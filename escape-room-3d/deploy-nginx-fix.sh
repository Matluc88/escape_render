#!/bin/bash

# Deploy Nginx API Proxy Fix al Raspberry Pi
# Fix per errore 404 su POST /api/sessions

echo "🔧 Deploy Nginx API Proxy Fix al Raspberry Pi"
echo "=============================================="
echo ""

# Configurazione
RASPBERRY_USER="pi"
RASPBERRY_IP="192.168.8.10"
REMOTE_PATH="/home/pi/escape-room"

echo "📦 Step 1: Build nuovo container frontend con nginx fix..."
docker-compose build --no-cache frontend

if [ $? -ne 0 ]; then
    echo "❌ Errore durante il build del frontend"
    exit 1
fi

echo "✅ Build completato"
echo ""

echo "💾 Step 2: Salvataggio immagine..."
docker save escape-room-3d-frontend:latest | gzip > /tmp/escape-frontend-nginx-fix.tar.gz

if [ $? -ne 0 ]; then
    echo "❌ Errore durante il salvataggio dell'immagine"
    exit 1
fi

echo "✅ Immagine salvata"
echo ""

echo "📤 Step 3: Trasferimento al Raspberry Pi..."
scp /tmp/escape-frontend-nginx-fix.tar.gz ${RASPBERRY_USER}@${RASPBERRY_IP}:/tmp/

if [ $? -ne 0 ]; then
    echo "❌ Errore durante il trasferimento"
    rm /tmp/escape-frontend-nginx-fix.tar.gz
    exit 1
fi

echo "✅ Trasferimento completato"
echo ""

echo "🔄 Step 4: Caricamento immagine sul Raspberry..."
ssh ${RASPBERRY_USER}@${RASPBERRY_IP} << 'ENDSSH'
cd /tmp
echo "Caricamento immagine Docker..."
gunzip -c escape-frontend-nginx-fix.tar.gz | docker load
if [ $? -eq 0 ]; then
    echo "✅ Immagine caricata con successo"
    rm escape-frontend-nginx-fix.tar.gz
else
    echo "❌ Errore durante il caricamento"
    exit 1
fi
ENDSSH

if [ $? -ne 0 ]; then
    echo "❌ Errore durante il caricamento dell'immagine"
    exit 1
fi

echo ""
echo "♻️  Step 5: Restart container frontend..."
ssh ${RASPBERRY_USER}@${RASPBERRY_IP} "cd ${REMOTE_PATH} && docker-compose restart frontend"

if [ $? -ne 0 ]; then
    echo "❌ Errore durante il restart"
    exit 1
fi

echo "✅ Container riavviato"
echo ""

# Cleanup locale
rm /tmp/escape-frontend-nginx-fix.tar.gz

echo "✅ DEPLOY COMPLETATO!"
echo ""
echo "🧪 Verifica:"
echo "curl -X POST http://192.168.8.10/api/sessions -H 'Content-Type: application/json' -d '{}'"
echo ""
echo "Dovrebbe rispondere con 201 Created invece di 404"
