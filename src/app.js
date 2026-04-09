require('dotenv').config();
const express = require('express');
const cors    = require('cors');

const app = express();

app.use(cors());
app.use(express.json());

// ── Routes ── (were mounted at ./routes/* which doesn't exist)
app.use('/auth',     require('./modules/auth/auth.routes'));
app.use('/contract', require('./modules/contract/contract.routes'));
app.use('/products', require('./modules/products/products.routes'));
app.use('/orders',   require('./modules/orders/orders.routes'));
app.use('/admin',    require('./modules/admin/admin.routes'));

app.get('/health', (_, res) => res.json({ status: 'ok', ts: new Date().toISOString() }));

app.use((req, res) => res.status(404).json({ error: `Route ${req.path} not found` }));

app.use((err, _req, res, _next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

module.exports = app;