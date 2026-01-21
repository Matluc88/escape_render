#!/bin/bash
# 🚀 DEPLOY FIX WEBSOCKET BAGNO - Raspberry Pi
# Deploy automatico delle modifiche per fix WebSocket doccia

set -e

RASPBERRY_IP="192.168.8.10"
RASPBERRY_USER="pi"
RASPBERRY_PASS="escape"
PROJECT_DIR="/Users/matteo/Desktop/ESCAPE/escape-room-3d"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🚀 DEPLOY FIX WEBSOCKET BAGNO - Raspberry Pi"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# 1. Creazione tarball con file modificati
echo "📦 Step 1/5: Creazione tarball file modificati..."
cd "$PROJECT_DIR"
tar -czf /tmp/websocket-fix.tar.gz \
    src/hooks/useBathroomPuzzle.js \
    src/components/scenes/BathroomScene.jsx

echo "   ✅ Tarball creato: /tmp/websocket-fix.tar.gz"
ls -lh /tmp/websocket-fix.tar.gz

# 2. Trasferimento al Raspberry
echo ""
echo "📤 Step 2/5: Trasferimento al Raspberry Pi..."
sshpass -p "$RASPBERRY_PASS" scp /tmp/websocket-fix.tar.gz ${RASPBERRY_USER}@${RASPBERRY_IP}:/tmp/
echo "   ✅ File trasferito"

# 3. Estrazione e backup sul Raspberry
echo ""
echo "📂 Step 3/5: Estrazione file sul Raspberry..."
sshpass -p "$RASPBERRY_PASS" ssh -o StrictHostKeyChecking=no ${RASPBERRY_USER}@${RASPBERRY_IP} "
    cd /home/pi/escape-room &&
    echo '💾 Backup file esistenti...' &&
    mkdir -p backups &&
    cp src/hooks/useBathroomPuzzle.js backups/useBathroomPuzzle.js.bak.$(date +%Y%m%d_%H%M%S) 2>/dev/null || true &&
    cp src/components/scenes/BathroomScene.jsx backups/BathroomScene.jsx.bak.$(date +%Y%m%d_%H%M%S) 2>/dev/null || true &&
    echo '📦 Estrazione nuovi file...' &&
    tar -xzf /tmp/websocket-fix.tar.gz &&
    echo '   ✅ File estratti'
"

# 4. Rebuild frontend Docker
echo ""
echo "🔨 Step 4/5: Rebuild frontend Docker (ci vorranno ~5-7 minuti)..."
echo "   Questo è necessario per includere le modifiche JavaScript nel bundle"
sshpass -p "$RASPBERRY_PASS" ssh -o StrictHostKeyChecking=no ${RASPBERRY_USER}@${RASPBERRY_IP} "
    cd /home/pi/escape-room &&
    echo '🏗️  Building frontend...' &&
    docker compose build --no-cache frontend
"
echo "   ✅ Build completato"

# 5. Riavvio container
echo ""
echo "♻️  Step 5/5: Riavvio container frontend..."
sshpass -p "$RASPBERRY_PASS" ssh -o StrictHostKeyChecking=no ${RASPBERRY_USER}@${RASPBERRY_IP} "
    cd /home/pi/escape-room &&
    echo '⏹️  Stop container...' &&
    docker compose stop frontend &&
    docker compose rm -f frontend &&
    echo '▶️  Start container...' &&
    docker compose up -d frontend &&
    echo '⏳ Attendo 10 secondi per l avvio...' &&
    sleep 10
"
echo "   ✅ Frontend riavviato"

# 6. Verifica
echo ""
echo "✅ Step 6/6: Verifica deployment..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://${RASPBERRY_IP}/ || echo "000")
if [ "$HTTP_CODE" = "200" ]; then
    echo "   ✅ Frontend risponde correttamente (HTTP $HTTP_CODE)"
else
    echo "   ⚠️  Frontend risponde con HTTP $HTTP_CODE"
    echo "   Controlla i log: ssh pi@${RASPBERRY_IP} 'cd escape-room && docker compose logs frontend'"
fi

# Pulizia
rm /tmp/websocket-fix.tar.gz
sshpass -p "$RASPBERRY_PASS" ssh ${RASPBERRY_USER}@${RASPBERRY_IP} "rm /tmp/websocket-fix.tar.gz"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ DEPLOY COMPLETATO CON SUCCESSO!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🧪 TEST DA FARE:"
echo ""
echo "1. Apri il frontend: http://${RASPBERRY_IP}"
echo ""
echo "2. Vai nella scena Bagno"
echo ""
echo "3. Apri Console (F12) e cerca i log:"
echo "   - '[useBathroomPuzzle] 🔌 Registrazione listener WebSocket'"
echo "   - '[BathroomScene] 🔌 Socket disponibile: true'"
echo ""
echo "4. Fai completare il puzzle dall'ESP32 (PFin=green)"
echo ""
echo "5. Verifica nei log:"
echo "   - '[useBathroomPuzzle] 📡 Ricevuto puzzle_state_update'"
echo "   - '[useBathroomPuzzle] ✅ Aggiornamento bagno ricevuto'"
echo "   - L'anta doccia si chiude automaticamente! 🚿"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📋 File modificati sul Raspberry:"
echo "   - src/hooks/useBathroomPuzzle.js (aggiunto listener WebSocket)"
echo "   - src/components/scenes/BathroomScene.jsx (passaggio socket)"
echo ""
echo "💾 Backup salvati in: /home/pi/escape-room/backups/"
echo ""