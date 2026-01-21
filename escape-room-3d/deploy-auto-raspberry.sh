#!/bin/bash
# 🚀 DEPLOY AUTOMATICO RASPBERRY PI - MAG1 FIX
# Script che fa TUTTO in automatico

set -e  # Interrompi su errore

echo "🚀 =========================================="
echo "   DEPLOY AUTOMATICO RASPBERRY PI"
echo "   Fix MAG1 Soggiorno Auto-Trigger"
echo "=========================================="
echo ""

# Configurazione
RASPBERRY_IP="192.168.8.10"
RASPBERRY_USER="pi"
TAR_FILE="/Users/matteo/Desktop/ESCAPE/escape-room-deploy.tar.gz"
REMOTE_PATH="/home/pi"

# Step 1: Verifica che il file tar.gz esista
if [ ! -f "$TAR_FILE" ]; then
    echo "❌ ERRORE: File $TAR_FILE non trovato!"
    exit 1
fi

echo "✅ File tar.gz trovato: $(ls -lh $TAR_FILE | awk '{print $5}')"
echo ""

# Step 2: Trasferimento file
echo "📦 Step 1/5: Trasferimento file al Raspberry..."
scp "$TAR_FILE" ${RASPBERRY_USER}@${RASPBERRY_IP}:${REMOTE_PATH}/
echo "✅ File trasferito!"
echo ""

# Step 3-7: Esecuzione remota
echo "🔧 Step 2/5: Backup vecchio codice..."
echo "🔧 Step 3/5: Estrazione nuovo codice..."
echo "🔧 Step 4/5: Rebuild Docker (no-cache)..."
echo "🔧 Step 5/5: Avvio container..."
echo ""

ssh ${RASPBERRY_USER}@${RASPBERRY_IP} << 'ENDSSH'
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
echo "🧪 TEST MAG1:"
echo "  1. Vai a: http://192.168.8.10:5000/room/soggiorno/999"
echo "  2. Attiva sensore MAG1 con un magnete"
echo "  3. Il divano dovrebbe ruotare automaticamente!"
echo ""
echo "📊 Verifica logs:"
echo "  ssh pi@192.168.8.10"
echo "  cd /home/pi/escape-room-3d"
echo "  sudo docker compose logs -f"
echo ""
