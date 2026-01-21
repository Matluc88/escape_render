#!/bin/bash
# Deploy con rebuild FORZATO senza cache Docker
# Questo script garantisce che tutto il codice sia ricompilato

set -e

HOST="pi@192.168.8.10"
REMOTE_DIR="/home/pi/escape-room-3d"
LOCAL_TAR="../escape-room-deploy.tar.gz"

echo "🚀 Deploy con Rebuild FORZATO (NO CACHE)"
echo "========================================"
echo "Host: $HOST"
echo ""

# Verifica che il tar esista
if [ ! -f "$LOCAL_TAR" ]; then
    echo "❌ File $LOCAL_TAR non trovato!"
    echo "Esegui prima: ./prepare-deploy.sh"
    exit 1
fi

echo "📤 Step 1: Trasferimento tar.gz sul Raspberry..."
scp "$LOCAL_TAR" "$HOST:/home/pi/escape-room-deploy.tar.gz"
echo ""
echo "✅ Tar.gz trasferito"
echo ""

echo "📦 Step 2: Backup e estrazione progetto..."
ssh "$HOST" << 'ENDSSH'
cd /home/pi

# Backup se esiste
if [ -d "escape-room-3d" ]; then
    echo "📦 Backup cartella esistente..."
    mv escape-room-3d escape-room-3d.backup-$(date +%Y%m%d-%H%M%S)
fi

# Estrai
mkdir -p escape-room-3d
tar -xzf escape-room-deploy.tar.gz -C escape-room-3d
cd escape-room-3d
ENDSSH
echo ""
echo "✅ Progetto estratto"
echo ""

echo "🐳 Step 3: Rebuild container Docker CON --no-cache..."
ssh "$HOST" << 'ENDSSH'
cd /home/pi/escape-room-3d

echo "⏸️  Stop container..."
docker-compose down

echo "🗑️  Rimuovi immagini vecchie..."
docker-compose rm -f

echo "🔨 Build CON --no-cache (ricompila tutto)..."
docker-compose build --no-cache

echo "🚀 Avvio container..."
docker-compose up -d

echo "⏳ Attendi 10 secondi per startup..."
sleep 10

echo "📊 Status container:"
docker-compose ps
ENDSSH
echo ""
echo "✅ Rebuild completato!"
echo ""

echo "🎉 DEPLOY COMPLETATO CON SUCCESSO!"
echo ""
echo "🌐 Applicazione disponibile su:"
echo "   http://192.168.8.10"
echo ""
echo "📋 Comandi utili:"
echo "   ssh $HOST"
echo "   cd $REMOTE_DIR"
echo "   docker-compose logs -f --tail=50"
echo ""
