-- ================================================================
--  MARKETPLACE — SEED DATA
--  Run AFTER schema.sql
-- ================================================================

--  IMPORTANT:
-- Replace these UUIDs with real ones from auth.users if needed
-- (or insert users manually from Supabase Auth UI)

-- ── SAMPLE USERS (PROFILES ONLY) ─────────────────────────────────
-- These assume users already exist in auth.users

INSERT INTO profiles (id, name, lang, is_seller, is_admin)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'Admin User', 'en', TRUE, TRUE),
  ('22222222-2222-2222-2222-222222222222', 'Seller One', 'en', TRUE, FALSE),
  ('33333333-3333-3333-3333-333333333333', 'Buyer One', 'en', FALSE, FALSE)
ON CONFLICT (id) DO NOTHING;

-- ── CONTRACT SIGNATURES ─────────────────────────────────────────
INSERT INTO contract_signatures (user_id, contract_version, ip_address, user_agent)
VALUES
  ('22222222-2222-2222-2222-222222222222', 1, '127.0.0.1', 'seed-script'),
  ('11111111-1111-1111-1111-111111111111', 1, '127.0.0.1', 'seed-script')
ON CONFLICT DO NOTHING;

-- ── PRODUCTS ────────────────────────────────────────────────────
INSERT INTO products (
  id, seller_id, title, description, price, currency,
  stock, category, images, review_status, is_active
)
VALUES
  (
    gen_random_uuid(),
    '22222222-2222-2222-2222-222222222222',
    'Gaming Laptop',
    'High performance laptop',
    1500,
    'USD',
    5,
    'electronics',
    ARRAY['https://example.com/laptop.jpg'],
    'approved',
    TRUE
  ),
  (
    gen_random_uuid(),
    '22222222-2222-2222-2222-222222222222',
    'Mechanical Keyboard',
    'RGB keyboard',
    120,
    'USD',
    10,
    'electronics',
    ARRAY['https://example.com/keyboard.jpg'],
    'pending_review',
    TRUE
  );

-- ── ORDERS ──────────────────────────────────────────────────────
INSERT INTO orders (
  id, buyer_id, buyer_name, buyer_address, buyer_phone,
  status, total_amount, currency
)
VALUES
  (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    '33333333-3333-3333-3333-333333333333',
    'Buyer One',
    'Tunis',
    '+21600000000',
    'pending_confirmation',
    1500,
    'USD'
  );

-- ── ORDER ITEMS ─────────────────────────────────────────────────
INSERT INTO order_items (
  order_id, product_id, seller_id, quantity, unit_price, snapshot
)
SELECT
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  p.id,
  p.seller_id,
  1,
  p.price,
  jsonb_build_object(
    'title', p.title,
    'price', p.price
  )
FROM products p
WHERE p.title = 'Gaming Laptop'
LIMIT 1;

-- ================================================================
--  DONE
-- ================================================================