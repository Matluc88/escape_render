#!/bin/bash

# Script per applicare il fix dell'health check del frontend
# Data: 09/01/2026

set -e  # Exit on error

echo "🔧 Fix Health Check Frontend - Escape Room 3D"
echo "=============================================="
echo ""

# Colori per output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Funzione per stampare con colori
print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

# Verifica di essere nella directory corretta
if [ ! -f "docker-compose.yml" ]; then
    print_error "File docker-compose.yml non trovato!"
    print_error "Esegui questo script dalla directory escape-room-3d"
    exit 1
fi

print_success "Directory corretta trovata"
echo ""

# Mostra stato attuale
print_info "Stato attuale dei container:"
docker ps --format "table {{.Names}}\t{{.Status}}" | grep -E "NAMES|escape-"
echo ""

# Chiedi conferma
print_warning "Questo script farà il rebuild del container frontend."
print_warning "Il servizio sarà brevemente offline durante il rebuild."
echo ""
read -p "Vuoi continuare? (y/n) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    print_info "Operazione annullata."
    exit 0
fi

echo ""
print_info "Inizio procedura di fix..."
echo ""

# Step 1: Ferma il container frontend
print_info "Step 1/4: Fermo il container frontend..."
docker-compose stop frontend
print_success "Container frontend fermato"
echo ""

# Step 2: Rebuild dell'immagine
print_info "Step 2/4: Rebuild dell'immagine frontend (può richiedere 2-5 minuti)..."
docker-compose build frontend
print_success "Rebuild completato"
echo ""

# Step 3: Riavvia il container
print_info "Step 3/4: Riavvio del container frontend..."
docker-compose up -d frontend
print_success "Container riavviato"
echo ""

# Step 4: Attendi che il servizio sia pronto
print_info "Step 4/4: Attendo che il servizio sia pronto (30 secondi)..."
sleep 30
echo ""

# Verifica lo stato
print_info "Verifica dello stato finale:"
docker ps --format "table {{.Names}}\t{{.Status}}" | grep -E "NAMES|escape-frontend"
echo ""

# Test dell'endpoint health
print_info "Test dell'endpoint /health..."
if curl -f -s http://localhost/health > /dev/null 2>&1; then
    print_success "Endpoint /health risponde correttamente!"
else
    print_warning "Endpoint /health non raggiungibile (potrebbe essere normale se la porta è diversa da 80)"
fi
echo ""

# Verifica health check
HEALTH_STATUS=$(docker inspect --format='{{.State.Health.Status}}' escape-frontend 2>/dev/null || echo "unknown")

echo ""
print_info "==================================="
print_info "RISULTATO FINALE"
print_info "==================================="

if [ "$HEALTH_STATUS" = "healthy" ]; then
    print_success "✓ HEALTH CHECK: HEALTHY"
    print_success "Il fix è stato applicato con successo!"
elif [ "$HEALTH_STATUS" = "starting" ]; then
    print_warning "⚡ HEALTH CHECK: STARTING"
    print_info "Il container si sta avviando. Attendi altri 30 secondi e controlla con:"
    echo "  docker ps"
elif [ "$HEALTH_STATUS" = "unhealthy" ]; then
    print_error "✗ HEALTH CHECK: UNHEALTHY"
    print_warning "Controlla i log con:"
    echo "  docker logs escape-frontend"
else
    print_warning "⚠ HEALTH CHECK: $HEALTH_STATUS"
    print_info "Stato non riconosciuto. Controlla manualmente con:"
    echo "  docker ps"
fi

echo ""
print_info "Per vedere i log del frontend:"
echo "  docker logs -f escape-frontend"
echo ""
print_info "Per verificare manualmente l'health check:"
echo "  docker exec escape-frontend curl -f http://localhost:80/health"
echo ""

print_success "Script completato!"
