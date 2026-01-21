#!/bin/bash

# =====================================================
# Script per Spegnere il Raspberry Pi in Modo Sicuro
# =====================================================

echo "=============================================="
echo "  🔴 SHUTDOWN RASPBERRY PI - ESCAPE ROOM"
echo "=============================================="
echo ""

# Colori per output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Verifica se siamo su Raspberry Pi
if [[ ! -f /proc/device-tree/model ]] || ! grep -q "Raspberry Pi" /proc/device-tree/model 2>/dev/null; then
    echo -e "${YELLOW}⚠️  ATTENZIONE: Questo script è progettato per Raspberry Pi${NC}"
    echo -e "${YELLOW}   Sembra che tu non sia su un Raspberry Pi.${NC}"
    echo ""
    read -p "Vuoi continuare comunque? (s/n): " confirm
    if [[ $confirm != "s" && $confirm != "S" ]]; then
        echo -e "${GREEN}✅ Operazione annullata${NC}"
        exit 0
    fi
fi

echo -e "${YELLOW}📋 Questo script spegnerà il Raspberry Pi in modo sicuro.${NC}"
echo ""
echo "Prima dello spegnimento verranno eseguiti:"
echo "  1. ⏸️  Stop di tutti i container Docker"
echo "  2. 💾 Sincronizzazione filesystem"
echo "  3. 🔴 Shutdown del sistema"
echo ""

# Chiedi conferma
read -p "🔴 Sei sicuro di voler spegnere il Raspberry Pi? (s/n): " confirm

if [[ $confirm != "s" && $confirm != "S" ]]; then
    echo ""
    echo -e "${GREEN}✅ Operazione annullata. Sistema ancora attivo.${NC}"
    exit 0
fi

echo ""
echo -e "${YELLOW}🚀 Avvio procedura di spegnimento...${NC}"
echo ""

# 1. Stop Docker containers (se Docker è installato)
if command -v docker &> /dev/null; then
    echo "⏸️  Stopping Docker containers..."
    docker stop $(docker ps -q) 2>/dev/null
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}   ✅ Docker containers fermati${NC}"
    else
        echo -e "${YELLOW}   ℹ️  Nessun container in esecuzione o Docker non disponibile${NC}"
    fi
    sleep 2
else
    echo -e "${YELLOW}ℹ️  Docker non trovato, skip...${NC}"
fi

# 2. Sincronizza filesystem
echo ""
echo "💾 Sincronizzazione filesystem..."
sync
sync
echo -e "${GREEN}   ✅ Filesystem sincronizzato${NC}"
sleep 1

# 3. Shutdown
echo ""
echo -e "${RED}🔴 Spegnimento in corso...${NC}"
echo -e "${YELLOW}   Puoi scollegare l'alimentazione quando tutti i LED si spengono.${NC}"
echo ""
sleep 2

# Esegui shutdown
sudo shutdown -h now

# Questo non dovrebbe essere raggiunto, ma per sicurezza
echo ""
echo -e "${RED}Se vedi questo messaggio, lo shutdown potrebbe aver fallito.${NC}"
echo "Riprova con: sudo shutdown -h now"