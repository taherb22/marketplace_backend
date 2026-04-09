/**
 * ORDERS ROUTES
 *
 * POST /orders                — buyer places order (name, address, phone)
 * GET  /orders/my             — buyer: own orders with items
 * GET  /orders/seller         — seller: orders containing their products
 * GET  /orders/admin/all      — admin: all orders, filterable by status
 * POST /orders/:id/confirm    — seller/admin confirms after direct contact
 * POST /orders/:id/status     — seller/admin updates status
 */

const router = require('express').Router();
const { body, validationResult } = require('express-validator');

// Go up two levels
const { serviceClient } = require('../../services/supabase');
const { authenticate, requireAdmin } = require('../../middleware/auth');

// ── POST /orders ──────────────────────────────────────────────────────────
router.post('/', authenticate, [
  body('items').isArray({ min: 1 }),
  body('items.*.product_id').isUUID(),
  body('items.*.quantity').isInt({ min: 1 }),
  body('buyer_name').trim().notEmpty(),
  body('buyer_address').trim().notEmpty(),
  body('buyer_phone').trim().notEmpty(),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { items, buyer_name, buyer_address, buyer_phone, notes, currency = 'USD' } = req.body;
  const productIds = items.map(i => i.product_id);

  // Fetch products (approved + active only)
  const { data: products, error: prodError } = await serviceClient
    .from('products')
    .select('id, title, price, stock, seller_id')
    .in('id', productIds)
    .eq('review_status', 'approved')
    .eq('is_active', true);

  if (prodError) return res.status(500).json({ error: prodError.message });

  const productMap = Object.fromEntries(products.map(p => [p.id, p]));

  // Validate stock
  let total = 0;
  for (const item of items) {
    const product = productMap[item.product_id];
    if (!product) {
      return res.status(400).json({ error: `Product ${item.product_id} not found or unavailable` });
    }
    if (product.stock < item.quantity) {
      return res.status(400).json({
        error: `Insufficient stock for "${product.title}" (requested ${item.quantity}, available ${product.stock})`,
      });
    }
    total += product.price * item.quantity;
  }

  // Create order
  const { data: order, error: orderError } = await serviceClient
    .from('orders')
    .insert({
      buyer_id:      req.user.id,
      buyer_name,
      buyer_address,
      buyer_phone,
      total_amount:  total,
      currency,
      notes:         notes ?? null,
      status:        'pending_confirmation',
    })
    .select()
    .single();

  if (orderError) return res.status(500).json({ error: orderError.message });

  // Insert order items + decrement stock
  const orderItems = items.map(item => ({
    order_id:   order.id,
    product_id: item.product_id,
    seller_id:  productMap[item.product_id].seller_id,
    quantity:   item.quantity,
    unit_price: productMap[item.product_id].price,
    snapshot:   {
      title: productMap[item.product_id].title,
      price: productMap[item.product_id].price,
    },
  }));

  const { error: itemsError } = await serviceClient.from('order_items').insert(orderItems);
  if (itemsError) return res.status(500).json({ error: itemsError.message });

  // Decrement stock for each product
  await Promise.all(
    items.map(item =>
      serviceClient.rpc('decrement_stock', {
        product_id: item.product_id,
        amount:     item.quantity,
      })
    )
  );

  res.status(201).json({
    order,
    message: 'Order placed. A seller representative will contact you to confirm.',
  });
});

// ── GET /orders/my ────────────────────────────────────────────────────────
router.get('/my', authenticate, async (req, res) => {
  const { data, error } = await serviceClient
    .from('orders')
    .select(`
      id, status, total_amount, currency, created_at, confirmed_at,
      order_items ( product_id, quantity, unit_price, snapshot )
    `)
    .eq('buyer_id', req.user.id)
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json({ orders: data });
});

// ── GET /orders/seller ────────────────────────────────────────────────────
router.get('/seller', authenticate, async (req, res) => {
  if (req.profile.seller_status !== 'verified') {
    return res.status(403).json({ error: 'Verified seller account required' });
  }

  // Get order IDs that contain this seller's products
  const { data: sellerItems, error: itemsError } = await serviceClient
    .from('order_items')
    .select('order_id, product_id, quantity, unit_price, snapshot')
    .eq('seller_id', req.user.id);

  if (itemsError) return res.status(500).json({ error: itemsError.message });

  if (!sellerItems.length) return res.json({ orders: [] });

  const orderIds = [...new Set(sellerItems.map(i => i.order_id))];

  const { data: orders, error: ordersError } = await serviceClient
    .from('orders')
    .select('id, buyer_name, buyer_phone, buyer_address, status, total_amount, created_at')
    .in('id', orderIds)
    .order('created_at', { ascending: false });

  if (ordersError) return res.status(500).json({ error: ordersError.message });

  // Attach only this seller's items to each order
  const itemsByOrder = {};
  sellerItems.forEach(item => {
    if (!itemsByOrder[item.order_id]) itemsByOrder[item.order_id] = [];
    itemsByOrder[item.order_id].push(item);
  });

  const result = orders.map(o => ({ ...o, my_items: itemsByOrder[o.id] ?? [] }));
  res.json({ orders: result });
});

// ── GET /orders/admin/all ─────────────────────────────────────────────────
router.get('/admin/all', authenticate, requireAdmin, async (req, res) => {
  let query = serviceClient
    .from('orders')
    .select('*, order_items ( product_id, quantity, unit_price, snapshot )')
    .order('created_at', { ascending: false });

  if (req.query.status) query = query.eq('status', req.query.status);

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json({ orders: data });
});

// ── POST /orders/:id/confirm ──────────────────────────────────────────────
router.post('/:id/confirm', authenticate, async (req, res) => {
  if (!req.profile.is_seller && !req.profile.is_admin) {
    return res.status(403).json({ error: 'Seller or admin access required' });
  }

  const { data, error } = await serviceClient
    .from('orders')
    .update({
      status:       'confirmed',
      confirmed_at: new Date().toISOString(),
      updated_at:   new Date().toISOString(),
    })
    .eq('id', req.params.id)
    .eq('status', 'pending_confirmation')
    .select()
    .single();

  if (error || !data) return res.status(404).json({ error: 'Order not found or already confirmed' });
  res.json({ order: data });
});

// ── POST /orders/:id/status ───────────────────────────────────────────────
router.post('/:id/status', authenticate, [
  body('status').isIn(['processing', 'shipped', 'delivered', 'cancelled']),
], async (req, res) => {
  if (!req.profile.is_seller && !req.profile.is_admin) {
    return res.status(403).json({ error: 'Seller or admin access required' });
  }
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { data, error } = await serviceClient
    .from('orders')
    .update({ status: req.body.status, updated_at: new Date().toISOString() })
    .eq('id', req.params.id)
    .select()
    .single();

  if (error || !data) return res.status(404).json({ error: 'Order not found' });
  res.json({ order: data });
});

module.exports = router;