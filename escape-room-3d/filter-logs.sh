#!/bin/bash

# 🔍 Docker Backend Log Filter
# Script per filtrare i log del backend Docker in modo intelligente

# Colori per output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Container name
CONTAINER="escape-backend-dev"

echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   🔍 Backend Docker Log Filter         ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
echo ""

# Check se container esiste
if ! docker ps -a --format '{{.Names}}' | grep -q "^${CONTAINER}$"; then
    echo -e "${RED}❌ Container ${CONTAINER} non trovato!${NC}"
    echo -e "${YELLOW}💡 Verifica che Docker sia avviato con: ./docker.sh dev${NC}"
    exit 1
fi

# Check se container è in running
if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER}$"; then
    echo -e "${RED}❌ Container ${CONTAINER} non è in esecuzione!${NC}"
    echo -e "${YELLOW}💡 Avvia con: ./docker.sh dev${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Container trovato e in esecuzione${NC}"
echo ""
echo -e "${YELLOW}Seleziona il tipo di filtraggio:${NC}"
echo ""
echo "  [1] 🚪 LED & Porta Cucina (debug porta lampeggiante)"
echo "  [2] 🌿 Puzzle Cucina Completo (fornelli, frigo, serra, porta)"
echo "  [3] 🎮 Game Completion (vittoria, stato stanze)"
echo "  [4] 📡 WebSocket & Broadcast"
echo "  [5] ❌ Solo Errori"
echo "  [6] 🔥 Eventi Critici (✅ ❌ 🚀 🏆)"
echo "  [7] 📋 Tutto (nessun filtro)"
echo "  [0] ❌ Esci"
echo ""
read -p "Scegli [0-7]: " choice

case $choice in
    1)
        echo -e "\n${GREEN}🚪 Filtraggio: LED & Porta Cucina${NC}"
        echo -e "${YELLOW}Press Ctrl+C to exit${NC}\n"
        docker logs -f "$CONTAINER" 2>&1 | grep --line-buffered -E "🔍|LED|door_led|blinking|porta|PORTA"
        ;;
    2)
        echo -e "\n${GREEN}🌿 Filtraggio: Puzzle Cucina Completo${NC}"
        echo -e "${YELLOW}Press Ctrl+C to exit${NC}\n"
        docker logs -f "$CONTAINER" 2>&1 | grep --line-buffered -E "🔥|🧊|🌿|🚪|fornelli|frigo|serra|porta|kitchen|KitchenPuzzle"
        ;;
    3)
        echo -e "\n${GREEN}🎮 Filtraggio: Game Completion${NC}"
        echo -e "${YELLOW}Press Ctrl+C to exit${NC}\n"
        docker logs -f "$CONTAINER" 2>&1 | grep --line-buffered -E "🏆|game_completion|GameCompletion|victory|rooms_status|game_won"
        ;;
    4)
        echo -e "\n${GREEN}📡 Filtraggio: WebSocket & Broadcast${NC}"
        echo -e "${YELLOW}Press Ctrl+C to exit${NC}\n"
        docker logs -f "$CONTAINER" 2>&1 | grep --line-buffered -E "📡|🚀|WebSocket|broadcast|socket"
        ;;
    5)
        echo -e "\n${GREEN}❌ Filtraggio: Solo Errori${NC}"
        echo -e "${YELLOW}Press Ctrl+C to exit${NC}\n"
        docker logs -f "$CONTAINER" 2>&1 | grep --line-buffered -E "ERROR|Error|error|❌|Exception|Traceback"
        ;;
    6)
        echo -e "\n${GREEN}🔥 Filtraggio: Eventi Critici${NC}"
        echo -e "${YELLOW}Press Ctrl+C to exit${NC}\n"
        docker logs -f "$CONTAINER" 2>&1 | grep --line-buffered -E "✅|❌|🚀|🏆|🔥|ERROR"
        ;;
    7)
        echo -e "\n${GREEN}📋 Mostrando tutti i log (nessun filtro)${NC}"
        echo -e "${YELLOW}Press Ctrl+C to exit${NC}\n"
        docker logs -f "$CONTAINER" 2>&1
        ;;
    0)
        echo -e "\n${BLUE}👋 Uscita...${NC}"
        exit 0
        ;;
    *)
        echo -e "\n${RED}❌ Scelta non valida!${NC}"
        exit 1
        ;;
esac
