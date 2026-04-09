#!/bin/bash

BASE="http://localhost:3000"
EMAIL="taherboudriga22@gmail.com"
PASS="password123"

echo ""
echo "══════════════════════════════════════"
echo " MARKETPLACE FLOW TEST"
echo "══════════════════════════════════════"

# ── LOGIN ──────────────────────────────────────────────────────
echo ""
echo " 1. Login"
LOGIN=$(curl -s -X POST $BASE/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASS\"}")
echo $LOGIN | jq

TOKEN=$(echo $LOGIN | jq -r '.access_token')
if [ "$TOKEN" = "null" ] || [ -z "$TOKEN" ]; then
  echo " Login failed — stopping"
  exit 1
fi
echo " Token saved"

# ── GATE 1: blocked before contract ───────────────────────────
echo ""
echo " 2. Try posting product (should be BLOCKED — no seller)"
curl -s -X POST $BASE/products \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"title":"Test Product","price":9.99}' | jq

# ── SIGN CONTRACT ──────────────────────────────────────────────
echo ""
echo " 3. Sign the contract"
curl -s -X POST $BASE/contract/sign \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"agreed":true}' | jq

# ── GATE 2: blocked while pending ─────────────────────────────
echo ""
echo " 4. Try posting product (should be BLOCKED — pending)"
curl -s -X POST $BASE/products \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"title":"Test Product","price":9.99}' | jq

# ── GRANT ADMIN + APPROVE SELLER ──────────────────────────────
echo ""
echo " 5. Check seller verification queue"
USER_ID=$(echo $LOGIN | jq -r '.user.id')
echo "   User ID: $USER_ID"
echo "   Run this in Supabase SQL Editor to make yourself admin:"
echo "   UPDATE profiles SET is_admin = TRUE WHERE id = '$USER_ID';"
echo ""
echo "   Then run: bash test-flow-admin.sh $TOKEN $USER_ID"

