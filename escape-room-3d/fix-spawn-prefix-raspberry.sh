#!/bin/bash

# Script per fixare il prefix del router spawn su Raspberry Pi
# Cambia prefix="/spawn" in prefix="/api/spawn" per coerenza con nginx

echo "🔧 Fix Spawn Router Prefix su Raspberry Pi"
echo "=========================================="

RASPBERRY_IP="192.168.8.10"
RASPBERRY_USER="pi"
RASPBERRY_PASSWORD="escape"
PROJECT_DIR="/home/pi/escape-room-3d"

echo ""
echo "📝 Step 1: Backup del file originale..."
sshpass -p "$RASPBERRY_PASSWORD" ssh -o StrictHostKeyChecking=no ${RASPBERRY_USER}@${RASPBERRY_IP} \
  "sudo cp ${PROJECT_DIR}/backend/app/api/spawn.py ${PROJECT_DIR}/backend/app/api/spawn.py.backup-$(date +%Y%m%d_%H%M%S)"

if [ $? -eq 0 ]; then
    echo "   ✅ Backup creato"
else
    echo "   ❌ Errore nel backup"
    exit 1
fi

echo ""
echo "📝 Step 2: Applico fix al router prefix..."
sshpass -p "$RASPBERRY_PASSWORD" ssh -o StrictHostKeyChecking=no ${RASPBERRY_USER}@${RASPBERRY_IP} \
  "sudo sed -i 's|router = APIRouter(prefix=\"/spawn\", tags=\[\"spawn\"\])|router = APIRouter(prefix=\"/api/spawn\", tags=[\"spawn\"])|g' ${PROJECT_DIR}/backend/app/api/spawn.py"

if [ $? -eq 0 ]; then
    echo "   ✅ Fix applicato"
else
    echo "   ❌ Errore nell'applicazione del fix"
    exit 1
fi

echo ""
echo "📝 Step 3: Verifico la modifica..."
sshpass -p "$RASPBERRY_PASSWORD" ssh -o StrictHostKeyChecking=no ${RASPBERRY_USER}@${RASPBERRY_IP} \
  "sudo grep 'prefix=\"/api/spawn\"' ${PROJECT_DIR}/backend/app/api/spawn.py"

if [ $? -eq 0 ]; then
    echo "   ✅ Verifica OK - prefix corretto"
else
    echo "   ⚠️  Attenzione: verifica fallita"
fi

echo ""
echo "🔄 Step 4: Rebuild del backend container..."
sshpass -p "$RASPBERRY_PASSWORD" ssh -o StrictHostKeyChecking=no ${RASPBERRY_USER}@${RASPBERRY_IP} \
  "cd ${PROJECT_DIR} && sudo docker compose up -d --build --force-recreate backend"

if [ $? -eq 0 ]; then
    echo "   ✅ Backend rebuild completato"
else
    echo "   ❌ Errore nel rebuild"
    exit 1
fi

echo ""
echo "⏳ Step 5: Attendo avvio backend (15 secondi)..."
sleep 15

echo ""
echo "🏥 Step 6: Verifico stato containers..."
sshpass -p "$RASPBERRY_PASSWORD" ssh -o StrictHostKeyChecking=no ${RASPBERRY_USER}@${RASPBERRY_IP} \
  "cd ${PROJECT_DIR} && sudo docker compose ps"

echo ""
echo "✅ Fix spawn router completato!"
echo ""
echo "📋 Test manuale suggerito:"
echo "   curl http://192.168.8.10:8001/api/spawn/soggiorno"
echo ""
echo "🌐 Oppure ricarica la pagina del soggiorno nel browser"
echo ""