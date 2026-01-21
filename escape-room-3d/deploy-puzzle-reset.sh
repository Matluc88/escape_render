#!/bin/bash

###############################################################################
# 🔄 DEPLOY SISTEMA RESET ENIGMI
# Aggiorna i container Docker con la nuova funzionalità di reset enigmi
###############################################################################

set -e  # Exit on error

echo "🔄 =========================================="
echo "🔄 DEPLOY SISTEMA RESET ENIGMI"
echo "🔄 =========================================="
echo ""

# Colori per output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Verifica che Docker sia in esecuzione
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}❌ Docker non è in esecuzione!${NC}"
    echo "   Avvia Docker e riprova."
    exit 1
fi

echo -e "${YELLOW}📋 Modifiche implementate:${NC}"
echo "   - Backend: Nuovo endpoint POST /api/puzzles/session/{id}/reset"
echo "   - Backend: Metodo reset_puzzles_for_session() nel PuzzleService"
echo "   - Frontend: Pulsante 🔄 RESET ENIGMI nella Lobby"
echo ""

# Chiedi conferma
read -p "Vuoi procedere con il deploy? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}⚠️  Deploy annullato${NC}"
    exit 0
fi

echo ""
echo -e "${YELLOW}🛑 Step 1: Fermo i container...${NC}"
docker-compose down

echo ""
echo -e "${YELLOW}🔨 Step 2: Rebuild Backend (con modifiche API)...${NC}"
docker-compose build --no-cache backend

echo ""
echo -e "${YELLOW}🎨 Step 3: Rebuild Frontend (con nuovo pulsante Lobby)...${NC}"
docker-compose build --no-cache frontend

echo ""
echo -e "${YELLOW}🚀 Step 4: Avvio container aggiornati...${NC}"
docker-compose up -d

echo ""
echo -e "${YELLOW}⏳ Attendo che i servizi siano pronti...${NC}"
sleep 10

echo ""
echo -e "${YELLOW}🔍 Step 5: Verifico stato container...${NC}"
docker-compose ps

echo ""
echo -e "${YELLOW}📊 Step 6: Verifico logs backend...${NC}"
echo "   (ctrl+c per uscire dai logs)"
sleep 2
docker-compose logs --tail=20 backend

echo ""
echo -e "${GREEN}✅ =========================================="
echo -e "✅ DEPLOY COMPLETATO!"
echo -e "✅ ==========================================${NC}"
echo ""
echo -e "${GREEN}🎯 Funzionalità disponibili:${NC}"
echo "   1. Vai alla Lobby: http://localhost/admin/session/{sessionId}/lobby"
echo "   2. Troverai il nuovo pulsante arancione '🔄 RESET ENIGMI'"
echo "   3. Usa il pulsante per resettare tutti i 13 enigmi"
echo ""
echo -e "${YELLOW}📝 Note:${NC}"
echo "   - Il reset NON espelle i giocatori"
echo "   - Il reset NON termina la sessione"
echo "   - Il reset è un 'soft reset' (mantiene i record)"
echo "   - Richiede conferma prima di procedere"
echo ""
echo -e "${GREEN}📚 Documentazione completa:${NC}"
echo "   Leggi: PUZZLE_RESET_SYSTEM.md"
echo ""
echo -e "${YELLOW}🧪 Test rapido API:${NC}"
echo "   curl -X POST http://localhost/api/puzzles/session/1/reset"
echo ""

# Chiedi se mostrare i logs in tempo reale
read -p "Vuoi vedere i logs in tempo reale? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    echo -e "${YELLOW}📋 Logs in tempo reale (ctrl+c per uscire):${NC}"
    docker-compose logs -f
fi