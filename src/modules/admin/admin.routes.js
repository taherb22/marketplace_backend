const router = require('express').Router();
const { serviceClient } = require('../../services/supabase');
const { authenticate, requireAdmin } = require('../../middleware/auth');

router.use(authenticate, requireAdmin);

// GET /admin/stats
router.get('/stats', async (_req, res) => {
  const [profiles, products, orders, verifications] = await Promise.all([
    serviceClient.from('profiles').select('seller_status, is_admin'),
    serviceClient.from('products').select('review_status'),
    serviceClient.from('orders').select('status, total_amount'),
    serviceClient.from('seller_verification_requests').select('status'),
  ]);

  const countBy = (rows, field) =>
    (rows ?? []).reduce((acc, r) => { acc[r[field]] = (acc[r[field]] || 0) + 1; return acc; }, {});

  const pCounts = countBy(products.data, 'review_status');
  const oCounts = countBy(orders.data, 'status');
  const vCounts = countBy(verifications.data, 'status');
  const revenue = (orders.data ?? [])
    .filter(o => o.status === 'delivered')
    .reduce((s, o) => s + Number(o.total_amount), 0);

  res.json({
    users: {
      total:    profiles.data?.length ?? 0,
      sellers:  profiles.data?.filter(p => p.seller_status === 'verified').length ?? 0,
      pending:  profiles.data?.filter(p => p.seller_status === 'pending').length ?? 0,
      admins:   profiles.data?.filter(p => p.is_admin).length ?? 0,
    },
    seller_applications: {
      pending:  vCounts['pending']  ?? 0,
      approved: vCounts['approved'] ?? 0,
      rejected: vCounts['rejected'] ?? 0,
    },
    products: {
      total:          products.data?.length ?? 0,
      pending_review: pCounts['pending_review'] ?? 0,
      approved:       pCounts['approved']       ?? 0,
      rejected:       pCounts['rejected']       ?? 0,
    },
    orders: {
      total:                orders.data?.length ?? 0,
      pending_confirmation: oCounts['pending_confirmation'] ?? 0,
      delivered:            oCounts['delivered']            ?? 0,
      revenue_delivered:    revenue,
    },
  });
});

// GET /admin/sellers/pending — list seller applications awaiting review
router.get('/sellers/pending', async (_req, res) => {
  const { data, error } = await serviceClient
    .from('seller_verification_requests')
    .select('id, user_id, note, status, created_at')
    .eq('status', 'pending')
    .order('created_at', { ascending: true });

  if (error) return res.status(500).json({ error: error.message });
  res.json({ applications: data });
});

// POST /admin/sellers/:userId/approve
router.post('/sellers/:userId/approve', async (req, res) => {
  const { userId } = req.params;

  // Update verification request
  const { error: reqError } = await serviceClient
    .from('seller_verification_requests')
    .update({
      status:      'approved',
      reviewed_by: req.user.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq('user_id', userId)
    .eq('status', 'pending');

  if (reqError) return res.status(500).json({ error: reqError.message });

  // Grant verified seller status
  const { error: profileError } = await serviceClient
    .from('profiles')
    .update({ seller_status: 'verified', updated_at: new Date().toISOString() })
    .eq('id', userId);

  if (profileError) return res.status(500).json({ error: profileError.message });

  res.json({ message: 'Seller approved. They can now submit products for review.' });
});

// POST /admin/sellers/:userId/reject
router.post('/sellers/:userId/reject', async (req, res) => {
  const { userId } = req.params;
  const { reason } = req.body;

  if (!reason) return res.status(400).json({ error: 'A rejection reason is required' });

  const { error: reqError } = await serviceClient
    .from('seller_verification_requests')
    .update({
      status:      'rejected',
      note:        reason,
      reviewed_by: req.user.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq('user_id', userId)
    .eq('status', 'pending');

  if (reqError) return res.status(500).json({ error: reqError.message });

  const { error: profileError } = await serviceClient
    .from('profiles')
    .update({ seller_status: 'rejected', updated_at: new Date().toISOString() })
    .eq('id', userId);

  if (profileError) return res.status(500).json({ error: profileError.message });

  res.json({ message: 'Seller application rejected.' });
});

// GET /admin/products/queue — products awaiting review
router.get('/products/queue', async (req, res) => {
  const status = req.query.status || 'pending_review';
  const { data, error } = await serviceClient
    .from('products')
    .select('id, seller_id, title, description, price, category, images, review_status, rejection_note, created_at')
    .eq('review_status', status)
    .order('created_at', { ascending: true });

  if (error) return res.status(500).json({ error: error.message });
  res.json({ products: data });
});

// POST /admin/products/:id/approve
router.post('/products/:id/approve', async (req, res) => {
  const { data, error } = await serviceClient
    .from('products')
    .update({
      review_status: 'approved',
      rejection_note: null,
      reviewed_by:   req.user.id,
      reviewed_at:   new Date().toISOString(),
      updated_at:    new Date().toISOString(),
    })
    .eq('id', req.params.id)
    .eq('review_status', 'pending_review')
    .select('id, title')
    .single();

  if (error || !data) return res.status(404).json({ error: 'Product not found or not pending' });
  res.json({ message: `"${data.title}" approved and now live.` });
});

// POST /admin/products/:id/reject
router.post('/products/:id/reject', async (req, res) => {
  const { note } = req.body;
  if (!note) return res.status(400).json({ error: 'A rejection note is required' });

  const { data, error } = await serviceClient
    .from('products')
    .update({
      review_status:  'rejected',
      rejection_note: note,
      reviewed_by:    req.user.id,
      reviewed_at:    new Date().toISOString(),
      updated_at:     new Date().toISOString(),
    })
    .eq('id', req.params.id)
    .eq('review_status', 'pending_review')
    .select('id, title')
    .single();

  if (error || !data) return res.status(404).json({ error: 'Product not found or not pending' });
  res.json({ message: `"${data.title}" rejected.`, note });
});

// GET /admin/users
router.get('/users', async (req, res) => {
  let query = serviceClient
    .from('profiles')
    .select('id, name, phone, lang, seller_status, is_admin, created_at')
    .order('created_at', { ascending: false });

  if (req.query.seller_status) query = query.eq('seller_status', req.query.seller_status);
  if (req.query.search) {
    query = query.or(`name.ilike.%${req.query.search}%,email.ilike.%${req.query.search}%`);
  }

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json({ users: data });
});

// PUT /admin/users/:id/toggle-admin
router.put('/users/:id/toggle-admin', async (req, res) => {
  const { data: current } = await serviceClient
    .from('profiles').select('is_admin').eq('id', req.params.id).single();

  if (!current) return res.status(404).json({ error: 'User not found' });

  const { data, error } = await serviceClient
    .from('profiles')
    .update({ is_admin: !current.is_admin })
    .eq('id', req.params.id)
    .select('id, name, is_admin')
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json({ user: data });
});

module.exports = router;