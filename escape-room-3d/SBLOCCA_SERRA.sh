#!/bin/bash
# Script per sbloccare serra in modalità test
# Completa automaticamente fornelli + frigo → serra diventa active

echo "🔓 SBLOCCO SERRA PER TEST MICROFONO"
echo "====================================="
echo ""

BACKEND="http://192.168.1.10:8001"
SESSION="999"

echo "1️⃣ Completo fornelli..."
curl -X POST "$BACKEND/api/sessions/$SESSION/kitchen-puzzles/fornelli/complete" \
  -H "Content-Type: application/json" \
  -d '{}' \
  -s -o /dev/null -w "   Status: %{http_code}\n"

sleep 1

echo "2️⃣ Completo frigo..."
curl -X POST "$BACKEND/api/sessions/$SESSION/kitchen-puzzles/frigo/complete" \
  -H "Content-Type: application/json" \
  -d '{}' \
  -s -o /dev/null -w "   Status: %{http_code}\n"

sleep 1

echo ""
echo "✅ FATTO! Ora serra è ACTIVE"
echo "👏 Batti le mani → ESP32 completerà serra → Strip LED si accende!"
echo ""
