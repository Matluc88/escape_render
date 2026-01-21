#!/bin/bash

echo "🔄 Riavvio Backend DEV per caricare nuovo endpoint ESP32..."
echo ""

cd "$(dirname "$0")/backend"

# Trova e termina il processo uvicorn sulla porta 8001
echo "🔍 Cerco processi sulla porta 8001..."
PIDS=$(lsof -ti:8001)

if [ ! -z "$PIDS" ]; then
    echo "⚠️  Trovati processi: $PIDS"
    echo "🛑 Termino processi..."
    kill -9 $PIDS
    sleep 2
    echo "✅ Processi terminati"
else
    echo "ℹ️  Nessun processo trovato sulla porta 8001"
fi

echo ""
echo "🚀 Avvio backend DEV..."
echo "   URL: http://0.0.0.0:8001"
echo "   Premi Ctrl+C per fermare"
echo ""

# Avvia uvicorn
python3 -m uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload
