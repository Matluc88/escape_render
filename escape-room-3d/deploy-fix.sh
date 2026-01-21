#!/bin/bash

# ========================================
# DEPLOY FIX BACKEND MIGRATIONS
# ========================================
# Trasferisce e esegue lo script di fix sul Raspberry

set -e

PI_HOST="pi@192.168.8.10"
PI_PASSWORD="escape"
SCRIPT_NAME="fix-backend-migrations.sh"

echo "🚀 Deploy Fix Backend Migrations"
echo "================================"
echo ""

# Rendi eseguibile lo script locale
chmod +x "$SCRIPT_NAME"

echo "📤 Trasferimento script su Raspberry..."
sshpass -p "$PI_PASSWORD" scp "$SCRIPT_NAME" "$PI_HOST:~/escape-room-3d/"

echo "✅ Script trasferito"
echo ""

echo "🔧 Esecuzione script sul Raspberry..."
sshpass -p "$PI_PASSWORD" ssh "$PI_HOST" "cd ~/escape-room-3d && chmod +x $SCRIPT_NAME && ./$SCRIPT_NAME"

echo ""
echo "================================"
echo "✅ Deploy completato!"
