#!/bin/bash

###############################################################################
# Escape Room 3D - Raspberry Pi Deployment Script
###############################################################################
# Questo script automatizza il deployment completo dell'applicazione
# su Raspberry Pi utilizzando Docker Compose
###############################################################################

set -e  # Exit on error

# Colori per output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Funzioni di utility
print_info() {
    echo -e "${BLUE}ℹ ${1}${NC}"
}

print_success() {
    echo -e "${GREEN}✓ ${1}${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ ${1}${NC}"
}

print_error() {
    echo -e "${RED}✗ ${1}${NC}"
}

# Banner
clear
echo -e "${BLUE}"
echo "╔═══════════════════════════════════════════════════════════╗"
echo "║        Escape Room 3D - Raspberry Pi Deployment          ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Verifica che lo script sia eseguito come utente normale (non root)
if [ "$EUID" -eq 0 ]; then 
    print_error "Non eseguire questo script come root!"
    print_info "Esegui: ./deploy-raspberry.sh"
    exit 1
fi

# Verifica prerequisiti
print_info "Verifica prerequisiti..."

# Controlla Docker
if ! command -v docker &> /dev/null; then
    print_error "Docker non è installato!"
    print_info "Installa Docker con: curl -fsSL https://get.docker.com | sh"
    exit 1
fi
print_success "Docker installato"

# Controlla Docker Compose
if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    print_error "Docker Compose non è installato!"
    print_info "Installa Docker Compose"
    exit 1
fi
print_success "Docker Compose installato"

# Verifica che l'utente sia nel gruppo docker
if ! groups | grep -q docker; then
    print_warning "L'utente non è nel gruppo docker"
    print_info "Aggiungi l'utente al gruppo: sudo usermod -aG docker $USER"
    print_info "Poi fai logout e login"
    exit 1
fi
print_success "Utente nel gruppo docker"

# Verifica file .env
print_info "Verifica configurazione..."
if [ ! -f ".env" ]; then
    print_warning "File .env non trovato"
    if [ -f ".env.docker" ]; then
        print_info "Copia .env.docker in .env..."
        cp .env.docker .env
        print_success "File .env creato"
        print_warning "IMPORTANTE: Modifica .env con le tue configurazioni!"
        print_info "Specialmente cambia:"
        print_info "  - POSTGRES_PASSWORD"
        print_info "  - SECRET_KEY"
        print_info "  - CORS_ORIGINS (aggiungi l'IP del Raspberry Pi)"
        read -p "Premi ENTER dopo aver configurato .env..."
    else
        print_error "File .env.docker non trovato!"
        exit 1
    fi
else
    print_success "File .env trovato"
fi

# Mostra informazioni sistema
print_info "Informazioni sistema:"
echo "  - OS: $(uname -s)"
echo "  - Architettura: $(uname -m)"
echo "  - RAM disponibile: $(free -h | awk '/^Mem:/ {print $7}')"
echo "  - Spazio disco: $(df -h . | awk 'NR==2 {print $4}')"

# Chiedi conferma
echo ""
print_warning "Stai per avviare il deployment. Questo processo:"
echo "  1. Fermerà i container esistenti (se presenti)"
echo "  2. Scaricherà/builderà le immagini Docker"
echo "  3. Avvierà tutti i servizi"
echo ""
read -p "Vuoi continuare? (y/n) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    print_info "Deployment annullato"
    exit 0
fi

# Stop container esistenti
print_info "Ferma container esistenti..."
docker-compose down 2>/dev/null || true
print_success "Container fermati"

# Pulizia volumi (opzionale - commentato per sicurezza)
# print_warning "ATTENZIONE: Vuoi eliminare anche i volumi (database, dati MQTT)?"
# read -p "Elimina volumi? (y/n) " -n 1 -r
# echo ""
# if [[ $REPLY =~ ^[Yy]$ ]]; then
#     docker-compose down -v
#     print_success "Volumi eliminati"
# fi

# Build delle immagini
print_info "Build delle immagini Docker..."
print_warning "Questo può richiedere 10-30 minuti su Raspberry Pi..."
if docker-compose build --pull; then
    print_success "Build completata"
else
    print_error "Errore durante la build"
    exit 1
fi

# Avvio dei servizi
print_info "Avvio dei servizi..."
if docker-compose up -d; then
    print_success "Servizi avviati"
else
    print_error "Errore durante l'avvio"
    exit 1
fi

# Attendi che i servizi siano healthy
print_info "Attendo che i servizi siano pronti (max 120 secondi)..."
SECONDS=0
while [ $SECONDS -lt 120 ]; do
    if docker-compose ps | grep -q "healthy"; then
        print_success "Servizi pronti!"
        break
    fi
    echo -n "."
    sleep 5
done
echo ""

# Mostra status
print_info "Status dei servizi:"
docker-compose ps

# Ottieni l'IP del Raspberry Pi
IP=$(hostname -I | awk '{print $1}')

# Successo!
echo ""
echo -e "${GREEN}"
echo "╔═══════════════════════════════════════════════════════════╗"
echo "║              🎉 DEPLOYMENT COMPLETATO! 🎉                 ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo -e "${NC}"
echo ""
print_success "L'applicazione è ora disponibile:"
echo ""
echo -e "  ${BLUE}Frontend:${NC}  http://${IP}"
echo -e "  ${BLUE}API:${NC}       http://${IP}/api"
echo -e "  ${BLUE}MQTT:${NC}      mqtt://${IP}:1883"
echo -e "  ${BLUE}MQTT WS:${NC}   ws://${IP}:9001"
echo ""
print_info "Comandi utili:"
echo "  - Vedi logs:           docker-compose logs -f"
echo "  - Ferma servizi:       docker-compose stop"
echo "  - Riavvia servizi:     docker-compose restart"
echo "  - Elimina tutto:       docker-compose down -v"
echo ""
print_warning "Ricorda di aprire le porte nel firewall se necessario!"
echo ""
