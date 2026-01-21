#!/bin/bash

# =====================================================
# Script QUICK per Spegnere Raspberry Pi (senza conferma)
# =====================================================

echo "🔴 SHUTDOWN RASPBERRY PI - QUICK MODE"
echo ""

# Stop Docker se disponibile
if command -v docker &> /dev/null; then
    echo "⏸️  Stopping Docker..."
    docker stop $(docker ps -q) 2>/dev/null
fi

# Sync filesystem
echo "💾 Sync filesystem..."
sync
sync

# Shutdown
echo "🔴 Spegnimento in 3 secondi..."
sleep 3
sudo shutdown -h now