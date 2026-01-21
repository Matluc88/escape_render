#!/bin/bash

# =====================================================
# Script QUICK per Spegnere Raspberry Pi da Mac
# =====================================================

echo "🔴 SHUTDOWN RASPBERRY PI - QUICK MODE (da Mac)"
echo ""

# Configurazione
RASPBERRY_IP="192.168.8.10"
RASPBERRY_USER="escape"
RASPBERRY_PASSWORD="escape"

# Verifica sshpass
if ! command -v sshpass &> /dev/null; then
    echo "❌ ERRORE: sshpass non installato!"
    echo "Installa con: brew install hudochenkov/sshpass/sshpass"
    exit 1
fi

echo "⏸️  Stopping Docker..."
sshpass -p "$RASPBERRY_PASSWORD" ssh -o StrictHostKeyChecking=no "$RASPBERRY_USER@$RASPBERRY_IP" \
    "docker stop \$(docker ps -q) 2>/dev/null" 2>/dev/null

echo "💾 Sync filesystem..."
sshpass -p "$RASPBERRY_PASSWORD" ssh -o StrictHostKeyChecking=no "$RASPBERRY_USER@$RASPBERRY_IP" \
    "sync && sync"

echo "🔴 Spegnimento Raspberry Pi..."
sshpass -p "$RASPBERRY_PASSWORD" ssh -o StrictHostKeyChecking=no "$RASPBERRY_USER@$RASPBERRY_IP" \
    "sudo shutdown -h now" 2>/dev/null

echo ""
echo "✅ Comando inviato! Raspberry Pi in spegnimento..."