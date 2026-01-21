#!/bin/bash
# 🚀 DEPLOY AUTOMATICO RASPBERRY PI - VETRATA FIX
# Deploy con rimozione click handler vetrata soggiorno

set -e  # Interrompi su errore

echo "🚀 =========================================="
echo "   DEPLOY AUTOMATICO RASPBERRY PI"
echo "   Fix Vetrata Soggiorno - Rimozione Click"
echo "=========================================="
echo ""

# Configurazione
RASPBERRY_IP="192.168.8.10"
RASPBERRY_USER="pi"
RASPBERRY_PASSWORD="escape"
TAR_FILE="/Users/matteo/Desktop/ESCAPE/escape-room-deploy.tar.gz"
REMOTE_PATH="/home/pi"

# Verifica sshpass
if ! command -v sshpass &> /dev/null; then
    echo "❌ ERRORE: sshpass non installato!"
    echo "📦 Installa con: brew install sshpass"
    exit 1
fi

# Step 1: Verifica che il file tar.gz esista
if [ ! -f "$TAR_FILE" ]; then
    echo "❌ ERRORE: File $TAR_FILE non trovato!"
    exit 1
fi

echo "✅ File tar.gz trovato: $(ls -lh $TAR_FILE | awk '{print $5}')"
echo ""

# Step 2: Trasferimento file
echo "📦 Step 1/5: Trasferimento file al Raspberry (1.2GB - può richiedere 2-3 min)..."
sshpass -p "$RASPBERRY_PASSWORD" scp "$TAR_FILE" ${RASPBERRY_USER}@${RASPBERRY_IP}:${REMOTE_PATH}/
echo "✅ File trasferito!"
echo ""

# Step 3-7: Esecuzione remota
echo "🔧 Step 2/5: Backup vecchio codice..."
echo "🔧 Step 3/5: Estrazione nuovo codice..."
echo "🔧 Step 4/5: Rebuild Docker (no-cache - può richiedere 5-10 min)..."
echo "🔧 Step 5/5: Avvio container..."
echo ""

sshpass -p "$RASPBERRY_PASSWORD" ssh ${RASPBERRY_USER}@${RASPBERRY_IP} << 'ENDSSH'
set -e

cd /home/pi

# Backup vecchio codice
if [ -d "escape-room-3d" ]; then
    echo "📦 Backup vecchio codice..."
    sudo mv escape-room-3d escape-room-3d-backup-$(date +%Y%m%d-%H%M%S)
fi

# Estrazione
echo "📦 Estrazione nuovo codice..."
mkdir -p escape-room-3d
tar -xzf escape-room-deploy.tar.gz -C escape-room-3d
cd escape-room-3d

# Stop container
echo "⏹️  Stop container esistenti..."
sudo docker compose down || true

# Rebuild SENZA cache
echo "🔨 Rebuild Docker (SENZA cache - può richiedere 5-10 min)..."
sudo docker compose build --no-cache

# Avvio
echo "▶️  Avvio container..."
sudo docker compose up -d

# Attendi che i container siano pronti
echo "⏳ Attendo che i container siano pronti..."
sleep 10

# Verifica stato
echo ""
echo "📊 Stato container:"
sudo docker compose ps

echo ""
echo "✅ DEPLOY COMPLETATO!"
echo ""
echo "📝 Log ultimi 30 righe backend:"
sudo docker compose logs backend --tail=30

ENDSSH

echo ""
echo "=========================================="
echo "🎉 DEPLOY COMPLETATO CON SUCCESSO!"
echo "=========================================="
echo ""
echo "🧪 VERIFICA FIX VETRATA:"
echo "  1. Vai a: http://192.168.8.10/room/soggiorno/999"
echo "  2. Prova a cliccare sulla vetrata"
echo "  3. La vetrata NON dovrebbe più essere cliccabile!"
echo ""
echo "📊 Verifica logs:"
echo "  ssh pi@192.168.8.10"
echo "  cd /home/pi/escape-room-3d"
echo "  sudo docker compose logs -f"
echo ""