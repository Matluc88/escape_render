#!/bin/bash

# ==================================================
# Escape Room 3D - Backup Script
# ==================================================

set -e

# Colori
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   Escape Room 3D - Backup System      ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
echo ""

# Configurazione
BACKUP_ROOT="./backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="$BACKUP_ROOT/$TIMESTAMP"
RETENTION_DAYS=${BACKUP_RETENTION_DAYS:-7}

# Determina il comando docker compose
if docker compose version &> /dev/null 2>&1; then
    DOCKER_COMPOSE="docker compose"
else
    DOCKER_COMPOSE="docker-compose"
fi

# Verifica che il container sia in esecuzione
if ! docker ps | grep -q "escape-db"; then
    echo -e "${RED}❌ Container database non in esecuzione!${NC}"
    exit 1
fi

# Crea directory backup
mkdir -p "$BACKUP_DIR"

echo -e "${YELLOW}📦 Backup in corso...${NC}"
echo -e "Directory: ${BLUE}$BACKUP_DIR${NC}"
echo ""

# --------------------------------------------------
# 1. Backup Database PostgreSQL
# --------------------------------------------------
echo -e "${YELLOW}[1/3] Backup database PostgreSQL...${NC}"

docker exec escape-db pg_dump -U escape_user -F c -b -v escape_db > "$BACKUP_DIR/database.dump"

if [ -f "$BACKUP_DIR/database.dump" ]; then
    DB_SIZE=$(du -h "$BACKUP_DIR/database.dump" | cut -f1)
    echo -e "${GREEN}✓ Database backup completato (${DB_SIZE})${NC}"
else
    echo -e "${RED}❌ Backup database fallito!${NC}"
    exit 1
fi

# --------------------------------------------------
# 2. Backup configurazioni
# --------------------------------------------------
echo -e "\n${YELLOW}[2/3] Backup configurazioni...${NC}"

# Backup file .env (senza password in chiaro)
if [ -f .env.production ]; then
    cp .env.production "$BACKUP_DIR/env.production.backup"
    echo -e "${GREEN}✓ .env.production backup completato${NC}"
fi

# Backup configurazione nginx
if [ -f nginx.conf ]; then
    cp nginx.conf "$BACKUP_DIR/nginx.conf"
    echo -e "${GREEN}✓ nginx.conf backup completato${NC}"
fi

# Backup docker-compose
if [ -f docker-compose.yml ]; then
    cp docker-compose.yml "$BACKUP_DIR/docker-compose.yml"
    echo -e "${GREEN}✓ docker-compose.yml backup completato${NC}"
fi

# --------------------------------------------------
# 3. Backup volumi Docker (opzionale)
# --------------------------------------------------
echo -e "\n${YELLOW}[3/3] Backup volumi MQTT...${NC}"

# Backup configurazione MQTT
if [ -d "backend/mosquitto/config" ]; then
    mkdir -p "$BACKUP_DIR/mosquitto"
    cp -r backend/mosquitto/config "$BACKUP_DIR/mosquitto/"
    echo -e "${GREEN}✓ Configurazione MQTT backup completato${NC}"
fi

# --------------------------------------------------
# Comprimi backup
# --------------------------------------------------
echo -e "\n${YELLOW}Compressione backup...${NC}"

cd "$BACKUP_ROOT"
tar -czf "${TIMESTAMP}.tar.gz" "$TIMESTAMP"
COMPRESSED_SIZE=$(du -h "${TIMESTAMP}.tar.gz" | cut -f1)

# Rimuovi directory non compressa
rm -rf "$TIMESTAMP"

cd - > /dev/null

echo -e "${GREEN}✓ Backup compresso: ${TIMESTAMP}.tar.gz (${COMPRESSED_SIZE})${NC}"

# --------------------------------------------------
# Pulizia backup vecchi
# --------------------------------------------------
echo -e "\n${YELLOW}Pulizia backup vecchi (> ${RETENTION_DAYS} giorni)...${NC}"

DELETED=0
for backup in "$BACKUP_ROOT"/*.tar.gz; do
    if [ -f "$backup" ]; then
        # Controlla età file
        if [ $(find "$backup" -mtime +${RETENTION_DAYS} 2>/dev/null | wc -l) -gt 0 ]; then
            rm "$backup"
            DELETED=$((DELETED + 1))
        fi
    fi
done

if [ $DELETED -gt 0 ]; then
    echo -e "${GREEN}✓ Rimossi $DELETED backup vecchi${NC}"
else
    echo -e "${BLUE}ℹ Nessun backup vecchio da rimuovere${NC}"
fi

# --------------------------------------------------
# Riepilogo
# --------------------------------------------------
echo -e "\n${GREEN}╔════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║   ✓ Backup completato con successo!   ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════╝${NC}"
echo ""

TOTAL_BACKUPS=$(ls -1 "$BACKUP_ROOT"/*.tar.gz 2>/dev/null | wc -l)
TOTAL_SIZE=$(du -sh "$BACKUP_ROOT" | cut -f1)

echo -e "${BLUE}📊 Informazioni backup:${NC}"
echo -e "   File:           ${TIMESTAMP}.tar.gz"
echo -e "   Dimensione:     ${COMPRESSED_SIZE}"
echo -e "   Totale backup:  ${TOTAL_BACKUPS}"
echo -e "   Spazio totale:  ${TOTAL_SIZE}"
echo ""

echo -e "${BLUE}📝 Per ripristinare questo backup:${NC}"
echo -e "   ./restore.sh ${TIMESTAMP}"
echo ""
