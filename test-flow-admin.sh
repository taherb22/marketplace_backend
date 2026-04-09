#!/bin/bash

BASE="http://localhost:3000"
TOKEN=$1
USER_ID=$2

if [ -z "$TOKEN" ] || [ -z "$USER_ID" ]; then
  echo "Usage: bash test-flow-admin.sh TOKEN USER_ID"
  exit 1
fi

echo ""
echo "══════════════════════════════════════"
echo " ADMIN FLOW TEST"
echo "══════════════════════════════════════"

# ── VIEW PENDING SELLERS ───────────────────────────────────────
echo ""
echo "▶ 1. List pending seller applications"
curl -s $BASE/admin/sellers/pending \
  -H "Authorization: Bearer $TOKEN" | jq

# ── APPROVE SELLER ─────────────────────────────────────────────
echo ""
echo "▶ 2. Approve seller"
curl -s -X POST $BASE/admin/sellers/$USER_ID/approve \
  -H "Authorization: Bearer $TOKEN" | jq

# ── GATE 3: now verified — try posting product ─────────────────
echo ""
echo "▶ 3. Post a product (should SUCCEED — now verified seller)"
PRODUCT=$(curl -s -X POST $BASE/products \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"title":"Test Product","price":29.99,"stock":10,"category":"electronics"}')
echo $PRODUCT | jq

PRODUCT_ID=$(echo $PRODUCT | jq -r '.product.id')
echo "   Product ID: $PRODUCT_ID"

# ── VIEW PRODUCT QUEUE ─────────────────────────────────────────
echo ""
echo "▶ 4. Admin views product review queue"
curl -s $BASE/admin/products/queue \
  -H "Authorization: Bearer $TOKEN" | jq

# ── APPROVE PRODUCT ────────────────────────────────────────────
echo ""
echo "▶ 5. Admin approves product"
curl -s -X POST $BASE/admin/products/$PRODUCT_ID/approve \
  -H "Authorization: Bearer $TOKEN" | jq

# ── PRODUCT LIVE ───────────────────────────────────────────────
echo ""
echo "▶ 6. Browse live products (should show approved product)"
curl -s $BASE/products | jq

echo ""
echo "══════════════════════════════════════"
echo " ALL GATES TESTED"
echo "══════════════════════════════════════"

