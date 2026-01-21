#!/bin/bash
# 🚀 DEPLOY DOOR-LEDS ENDPOINT FIX SU RASPBERRY PI
# Fix endpoint /api/game-completion/door-leds mancante

set -e  # Interrompi su errore

echo "🚀 =========================================="
echo "   DEPLOY DOOR-LEDS ENDPOINT FIX"
echo "   Backend con endpoint game-completion"
echo "=========================================="
echo ""

# Configurazione
RASPBERRY_IP="192.168.8.10"
RASPBERRY_USER="pi"
TAR_FILE="/Users/matteo/Desktop/ESCAPE/escape-room-deploy-doorleds-fix.tar.gz"
REMOTE_PATH="/home/pi"

# Step 1: Verifica che il file tar.gz esista
echo "📦 Verifica pacchetto..."
if [ ! -f "$TAR_FILE" ]; then
    echo "❌ ERRORE: File $TAR_FILE non trovato!"
    exit 1
fi

FILE_SIZE=$(ls -lh "$TAR_FILE" | awk '{print $5}')
echo "✅ Pacchetto pronto: $FILE_SIZE"
echo ""

# Step 2: Test connessione Raspberry
echo "🔌 Test connessione Raspberry..."
if ! ping -c 1 $RASPBERRY_IP >/dev/null 2>&1; then
    echo "❌ ERRORE: Raspberry Pi non raggiungibile su $RASPBERRY_IP"
    exit 1
fi
echo "✅ Raspberry raggiungibile"
echo ""

# Step 3: Verifica backend attuale
echo "🔍 Verifica stato backend attuale..."
CURRENT_STATUS=$(curl -s http://${RASPBERRY_IP}:8001/ | grep -o '"status":"[^"]*"' || echo "non raggiungibile")
echo "   Stato: $CURRENT_STATUS"

# Test endpoint door-leds (dovrebbe essere 404)
DOOR_LEDS_TEST=$(curl -s -o /dev/null -w "%{http_code}" http://${RASPBERRY_IP}:8001/api/game-completion/door-leds)
if [ "$DOOR_LEDS_TEST" == "404" ]; then
    echo "   ❌ Endpoint door-leds: 404 (NON PRESENTE - da fixare!)"
elif [ "$DOOR_LEDS_TEST" == "200" ]; then
    echo "   ✅ Endpoint door-leds: 200 (GIÀ PRESENTE)"
    echo ""
    read -p "⚠️  L'endpoint è già presente. Continuare comunque? (y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Deploy annullato."
        exit 0
    fi
else
    echo "   ⚠️  Endpoint door-leds: $DOOR_LEDS_TEST"
fi
echo ""

# Step 4: Conferma deploy
echo "⚠️  Questo deploy farà:"
echo "   1. Backup del codice attuale"
echo "   2. Upload del nuovo codice con fix"
echo "   3. Rebuild completo backend (no-cache)"
echo "   4. Riavvio dei container"
echo ""
read -p "Procedere con il deploy? (y/n): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Deploy annullato."
    exit 0
fi
echo ""

# Step 5: Trasferimento file
echo "📤 Step 1/5: Trasferimento file al Raspberry..."
echo "   Questo può richiedere alcuni minuti..."
scp "$TAR_FILE" ${RASPBERRY_USER}@${RASPBERRY_IP}:${REMOTE_PATH}/
echo "✅ File trasferito!"
echo ""

# Step 6-9: Esecuzione remota
echo "🔧 Step 2/5: Esecuzione deploy remoto..."
echo ""

ssh ${RASPBERRY_USER}@${RASPBERRY_IP} << 'ENDSSH'
set -e

cd /home/pi

echo "📦 Step 2/5: Backup vecchio codice..."
if [ -d "escape-room-3d" ]; then
    BACKUP_DIR="escape-room-3d-backup-$(date +%Y%m%d-%H%M%S)"
    sudo mv escape-room-3d "$BACKUP_DIR"
    echo "   ✅ Backup salvato in: $BACKUP_DIR"
else
    echo "   ⚠️  Nessun codice precedente da fare backup"
fi

echo ""
echo "📦 Step 3/5: Estrazione nuovo codice..."
mkdir -p escape-room-3d
tar -xzf escape-room-deploy-doorleds-fix.tar.gz -C escape-room-3d
cd escape-room-3d
echo "   ✅ Codice estratto"

echo ""
echo "⏹️  Step 4/5: Stop container esistenti..."
sudo docker compose down || true
echo "   ✅ Container fermati"

echo ""
echo "🔨 Step 5/5: Rebuild backend (SENZA cache)..."
echo "   ⏳ Questo può richiedere 5-10 minuti..."
sudo docker compose build --no-cache backend

echo ""
echo "▶️  Avvio container..."
sudo docker compose up -d

echo ""
echo "⏳ Attendo che i container siano pronti (30 secondi)..."
sleep 30

echo ""
echo "📊 Stato container:"
sudo docker compose ps

echo ""
echo "✅ DEPLOY REMOTO COMPLETATO!"

ENDSSH

# Step 10: Verifica finale
echo ""
echo "=========================================="
echo "🧪 VERIFICA ENDPOINT"
echo "=========================================="
echo ""

echo "⏳ Attendo 10 secondi per stabilizzazione..."
sleep 10

echo "🔍 Test endpoint door-leds..."
DOOR_LEDS_CHECK=$(curl -s http://${RASPBERRY_IP}:8001/api/game-completion/door-leds)
DOOR_LEDS_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://${RASPBERRY_IP}:8001/api/game-completion/door-leds)

echo ""
if [ "$DOOR_LEDS_CODE" == "200" ]; then
    echo "✅ SUCCESS! Endpoint door-leds funzionante!"
    echo ""
    echo "📥 Risposta:"
    echo "$DOOR_LEDS_CHECK" | python3 -m json.tool 2>/dev/null || echo "$DOOR_LEDS_CHECK"
    echo ""
    echo "=========================================="
    echo "🎉 DEPLOY COMPLETATO CON SUCCESSO!"
    echo "=========================================="
else
    echo "❌ ERRORE: Endpoint ancora non risponde correttamente"
    echo "   HTTP Code: $DOOR_LEDS_CODE"
    echo "   Risposta: $DOOR_LEDS_CHECK"
    echo ""
    echo "📊 Verifica logs backend:"
    echo "   ssh pi@${RASPBERRY_IP}"
    echo "   cd /home/pi/escape-room-3d"
    echo "   sudo docker compose logs backend --tail=50"
fi

echo ""
echo "📝 Prossimi passi:"
echo "   1. Upload nuovo codice ESP32 (con fix blinking)"
echo "   2. Verifica che LED porta lampeggi al completamento soggiorno"
echo ""
echo "🔧 Comandi utili:"
echo "   Logs backend:  ssh pi@${RASPBERRY_IP} 'cd /home/pi/escape-room-3d && sudo docker compose logs -f backend'"
echo "   Restart:       ssh pi@${RASPBERRY_IP} 'cd /home/pi/escape-room-3d && sudo docker compose restart'"
echo "   Status:        ssh pi@${RASPBERRY_IP} 'cd /home/pi/escape-room-3d && sudo docker compose ps'"
echo ""