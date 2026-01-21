#!/bin/bash
# Deploy Backend BAGNO Hardware Fix al Raspberry Pi
# Aggiunge supporto servo motors (P25/P26), fan (P32) e relativi endpoint

set -e

RASPBERRY_IP="192.168.8.10"
RASPBERRY_USER="pi"
RASPBERRY_PASS="escape"
IMAGE_FILE="/Users/matteo/Desktop/escape-room-backend-bagno-hardware.tar.gz"

echo "🚀 Deploy Backend BAGNO Hardware Fix al Raspberry Pi"
echo "========================================================"
echo ""
echo "📋 Modifiche incluse:"
echo "   - 3 nuovi endpoint ESP32 per bagno (door-servo, window-servo, fan)"
echo "   - 3 nuovi campi Boolean nel database (door_servo_should_open, window_servo_should_close, fan_should_run)"
echo "   - Service logic aggiornato per attivare hardware quando puzzle completato"
echo ""

# 1. Trasferimento immagine
echo "📦 Step 1/5: Trasferimento immagine al Raspberry Pi..."
sshpass -p "$RASPBERRY_PASS" scp "$IMAGE_FILE" ${RASPBERRY_USER}@${RASPBERRY_IP}:/tmp/backend-bagno-hardware.tar.gz
echo "   ✅ Immagine trasferita"

# 2. Deploy completo sul Raspberry
echo ""
echo "🐳 Step 2/5: Caricamento immagine Docker sul Raspberry..."
sshpass -p "$RASPBERRY_PASS" ssh -o StrictHostKeyChecking=no ${RASPBERRY_USER}@${RASPBERRY_IP} "
    cd /home/pi/escape-room-3d && \
    echo '📥 Loading Docker image...' && \
    docker load < /tmp/backend-bagno-hardware.tar.gz && \
    echo '   ✅ Immagine caricata'
"

# 3. Applica migration database
echo ""
echo "🗄️  Step 3/5: Applicazione migration database..."
sshpass -p "$RASPBERRY_PASS" ssh -o StrictHostKeyChecking=no ${RASPBERRY_USER}@${RASPBERRY_IP} "
    cd /home/pi/escape-room-3d && \
    echo '📊 Aggiunta colonne hardware a bathroom_puzzle_states...' && \
    docker compose exec -T db psql -U escape_user escape_room_db << 'EOSQL'
-- Aggiungi colonne hardware solo se non esistono
DO \$\$
BEGIN
    -- door_servo_should_open
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'bathroom_puzzle_states' 
        AND column_name = 'door_servo_should_open'
    ) THEN
        ALTER TABLE bathroom_puzzle_states 
        ADD COLUMN door_servo_should_open BOOLEAN NOT NULL DEFAULT FALSE;
        RAISE NOTICE 'Aggiunta colonna door_servo_should_open';
    ELSE
        RAISE NOTICE 'Colonna door_servo_should_open già esistente';
    END IF;

    -- window_servo_should_close
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'bathroom_puzzle_states' 
        AND column_name = 'window_servo_should_close'
    ) THEN
        ALTER TABLE bathroom_puzzle_states 
        ADD COLUMN window_servo_should_close BOOLEAN NOT NULL DEFAULT FALSE;
        RAISE NOTICE 'Aggiunta colonna window_servo_should_close';
    ELSE
        RAISE NOTICE 'Colonna window_servo_should_close già esistente';
    END IF;

    -- fan_should_run
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'bathroom_puzzle_states' 
        AND column_name = 'fan_should_run'
    ) THEN
        ALTER TABLE bathroom_puzzle_states 
        ADD COLUMN fan_should_run BOOLEAN NOT NULL DEFAULT FALSE;
        RAISE NOTICE 'Aggiunta colonna fan_should_run';
    ELSE
        RAISE NOTICE 'Colonna fan_should_run già esistente';
    END IF;
END \$\$;

-- Verifica colonne aggiunte
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'bathroom_puzzle_states' 
AND column_name IN ('door_servo_should_open', 'window_servo_should_close', 'fan_should_run');
EOSQL
    echo '   ✅ Migration completata'
"

# 4. Restart backend container
echo ""
echo "🔄 Step 4/5: Riavvio backend container..."
sshpass -p "$RASPBERRY_PASS" ssh -o StrictHostKeyChecking=no ${RASPBERRY_USER}@${RASPBERRY_IP} "
    cd /home/pi/escape-room-3d && \
    docker compose stop backend && \
    docker compose rm -f backend && \
    docker compose up -d backend && \
    echo '   ⏳ Aspetto 25 secondi per avvio backend...' && \
    sleep 25 && \
    echo '   ✅ Backend riavviato'
"

# 5. Test endpoint
echo ""
echo "✅ Step 5/5: Test nuovi endpoint BAGNO..."
sshpass -p "$RASPBERRY_PASS" ssh -o StrictHostKeyChecking=no ${RASPBERRY_USER}@${RASPBERRY_IP} "
    echo '' && \
    echo '=== Test 1: door-servo-status ===' && \
    curl -s http://localhost:8001/api/sessions/999/bathroom-puzzles/door-servo-status | jq '.' && \
    echo '' && \
    echo '=== Test 2: window-servo-status ===' && \
    curl -s http://localhost:8001/api/sessions/999/bathroom-puzzles/window-servo-status | jq '.' && \
    echo '' && \
    echo '=== Test 3: fan-status ===' && \
    curl -s http://localhost:8001/api/sessions/999/bathroom-puzzles/fan-status | jq '.' && \
    echo '' && \
    echo '=== Test 4: bathroom state ===' && \
    curl -s http://localhost:8001/api/sessions/999/bathroom-puzzles/state | jq '.states' && \
    echo '' && \
    echo '🧹 Pulizia...' && \
    rm /tmp/backend-bagno-hardware.tar.gz && \
    echo '   ✅ File temporanei rimossi'
"

echo ""
echo "🎉 Deploy completato con successo!"
echo ""
echo "📝 Endpoint BAGNO disponibili:"
echo "   http://192.168.8.10:8001/api/sessions/{id}/bathroom-puzzles/door-servo-status"
echo "   http://192.168.8.10:8001/api/sessions/{id}/bathroom-puzzles/window-servo-status"
echo "   http://192.168.8.10:8001/api/sessions/{id}/bathroom-puzzles/fan-status"
echo ""
echo "🔌 Hardware supportato:"
echo "   - Servo Porta (P26): si apre quando game_won = true"
echo "   - Servo Finestra (P25): si chiude quando ventola completata"
echo "   - Ventola (P32): si attiva quando ventola completata"
echo ""
echo "📱 Prossimo step:"
echo "   1. Carica esp32-bagno-RASPBERRY-COMPLETE.ino sull'ESP32 del bagno"
echo "   2. Verifica serial monitor che si connetta al backend"
echo "   3. Testa puzzle completando ventola → hardware si attiva!"
echo ""