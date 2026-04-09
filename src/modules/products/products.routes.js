const router = require('express').Router();
const { body, validationResult } = require('express-validator');
const { serviceClient } = require('../../services/supabase');
const { authenticate, requireSeller } = require('../../middleware/auth');

// GET /products — public, approved only
router.get('/', async (req, res) => {
  const { category, seller_id, search, page = 1, limit = 20 } = req.query;
  const from = (page - 1) * limit;
  const to   = from + Number(limit) - 1;

  let query = serviceClient
    .from('products')
    .select('id, seller_id, title, description, price, currency, stock, category, images, created_at', { count: 'exact' })
    .eq('review_status', 'approved')
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .range(from, to);

  if (category)  query = query.eq('category', category);
  if (seller_id) query = query.eq('seller_id', seller_id);
  if (search)    query = query.ilike('title', `%${search}%`);

  const { data, error, count } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json({ products: data, total: count, page: +page, limit: +limit });
});

// GET /products/mine — seller sees all their own products
router.get('/mine', authenticate, requireSeller, async (req, res) => {
  const { data, error } = await serviceClient
    .from('products')
    .select('id, title, price, currency, stock, category, review_status, rejection_note, is_active, created_at')
    .eq('seller_id', req.user.id)
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json({ products: data });
});

// GET /products/:id — public, approved only
router.get('/:id', async (req, res) => {
  const { data, error } = await serviceClient
    .from('products')
    .select('*, profiles!seller_id(id, name)')
    .eq('id', req.params.id)
    .eq('review_status', 'approved')
    .eq('is_active', true)
    .single();

  if (error || !data) return res.status(404).json({ error: 'Product not found' });
  res.json({ product: data });
});

// POST /products — verified sellers only, starts as pending_review
router.post('/', authenticate, requireSeller, [
  body('title').trim().notEmpty(),
  body('price').isFloat({ min: 0.01 }),
  body('stock').optional().isInt({ min: 0 }),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { title, description, price, currency = 'USD', stock = 0, category, images = [] } = req.body;

  const { data, error } = await serviceClient
    .from('products')
    .insert({
      seller_id: req.user.id,
      title, description, price, currency, stock, category, images,
      review_status: 'pending_review',
    })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json({
    product: data,
    message: 'Product submitted for review. It will go live once approved.',
  });
});

// PUT /products/:id — edit resets to pending_review
router.put('/:id', authenticate, requireSeller, async (req, res) => {
  const { title, description, price, stock, category, images } = req.body;

  const updates = {
    review_status:  'pending_review',
    rejection_note: null,
    updated_at:     new Date().toISOString(),
  };
  if (title       !== undefined) updates.title       = title;
  if (description !== undefined) updates.description = description;
  if (price       !== undefined) updates.price       = price;
  if (stock       !== undefined) updates.stock       = stock;
  if (category    !== undefined) updates.category    = category;
  if (images      !== undefined) updates.images      = images;

  const { data, error } = await serviceClient
    .from('products')
    .update(updates)
    .eq('id', req.params.id)
    .eq('seller_id', req.user.id)
    .select()
    .single();

  if (error || !data) return res.status(404).json({ error: 'Product not found or not yours' });
  res.json({ product: data, message: 'Product updated and re-queued for review.' });
});

// DELETE /products/:id — soft delete
router.delete('/:id', authenticate, requireSeller, async (req, res) => {
  const { data, error } = await serviceClient
    .from('products')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('id', req.params.id)
    .eq('seller_id', req.user.id)
    .select('id')
    .single();

  if (error || !data) return res.status(404).json({ error: 'Product not found or not yours' });
  res.json({ message: 'Product deactivated' });
});

module.exports = router;


