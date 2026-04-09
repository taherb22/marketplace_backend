/**
 * ADMIN ROUTES  — all require authenticate + requireAdmin
 *
 * GET /admin/users              — all users (filterable)
 * GET /admin/stats              — dashboard numbers
 * PUT /admin/users/:id/toggle-admin — grant / revoke admin
 */

const router = require('express').Router();
const { serviceClient } = require('../../services/supabase');
const { authenticate, requireAdmin } = require('../../middleware/auth');

router.use(authenticate, requireAdmin);

// ── GET /admin/users ──────────────────────────────────────────────────────
router.get('/users', async (req, res) => {
  let query = serviceClient
    .from('profiles')
    .select('id, name, email, phone, lang, is_seller, is_admin, created_at')
    .order('created_at', { ascending: false });

  if (req.query.is_seller !== undefined) {
    query = query.eq('is_seller', req.query.is_seller === 'true');
  }
  if (req.query.search) {
    query = query.or(`name.ilike.%${req.query.search}%,email.ilike.%${req.query.search}%`);
  }

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json({ users: data });
});

// ── GET /admin/stats ──────────────────────────────────────────────────────
router.get('/stats', async (_req, res) => {
  const [users, products, orders] = await Promise.all([
    serviceClient.from('profiles').select('is_seller, is_admin', { count: 'exact', head: false }),
    serviceClient.from('products').select('review_status', { count: 'exact', head: false }),
    serviceClient.from('orders').select('status, total_amount', { count: 'exact', head: false }),
  ]);

  const countBy = (rows, field) =>
    rows?.reduce((acc, row) => {
      acc[row[field]] = (acc[row[field]] || 0) + 1;
      return acc;
    }, {}) ?? {};

  const productCounts = countBy(products.data, 'review_status');
  const orderCounts   = countBy(orders.data, 'status');
  const revenue       = orders.data
    ?.filter(o => o.status === 'delivered')
    .reduce((sum, o) => sum + Number(o.total_amount), 0) ?? 0;

  res.json({
    users: {
      total:   users.data?.length ?? 0,
      sellers: users.data?.filter(u => u.is_seller).length ?? 0,
      admins:  users.data?.filter(u => u.is_admin).length ?? 0,
    },
    products: {
      total:          products.data?.length ?? 0,
      pending_review: productCounts['pending_review'] ?? 0,
      approved:       productCounts['approved'] ?? 0,
      rejected:       productCounts['rejected'] ?? 0,
    },
    orders: {
      total:                orders.data?.length ?? 0,
      pending_confirmation: orderCounts['pending_confirmation'] ?? 0,
      confirmed:            orderCounts['confirmed'] ?? 0,
      delivered:            orderCounts['delivered'] ?? 0,
      revenue_delivered:    revenue,
    },
  });
});

// ── PUT /admin/users/:id/toggle-admin ─────────────────────────────────────
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