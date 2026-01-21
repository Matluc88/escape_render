#!/bin/bash

# Script di diagnostica per Raspberry Pi
# Verifica configurazione e logs per errore 404 su /api/sessions

echo "🔍 DIAGNOSTICA RASPBERRY PI - Errore 404 /api/sessions"
echo "========================================================"
echo ""

# Check se siamo nella directory corretta
if [ ! -d "/home/pi/escape-room-3d" ]; then
    echo "❌ Directory non trovata: /home/pi/escape-room-3d"
    exit 1
fi

cd /home/pi/escape-room-3d || exit 1

echo "📁 Directory: $(pwd)"
echo ""

# 1. Verifica file .env
echo "1️⃣  Configurazione .env"
echo "========================"
if [ -f ".env" ]; then
    echo "File .env trovato:"
    echo ""
    grep -E "VITE_BACKEND_URL|VITE_API_URL|VITE_WS_URL|CORS_ORIGINS" .env | while read line; do
        echo "  $line"
    done
else
    echo "⚠️  File .env NON trovato!"
fi
echo ""

# 2. Verifica stato containers
echo "2️⃣  Stato Docker Containers"
echo "============================"
docker-compose ps
echo ""

# 3. Logs frontend (ultimi 30 righe)
echo "3️⃣  Logs Frontend (ultimi 30 righe)"
echo "====================================="
docker-compose logs --tail=30 frontend
echo ""

# 4. Logs backend (ultimi 30 righe)
echo "4️⃣  Logs Backend (ultimi 30 righe)"
echo "===================================="
docker-compose logs --tail=30 backend
echo ""

# 5. Test endpoint diretto backend
echo "5️⃣  Test Endpoint Backend Diretto"
echo "=================================="
echo "Test: curl http://localhost:8001/api/sessions"
curl -s -o /dev/null -w "Status: %{http_code}\n" http://localhost:8001/api/sessions 2>&1
echo ""

# 6. Test endpoint attraverso Nginx
echo "6️⃣  Test Endpoint Attraverso Nginx"
echo "==================================="
echo "Test: curl http://localhost/api/sessions"
curl -s -o /dev/null -w "Status: %{http_code}\n" http://localhost/api/sessions 2>&1
echo ""

# 7. Verifica nginx.conf
echo "7️⃣  Configurazione Nginx (location /api/)"
echo "=========================================="
if [ -f "nginx.conf" ]; then
    echo "Proxy pass configurato:"
    grep -A 2 "location /api/" nginx.conf | grep proxy_pass
else
    echo "⚠️  nginx.conf NON trovato!"
fi
echo ""

echo "✅ DIAGNOSTICA COMPLETATA"
echo ""
echo "📊 RIEPILOGO:"
echo "  - Verifica VITE_BACKEND_URL in .env (deve essere '/api' o relativo)"
echo "  - Verifica che backend risponda su porta 8001"
echo "  - Verifica che nginx proxy correttamente a backend"
echo ""