#!/bin/bash
# 🔨 Rebuild Completo Frontend Raspberry Pi - 16 Gennaio 2026
# Fix coordinate spawn definitive - rebuild da zero

set -e

RASPBERRY_IP="192.168.8.10"
RASPBERRY_USER="pi"
RASPBERRY_PASS="escape"

echo "🎯 REBUILD COMPLETO RASPBERRY PI - COORDINATE SPAWN DEFINITIVE"
echo "=============================================================="
echo ""

echo "📍 Step 1: Fermare e rimuovere tutti i container..."
sshpass -p "$RASPBERRY_PASS" ssh "$RASPBERRY_USER@$RASPBERRY_IP" << 'ENDSSH'
cd /home/pi/backend
docker compose down
echo "✅ Container fermati e rimossi"
ENDSSH

echo ""
echo "🗑️ Step 2: Rimuovere immagini vecchie..."
sshpass -p "$RASPBERRY_PASS" ssh "$RASPBERRY_USER@$RASPBERRY_IP" << 'ENDSSH'
docker rmi escape-backend escape-frontend 2>/dev/null || true
docker rmi backend-escape-backend backend-escape-frontend 2>/dev/null || true
echo "✅ Immagini vecchie rimosse"
ENDSSH

echo ""
echo "🔨 Step 3: Build completo da zero (--no-cache)..."
echo "⏳ Questo richiederà diversi minuti..."
sshpass -p "$RASPBERRY_PASS" ssh "$RASPBERRY_USER@$RASPBERRY_IP" << 'ENDSSH'
cd /home/pi/backend
docker compose build --no-cache
echo "✅ Build completato"
ENDSSH

echo ""
echo "🚀 Step 4: Avviare i container..."
sshpass -p "$RASPBERRY_PASS" ssh "$RASPBERRY_USER@$RASPBERRY_IP" << 'ENDSSH'
cd /home/pi/backend
docker compose up -d
echo "✅ Container avviati"
ENDSSH

echo ""
echo "⏳ Step 5: Attendere che i servizi siano pronti (30 secondi)..."
sleep 30

echo ""
echo "🔍 Step 6: Verificare lo stato dei container..."
sshpass -p "$RASPBERRY_PASS" ssh "$RASPBERRY_USER@$RASPBERRY_IP" << 'ENDSSH'
docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'
ENDSSH

echo ""
echo "✅ Step 7: Testare le API spawn..."
echo ""
echo "🏠 Soggiorno:"
curl -s http://192.168.8.10:8001/api/spawn/soggiorno | jq '.'
echo ""
echo "🛏️ Camera:"
curl -s http://192.168.8.10:8001/api/spawn/camera | jq '.'
echo ""
echo "🚿 Bagno:"
curl -s http://192.168.8.10:8001/api/spawn/bagno | jq '.'
echo ""
echo "🍳 Cucina:"
curl -s http://192.168.8.10:8001/api/spawn/cucina | jq '.'

echo ""
echo "=============================================================="
echo "✅ REBUILD COMPLETO RASPBERRY PI TERMINATO"
echo ""
echo "📍 Coordinate Definitive Attese:"
echo "   🏠 Soggiorno: X: 0.54, Z: 1.51, Yaw: 5.39 (309°)"
echo "   🛏️ Camera: X: -0.56, Z: 1.31, Yaw: 0.46 (26°)"
echo "   🚿 Bagno: X: 1.31, Z: 2.77, Yaw: 3.53 (202°)"
echo "   🍳 Cucina: X: -0.94, Z: 2.14, Yaw: 2.48 (142°)"
echo ""
echo "🌐 Testa su: http://192.168.8.10/play/999/soggiorno"
echo "🧹 Ricorda di pulire la cache del browser!"
echo "=============================================================="