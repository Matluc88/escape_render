#!/bin/bash

# ==================================================
# Escape Room 3D - Production Deployment Script
# ==================================================

set -e  # Exit on error

# Colori per output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}"
echo "╔════════════════════════════════════════════════╗"
echo "║   Escape Room 3D - Production Deployment      ║"
echo "╚════════════════════════════════════════════════╝"
echo -e "${NC}"

# --------------------------------------------------
# 1. Verifica prerequisiti
# --------------------------------------------------
echo -e "${YELLOW}[1/8] Verifica prerequisiti...${NC}"

if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker non installato!${NC}"
    exit 1
fi

if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo -e "${RED}❌ Docker Compose non installato!${NC}"
    exit 1
fi

# Determina il comando docker compose
if docker compose version &> /dev/null; then
    DOCKER_COMPOSE="docker compose"
else
    DOCKER_COMPOSE="docker-compose"
fi

echo -e "${GREEN}✓ Docker installato${NC}"
echo -e "${GREEN}✓ Docker Compose installato (usando: $DOCKER_COMPOSE)${NC}"

# --------------------------------------------------
# 2. Verifica file .env.production
# --------------------------------------------------
echo -e "\n${YELLOW}[2/8] Verifica configurazione...${NC}"

if [ ! -f .env.production ]; then
    echo -e "${RED}❌ File .env.production non trovato!${NC}"
    echo "Copia .env.production.example e configuralo:"
    echo "  cp .env.production.example .env.production"
    exit 1
fi

# Controlla se le password sono state cambiate
if grep -q "CHANGE_ME" .env.production; then
    echo -e "${RED}❌ ATTENZIONE: Alcune password non sono state cambiate in .env.production!${NC}"
    echo "Aggiorna le seguenti variabili:"
    grep "CHANGE_ME" .env.production
    read -p "Vuoi continuare comunque? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

echo -e "${GREEN}✓ File .env.production trovato${NC}"

# --------------------------------------------------
# 3. Backup dati esistenti (se presenti)
# --------------------------------------------------
echo -e "\n${YELLOW}[3/8] Backup dati esistenti...${NC}"

if [ -d "postgres_data" ] || docker volume ls | grep -q "escape.*postgres_data"; then
    BACKUP_DIR="backups/$(date +%Y%m%d_%H%M%S)"
    mkdir -p "$BACKUP_DIR"
    
    echo "Creazione backup in $BACKUP_DIR..."
    
    # Backup database se il container è in esecuzione
    if docker ps | grep -q "escape-db"; then
        echo "Backup database..."
        docker exec escape-db pg_dump -U escape_user escape_db > "$BACKUP_DIR/database.sql" || true
    fi
    
    echo -e "${GREEN}✓ Backup completato${NC}"
else
    echo -e "${BLUE}ℹ Nessun dato da backuppare (prima installazione)${NC}"
fi

# --------------------------------------------------
# 4. Stop container esistenti
# --------------------------------------------------
echo -e "\n${YELLOW}[4/8] Stop container esistenti...${NC}"

if docker ps | grep -q "escape-"; then
    echo "Stopping containers..."
    $DOCKER_COMPOSE --env-file .env.production down || true
    echo -e "${GREEN}✓ Container fermati${NC}"
else
    echo -e "${BLUE}ℹ Nessun container in esecuzione${NC}"
fi

# --------------------------------------------------
# 5. Pull immagini aggiornate
# --------------------------------------------------
echo -e "\n${YELLOW}[5/8] Pull immagini base...${NC}"
docker pull postgres:15-alpine
docker pull eclipse-mosquitto:2
docker pull nginx:1.25-alpine
docker pull python:3.11-slim
docker pull node:18-alpine
echo -e "${GREEN}✓ Immagini aggiornate${NC}"

# --------------------------------------------------
# 6. Build immagini
# --------------------------------------------------
echo -e "\n${YELLOW}[6/8] Build applicazione...${NC}"
echo "Questo potrebbe richiedere alcuni minuti..."

$DOCKER_COMPOSE --env-file .env.production build --no-cache

echo -e "${GREEN}✓ Build completata${NC}"

# --------------------------------------------------
# 7. Avvio servizi
# --------------------------------------------------
echo -e "\n${YELLOW}[7/8] Avvio servizi...${NC}"

$DOCKER_COMPOSE --env-file .env.production up -d

echo "Attendi inizializzazione servizi..."
sleep 10

# --------------------------------------------------
# 8. Verifica stato
# --------------------------------------------------
echo -e "\n${YELLOW}[8/8] Verifica deployment...${NC}"

# Mostra stato container
$DOCKER_COMPOSE --env-file .env.production ps

# Verifica health
echo -e "\n${BLUE}Controllo health check...${NC}"
sleep 5

HEALTHY=true

if ! docker ps | grep -q "escape-db.*healthy"; then
    echo -e "${RED}❌ Database non healthy${NC}"
    HEALTHY=false
else
    echo -e "${GREEN}✓ Database healthy${NC}"
fi

if ! docker ps | grep -q "escape-backend.*healthy"; then
    echo -e "${RED}❌ Backend non healthy${NC}"
    HEALTHY=false
else
    echo -e "${GREEN}✓ Backend healthy${NC}"
fi

if ! docker ps | grep -q "escape-frontend.*healthy"; then
    echo -e "${RED}❌ Frontend non healthy${NC}"
    HEALTHY=false
else
    echo -e "${GREEN}✓ Frontend healthy${NC}"
fi

if [ "$HEALTHY" = false ]; then
    echo -e "\n${RED}⚠ Alcuni servizi non sono healthy. Controlla i logs:${NC}"
    echo "  $DOCKER_COMPOSE --env-file .env.production logs"
    exit 1
fi

# --------------------------------------------------
# Deployment completato
# --------------------------------------------------
echo -e "\n${GREEN}"
echo "╔════════════════════════════════════════════════╗"
echo "║     ✓ Deployment completato con successo!     ║"
echo "╚════════════════════════════════════════════════╝"
echo -e "${NC}"

# Informazioni accesso
FRONTEND_PORT=$(grep FRONTEND_PORT .env.production | cut -d '=' -f2)
FRONTEND_PORT=${FRONTEND_PORT:-80}

echo -e "${BLUE}📡 Applicazione disponibile su:${NC}"
echo -e "   → http://localhost:${FRONTEND_PORT}"
echo -e "   → http://$(hostname -I | awk '{print $1}'):${FRONTEND_PORT}"

echo -e "\n${BLUE}📊 Comandi utili:${NC}"
echo -e "   Logs:        $DOCKER_COMPOSE --env-file .env.production logs -f"
echo -e "   Status:      $DOCKER_COMPOSE --env-file .env.production ps"
echo -e "   Stop:        $DOCKER_COMPOSE --env-file .env.production down"
echo -e "   Restart:     $DOCKER_COMPOSE --env-file .env.production restart"
echo -e "   Backup:      ./backup.sh"

echo -e "\n${YELLOW}⚠ Note importanti:${NC}"
echo -e "   • Configura il firewall per esporre solo le porte necessarie"
echo -e "   • Configura HTTPS con un reverse proxy (nginx/traefik + Let's Encrypt)"
echo -e "   • Monitora regolarmente i logs e le performance"
echo -e "   • Effettua backup regolari del database"

echo ""
