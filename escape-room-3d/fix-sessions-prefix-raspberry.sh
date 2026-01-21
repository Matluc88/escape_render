#!/bin/bash

# Fix Router Prefix in sessions.py - Raspberry Pi
# Corregge prefix da "/sessions" a "/api/sessions"

echo "🔧 FIX ROUTER PREFIX /api/sessions"
echo "===================================="
echo ""

# Check directory
if [ ! -d "/home/pi/escape-room-3d" ]; then
    echo "❌ Directory non trovata: /home/pi/escape-room-3d"
    exit 1
fi

cd /home/pi/escape-room-3d || exit 1

echo "📁 Directory: $(pwd)"
echo ""

# Backup sessions.py
echo "💾 Step 1: Backup file sessions.py..."
if [ -f "backend/app/api/sessions.py" ]; then
    cp backend/app/api/sessions.py backend/app/api/sessions.py.backup.$(date +%Y%m%d-%H%M%S)
    echo "✅ Backup creato"
else
    echo "❌ File sessions.py non trovato!"
    exit 1
fi
echo ""

# Mostra configurazione attuale
echo "📋 Configurazione PRIMA:"
grep 'router = APIRouter' backend/app/api/sessions.py
echo ""

# Fix prefix
echo "🔧 Step 2: Fix router prefix..."
sed -i 's|router = APIRouter(prefix="/sessions"|router = APIRouter(prefix="/api/sessions"|g' backend/app/api/sessions.py

if [ $? -eq 0 ]; then
    echo "✅ Prefix aggiornato"
    echo ""
    echo "📋 Configurazione DOPO:"
    grep 'router = APIRouter' backend/app/api/sessions.py
else
    echo "❌ Errore durante l'aggiornamento"
    exit 1
fi
echo ""

# Rebuild backend
echo "🏗️  Step 3: Rebuild backend container..."
echo "  (Questo richiede alcuni minuti...)"
docker compose build --no-cache backend

if [ $? -eq 0 ]; then
    echo "✅ Build completato"
else
    echo "❌ Errore durante il build"
    exit 1
fi
echo ""

# Restart backend
echo "♻️  Step 4: Restart backend..."
docker compose restart backend

if [ $? -eq 0 ]; then
    echo "✅ Backend riavviato"
else
    echo "❌ Errore durante il restart"
    exit 1
fi
echo ""

# Attendi che backend sia pronto
echo "⏳ Step 5: Attendo che backend sia pronto (20 secondi)..."
sleep 20
echo ""

# Test endpoints
echo "🧪 Step 6: Test endpoints..."
echo ""

echo "  Test 1 - Vecchio endpoint /sessions (dovrebbe dare 404):"
OLD_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8001/sessions)
echo "    Status: $OLD_STATUS"
if [ "$OLD_STATUS" = "404" ]; then
    echo "    ✅ Vecchio endpoint rimosso correttamente"
else
    echo "    ⚠️  Vecchio endpoint ancora attivo"
fi
echo ""

echo "  Test 2 - Nuovo endpoint /api/sessions:"
NEW_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8001/api/sessions)
echo "    Status: $NEW_STATUS"
if [ "$NEW_STATUS" = "200" ]; then
    echo "    ✅ Nuovo endpoint funziona!"
else
    echo "    ❌ Nuovo endpoint non funziona ancora"
fi
echo ""

echo "  Test 3 - Attraverso Nginx proxy:"
NGINX_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost/api/sessions)
echo "    Status: $NGINX_STATUS"
if [ "$NGINX_STATUS" = "200" ]; then
    echo "    ✅ Nginx proxy OK!"
else
    echo "    ❌ Nginx proxy non funziona"
fi
echo ""

# Test creazione sessione (POST)
echo "  Test 4 - POST /api/sessions (crea sessione):"
POST_RESPONSE=$(curl -s -X POST -H "Content-Type: application/json" -d '{}' http://localhost/api/sessions)
echo "    Response: $(echo $POST_RESPONSE | cut -c 1-100)..."
if echo "$POST_RESPONSE" | grep -q '"pin"'; then
    echo "    ✅ Creazione sessione funziona!"
else
    echo "    ⚠️  Verifica response manualmente"
fi
echo ""

# Risultato finale
echo "========================================="
if [ "$NEW_STATUS" = "200" ] && [ "$NGINX_STATUS" = "200" ]; then
    echo "✅ FIX COMPLETATO CON SUCCESSO!"
    echo ""
    echo "Il sistema ora funziona correttamente:"
    echo "  - Backend: http://localhost:8001/api/sessions ✅"
    echo "  - Nginx: http://localhost/api/sessions ✅"
    echo "  - Admin: http://192.168.8.10/admin ✅"
    echo ""
    echo "Puoi ora usare l'admin panel per creare sessioni."
else
    echo "⚠️  FIX PARZIALE - Verifica manuale necessaria"
    echo ""
    echo "📋 TROUBLESHOOTING:"
    echo "  1. Verifica logs: docker compose logs backend"
    echo "  2. Verifica file: cat backend/app/api/sessions.py | grep 'router = APIRouter'"
    echo "  3. Pulisci cache browser e riprova"
fi
echo ""