#!/bin/bash

# 🚨 ROLLBACK URGENTE - Ripristina versione precedente sul Raspberry Pi
# Uso: ./rollback-raspberry.sh

set -e

RASPBERRY_IP="192.168.8.10"
RASPBERRY_USER="pi"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)

echo "🚨 =========================================="
echo "🚨  ROLLBACK URGENTE - RASPBERRY PI"
echo "🚨 =========================================="
echo ""

# Verifica connessione SSH
echo "📡 Verifica connessione al Raspberry..."
if ! ssh -o ConnectTimeout=5 ${RASPBERRY_USER}@${RASPBERRY_IP} "echo 'Connected'" > /dev/null 2>&1; then
    echo "❌ ERRORE: Impossibile connettersi al Raspberry Pi"
    echo "   Verifica che sia acceso e raggiungibile"
    exit 1
fi
echo "✅ Connessione OK"
echo ""

# Esegui rollback sul Raspberry
echo "🔄 Esecuzione rollback sul Raspberry..."
ssh ${RASPBERRY_USER}@${RASPBERRY_IP} << 'ENDSSH'
set -e

cd /home/pi

echo "1️⃣  Stop container correnti..."
cd escape-room-3d
sudo docker compose down
cd ..

echo "2️⃣  Backup versione broken..."
if [ -d "escape-room-3d-BROKEN" ]; then
    echo "   ⚠️  Versione broken già presente, la rimuovo..."
    sudo rm -rf escape-room-3d-BROKEN
fi
sudo mv escape-room-3d escape-room-3d-BROKEN

echo "3️⃣  Ricerca backup precedente..."
BACKUP_DIR=$(ls -td escape-room-3d-backup-* 2>/dev/null | head -1 || echo "")

if [ -z "$BACKUP_DIR" ]; then
    echo "❌ ERRORE: Nessun backup trovato!"
    echo "   Directory cercate: escape-room-3d-backup-*"
    
    # Ripristina la versione broken
    echo "   🔄 Ripristino versione broken..."
    sudo mv escape-room-3d-BROKEN escape-room-3d
    cd escape-room-3d
    sudo docker compose up -d
    
    exit 1
fi

echo "   ✅ Backup trovato: $BACKUP_DIR"

echo "4️⃣  Ripristino backup..."
sudo cp -r "$BACKUP_DIR" escape-room-3d

echo "5️⃣  Avvio container..."
cd escape-room-3d
sudo docker compose up -d

echo ""
echo "⏳ Attendo 10 secondi per avvio servizi..."
sleep 10

echo "6️⃣  Verifica stato servizi..."
sudo docker compose ps

echo ""
echo "✅ ROLLBACK COMPLETATO!"
echo ""
echo "📊 Riepilogo:"
echo "   - Versione broken: ~/escape-room-3d-BROKEN"
echo "   - Versione attiva: ~/escape-room-3d (ripristinata da $BACKUP_DIR)"
echo ""

ENDSSH

echo ""
echo "🎉 =========================================="
echo "🎉  ROLLBACK COMPLETATO CON SUCCESSO!"
echo "🎉 =========================================="
echo ""
echo "🔍 Verifica funzionamento:"
echo "   http://192.168.8.10:5000"
echo ""
echo "📝 Log backend (se serve):"
echo "   ssh pi@192.168.8.10"
echo "   cd /home/pi/escape-room-3d"
echo "   sudo docker compose logs -f"
echo ""
