-- ================================================================
--  MARKETPLACE — SUPABASE SCHEMA (FINAL)
--
--  Two-gate system:
--    Gate 1: User signs contract → seller_status = 'pending'
--            Admin approves     → seller_status = 'verified'
--    Gate 2: Verified seller submits product → review_status = 'pending_review'
--            Admin approves                 → product goes live
--
--  Run once in: Supabase Dashboard → SQL Editor → New query
-- ================================================================


-- ================================================================
--  ENUM TYPES
-- ================================================================

CREATE TYPE seller_status_enum AS ENUM (
  'pending',
  'verified',
  'rejected'
);

CREATE TYPE product_review_status AS ENUM (
  'pending_review',
  'approved',
  'rejected'
);

CREATE TYPE order_status AS ENUM (
  'pending_confirmation',
  'confirmed',
  'processing',
  'shipped',
  'delivered',
  'cancelled'
);


-- ================================================================
--  TABLES
-- ================================================================

-- ── PROFILES ─────────────────────────────────────────────────────
-- Extends auth.users (Supabase built-in).
-- seller_status is NULL until the user signs the contract.
-- is_admin is set manually via SQL for the first admin;
-- thereafter use PUT /admin/users/:id/toggle-admin.
CREATE TABLE profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  phone         TEXT,
  address       TEXT,
  lang          TEXT DEFAULT 'en' CHECK (lang IN ('en', 'fr', 'ar')),
  is_admin      BOOLEAN DEFAULT FALSE NOT NULL,
  seller_status seller_status_enum DEFAULT NULL,  -- NULL = buyer only
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ── CONTRACT SIGNATURES ──────────────────────────────────────────
-- Legal audit trail: one row per user per contract version.
-- IP + user-agent stored for legal purposes.
-- Signing does NOT grant seller access — it creates a verification request.
CREATE TABLE contract_signatures (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  contract_version INT NOT NULL,
  ip_address       TEXT,
  user_agent       TEXT,
  signed_at        TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, contract_version)
);

-- ── SELLER VERIFICATION REQUESTS ─────────────────────────────────
-- Created when a user signs the contract.
-- Admin reviews these to approve/reject seller applications.
-- UNIQUE on user_id: one active request per user.
CREATE TABLE seller_verification_requests (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  note        TEXT,                          -- optional message from applicant
  status      TEXT DEFAULT 'pending'
              CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id)
);

-- ── PRODUCTS ─────────────────────────────────────────────────────
-- Only verified sellers (seller_status = 'verified') can insert.
-- Enforced by both API middleware AND the RLS insert policy below.
-- Every new product starts as pending_review regardless of seller status.
CREATE TABLE products (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title          TEXT NOT NULL,
  description    TEXT,
  price          NUMERIC(12,2) NOT NULL CHECK (price > 0),
  currency       TEXT DEFAULT 'USD' CHECK (currency IN ('USD', 'EUR', 'TND')),
  stock          INT DEFAULT 0 CHECK (stock >= 0),
  category       TEXT,
  images         TEXT[] DEFAULT '{}',
  review_status  product_review_status DEFAULT 'pending_review',
  rejection_note TEXT,
  reviewed_by    UUID REFERENCES auth.users(id),
  reviewed_at    TIMESTAMPTZ,
  is_active      BOOLEAN DEFAULT TRUE NOT NULL,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ── ORDERS ───────────────────────────────────────────────────────
-- Any authenticated user can be a buyer.
-- buyer_name / buyer_address / buyer_phone captured at checkout.
-- Confirmation requires direct contact (status starts pending_confirmation).
CREATE TABLE orders (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id      UUID NOT NULL REFERENCES auth.users(id),
  buyer_name    TEXT NOT NULL,
  buyer_address TEXT NOT NULL,
  buyer_phone   TEXT NOT NULL,
  status        order_status DEFAULT 'pending_confirmation',
  total_amount  NUMERIC(12,2) NOT NULL,
  currency      TEXT DEFAULT 'USD' CHECK (currency IN ('USD', 'EUR', 'TND')),
  notes         TEXT,
  confirmed_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ── ORDER ITEMS ──────────────────────────────────────────────────
-- snapshot stores product title/price at time of order so historical
-- orders stay accurate even if the product is edited or deleted later.
CREATE TABLE order_items (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id   UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id),
  seller_id  UUID NOT NULL REFERENCES auth.users(id),
  quantity   INT NOT NULL CHECK (quantity > 0),
  unit_price NUMERIC(12,2) NOT NULL,
  snapshot   JSONB
);


-- ================================================================
--  INDEXES
-- ================================================================

CREATE INDEX idx_products_seller        ON products(seller_id);
CREATE INDEX idx_products_status_active ON products(review_status, is_active);
CREATE INDEX idx_orders_buyer           ON orders(buyer_id);
CREATE INDEX idx_orders_status          ON orders(status);
CREATE INDEX idx_order_items_order      ON order_items(order_id);
CREATE INDEX idx_order_items_seller     ON order_items(seller_id);
CREATE INDEX idx_seller_verif_status    ON seller_verification_requests(status);
CREATE INDEX idx_seller_verif_user      ON seller_verification_requests(user_id);


-- ================================================================
--  TRIGGERS
-- ================================================================

-- ── Auto-create profile row on signup ────────────────────────────
-- Runs immediately after Supabase Auth creates a user.
-- Picks up name + lang from registration metadata.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, name, lang)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'lang', 'en')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ── Auto-update updated_at ────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── Reset product to pending_review on content edits ─────────────
-- Guards against bait-and-switch: seller gets approved, then edits
-- to prohibited content. Only fires when meaningful fields change.
-- The API middleware also resets this explicitly — the trigger is
-- a database-level guarantee that cannot be bypassed.
CREATE OR REPLACE FUNCTION enforce_product_review_reset()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.review_status = 'approved'
     AND (
       OLD.title       IS DISTINCT FROM NEW.title       OR
       OLD.description IS DISTINCT FROM NEW.description OR
       OLD.price       IS DISTINCT FROM NEW.price       OR
       OLD.images      IS DISTINCT FROM NEW.images      OR
       OLD.category    IS DISTINCT FROM NEW.category
     )
  THEN
    NEW.review_status  := 'pending_review';
    NEW.rejection_note := NULL;
    NEW.reviewed_by    := NULL;
    NEW.reviewed_at    := NULL;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER product_review_reset
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION enforce_product_review_reset();


-- ================================================================
--  STOCK CONTROL
--  Atomic decrement — prevents two buyers claiming the last unit.
--  Called from the API via supabase.rpc('decrement_stock', {...})
-- ================================================================

CREATE OR REPLACE FUNCTION decrement_stock(product_id UUID, amount INT)
RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
  UPDATE products
  SET stock = stock - amount
  WHERE id = product_id AND stock >= amount;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Insufficient stock for product %', product_id;
  END IF;
END;
$$;


-- ================================================================
--  ROW LEVEL SECURITY (RLS)
--
--  Data firewall at the database layer. Even if the API has a bug,
--  users cannot read or write data they don't own.
--  The service_role key (server-side only) bypasses all RLS.
-- ================================================================

ALTER TABLE profiles                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE contract_signatures          ENABLE ROW LEVEL SECURITY;
ALTER TABLE seller_verification_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE products                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders                       ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items                  ENABLE ROW LEVEL SECURITY;


-- ── PROFILES ─────────────────────────────────────────────────────

CREATE POLICY "users: read own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "users: update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "admins: read all profiles"
  ON profiles FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = TRUE)
  );

CREATE POLICY "service: full access profiles"
  ON profiles FOR ALL
  USING (auth.role() = 'service_role');


-- ── CONTRACT SIGNATURES ──────────────────────────────────────────

CREATE POLICY "users: read own signatures"
  ON contract_signatures FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "service: full access signatures"
  ON contract_signatures FOR ALL
  USING (auth.role() = 'service_role');


-- ── SELLER VERIFICATION REQUESTS ─────────────────────────────────

CREATE POLICY "users: read own verification request"
  ON seller_verification_requests FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "admins: read all verification requests"
  ON seller_verification_requests FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = TRUE)
  );

CREATE POLICY "service: full access verification requests"
  ON seller_verification_requests FOR ALL
  USING (auth.role() = 'service_role');


-- ── PRODUCTS ─────────────────────────────────────────────────────

-- Buyers (and public) see only approved + active listings
CREATE POLICY "public: read approved products"
  ON products FOR SELECT
  USING (review_status = 'approved' AND is_active = TRUE);

-- Sellers see all their own products regardless of review status
CREATE POLICY "sellers: read own products"
  ON products FOR SELECT
  USING (auth.uid() = seller_id);

-- Only verified sellers can insert — double-checked with profiles lookup
CREATE POLICY "sellers: insert products"
  ON products FOR INSERT
  WITH CHECK (
    auth.uid() = seller_id AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND seller_status = 'verified'
    )
  );

-- Sellers can only update their own listings
CREATE POLICY "sellers: update own products"
  ON products FOR UPDATE
  USING (auth.uid() = seller_id)
  WITH CHECK (auth.uid() = seller_id);

CREATE POLICY "admins: full access products"
  ON products FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = TRUE)
  );

CREATE POLICY "service: full access products"
  ON products FOR ALL
  USING (auth.role() = 'service_role');


-- ── ORDERS ───────────────────────────────────────────────────────

CREATE POLICY "buyers: read own orders"
  ON orders FOR SELECT
  USING (auth.uid() = buyer_id);

CREATE POLICY "buyers: insert orders"
  ON orders FOR INSERT
  WITH CHECK (auth.uid() = buyer_id);

-- Sellers can read orders that contain their products
CREATE POLICY "sellers: read related orders"
  ON orders FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM order_items
      WHERE order_items.order_id = orders.id
        AND order_items.seller_id = auth.uid()
    )
  );

CREATE POLICY "admins: full access orders"
  ON orders FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = TRUE)
  );

CREATE POLICY "service: full access orders"
  ON orders FOR ALL
  USING (auth.role() = 'service_role');


-- ── ORDER ITEMS ──────────────────────────────────────────────────

CREATE POLICY "buyers: read own order items"
  ON order_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE id = order_items.order_id AND buyer_id = auth.uid()
    )
  );

CREATE POLICY "sellers: read own order items"
  ON order_items FOR SELECT
  USING (auth.uid() = seller_id);

CREATE POLICY "admins: full access order items"
  ON order_items FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = TRUE)
  );

CREATE POLICY "service: full access order items"
  ON order_items FOR ALL
  USING (auth.role() = 'service_role');


-- ================================================================
--  AFTER RUNNING THIS FILE
--
--  1. Register your admin account via POST /auth/register
--  2. Find your UUID in Supabase Dashboard → Authentication → Users
--  3. Run this to grant admin access:
--       UPDATE profiles SET is_admin = TRUE WHERE id = 'your-uuid-here';
-- ================================================================