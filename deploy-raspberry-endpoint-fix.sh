#!/bin/bash
# Deploy Backend Endpoint Fix al Raspberry Pi

set -e

RASPBERRY_IP="192.168.8.10"
RASPBERRY_USER="pi"
RASPBERRY_PASS="escape"
IMAGE_FILE="/Users/matteo/Desktop/escape-room-backend-endpoint-fix.tar.gz"

echo "🚀 Deploy Backend Endpoint Fix al Raspberry Pi"
echo "=============================================="
echo ""

# 1. Trasferimento immagine
echo "📦 Trasferimento immagine al Raspberry Pi..."
sshpass -p "$RASPBERRY_PASS" scp "$IMAGE_FILE" ${RASPBERRY_USER}@${RASPBERRY_IP}:/tmp/backend-fix.tar.gz

# 2. Caricamento immagine e restart
echo "🐳 Caricamento immagine Docker sul Raspberry..."
sshpass -p "$RASPBERRY_PASS" ssh -o StrictHostKeyChecking=no ${RASPBERRY_USER}@${RASPBERRY_IP} "
    cd /home/pi/escape-room-3d && \
    echo '📥 Loading Docker image...' && \
    docker load < /tmp/backend-fix.tar.gz && \
    echo '🔄 Riavvio backend container...' && \
    docker compose stop backend && \
    docker compose rm -f backend && \
    docker compose up -d backend && \
    echo '⏳ Aspetto 25 secondi per l'\''avvio...' && \
    sleep 25 && \
    echo '' && \
    echo '✅ Testing endpoint...' && \
    echo '=== Test 1: door-leds ===' && \
    curl -s http://localhost:8001/api/game-completion/door-leds && \
    echo '' && \
    echo '=== Test 2: door-servo-status ===' && \
    curl -s http://localhost:8001/api/sessions/1000/livingroom-puzzles/door-servo-status && \
    echo '' && \
    echo '=== Test 3: fan-status ===' && \
    curl -s http://localhost:8001/api/sessions/1000/livingroom-puzzles/fan-status && \
    echo '' && \
    echo '🧹 Pulizia...' && \
    rm /tmp/backend-fix.tar.gz && \
    echo '' && \
    echo '✅ Deploy completato!'
"

echo ""
echo "🎉 Deploy completato con successo!"
echo ""
echo "📝 Per testare da remoto:"
echo "  curl http://192.168.8.10:8001/api/game-completion/door-leds"
echo "  curl http://192.168.8.10:8001/api/sessions/1000/livingroom-puzzles/door-servo-status"
echo "  curl http://192.168.8.10:8001/api/sessions/1000/livingroom-puzzles/fan-status"