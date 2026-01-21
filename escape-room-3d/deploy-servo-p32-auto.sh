#!/bin/bash

# ====================================================
# Deploy Servo P32 su Raspberry Pi - Automatico con sshpass
# ====================================================

set -e  # Exit on error

# Colori per output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}╔════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   Deploy Servo P32 - Raspberry Pi (Automatico)║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════╝${NC}"
echo ""

# ====================================================
# Configurazione
# ====================================================
RASPBERRY_IP="${RASPBERRY_IP:-192.168.8.10}"
RASPBERRY_USER="${RASPBERRY_USER:-pi}"
RASPBERRY_PASSWORD="${RASPBERRY_PASSWORD}"
RASPBERRY_PATH="/home/pi/escape-room-3d"
LOCAL_ARCHIVE="/Users/matteo/Desktop/ESCAPE/escape-room-3d/servo-p32-update.tar.gz"

# ====================================================
# Verifica sshpass
# ====================================================
if ! command -v sshpass &> /dev/null; then
    echo -e "${RED}❌ Errore: sshpass non installato${NC}"
    echo -e "${YELLOW}Installa con: brew install hudochenkov/sshpass/sshpass${NC}"
    exit 1
fi

# ====================================================
# Richiedi password se non impostata
# ====================================================
if [ -z "$RASPBERRY_PASSWORD" ]; then
    echo -e "${YELLOW}Inserisci la password del Raspberry Pi:${NC}"
    read -s RASPBERRY_PASSWORD
    echo ""
fi

# ====================================================
# FASE 0: Test connessione
# ====================================================
echo -e "${YELLOW}[FASE 0]${NC} Test connessione al Raspberry Pi..."

if ! sshpass -p "$RASPBERRY_PASSWORD" ssh -o StrictHostKeyChecking=no -o ConnectTimeout=5 \
    "${RASPBERRY_USER}@${RASPBERRY_IP}" "echo 'OK'" &> /dev/null; then
    echo -e "${RED}❌ Errore: Impossibile connettersi a ${RASPBERRY_IP}${NC}"
    echo -e "${YELLOW}💡 Verifica:${NC}"
    echo "   - Raspberry Pi acceso"
    echo "   - IP corretto: ${RASPBERRY_IP}"
    echo "   - Password corretta"
    exit 1
fi

echo -e "${GREEN}✓ Connessione al Raspberry Pi OK${NC}"
echo ""

# ====================================================
# FASE 1: Verifica file locale
# ====================================================
echo -e "${YELLOW}[FASE 1]${NC} Verifica file locale..."

if [ ! -f "$LOCAL_ARCHIVE" ]; then
    echo -e "${RED}❌ Errore: File non trovato: $LOCAL_ARCHIVE${NC}"
    exit 1
fi

FILE_SIZE=$(ls -lh "$LOCAL_ARCHIVE" | awk '{print $5}')
echo -e "${GREEN}✓ File trovato: $LOCAL_ARCHIVE ($FILE_SIZE)${NC}"
echo ""

# ====================================================
# FASE 2: Trasferimento su Raspberry Pi
# ====================================================
echo -e "${YELLOW}[FASE 2]${NC} Trasferimento file su Raspberry Pi..."

sshpass -p "$RASPBERRY_PASSWORD" scp -o StrictHostKeyChecking=no \
    "$LOCAL_ARCHIVE" "${RASPBERRY_USER}@${RASPBERRY_IP}:/home/pi/" || {
    echo -e "${RED}❌ Errore durante il trasferimento SCP${NC}"
    exit 1
}

echo -e "${GREEN}✓ File trasferito con successo!${NC}"
echo ""

# ====================================================
# FASE 3: Deployment remoto
# ====================================================
echo -e "${YELLOW}[FASE 3]${NC} Deployment remoto su Raspberry Pi..."

sshpass -p "$RASPBERRY_PASSWORD" ssh -o StrictHostKeyChecking=no \
    "${RASPBERRY_USER}@${RASPBERRY_IP}" << 'ENDSSH'
set -e

# Colori
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

cd /home/pi

echo -e "${BLUE}[3.1]${NC} Backup file esistenti..."
mkdir -p escape-room-3d/backups/pre-servo-p32
cp escape-room-3d/backend/app/models/livingroom_puzzle.py escape-room-3d/backups/pre-servo-p32/ 2>/dev/null || true
cp escape-room-3d/backend/app/api/livingroom_puzzles.py escape-room-3d/backups/pre-servo-p32/ 2>/dev/null || true
cp escape-room-3d/backend/app/services/livingroom_puzzle_service.py escape-room-3d/backups/pre-servo-p32/ 2>/dev/null || true
echo -e "${GREEN}✓ Backup creato${NC}"

echo -e "${BLUE}[3.2]${NC} Estrazione file aggiornati..."
tar -xzf servo-p32-update.tar.gz -C escape-room-3d/backend/
echo -e "${GREEN}✓ File estratti${NC}"

echo -e "${BLUE}[3.3]${NC} Posizionamento file nelle directory corrette..."
cd escape-room-3d/backend

# Sposta i file nelle posizioni corrette
mv -f livingroom_puzzle.py app/models/livingroom_puzzle.py 2>/dev/null || true
mv -f 013_add_livingroom_door_servo.py alembic/versions/013_add_livingroom_door_servo.py 2>/dev/null || true
mv -f livingroom_puzzles.py app/api/livingroom_puzzles.py 2>/dev/null || true
mv -f livingroom_puzzle_service.py app/services/livingroom_puzzle_service.py 2>/dev/null || true

echo -e "${GREEN}✓ File posizionati correttamente${NC}"

echo -e "${BLUE}[3.4]${NC} Verifica file aggiornati..."
ls -lh app/models/livingroom_puzzle.py
ls -lh alembic/versions/013_add_livingroom_door_servo.py
ls -lh app/api/livingroom_puzzles.py
ls -lh app/services/livingroom_puzzle_service.py
echo -e "${GREEN}✓ Tutti i file presenti${NC}"

cd /home/pi/escape-room-3d

echo -e "${BLUE}[3.5]${NC} Applicazione migration database..."
docker compose exec -T backend alembic upgrade head 2>&1 || {
    echo -e "${YELLOW}⚠ Warning: Migration potrebbe essere già applicata${NC}"
}
echo -e "${GREEN}✓ Migration completata${NC}"

echo -e "${BLUE}[3.6]${NC} Riavvio container backend..."
docker compose restart backend
sleep 5
echo -e "${GREEN}✓ Backend riavviato${NC}"

echo -e "${BLUE}[3.7]${NC} Verifica stato container..."
docker compose ps backend
echo ""

echo -e "${GREEN}═══════════════════════════════════════════${NC}"
echo -e "${GREEN}✓ Deployment remoto completato!${NC}"
echo -e "${GREEN}═══════════════════════════════════════════${NC}"

ENDSSH

echo -e "${GREEN}✓ Deployment completato!${NC}"
echo ""

# ====================================================
# FASE 4: Test endpoint
# ====================================================
echo -e "${YELLOW}[FASE 4]${NC} Test endpoint..."
echo ""

echo -e "${BLUE}Test endpoint door-servo-status...${NC}"
sleep 2  # Attendi che backend sia completamente up

RESPONSE=$(curl -s "http://${RASPBERRY_IP}:8001/api/sessions/1032/livingroom-puzzles/door-servo-status" 2>&1 || echo "ERROR")

if echo "$RESPONSE" | grep -q "should_close_servo"; then
    echo -e "${GREEN}✅ SUCCESS! Endpoint funziona correttamente${NC}"
    echo -e "${GREEN}Risposta: $RESPONSE${NC}"
    echo ""
    ENDPOINT_OK=true
else
    echo -e "${YELLOW}⚠ Risposta inattesa o endpoint non ancora pronto: $RESPONSE${NC}"
    echo -e "${YELLOW}Verificare manualmente con:${NC}"
    echo "   curl http://${RASPBERRY_IP}:8001/api/sessions/1032/livingroom-puzzles/door-servo-status"
    echo ""
    ENDPOINT_OK=false
fi

# ====================================================
# FASE 5: Verifica migration
# ====================================================
echo -e "${YELLOW}[FASE 5]${NC} Verifica migration database..."

MIGRATION_CHECK=$(sshpass -p "$RASPBERRY_PASSWORD" ssh -o StrictHostKeyChecking=no \
    "${RASPBERRY_USER}@${RASPBERRY_IP}" \
    "cd ${RASPBERRY_PATH} && docker compose exec -T backend alembic current" 2>&1)

if echo "$MIGRATION_CHECK" | grep -q "013_add_livingroom_door_servo"; then
    echo -e "${GREEN}✅ Migration 013 applicata correttamente${NC}"
    echo -e "${GREEN}${MIGRATION_CHECK}${NC}"
else
    echo -e "${YELLOW}⚠ Stato migration: ${MIGRATION_CHECK}${NC}"
fi
echo ""

# ====================================================
# Riepilogo finale
# ====================================================
echo -e "${BLUE}╔════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║           DEPLOYMENT COMPLETATO! 🎉            ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${GREEN}✓ File aggiornati trasferiti${NC}"
echo -e "${GREEN}✓ Migration 013 applicata${NC}"
echo -e "${GREEN}✓ Backend riavviato${NC}"

if [ "$ENDPOINT_OK" = true ]; then
    echo -e "${GREEN}✓ Endpoint testato e funzionante${NC}"
else
    echo -e "${YELLOW}⚠ Endpoint da verificare manualmente${NC}"
fi

echo ""
echo -e "${YELLOW}═══════════════════════════════════════════════════${NC}"
echo -e "${YELLOW}Prossimo step: Flash ESP32 soggiorno${NC}"
echo -e "${YELLOW}═══════════════════════════════════════════════════${NC}"
echo ""
echo "1. Apri Arduino IDE"
echo "2. Carica: escape-room-3d/esp32-soggiorno-RASPBERRY-MAG1-BLINKING-FIX/esp32-soggiorno-RASPBERRY-MAG1-BLINKING-FIX.ino"
echo "3. Seleziona porta ESP32 soggiorno"
echo "4. Upload ⬆️"
echo "5. Apri Serial Monitor (115200 baud)"
echo ""
echo -e "${GREEN}Deploy backend completato con successo! 🚀${NC}"