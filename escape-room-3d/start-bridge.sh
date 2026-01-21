#!/bin/bash
# ============================================
# START IPv4 BRIDGE per ESP32
# ============================================

cd "$(dirname "$0")"

echo "🌉 Avvio Bridge IPv4 per ESP32..."

# Controlla se già in esecuzione
if lsof -i :8002 | grep LISTEN > /dev/null 2>&1; then
    echo "⚠️  Bridge già attivo sulla porta 8002!"
    echo ""
    ps aux | grep ipv4-bridge.py | grep -v grep
    echo ""
    echo "✅ Tutto OK - nessuna azione richiesta"
    exit 0
fi

# Avvia bridge in background
python3 ipv4-bridge.py > /dev/null 2>&1 &
BRIDGE_PID=$!

# Aspetta che sia attivo
sleep 2

# Verifica che funzioni
if lsof -i :8002 | grep LISTEN > /dev/null 2>&1; then
    echo "✅ Bridge avviato con successo!"
    echo "   PID: $BRIDGE_PID"
    echo "   Porta: 8002 (IPv4)"
    echo "   Forward: localhost:8001"
    echo ""
    echo "💡 Il bridge rimarrà attivo fino allo spegnimento del Mac"
    echo ""
else
    echo "❌ Errore: Bridge non partito!"
    echo "   Verifica che Python3 sia installato"
    exit 1
fi
