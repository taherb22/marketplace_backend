#!/bin/bash

BASE="http://localhost:3000"
TOKEN=$1
PRODUCT_ID=$2

echo ""
echo "══════════════════════════════════════"
echo " ORDERS FLOW TEST"
echo "══════════════════════════════════════"


# ── PLACE ORDER ───────────────────────────────────────────────
echo ""
echo "▶ 1. Place an order"
ORDER=$(curl -s -X POST $BASE/orders \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"items\": [{\"product_id\": \"$PRODUCT_ID\", \"quantity\": 1}],
    \"buyer_name\": \"Taher Boudriga\",
    \"buyer_address\": \"123 Main St, Tunis\",
    \"buyer_phone\": \"+21612345678\"
  }")
echo $ORDER | jq
ORDER_ID=$(echo $ORDER | jq -r '.order.id')
echo "   Order ID: $ORDER_ID"

# ── BUYER VIEWS OWN ORDERS ────────────────────────────────────
echo ""
echo "▶ 2. Buyer views own orders"
curl -s $BASE/orders/my \
  -H "Authorization: Bearer $TOKEN" | jq

# ── SELLER VIEWS THEIR ORDERS ─────────────────────────────────
echo ""
echo "▶ 3. Seller views orders for their products"
curl -s $BASE/orders/seller \
  -H "Authorization: Bearer $TOKEN" | jq

# ── CONFIRM ORDER ─────────────────────────────────────────────
echo ""
echo "▶ 4. Confirm order (after direct contact with buyer)"
curl -s -X POST $BASE/orders/$ORDER_ID/confirm \
  -H "Authorization: Bearer $TOKEN" | jq

# ── UPDATE STATUS ─────────────────────────────────────────────
echo ""
echo "▶ 5. Update status to processing"
curl -s -X POST $BASE/orders/$ORDER_ID/status \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"status":"processing"}' | jq

echo ""
echo "▶ 6. Update status to shipped"
curl -s -X POST $BASE/orders/$ORDER_ID/status \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"status":"shipped"}' | jq

echo ""
echo "▶ 7. Update status to delivered"
curl -s -X POST $BASE/orders/$ORDER_ID/status \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"status":"delivered"}' | jq

# ── ADMIN VIEWS ALL ORDERS ────────────────────────────────────
echo ""
echo "▶ 8. Admin views all orders"
curl -s "$BASE/orders/admin/all" \
  -H "Authorization: Bearer $TOKEN" | jq

echo ""
echo "══════════════════════════════════════"
echo " ORDERS FLOW COMPLETE"
echo "══════════════════════════════════════"
