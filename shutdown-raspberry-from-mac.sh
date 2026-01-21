#!/bin/bash

# =====================================================
# Script per Spegnere Raspberry Pi da Mac (con sshpass)
# =====================================================

echo "=============================================="
echo "  🔴 SHUTDOWN RASPBERRY PI DA MAC"
echo "=============================================="
echo ""

# Configurazione
RASPBERRY_IP="192.168.8.10"
RASPBERRY_USER="escape"
RASPBERRY_PASSWORD="escape"

# Colori
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Verifica se sshpass è installato
if ! command -v sshpass &> /dev/null; then
    echo -e "${RED}❌ ERRORE: sshpass non è installato!${NC}"
    echo ""
    echo "Per installare sshpass su Mac:"
    echo "  brew install hudochenkov/sshpass/sshpass"
    echo ""
    echo "Oppure usa Homebrew:"
    echo "  brew install esolitos/ipa/sshpass"
    echo ""
    exit 1
fi

echo -e "${YELLOW}📋 Spegnerò il Raspberry Pi all'indirizzo: ${RASPBERRY_IP}${NC}"
echo ""

# Chiedi conferma
read -p "🔴 Sei sicuro di voler spegnere il Raspberry Pi? (s/n): " confirm

if [[ $confirm != "s" && $confirm != "S" ]]; then
    echo ""
    echo -e "${GREEN}✅ Operazione annullata.${NC}"
    exit 0
fi

echo ""
echo -e "${YELLOW}🚀 Connessione al Raspberry Pi...${NC}"
echo ""

# Test connessione
if ! sshpass -p "$RASPBERRY_PASSWORD" ssh -o StrictHostKeyChecking=no -o ConnectTimeout=5 "$RASPBERRY_USER@$RASPBERRY_IP" "echo 'Connesso!' > /dev/null" 2>/dev/null; then
    echo -e "${RED}❌ ERRORE: Impossibile connettersi al Raspberry Pi!${NC}"
    echo ""
    echo "Verifica:"
    echo "  - Raspberry Pi acceso"
    echo "  - Indirizzo IP corretto: $RASPBERRY_IP"
    echo "  - Rete attiva"
    echo ""
    exit 1
fi

echo -e "${GREEN}✅ Connesso al Raspberry Pi!${NC}"
echo ""

# Stop Docker containers
echo "⏸️  Stopping Docker containers..."
sshpass -p "$RASPBERRY_PASSWORD" ssh -o StrictHostKeyChecking=no "$RASPBERRY_USER@$RASPBERRY_IP" \
    "docker stop \$(docker ps -q) 2>/dev/null" 2>/dev/null

if [ $? -eq 0 ]; then
    echo -e "${GREEN}   ✅ Docker containers fermati${NC}"
else
    echo -e "${YELLOW}   ℹ️  Nessun container in esecuzione${NC}"
fi

sleep 2

# Sincronizza filesystem
echo ""
echo "💾 Sincronizzazione filesystem..."
sshpass -p "$RASPBERRY_PASSWORD" ssh -o StrictHostKeyChecking=no "$RASPBERRY_USER@$RASPBERRY_IP" \
    "sync && sync"

echo -e "${GREEN}   ✅ Filesystem sincronizzato${NC}"
sleep 1

# Shutdown
echo ""
echo -e "${RED}🔴 Invio comando di spegnimento...${NC}"
echo ""

sshpass -p "$RASPBERRY_PASSWORD" ssh -o StrictHostKeyChecking=no "$RASPBERRY_USER@$RASPBERRY_IP" \
    "sudo shutdown -h now" 2>/dev/null

sleep 2

echo -e "${GREEN}✅ Comando di shutdown inviato con successo!${NC}"
echo ""
echo -e "${YELLOW}📋 Il Raspberry Pi si sta spegnendo...${NC}"
echo -e "${YELLOW}   Attendere che tutti i LED si spengano prima di scollegare l'alimentazione.${NC}"
echo ""
echo -e "${GREEN}🎉 Operazione completata!${NC}"