#!/bin/bash

# ==================================================
# Escape Room 3D - Restore Script
# ==================================================

set -e

# Colori
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   Escape Room 3D - Restore System     ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
echo ""

# Verifica argomenti
if [ $# -lt 1 ]; then
    echo -e "${RED}❌ Uso: $0 <timestamp_backup>${NC}"
    echo ""
    echo "Backup disponibili:"
    ls -1 ./backups/*.tar.gz 2>/dev/null | sed 's/.*\///' | sed 's/.tar.gz//' || echo "  Nessun backup trovato"
    exit 1
fi

BACKUP_TIMESTAMP=$1
BACKUP_ROOT="./backups"
BACKUP_FILE="$BACKUP_ROOT/${BACKUP_TIMESTAMP}.tar.gz"

# Verifica esistenza backup
if [ ! -f "$BACKUP_FILE" ]; then
    echo -e "${RED}❌ Backup non trovato: $BACKUP_FILE${NC}"
    echo ""
    echo "Backup disponibili:"
    ls -1 ./backups/*.tar.gz 2>/dev/null | sed 's/.*\///' | sed 's/.tar.gz//' || echo "  Nessun backup trovato"
    exit 1
fi

# Determina il comando docker compose
if docker compose version &> /dev/null 2>&1; then
    DOCKER_COMPOSE="docker compose"
else
    DOCKER_COMPOSE="docker-compose"
fi

echo -e "${YELLOW}⚠️  ATTENZIONE: Questa operazione sovrascriverà i dati esistenti!${NC}"
echo -e "Backup da ripristinare: ${BLUE}${BACKUP_TIMESTAMP}${NC}"
echo ""
read -p "Continuare? (digita 'YES' per confermare): " -r
echo

if [ "$REPLY" != "YES" ]; then
    echo -e "${BLUE}Operazione annullata.${NC}"
    exit 0
fi

# --------------------------------------------------
# 1. Estrai backup
# --------------------------------------------------
echo -e "${YELLOW}[1/4] Estrazione backup...${NC}"

RESTORE_DIR="$BACKUP_ROOT/${BACKUP_TIMESTAMP}"
cd "$BACKUP_ROOT"
tar -xzf "${BACKUP_TIMESTAMP}.tar.gz"
cd - > /dev/null

if [ ! -d "$RESTORE_DIR" ]; then
    echo -e "${RED}❌ Errore nell'estrazione del backup${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Backup estratto${NC}"

# --------------------------------------------------
# 2. Stop container
# --------------------------------------------------
echo -e "\n${YELLOW}[2/4] Stop container...${NC}"

if docker ps | grep -q "escape-"; then
    $DOCKER_COMPOSE --env-file .env.production down
    echo -e "${GREEN}✓ Container fermati${NC}"
else
    echo -e "${BLUE}ℹ Container già fermati${NC}"
fi

# --------------------------------------------------
# 3. Restore database
# --------------------------------------------------
echo -e "\n${YELLOW}[3/4] Avvio database per restore...${NC}"

# Avvia solo il database
$DOCKER_COMPOSE --env-file .env.production up -d db

# Attendi che il database sia pronto
echo "Attendi inizializzazione database..."
sleep 10

# Verifica che il database sia pronto
MAX_RETRIES=30
RETRY=0
while ! docker exec escape-db pg_isready -U escape_user > /dev/null 2>&1; do
    RETRY=$((RETRY + 1))
    if [ $RETRY -gt $MAX_RETRIES ]; then
        echo -e "${RED}❌ Database non pronto dopo ${MAX_RETRIES} tentativi${NC}"
        exit 1
    fi
    echo "Attesa database... ($RETRY/$MAX_RETRIES)"
    sleep 2
done

echo -e "${GREEN}✓ Database pronto${NC}"

# Drop e ricrea database
echo -e "\n${YELLOW}Restore database...${NC}"

docker exec -i escape-db psql -U escape_user -d postgres <<EOF
DROP DATABASE IF EXISTS escape_db;
CREATE DATABASE escape_db;
\q
EOF

# Restore database
docker exec -i escape-db pg_restore -U escape_user -d escape_db -v < "$RESTORE_DIR/database.dump"

echo -e "${GREEN}✓ Database ripristinato${NC}"

# --------------------------------------------------
# 4. Restore configurazioni
# --------------------------------------------------
echo -e "\n${YELLOW}[4/4] Restore configurazioni...${NC}"

RESTORED_CONFIGS=0

# Restore .env.production
if [ -f "$RESTORE_DIR/env.production.backup" ]; then
    cp "$RESTORE_DIR/env.production.backup" .env.production
    echo -e "${GREEN}✓ .env.production ripristinato${NC}"
    RESTORED_CONFIGS=$((RESTORED_CONFIGS + 1))
fi

# Restore nginx.conf
if [ -f "$RESTORE_DIR/nginx.conf" ]; then
    cp "$RESTORE_DIR/nginx.conf" nginx.conf
    echo -e "${GREEN}✓ nginx.conf ripristinato${NC}"
    RESTORED_CONFIGS=$((RESTORED_CONFIGS + 1))
fi

# Restore docker-compose.yml
if [ -f "$RESTORE_DIR/docker-compose.yml" ]; then
    cp "$RESTORE_DIR/docker-compose.yml" docker-compose.yml
    echo -e "${GREEN}✓ docker-compose.yml ripristinato${NC}"
    RESTORED_CONFIGS=$((RESTORED_CONFIGS + 1))
fi

# Restore MQTT
if [ -d "$RESTORE_DIR/mosquitto" ]; then
    cp -r "$RESTORE_DIR/mosquitto/config" backend/mosquitto/
    echo -e "${GREEN}✓ Configurazione MQTT ripristinata${NC}"
    RESTORED_CONFIGS=$((RESTORED_CONFIGS + 1))
fi

if [ $RESTORED_CONFIGS -eq 0 ]; then
    echo -e "${YELLOW}⚠ Nessuna configurazione da ripristinare${NC}"
fi

# --------------------------------------------------
# Cleanup
# --------------------------------------------------
echo -e "\n${YELLOW}Pulizia file temporanei...${NC}"
rm -rf "$RESTORE_DIR"
echo -e "${GREEN}✓ Pulizia completata${NC}"

# --------------------------------------------------
# Riavvio completo
# --------------------------------------------------
echo -e "\n${YELLOW}Riavvio tutti i servizi...${NC}"

$DOCKER_COMPOSE --env-file .env.production down
$DOCKER_COMPOSE --env-file .env.production up -d

echo "Attendi inizializzazione servizi..."
sleep 15

# --------------------------------------------------
# Riepilogo
# --------------------------------------------------
echo -e "\n${GREEN}╔════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║   ✓ Restore completato con successo!  ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════╝${NC}"
echo ""

echo -e "${BLUE}📊 Verifica stato servizi:${NC}"
$DOCKER_COMPOSE --env-file .env.production ps

echo ""
echo -e "${BLUE}📝 Comandi utili:${NC}"
echo -e "   Logs:    $DOCKER_COMPOSE --env-file .env.production logs -f"
echo -e "   Status:  $DOCKER_COMPOSE --env-file .env.production ps"
echo ""
