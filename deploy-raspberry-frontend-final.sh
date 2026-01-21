#!/bin/bash
# Deploy Frontend Final al Raspberry Pi

set -e

RASPBERRY_IP="192.168.8.10"
RASPBERRY_USER="pi"
RASPBERRY_PASS="escape"
IMAGE_FILE="/Users/matteo/Desktop/escape-room-frontend-final.tar.gz"

echo "🚀 Deploy Frontend Final al Raspberry Pi"
echo "=========================================="
echo ""

# 1. Trasferimento immagine
echo "📦 Step 1/3: Trasferimento immagine frontend..."
sshpass -p "$RASPBERRY_PASS" scp "$IMAGE_FILE" ${RASPBERRY_USER}@${RASPBERRY_IP}:/tmp/frontend-final.tar.gz
echo "   ✅ Immagine trasferita"

# 2. Caricamento e riavvio
echo ""
echo "🐳 Step 2/3: Caricamento immagine e riavvio frontend..."
sshpass -p "$RASPBERRY_PASS" ssh -o StrictHostKeyChecking=no ${RASPBERRY_USER}@${RASPBERRY_IP} "
    cd /home/pi/escape-room-3d && \
    echo '📥 Loading Docker image...' && \
    docker load < /tmp/frontend-final.tar.gz && \
    echo '🔄 Riavvio frontend...' && \
    docker compose stop frontend && \
    docker compose rm -f frontend && \
    docker compose up -d frontend && \
    echo '⏳ Aspetto 10 secondi...' && \
    sleep 10 && \
    echo '   ✅ Frontend riavviato'
"

# 3. Test
echo ""
echo "✅ Step 3/3: Test frontend..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://192.168.8.10/)
if [ "$HTTP_CODE" = "200" ]; then
    echo "   ✅ Frontend risponde correttamente (HTTP $HTTP_CODE)"
else
    echo "   ⚠️  Frontend risponde con HTTP $HTTP_CODE"
fi

# Pulizia
sshpass -p "$RASPBERRY_PASS" ssh -o StrictHostKeyChecking=no ${RASPBERRY_USER}@${RASPBERRY_IP} "rm /tmp/frontend-final.tar.gz"

echo ""
echo "🎉 Deploy frontend completato!"
echo ""
echo "🌐 Accedi al frontend su: http://192.168.8.10"
echo ""