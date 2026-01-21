#!/bin/bash

# Script per trasferire i fix dei file sorgente sul Raspberry Pi
# Questo è necessario perché il Docker build ricompila dai sorgenti

set -e

echo "🔄 Transfer Source Fixes to Raspberry Pi"
echo "========================================="
echo ""

# Configurazione
RASPBERRY_IP="192.168.8.10"
RASPBERRY_USER="pi"
RASPBERRY_PASSWORD="escape"
RASPBERRY_PROJECT_DIR="/home/pi/escape-room-3d"

echo "📤 Step 1/2: Trasferimento file sorgente modificati..."

# Lista dei file da trasferire
FILES=(
    "src/hooks/useKitchenPuzzle.js"
    "src/hooks/useLivingRoomPuzzle.js"
    "src/hooks/useBedroomPuzzle.js"
    "src/hooks/useBathroomPuzzle.js"
    "src/hooks/useGameCompletion.js"
    "src/utils/api.js"
)

# Trasferisci in /tmp prima
for file in "${FILES[@]}"; do
    echo "   - Trasferimento: $file → /tmp/"
    sshpass -p "${RASPBERRY_PASSWORD}" scp -o StrictHostKeyChecking=no "$file" ${RASPBERRY_USER}@${RASPBERRY_IP}:/tmp/$(basename "$file")
done

echo "✅ File trasferiti in /tmp"
echo ""

echo "📋 Step 1.5/2: Spostamento file nella directory progetto..."
sshpass -p "${RASPBERRY_PASSWORD}" ssh -o StrictHostKeyChecking=no ${RASPBERRY_USER}@${RASPBERRY_IP} << 'ENDSSH2'
set -e
cd /home/pi/escape-room-3d

echo "   - Spostamento file con sudo..."
sudo cp /tmp/useKitchenPuzzle.js src/hooks/
sudo cp /tmp/useLivingRoomPuzzle.js src/hooks/
sudo cp /tmp/useBedroomPuzzle.js src/hooks/
sudo cp /tmp/useBathroomPuzzle.js src/hooks/
sudo cp /tmp/useGameCompletion.js src/hooks/
sudo cp /tmp/api.js src/utils/

echo "   - Cleanup /tmp..."
rm /tmp/useKitchenPuzzle.js /tmp/useLivingRoomPuzzle.js /tmp/useBedroomPuzzle.js /tmp/useBathroomPuzzle.js /tmp/useGameCompletion.js /tmp/api.js

echo "   ✅ File spostati nella directory progetto"
ENDSSH2
echo ""

echo "🐳 Step 2/2: Rebuild del container frontend..."
sshpass -p "${RASPBERRY_PASSWORD}" ssh -o StrictHostKeyChecking=no ${RASPBERRY_USER}@${RASPBERRY_IP} << 'ENDSSH'
set -e
cd /home/pi/escape-room-3d

echo "   - Stop container frontend..."
sudo docker compose stop frontend

echo "   - Rebuild container (con nuovi sorgenti)..."
sudo docker compose build --no-cache frontend

echo "   - Restart container..."
sudo docker compose up -d frontend

echo "   - Attesa 10 secondi..."
sleep 10

echo "   - Verifica status..."
sudo docker compose ps frontend

echo ""
echo "   ✅ Frontend rebuilded con i fix!"
ENDSSH

echo ""
echo "✅ TRASFERIMENTO E REBUILD COMPLETATO!"
echo ""
echo "🔍 Verifica nel browser:"
echo "   1. Apri DevTools (F12)"
echo "   2. Vai su Network > Disable cache"
echo "   3. Ricarica con Ctrl+Shift+R (hard refresh)"
echo "   4. Verifica che gli URL non abbiano più /api/api/"
echo ""
echo "   URL da testare: http://192.168.8.10/"
echo ""