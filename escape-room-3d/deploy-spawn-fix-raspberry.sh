#!/bin/bash
# ============================================
# DEPLOY SPAWN FIX RASPBERRY PI
# ============================================
# Data: 16/01/2026
# Applica coordinate spawn corrette al Raspberry Pi
# ============================================

set -e  # Exit on error

# Colori per output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configurazione
RASPBERRY_IP="192.168.8.10"
RASPBERRY_USER="pi"
DB_CONTAINER="escape-db"
DB_USER="escape_user"
DB_NAME="escape_db"
SQL_FILE="fix-spawn-raspberry-CORRETTE-2026.sql"

echo -e "${BLUE}════════════════════════════════════════════${NC}"
echo -e "${BLUE}  DEPLOY SPAWN FIX - RASPBERRY PI${NC}"
echo -e "${BLUE}════════════════════════════════════════════${NC}"
echo ""

# SSH Command with password
SSH_CMD="sshpass -p escape ssh -o StrictHostKeyChecking=no"

# Step 1: Verifica connessione Raspberry Pi
echo -e "${YELLOW}[1/4]${NC} Verifica connessione a Raspberry Pi..."
if ! ${SSH_CMD} ${RASPBERRY_USER}@${RASPBERRY_IP} "echo OK" > /dev/null 2>&1; then
    echo -e "${RED}✗ Impossibile connettersi a ${RASPBERRY_IP}${NC}"
    echo -e "${YELLOW}Verifica che:${NC}"
    echo "  - Il Raspberry Pi sia acceso"
    echo "  - Sia connesso alla rete"
    echo "  - L'IP sia corretto (192.168.8.10)"
    exit 1
fi
echo -e "${GREEN}✓ Connessione OK${NC}"
echo ""

# Step 2: Verifica che il container database esista
echo -e "${YELLOW}[2/4]${NC} Verifica container database..."
if ! ${SSH_CMD} ${RASPBERRY_USER}@${RASPBERRY_IP} "docker ps --filter name=${DB_CONTAINER} --format '{{.Names}}'" | grep -q "${DB_CONTAINER}"; then
    echo -e "${RED}✗ Container ${DB_CONTAINER} non trovato${NC}"
    echo -e "${YELLOW}Avvia i container con: docker-compose up -d${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Container database trovato${NC}"
echo ""

# Step 3: Applica fix SQL
echo -e "${YELLOW}[3/4]${NC} Applicazione coordinate corrette al database..."
echo -e "${BLUE}Eseguo: ${SQL_FILE}${NC}"
if ${SSH_CMD} ${RASPBERRY_USER}@${RASPBERRY_IP} "docker exec -i ${DB_CONTAINER} psql -U ${DB_USER} -d ${DB_NAME}" < ${SQL_FILE}; then
    echo -e "${GREEN}✓ Coordinate aggiornate con successo${NC}"
else
    echo -e "${RED}✗ Errore nell'applicazione del fix SQL${NC}"
    exit 1
fi
echo ""

# Step 4: Verifica coordinate finali
echo -e "${YELLOW}[4/4]${NC} Verifica coordinate nel database..."
echo -e "${BLUE}Coordinate attuali:${NC}"
${SSH_CMD} ${RASPBERRY_USER}@${RASPBERRY_IP} "docker exec ${DB_CONTAINER} psql -U ${DB_USER} -d ${DB_NAME} -c \"SELECT name, spawn_data::jsonb->'position'->>'x' as x, spawn_data::jsonb->'position'->>'z' as z, spawn_data::jsonb->>'yaw' as yaw FROM rooms ORDER BY CASE name WHEN 'kitchen' THEN 1 WHEN 'livingroom' THEN 2 WHEN 'bathroom' THEN 3 WHEN 'bedroom' THEN 4 WHEN 'gate' THEN 5 END;\""
echo ""

# Riepilogo
echo -e "${GREEN}════════════════════════════════════════════${NC}"
echo -e "${GREEN}✓ DEPLOY COMPLETATO CON SUCCESSO${NC}"
echo -e "${GREEN}════════════════════════════════════════════${NC}"
echo ""
echo -e "${YELLOW}⚠️  IMPORTANTE: Pulire la cache del browser${NC}"
echo -e "1. Apri il browser e vai su ${BLUE}http://${RASPBERRY_IP}${NC}"
echo -e "2. Premi ${BLUE}CTRL+SHIFT+R${NC} (Windows/Linux) o ${BLUE}CMD+SHIFT+R${NC} (Mac)"
echo -e "3. Oppure apri ${BLUE}clear-spawn-cache-raspberry.html${NC}"
echo ""
echo -e "${YELLOW}✓ Testa lo spawn in ogni stanza per verificare${NC}"
echo ""