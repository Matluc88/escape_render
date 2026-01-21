#!/bin/bash

# ==================================================
# 🐳 Escape Room 3D - Script Gestione Docker
# ==================================================
# Script semplice per gestire l'applicazione Docker

set -e

# Colori per output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Directory del progetto
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# ==================================================
# Funzioni Utility
# ==================================================

print_header() {
    echo -e "${BLUE}"
    echo "╔════════════════════════════════════════════════╗"
    echo "║   🏠 Escape Room 3D - Gestione Docker 🐳      ║"
    echo "╚════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# ==================================================
# Funzioni Principali
# ==================================================

check_requirements() {
    print_info "Controllo requisiti..."
    
    if ! command -v docker &> /dev/null; then
        print_error "Docker non installato!"
        echo "Installa Docker da: https://docs.docker.com/get-docker/"
        exit 1
    fi
    
    if ! command -v docker compose &> /dev/null && ! command -v docker-compose &> /dev/null; then
        print_error "Docker Compose non installato!"
        echo "Installa Docker Compose da: https://docs.docker.com/compose/install/"
        exit 1
    fi
    
    print_success "Requisiti OK"
}

check_env() {
    if [ ! -f ".env" ]; then
        print_warning "File .env non trovato!"
        print_info "Creo .env da .env.docker..."
        if [ -f ".env.docker" ]; then
            cp .env.docker .env
            print_success ".env creato! Modifica le configurazioni se necessario."
        else
            print_error "Template .env.docker non trovato!"
            exit 1
        fi
    else
        print_success "File .env trovato"
    fi
}

# Avvia i container
start() {
    print_header
    print_info "Avvio dell'applicazione..."
    
    check_requirements
    check_env
    
    echo ""
    print_info "Building e avvio dei container (può richiedere tempo alla prima esecuzione)..."
    docker compose up -d --build
    
    echo ""
    print_success "Applicazione avviata!"
    show_urls
}

# Ferma i container
stop() {
    print_header
    print_info "Arresto dell'applicazione..."
    
    docker compose down
    
    print_success "Applicazione arrestata!"
}

# Riavvia i container
restart() {
    print_header
    print_info "Riavvio dell'applicazione..."
    
    stop
    sleep 2
    start
}

# Mostra i logs
logs() {
    print_header
    
    if [ -z "$1" ]; then
        print_info "Visualizzazione logs di tutti i servizi..."
        echo "Premi Ctrl+C per uscire"
        echo ""
        docker compose logs -f
    else
        print_info "Visualizzazione logs di: $1..."
        echo "Premi Ctrl+C per uscire"
        echo ""
        docker compose logs -f "$1"
    fi
}

# Mostra lo status
status() {
    print_header
    print_info "Status dei container:"
    echo ""
    docker compose ps
    echo ""
    
    print_info "Uso risorse:"
    echo ""
    docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}" $(docker compose ps -q)
}

# Mostra gli URL
show_urls() {
    local IP=$(hostname -I 2>/dev/null | awk '{print $1}' || echo "localhost")
    local PORT=${FRONTEND_PORT:-80}
    
    echo ""
    print_success "🌐 Applicazione disponibile su:"
    echo ""
    echo "  Frontend:    http://localhost:${PORT}"
    echo "  API:         http://localhost:${PORT}/api"
    echo "  WebSocket:   ws://localhost:${PORT}/ws"
    echo "  MQTT:        mqtt://localhost:1883"
    echo ""
    
    if [ "$IP" != "localhost" ]; then
        echo "  🌍 Accesso da rete locale:"
        echo "  Frontend:    http://${IP}:${PORT}"
        echo "  API:         http://${IP}:${PORT}/api"
        echo ""
    fi
    
    print_info "Usa './docker.sh logs' per vedere i logs in tempo reale"
}

# Build delle immagini
build() {
    print_header
    print_info "Building delle immagini Docker..."
    
    check_requirements
    check_env
    
    docker compose build --no-cache
    
    print_success "Build completato!"
}

# Pulizia completa
clean() {
    print_header
    print_warning "Questo rimuoverà TUTTI i container, volumi e immagini!"
    read -p "Sei sicuro? (y/N) " -n 1 -r
    echo
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        print_info "Pulizia in corso..."
        
        docker compose down -v --rmi all
        
        print_success "Pulizia completata!"
    else
        print_info "Operazione annullata"
    fi
}

# Backup del database
backup() {
    print_header
    print_info "Backup del database..."
    
    BACKUP_DIR="backups"
    mkdir -p "$BACKUP_DIR"
    
    TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    BACKUP_FILE="$BACKUP_DIR/backup_${TIMESTAMP}.sql"
    
    docker compose exec -T db pg_dump -U ${POSTGRES_USER:-escape_user} ${POSTGRES_DB:-escape_db} > "$BACKUP_FILE"
    
    print_success "Backup creato: $BACKUP_FILE"
}

# Restore del database
restore() {
    if [ -z "$1" ]; then
        print_error "Specifica il file di backup!"
        echo "Uso: ./docker.sh restore <file.sql>"
        exit 1
    fi
    
    if [ ! -f "$1" ]; then
        print_error "File non trovato: $1"
        exit 1
    fi
    
    print_header
    print_warning "Questo sovrascriverà il database corrente!"
    read -p "Sei sicuro? (y/N) " -n 1 -r
    echo
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        print_info "Restore in corso..."
        
        docker compose exec -T db psql -U ${POSTGRES_USER:-escape_user} ${POSTGRES_DB:-escape_db} < "$1"
        
        print_success "Restore completato!"
    else
        print_info "Operazione annullata"
    fi
}

# Shell nel container
shell() {
    local service=${1:-backend}
    
    print_header
    print_info "Apertura shell in: $service"
    
    docker compose exec "$service" /bin/sh
}

# Aggiornamento
update() {
    print_header
    print_info "Aggiornamento dell'applicazione..."
    
    # Pull delle modifiche
    if [ -d ".git" ]; then
        print_info "Pull da Git..."
        git pull
    fi
    
    # Rebuild e restart
    print_info "Rebuild dei container..."
    docker compose up -d --build
    
    print_success "Aggiornamento completato!"
    show_urls
}

# Health check
health() {
    print_header
    print_info "Health check dei servizi..."
    echo ""
    
    # Frontend
    if curl -sf http://localhost/health > /dev/null 2>&1; then
        print_success "Frontend: OK"
    else
        print_error "Frontend: NON DISPONIBILE"
    fi
    
    # Backend (assumendo che sia dietro nginx su /api)
    if curl -sf http://localhost/api/health > /dev/null 2>&1; then
        print_success "Backend: OK"
    else
        print_error "Backend: NON DISPONIBILE"
    fi
    
    # Database
    if docker compose exec -T db pg_isready -U ${POSTGRES_USER:-escape_user} > /dev/null 2>&1; then
        print_success "Database: OK"
    else
        print_error "Database: NON DISPONIBILE"
    fi
    
    # MQTT
    if nc -z localhost 1883 > /dev/null 2>&1; then
        print_success "MQTT: OK"
    else
        print_error "MQTT: NON DISPONIBILE"
    fi
}

# Help
show_help() {
    print_header
    echo "Uso: ./docker.sh [comando] [opzioni]"
    echo ""
    echo "Comandi disponibili:"
    echo ""
    echo "  start              Avvia l'applicazione"
    echo "  stop               Ferma l'applicazione"
    echo "  restart            Riavvia l'applicazione"
    echo "  status             Mostra lo status dei container"
    echo "  logs [servizio]    Mostra i logs (opzionale: frontend, backend, db, mqtt)"
    echo "  urls               Mostra gli URL dell'applicazione"
    echo "  health             Verifica lo stato dei servizi"
    echo ""
    echo "  build              Build delle immagini Docker"
    echo "  update             Aggiorna e riavvia l'applicazione"
    echo "  clean              Rimuove tutto (container, volumi, immagini)"
    echo ""
    echo "  backup             Backup del database"
    echo "  restore <file>     Restore del database da file"
    echo "  shell [servizio]   Apri una shell nel container (default: backend)"
    echo ""
    echo "  help               Mostra questo messaggio"
    echo ""
    echo "Esempi:"
    echo "  ./docker.sh start                # Avvia tutto"
    echo "  ./docker.sh logs backend         # Vedi logs del backend"
    echo "  ./docker.sh backup               # Backup del database"
    echo "  ./docker.sh restore backup.sql   # Restore del database"
    echo ""
}

# ==================================================
# Main
# ==================================================

case "${1:-help}" in
    start)
        start
        ;;
    stop)
        stop
        ;;
    restart)
        restart
        ;;
    logs)
        logs "$2"
        ;;
    status|ps)
        status
        ;;
    urls)
        print_header
        show_urls
        ;;
    build)
        build
        ;;
    clean)
        clean
        ;;
    backup)
        backup
        ;;
    restore)
        restore "$2"
        ;;
    shell)
        shell "$2"
        ;;
    update)
        update
        ;;
    health)
        health
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        print_error "Comando non riconosciuto: $1"
        echo ""
        show_help
        exit 1
        ;;
esac
