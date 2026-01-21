#!/bin/bash
# 🚀 Script Quick Fix LED - Riavvio Completo

echo "🔄 QUICK FIX LED - Riavvio Completo Sistema"
echo "=========================================="
echo ""

# 1. Stop tutto
echo "1️⃣  Stop containers..."
docker-compose down

# 2. Riavvia tutto
echo "2️⃣  Riavvio containers..."
docker-compose up -d

# 3. Attendi che il backend sia pronto
echo "3️⃣  Attendo che backend sia pronto (15 secondi)..."
sleep 15

# 4. Reset game completion via API
echo "4️⃣  Reset game completion..."
curl -X POST http://localhost:3000/api/sessions/1/game-completion/reset

echo ""
echo "5️⃣  Verifica stato..."
curl http://localhost:3000/api/sessions/1/game-completion/state | jq

echo ""
echo "✅ FATTO! Ora i LED dovrebbero partire ROSSI"
echo ""
echo "🎮 Apri browser su: http://localhost:5173/play/1/camera?name=Tester"
echo ""
