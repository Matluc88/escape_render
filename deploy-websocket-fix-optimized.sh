#!/bin/bash
# 🚀 DEPLOY FIX WEBSOCKET BAGNO - Raspberry Pi (OPTIMIZED)
# Deploy solo dei file modificati + rebuild diretto sul Raspberry

set -e

RASPBERRY_IP="192.168.8.10"
RASPBERRY_USER="pi"
RASPBERRY_PASS="escape"
PROJECT_DIR="/Users/matteo/Desktop/ESCAPE/escape-room-3d"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🚀 DEPLOY FIX WEBSOCKET BAGNO - OTTIMIZZATO"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# 1. Trasferimento file modificati (solo 2 file!)
echo "📤 Step 1/4: Trasferimento file modificati..."
sshpass -p "$RASPBERRY_PASS" scp \
    "$PROJECT_DIR/src/hooks/useBathroomPuzzle.js" \
    ${RASPBERRY_USER}@${RASPBERRY_IP}:/home/pi/escape-room/src/hooks/

sshpass -p "$RASPBERRY_PASS" scp \
    "$PROJECT_DIR/src/components/scenes/BathroomScene.jsx" \
    ${RASPBERRY_USER}@${RASPBERRY_IP}:/home/pi/escape-room/src/components/scenes/

echo "   ✅ File trasferiti (~50KB)"

# 2. Rebuild frontend sul Raspberry
echo ""
echo "🔨 Step 2/4: Rebuild frontend sul Raspberry..."
echo "   (usando cache Docker esistente - ~3-4 minuti)"
sshpass -p "$RASPBERRY_PASS" ssh -o StrictHostKeyChecking=no ${RASPBERRY_USER}@${RASPBERRY_IP} "
    cd /home/pi/escape-room &&
    echo '🏗️  Building frontend...' &&
    docker compose build frontend
"
echo "   ✅ Build completato"

# 3. Riavvio container
echo ""
echo "♻️  Step 3/4: Riavvio container frontend..."
sshpass -p "$RASPBERRY_PASS" ssh -o StrictHostKeyChecking=no ${RASPBERRY_USER}@${RASPBERRY_IP} "
    cd /home/pi/escape-room &&
    echo '⏹️  Stop container...' &&
    docker compose stop frontend &&
    docker compose rm -f frontend &&
    echo '▶️  Start container...' &&
    docker compose up -d frontend &&
    echo '⏳ Attendo 10 secondi per avvio...' &&
    sleep 10
"
echo "   ✅ Frontend riavviato"

# 4. Verifica
echo ""
echo "✅ Step 4/4: Verifica deployment..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://${RASPBERRY_IP}/ || echo "000")
if [ "$HTTP_CODE" = "200" ]; then
    echo "   ✅ Frontend risponde correttamente (HTTP $HTTP_CODE)"
else
    echo "   ⚠️  Frontend risponde con HTTP $HTTP_CODE"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ DEPLOY COMPLETATO!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🧪 TEST DA FARE:"
echo ""
echo "1. Apri: http://${RASPBERRY_IP}/play/SESSION_ID/bagno"
echo ""
echo "2. Console (F12) - verifica log:"
echo "   - '[useBathroomPuzzle] 🔌 Registrazione listener WebSocket'"
echo "   - '[BathroomScene] 🔌 Socket disponibile: true'"
echo ""
echo "3. Completa puzzle dall'ESP32 (PFin=green)"
echo ""
echo "4. Verifica nei log:"
echo "   - '[useBathroomPuzzle] 📡 Ricevuto puzzle_state_update'"
echo "   - L'anta doccia si chiude automaticamente! 🚿"
echo ""
echo "📋 File modificati:"
echo "   - src/hooks/useBathroomPuzzle.js"
echo "   - src/components/scenes/BathroomScene.jsx"
echo ""