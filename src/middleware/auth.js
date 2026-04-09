const { anonClient, serviceClient } = require('../services/supabase');

const authenticate = async (req, res, next) => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header' });
  }

  const token = header.slice(7);
  const { data: { user }, error } = await anonClient.auth.getUser(token);
  if (error || !user) return res.status(401).json({ error: 'Token invalid or expired' });

  const { data: profile, error: profileError } = await serviceClient
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (profileError || !profile) return res.status(401).json({ error: 'Profile not found' });

  req.user    = user;
  req.profile = profile;
  req.token   = token;
  next();
};

// User must be admin-approved as a seller
const requireSeller = (req, res, next) => {
  if (req.profile?.seller_status !== 'verified') {
    const hint = req.profile?.seller_status === 'pending'
      ? 'Your seller application is under review'
      : req.profile?.seller_status === 'rejected'
      ? 'Your seller application was rejected'
      : 'Apply to become a seller at POST /contract/sign';

    return res.status(403).json({ error: 'Verified seller account required', hint });
  }
  next();
};

const requireAdmin = (req, res, next) => {
  if (!req.profile?.is_admin) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

module.exports = { authenticate, requireSeller, requireAdmin };