#!/bin/bash

# ========================================
# DEPLOY 404 FIX SU RASPBERRY PI
# ========================================
# Deploya il fix dell'errore 404 ESP32 soggiorno

set -e

PI_HOST="pi@192.168.8.10"
PI_PASSWORD="escape"
TAR_FILE="../escape-room-deploy.tar.gz"
REMOTE_DIR="~/escape-room-3d"

echo "🚀 Deploy 404 Fix su Raspberry Pi"
echo "================================"
echo "Host: $PI_HOST"
echo ""

# Verifica che il tar.gz esista
if [ ! -f "$TAR_FILE" ]; then
    echo "❌ Errore: file $TAR_FILE non trovato!"
    exit 1
fi

echo "📤 Step 1: Trasferimento tar.gz sul Raspberry..."
sshpass -p "$PI_PASSWORD" scp "$TAR_FILE" "$PI_HOST":~/
echo "✅ Tar.gz trasferito"
echo ""

echo "📦 Step 2: Backup e estrazione progetto..."
sshpass -p "$PI_PASSWORD" ssh -o StrictHostKeyChecking=no "$PI_HOST" "[ -d escape-room-3d ] && mv escape-room-3d escape-room-3d.backup.\$(date +%Y%m%d-%H%M%S) || echo 'No backup needed'"
sshpass -p "$PI_PASSWORD" ssh -o StrictHostKeyChecking=no "$PI_HOST" "mkdir -p escape-room-3d && cd escape-room-3d && tar -xzf ~/escape-room-deploy.tar.gz"
echo "✅ Progetto estratto"
echo ""

echo "🐳 Step 3: Rebuild container Docker..."
echo "⏸️  Stop container..."
sshpass -p "$PI_PASSWORD" ssh -o StrictHostKeyChecking=no "$PI_HOST" "cd ~/escape-room-3d && docker compose down"
echo "🔨 Build nuovi container..."
sshpass -p "$PI_PASSWORD" ssh -o StrictHostKeyChecking=no "$PI_HOST" "cd ~/escape-room-3d && docker compose build"
echo "🚀 Avvio container..."
sshpass -p "$PI_PASSWORD" ssh -o StrictHostKeyChecking=no "$PI_HOST" "cd ~/escape-room-3d && docker compose up -d"
echo "✅ Container avviati"
echo ""

echo "⏳ Attesa 15 secondi per avvio completo..."
sleep 15
echo ""

echo "✅ Step 4: Verifica backend..."
echo "📊 Status container:"
sshpass -p "$PI_PASSWORD" ssh -o StrictHostKeyChecking=no "$PI_HOST" "cd ~/escape-room-3d && docker compose ps"
echo ""
echo "🔍 Test endpoint /api/sessions/active..."
sshpass -p "$PI_PASSWORD" ssh -o StrictHostKeyChecking=no "$PI_HOST" "curl -s -o /dev/null -w 'HTTP Status: %{http_code}\n' http://localhost:8001/api/sessions/active"

echo ""
echo "================================"
echo "✅ DEPLOY COMPLETATO!"
echo ""
echo "� Prossimi passi:"
echo "   1. Flasha esp32-soggiorno-RASPBERRY-FIXED.ino sull'ESP32"
echo "   2. Testa il sistema"
echo ""
echo "🔗 URL Frontend: http://192.168.8.10"
echo "🔗 URL Backend:  http://192.168.8.10:8001/docs"
