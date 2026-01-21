#!/bin/bash
# 🚀 BUILD SUL MAC + TRANSFER AL RASPBERRY
# Molto più veloce del build sul Raspberry!

set -e

echo "🚀 =========================================="
echo "   BUILD DOCKER SUL MAC → RASPBERRY PI"
echo "   Fix MAG1 Soggiorno Auto-Trigger"
echo "=========================================="
echo ""

# Configurazione
RASPBERRY_IP="192.168.8.10"
RASPBERRY_USER="pi"
PROJECT_DIR="/Users/matteo/Desktop/ESCAPE/escape-room-3d"

cd "$PROJECT_DIR"

# Step 1: Build immagini sul Mac per architettura ARM64
echo "🔨 Step 1/6: Build immagini Docker sul Mac (per ARM64/Raspberry)..."
echo "   ⏱️ Questo può richiedere 3-5 minuti..."
echo ""

# Usa buildx per build multi-architettura
docker buildx build \
  --platform linux/arm64 \
  --tag escape-room-3d-frontend:latest \
  --file Dockerfile \
  --load \
  .

docker buildx build \
  --platform linux/arm64 \
  --tag escape-room-3d-backend:latest \
  --file backend/Dockerfile \
  --load \
  backend/

echo "✅ Build completato!"
echo ""

# Step 2: Salva immagini in file tar
echo "📦 Step 2/6: Salvataggio immagini in file tar..."
docker save escape-room-3d-frontend:latest | gzip > /tmp/frontend-image.tar.gz
docker save escape-room-3d-backend:latest | gzip > /tmp/backend-image.tar.gz
echo "✅ Immagini salvate in /tmp/"
echo ""

# Step 3: Trasferisci tar.gz del codice
echo "📤 Step 3/6: Trasferimento codice al Raspberry..."
scp /Users/matteo/Desktop/ESCAPE/escape-room-deploy.tar.gz ${RASPBERRY_USER}@${RASPBERRY_IP}:/home/pi/
echo "✅ Codice trasferito!"
echo ""

# Step 4: Trasferisci immagini Docker
echo "📤 Step 4/6: Trasferimento immagini Docker al Raspberry..."
echo "   ⏱️ Questo può richiedere 2-3 minuti (260MB)..."
scp /tmp/frontend-image.tar.gz ${RASPBERRY_USER}@${RASPBERRY_IP}:/home/pi/
scp /tmp/backend-image.tar.gz ${RASPBERRY_USER}@${RASPBERRY_IP}:/home/pi/
echo "✅ Immagini trasferite!"
echo ""

# Step 5: Carica immagini e avvia sul Raspberry
echo "🔧 Step 5/6: Caricamento immagini e avvio sul Raspberry..."
echo ""

ssh ${RASPBERRY_USER}@${RASPBERRY_IP} << 'ENDSSH'
set -e

cd /home/pi

# Backup vecchio codice
if [ -d "escape-room-3d" ]; then
    echo "📦 Backup vecchio codice..."
    sudo mv escape-room-3d escape-room-3d-backup-$(date +%Y%m%d-%H%M%S)
fi

# Estrazione codice
echo "📦 Estrazione codice..."
mkdir -p escape-room-3d
tar -xzf escape-room-deploy.tar.gz -C escape-room-3d
cd escape-room-3d

# Stop container vecchi
echo "⏹️  Stop container esistenti..."
sudo docker compose down || true

# Carica immagini Docker (molto più veloce del build!)
echo "📥 Caricamento immagine frontend..."
sudo docker load -i /home/pi/frontend-image.tar.gz

echo "📥 Caricamento immagine backend..."
sudo docker load -i /home/pi/backend-image.tar.gz

# Tag immagini con nome corretto per docker-compose
echo "🏷️  Tag immagini..."
sudo docker tag escape-room-3d-frontend:latest escape-room-3d-frontend:latest
sudo docker tag escape-room-3d-backend:latest escape-room-3d-backend:latest

# Avvio container
echo "▶️  Avvio container..."
sudo docker compose up -d

# Pulizia file tar
echo "🧹 Pulizia file temporanei..."
rm -f /home/pi/frontend-image.tar.gz
rm -f /home/pi/backend-image.tar.gz
rm -f /home/pi/escape-room-deploy.tar.gz

# Attesa container pronti
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

# Step 6: Pulizia locale
echo ""
echo "🧹 Step 6/6: Pulizia file temporanei locali..."
rm -f /tmp/frontend-image.tar.gz
rm -f /tmp/backend-image.tar.gz

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
