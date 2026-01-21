#!/bin/bash
set -e

echo "🚀 Deploy frontend su Raspberry Pi con nginx..."

# Variabili
RASPBERRY_IP="192.168.8.10"
RASPBERRY_USER="pi"
RASPBERRY_PASS="escape"
REMOTE_DIR="/home/pi/escape-room-3d"

# 1. Trasferisci nginx.conf
echo "📋 Trasferimento nginx.conf..."
sshpass -p "$RASPBERRY_PASS" scp -o StrictHostKeyChecking=no \
    nginx.conf \
    ${RASPBERRY_USER}@${RASPBERRY_IP}:${REMOTE_DIR}/

# 2. Avvia container nginx montando dist e nginx.conf
echo "🐳 Avvio container nginx..."
sshpass -p "$RASPBERRY_PASS" ssh -o StrictHostKeyChecking=no \
    ${RASPBERRY_USER}@${RASPBERRY_IP} << 'ENDSSH'
cd /home/pi/escape-room-3d

# Installa curl nel container per health check
sudo docker run -d \
    --name escape-frontend \
    --network escape-room-3d_escape-network \
    -p 80:80 \
    -v /home/pi/escape-room-3d/dist:/usr/share/nginx/html:ro \
    -v /home/pi/escape-room-3d/nginx.conf:/etc/nginx/nginx.conf:ro \
    --restart unless-stopped \
    --health-cmd="curl -f http://localhost:80/health || exit 1" \
    --health-interval=30s \
    --health-timeout=10s \
    --health-retries=3 \
    --health-start-period=10s \
    nginx:1.25-alpine sh -c "apk add --no-cache curl && nginx -g 'daemon off;'"

echo "✅ Container avviato!"
ENDSSH

echo "🎉 Deploy completato!"
echo ""
echo "📊 Verifica stato:"
sshpass -p "$RASPBERRY_PASS" ssh -o StrictHostKeyChecking=no \
    ${RASPBERRY_USER}@${RASPBERRY_IP} 'sudo docker ps | grep escape-frontend'

echo ""
echo "🌐 Frontend disponibile su: http://192.168.8.10"