#!/bin/bash

# Script per deployare il frontend fixato sul Raspberry Pi
# Risolve il problema del double prefix /api/api/

set -e

echo "🚀 Deploy Frontend Fix - Raspberry Pi"
echo "======================================"
echo ""

# Configurazione
RASPBERRY_IP="192.168.8.10"
RASPBERRY_USER="pi"
RASPBERRY_PASSWORD="escape"
RASPBERRY_PROJECT_DIR="/home/pi/escape-room-3d"
LOCAL_DIST_DIR="./dist"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Verifica se sshpass è installato
if ! command -v sshpass &> /dev/null; then
    echo "⚠️  sshpass non trovato. Installazione in corso..."
    brew install hudochenkov/sshpass/sshpass 2>/dev/null || {
        echo "❌ Impossibile installare sshpass automaticamente"
        echo "📋 Installa manualmente con: brew install hudochenkov/sshpass/sshpass"
        echo "   Oppure usa: brew install esolitos/ipa/sshpass"
        exit 1
    }
    echo "✅ sshpass installato"
fi

echo "📦 Step 1/5: Creazione tarball del frontend..."
cd "$(dirname "$0")"
tar -czf frontend-dist-${TIMESTAMP}.tar.gz -C "${LOCAL_DIST_DIR}" .
echo "✅ Tarball creato: frontend-dist-${TIMESTAMP}.tar.gz"
echo ""

echo "📤 Step 2/5: Trasferimento al Raspberry Pi..."
sshpass -p "${RASPBERRY_PASSWORD}" scp -o StrictHostKeyChecking=no frontend-dist-${TIMESTAMP}.tar.gz ${RASPBERRY_USER}@${RASPBERRY_IP}:/tmp/
echo "✅ File trasferito"
echo ""

echo "🔧 Step 3/5: Backup del frontend esistente ed estrazione..."
sshpass -p "${RASPBERRY_PASSWORD}" ssh -o StrictHostKeyChecking=no ${RASPBERRY_USER}@${RASPBERRY_IP} "bash -s" << ENDSSH
set -e
cd /home/pi/escape-room-3d

# Backup del dist esistente
if [ -d "dist" ]; then
    echo "   - Backup del frontend esistente..."
    sudo mv dist dist.backup.\$(date +%Y%m%d_%H%M%S)
fi

# Crea nuova directory dist
echo "   - Creazione directory dist..."
sudo mkdir -p dist

# Estrai il nuovo frontend
echo "   - Estrazione nuovo frontend..."
sudo tar -xzf /tmp/frontend-dist-${TIMESTAMP}.tar.gz -C dist/

# Cleanup
rm /tmp/frontend-dist-${TIMESTAMP}.tar.gz

echo "   ✅ Frontend estratto con successo"
ENDSSH
echo ""

echo "🐳 Step 4/5: Rebuild del container frontend..."
sshpass -p "${RASPBERRY_PASSWORD}" ssh -o StrictHostKeyChecking=no ${RASPBERRY_USER}@${RASPBERRY_IP} << 'ENDSSH'
set -e
cd /home/pi/escape-room-3d

echo "   - Stop del container frontend..."
sudo docker compose stop frontend

echo "   - Rebuild del container..."
sudo docker compose build --no-cache frontend

echo "   ✅ Container rebuilded"
ENDSSH
echo ""

echo "🔄 Step 5/5: Restart dei servizi..."
sshpass -p "${RASPBERRY_PASSWORD}" ssh -o StrictHostKeyChecking=no ${RASPBERRY_USER}@${RASPBERRY_IP} << 'ENDSSH'
set -e
cd /home/pi/escape-room-3d

echo "   - Restart di tutti i servizi..."
sudo docker compose up -d

echo "   - Attesa avvio servizi (10 secondi)..."
sleep 10

echo "   - Verifica status containers..."
sudo docker compose ps

echo ""
echo "   ✅ Servizi riavviati"
ENDSSH

# Cleanup locale
rm frontend-dist-${TIMESTAMP}.tar.gz

echo ""
echo "✅ DEPLOY COMPLETATO CON SUCCESSO!"
echo ""
echo "🔍 Verifica deployment:"
echo "   - Admin Panel: http://192.168.8.10/"
echo "   - Test API: http://192.168.8.10/api/sessions"
echo ""
echo "📋 Comandi utili per monitoring:"
echo "   ssh pi@192.168.8.10 'cd /home/pi/escape-room-3d && sudo docker-compose logs -f --tail=50 frontend'"
echo "   ssh pi@192.168.8.10 'cd /home/pi/escape-room-3d && sudo docker-compose logs -f --tail=50 backend'"
echo ""