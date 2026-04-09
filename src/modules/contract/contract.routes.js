const router  = require('express').Router();  // THIS was missing — caused ReferenceError
const { serviceClient } = require('../../services/supabase');
const { authenticate }  = require('../../middleware/auth');
const { CONTRACT_VERSION, CONTRACT_TEXT } = require('./contract.service');

// GET /contract — public, display before signing
router.get('/', (_req, res) => {
  res.json({ version: CONTRACT_VERSION, text: CONTRACT_TEXT });
});

// GET /contract/status
router.get('/status', authenticate, async (req, res) => {
  const { data, error } = await serviceClient
    .from('contract_signatures')
    .select('signed_at, contract_version')
    .eq('user_id', req.user.id)
    .eq('contract_version', CONTRACT_VERSION)
    .maybeSingle();

  if (error) return res.status(500).json({ error: error.message });

  res.json({
    signed:          !!data,
    signed_at:       data?.signed_at ?? null,
    current_version: CONTRACT_VERSION,
    seller_status:   req.profile.seller_status ?? null,
  });
});

// POST /contract/sign
// Signs the contract → creates a verification request → seller_status = 'pending'
// Admin must then approve before the user can list products
router.post('/sign', authenticate, async (req, res) => {
  const { agreed } = req.body;
  if (agreed !== true) {
    return res.status(400).json({ error: 'Send { "agreed": true } to sign the contract' });
  }

  if (req.profile.seller_status === 'verified') {
    return res.status(409).json({ error: 'Already a verified seller' });
  }
  if (req.profile.seller_status === 'pending') {
    return res.status(409).json({ error: 'Application already pending admin review' });
  }

  // 1. Record the signature
  const { error: sigError } = await serviceClient
    .from('contract_signatures')
    .upsert({
      user_id:          req.user.id,
      contract_version: CONTRACT_VERSION,
      ip_address:       req.ip,
      user_agent:       req.headers['user-agent'] ?? null,
    }, { onConflict: 'user_id,contract_version' });

  if (sigError) return res.status(500).json({ error: sigError.message });

  // 2. Create seller verification request
  const { error: reqError } = await serviceClient
    .from('seller_verification_requests')
    .upsert({ user_id: req.user.id, note: req.body.note ?? null },
             { onConflict: 'user_id' });

  if (reqError) return res.status(500).json({ error: reqError.message });

  // 3. Set seller_status = 'pending' (NOT 'verified' yet)
  const { error: profileError } = await serviceClient
    .from('profiles')
    .update({ seller_status: 'pending', updated_at: new Date().toISOString() })
    .eq('id', req.user.id);

  if (profileError) return res.status(500).json({ error: profileError.message });

  res.json({
    message:     'Contract signed. Your seller application is pending admin review.',
    seller_status: 'pending',
  });
});

module.exports = router;