require('dotenv').config();

const required = [
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
];

for (const key of required) {
  if (!process.env[key]) {
    console.error(`Missing required environment variable: ${key}`);
    process.exit(1);
  }
}

module.exports = {
  SUPABASE_URL:              process.env.SUPABASE_URL,
  SUPABASE_ANON_KEY:         process.env.SUPABASE_ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  PORT:                      process.env.PORT || 3000,
  CONTRACT_VERSION:          parseInt(process.env.CONTRACT_VERSION || '1', 10),
  NODE_ENV:                  process.env.NODE_ENV || 'development',
};