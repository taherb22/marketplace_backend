/**
 * AUTH ROUTES
 *
 * Supabase handles ALL password hashing, JWT signing, token refresh,
 * email verification, and password reset. We just call their SDK.
 *
 * POST /auth/register     — create account + profile row
 * POST /auth/login        — returns access_token + refresh_token
 * POST /auth/logout       — invalidates the session
 * POST /auth/refresh      — exchange refresh_token for new access_token
 * GET  /auth/me           — current user + profile
 * PUT  /auth/me           — update display name, phone, address, lang
 */

const router = require('express').Router();
const { body, validationResult } = require('express-validator');
const { anonClient, serviceClient } = require('../../services/supabase');
const { authenticate } = require('../../middleware/auth');
router.post('/register', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }),
  body('name').trim().notEmpty(),
  body('lang').optional().isIn(['en', 'fr', 'ar']),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { email, password, name, lang = 'en' } = req.body;

  const { data, error } = await anonClient.auth.signUp({
    email,
    password,
    options: {
      data: { name, lang },
    },
  });

  if (error) return res.status(400).json({ error: error.message });

  res.status(201).json({
    message: 'Account created.',
    session: data.session,
    user: { id: data.user.id, email: data.user.email, name },
  });
});
// ── POST /auth/login ───────────────────────────────────────────────────────
router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { email, password } = req.body;

  const { data, error } = await anonClient.auth.signInWithPassword({ email, password });
  if (error) return res.status(401).json({ error: error.message });

  // Fetch profile to include is_seller/is_admin in response
  const { data: profile } = await serviceClient
    .from('profiles')
    .select('name, lang, is_seller, is_admin')
    .eq('id', data.user.id)
    .single();

  res.json({
    access_token:  data.session.access_token,
    refresh_token: data.session.refresh_token,
    expires_in:    data.session.expires_in,
    user: {
      id:    data.user.id,
      email: data.user.email,
      ...profile,
    },
  });
});

// ── POST /auth/logout ──────────────────────────────────────────────────────
router.post('/logout', authenticate, async (req, res) => {
  // Signs out using the user's own token (invalidates this session only)
  const userClient = require('@supabase/supabase-js')
    .createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
  await userClient.auth.setSession({ access_token: req.token, refresh_token: '' });
  await userClient.auth.signOut();
  res.json({ message: 'Logged out' });
});

// ── POST /auth/refresh ─────────────────────────────────────────────────────
router.post('/refresh', async (req, res) => {
  const { refresh_token } = req.body;
  if (!refresh_token) return res.status(400).json({ error: 'refresh_token required' });

  const { data, error } = await anonClient.auth.refreshSession({ refresh_token });
  if (error) return res.status(401).json({ error: error.message });

  res.json({
    access_token:  data.session.access_token,
    refresh_token: data.session.refresh_token,
    expires_in:    data.session.expires_in,
  });
});

// ── GET /auth/me ───────────────────────────────────────────────────────────
router.get('/me', authenticate, (req, res) => {
  res.json({
    user: {
      id:    req.user.id,
      email: req.user.email,
      ...req.profile,
    },
  });
});

// ── PUT /auth/me ───────────────────────────────────────────────────────────
router.put('/me', authenticate, [
  body('name').optional().trim().notEmpty(),
  body('phone').optional().trim(),
  body('address').optional().trim(),
  body('lang').optional().isIn(['en', 'fr', 'ar']),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { name, phone, address, lang } = req.body;
  const updates = {};
  if (name    !== undefined) updates.name    = name;
  if (phone   !== undefined) updates.phone   = phone;
  if (address !== undefined) updates.address = address;
  if (lang    !== undefined) updates.lang    = lang;
  updates.updated_at = new Date().toISOString();

  const { data, error } = await serviceClient
    .from('profiles')
    .update(updates)
    .eq('id', req.user.id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json({ profile: data });
});

module.exports = router;    