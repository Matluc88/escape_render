#!/bin/bash

# Fix Errore 404 su /api/sessions - Raspberry Pi
# Corregge VITE_BACKEND_URL per usare Nginx proxy invece di backend diretto

echo "🔧 FIX ERRORE 404 /api/sessions"
echo "================================"
echo ""

# Check directory
if [ ! -d "/home/pi/escape-room-3d" ]; then
    echo "❌ Directory non trovata: /home/pi/escape-room-3d"
    exit 1
fi

cd /home/pi/escape-room-3d || exit 1

echo "📁 Directory: $(pwd)"
echo ""

# Backup .env
echo "💾 Step 1: Backup file .env..."
if [ -f ".env" ]; then
    cp .env .env.backup.$(date +%Y%m%d-%H%M%S)
    echo "✅ Backup creato: .env.backup.$(date +%Y%m%d-%H%M%S)"
else
    echo "⚠️  File .env non trovato, uso .env.docker come base"
    cp .env.docker .env
fi
echo ""

# Fix VITE_BACKEND_URL
echo "🔧 Step 2: Fix VITE_BACKEND_URL in .env..."
echo "  Prima: $(grep VITE_BACKEND_URL .env || echo 'NON TROVATO')"

# Rimuovi vecchie configurazioni VITE_BACKEND_URL e VITE_API_URL
sed -i '/^VITE_BACKEND_URL=/d' .env
sed -i '/^VITE_API_URL=/d' .env

# Aggiungi la configurazione corretta
echo "" >> .env
echo "# Frontend API Configuration - Fixed for Nginx Proxy" >> .env
echo "VITE_BACKEND_URL=/api" >> .env
echo "VITE_WS_URL=/ws" >> .env

echo "  Dopo: $(grep VITE_BACKEND_URL .env)"
echo "✅ VITE_BACKEND_URL configurato correttamente"
echo ""

# Rebuild frontend con nuova configurazione
echo "🏗️  Step 3: Rebuild frontend container..."
echo "  (Questo richiede alcuni minuti...)"
docker-compose build --no-cache frontend

if [ $? -eq 0 ]; then
    echo "✅ Build completato con successo"
else
    echo "❌ Errore durante il build"
    exit 1
fi
echo ""

# Restart containers
echo "♻️  Step 4: Restart containers..."
docker-compose down
docker-compose up -d

if [ $? -eq 0 ]; then
    echo "✅ Containers riavviati"
else
    echo "❌ Errore durante il restart"
    exit 1
fi
echo ""

# Attendi che i servizi siano pronti
echo "⏳ Step 5: Attendo che i servizi siano pronti (30 secondi)..."
sleep 30
echo ""

# Test endpoint
echo "🧪 Step 6: Test endpoints..."
echo ""

echo "  Test 1 - Backend diretto (http://localhost:8001/api/sessions):"
BACKEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8001/api/sessions)
echo "    Status: $BACKEND_STATUS"
if [ "$BACKEND_STATUS" = "200" ]; then
    echo "    ✅ Backend OK"
else
    echo "    ⚠️  Backend risponde: $BACKEND_STATUS (potrebbe essere normale se non ci sono sessioni)"
fi
echo ""

echo "  Test 2 - Attraverso Nginx (http://localhost/api/sessions):"
NGINX_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost/api/sessions)
echo "    Status: $NGINX_STATUS"
if [ "$NGINX_STATUS" = "200" ]; then
    echo "    ✅ Nginx Proxy OK"
elif [ "$NGINX_STATUS" = "404" ]; then
    echo "    ❌ ERRORE 404 - Proxy non funziona ancora"
else
    echo "    ⚠️  Risposta: $NGINX_STATUS"
fi
echo ""

# Risultato finale
echo "========================================="
if [ "$NGINX_STATUS" = "200" ] || [ "$NGINX_STATUS" = "201" ]; then
    echo "✅ FIX COMPLETATO CON SUCCESSO!"
    echo ""
    echo "L'endpoint /api/sessions ora funziona correttamente."
    echo "Puoi testare l'admin su: http://192.168.8.10/admin"
else
    echo "⚠️  FIX APPLICATO - Verifica manuale necessaria"
    echo ""
    echo "📋 TROUBLESHOOTING:"
    echo "  1. Verifica logs frontend: docker-compose logs frontend"
    echo "  2. Verifica logs backend: docker-compose logs backend"
    echo "  3. Pulisci cache browser (Ctrl+Shift+R)"
    echo "  4. Verifica nginx.conf abbia proxy_pass corretto"
fi
echo ""