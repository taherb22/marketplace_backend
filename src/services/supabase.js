const { createClient } = require('@supabase/supabase-js');
require('../config/env');  // run validation only, don't destructure

const SUPABASE_URL              = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY         = process.env.SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing Supabase env vars. Copy .env.example to .env and fill in your project keys.');
  process.exit(1);
}

/**
 * anonClient — for verifying user JWTs and user-scoped reads.
 * RLS policies apply to queries made through this client.
 */
const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * serviceClient — bypasses RLS entirely.
 * Use ONLY for admin operations and background jobs.
 * Never pass this to route handlers that serve regular users.
 */
const serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

module.exports = { anonClient, serviceClient };