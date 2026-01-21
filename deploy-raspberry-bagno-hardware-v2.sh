#!/bin/bash
# Deploy Backend BAGNO Hardware Fix v2 al Raspberry Pi
# Versione corretta con immagine ricostruita

set -e

RASPBERRY_IP="192.168.8.10"
RASPBERRY_USER="pi"
RASPBERRY_PASS="escape"
IMAGE_FILE="/Users/matteo/Desktop/escape-room-backend-bagno-hardware-v2.tar.gz"

echo "🚀 Deploy Backend BAGNO Hardware Fix v2 al Raspberry Pi"
echo "=========================================================="
echo ""
echo "📋 Modifiche incluse:"
echo "   - 3 nuovi endpoint ESP32 per bagno (door-servo, window-servo, fan)"
echo "   - 3 nuovi campi Boolean nel database"
echo "   - Service logic aggiornato"
echo ""

# 1. Trasferimento immagine
echo "📦 Step 1/4: Trasferimento immagine al Raspberry Pi..."
sshpass -p "$RASPBERRY_PASS" scp "$IMAGE_FILE" ${RASPBERRY_USER}@${RASPBERRY_IP}:/tmp/backend-bagno-v2.tar.gz
echo "   ✅ Immagine trasferita"

# 2. Caricamento immagine e riavvio
echo ""
echo "🐳 Step 2/4: Caricamento immagine e riavvio backend..."
sshpass -p "$RASPBERRY_PASS" ssh -o StrictHostKeyChecking=no ${RASPBERRY_USER}@${RASPBERRY_IP} "
    cd /home/pi/escape-room-3d && \
    echo '📥 Loading Docker image...' && \
    docker load < /tmp/backend-bagno-v2.tar.gz && \
    echo '🔄 Riavvio backend...' && \
    docker compose stop backend && \
    docker compose rm -f backend && \
    docker compose up -d backend && \
    echo '⏳ Aspetto 25 secondi...' && \
    sleep 25 && \
    echo '   ✅ Backend riavviato'
"

# 3. Applica migration database (se necessario)
echo ""
echo "🗄️  Step 3/4: Verifica e applica migration database..."
sshpass -p "$RASPBERRY_PASS" ssh -o StrictHostKeyChecking=no ${RASPBERRY_USER}@${RASPBERRY_IP} "
    cd /home/pi/escape-room-3d && \
    docker compose exec -T db psql -U escape_user escape_room_db << 'EOSQL'
-- Aggiungi colonne solo se non esistono
DO \$\$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bathroom_puzzle_states' AND column_name = 'door_servo_should_open') THEN
        ALTER TABLE bathroom_puzzle_states ADD COLUMN door_servo_should_open BOOLEAN NOT NULL DEFAULT FALSE;
        RAISE NOTICE 'Aggiunta door_servo_should_open';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bathroom_puzzle_states' AND column_name = 'window_servo_should_close') THEN
        ALTER TABLE bathroom_puzzle_states ADD COLUMN window_servo_should_close BOOLEAN NOT NULL DEFAULT FALSE;
        RAISE NOTICE 'Aggiunta window_servo_should_close';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bathroom_puzzle_states' AND column_name = 'fan_should_run') THEN
        ALTER TABLE bathroom_puzzle_states ADD COLUMN fan_should_run BOOLEAN NOT NULL DEFAULT FALSE;
        RAISE NOTICE 'Aggiunta fan_should_run';
    END IF;
END \$\$;
EOSQL
    echo '   ✅ Migration verificata'
"

# 4. Test endpoint
echo ""
echo "✅ Step 4/4: Test endpoint BAGNO..."
echo ""
echo "=== door-servo-status ==="
curl -s http://192.168.8.10:8001/api/sessions/999/bathroom-puzzles/door-servo-status
echo ""
echo ""
echo "=== window-servo-status ==="
curl -s http://192.168.8.10:8001/api/sessions/999/bathroom-puzzles/window-servo-status
echo ""
echo ""
echo "=== fan-status ==="
curl -s http://192.168.8.10:8001/api/sessions/999/bathroom-puzzles/fan-status
echo ""

# Pulizia
sshpass -p "$RASPBERRY_PASS" ssh -o StrictHostKeyChecking=no ${RASPBERRY_USER}@${RASPBERRY_IP} "rm /tmp/backend-bagno-v2.tar.gz"

echo ""
echo "🎉 Deploy completato con successo!"
echo ""
echo "📝 Endpoint disponibili:"
echo "   http://192.168.8.10:8001/api/sessions/{id}/bathroom-puzzles/door-servo-status"
echo "   http://192.168.8.10:8001/api/sessions/{id}/bathroom-puzzles/window-servo-status"
echo "   http://192.168.8.10:8001/api/sessions/{id}/bathroom-puzzles/fan-status"
echo ""
echo "📱 Prossimo step:"
echo "   Carica esp32-bagno-RASPBERRY-COMPLETE/esp32-bagno-RASPBERRY-COMPLETE.ino"
echo ""