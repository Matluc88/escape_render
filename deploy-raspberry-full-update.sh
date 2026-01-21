#!/bin/bash
# ====================================================
# 🚀 DEPLOY COMPLETO RASPBERRY PI - AUTO UPDATE
# ====================================================
# Aggiorna il Raspberry Pi con TUTTE le modifiche locali
# - Build frontend (npm run build)
# - Crea archivio completo
# - Trasferisce su Raspberry
# - Rebuild containers Docker
# - Restart automatico
# Data: 17/01/2026

set -e  # Exit on error

# ====================================================
# CONFIGURAZIONE
# ====================================================

RASPBERRY_IP="192.168.8.10"
RASPBERRY_USER="pi"
RASPBERRY_PASS="escape"
PROJECT_DIR="/Users/matteo/Desktop/ESCAPE/escape-room-3d"
ARCHIVE_NAME="escape-room-full-update-$(date +%Y%m%d-%H%M%S).tar.gz"
ARCHIVE_PATH="/tmp/$ARCHIVE_NAME"

# Colori output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# ====================================================
# FUNZIONI UTILITY
# ====================================================

print_header() {
    echo ""
    echo -e "${BLUE}╔════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║  $1${NC}"
    echo -e "${BLUE}╚════════════════════════════════════════════════╝${NC}"
    echo ""
}

print_step() {
    echo -e "${CYAN}▶ $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Verifica comandi richiesti
check_requirements() {
    print_step "Verifica prerequisiti..."
    
    if ! command -v sshpass &> /dev/null; then
        print_error "sshpass non installato"
        echo "Installa con: brew install sshpass"
        exit 1
    fi
    
    if ! command -v npm &> /dev/null; then
        print_error "npm non installato"
        exit 1
    fi
    
    if [ ! -d "$PROJECT_DIR" ]; then
        print_error "Directory progetto non trovata: $PROJECT_DIR"
        exit 1
    fi
    
    print_success "Prerequisiti OK"
}

# ====================================================
# INIZIO DEPLOY
# ====================================================

clear
print_header "🚀 DEPLOY COMPLETO SU RASPBERRY PI"

echo -e "${CYAN}Target:${NC}     $RASPBERRY_USER@$RASPBERRY_IP"
echo -e "${CYAN}Progetto:${NC}   $PROJECT_DIR"
echo -e "${CYAN}Archivio:${NC}   $ARCHIVE_NAME"
echo ""

# Conferma
read -p "Continuare con il deploy? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    print_warning "Deploy annullato"
    exit 0
fi

# Verifica prerequisiti
check_requirements

# ====================================================
# STEP 1: PULIZIA FILE TEMPORANEI
# ====================================================

print_header "STEP 1/8: Pulizia File Temporanei"

cd "$PROJECT_DIR"

print_step "Rimozione file temporanei..."
find . -name "*.pyc" -delete 2>/dev/null || true
find . -name "__pycache__" -type d -exec rm -rf {} + 2>/dev/null || true
find . -name ".DS_Store" -delete 2>/dev/null || true
find . -name "*.log" -delete 2>/dev/null || true

print_success "Pulizia completata"

# ====================================================
# STEP 2: BUILD FRONTEND
# ====================================================

print_header "STEP 2/8: Build Frontend"

if [ -f "$PROJECT_DIR/package.json" ]; then
    print_step "Installazione dipendenze npm..."
    npm install --quiet
    
    print_step "Building frontend (npm run build)..."
    npm run build
    
    # Verifica build
    if [ -d "$PROJECT_DIR/dist" ]; then
        DIST_SIZE=$(du -sh "$PROJECT_DIR/dist" | cut -f1)
        print_success "Frontend buildato ($DIST_SIZE)"
    else
        print_error "Build frontend fallito - directory dist non trovata"
        exit 1
    fi
else
    print_warning "package.json non trovato - skip build frontend"
fi

# ====================================================
# STEP 3: CREAZIONE ARCHIVIO
# ====================================================

print_header "STEP 3/8: Creazione Archivio"

print_step "Compressione progetto..."

# Disabilita metadati Apple per evitare null bytes
export COPYFILE_DISABLE=1

cd "$PROJECT_DIR"
tar --exclude='node_modules' \
    --exclude='.git' \
    --exclude='__pycache__' \
    --exclude='*.pyc' \
    --exclude='.DS_Store' \
    --exclude='backups' \
    --exclude='*.log' \
    --exclude='.env.local' \
    --exclude='*.tar.gz' \
    --exclude='.pytest_cache' \
    -czf "$ARCHIVE_PATH" .

ARCHIVE_SIZE=$(du -h "$ARCHIVE_PATH" | cut -f1)
print_success "Archivio creato: $ARCHIVE_SIZE"

# ====================================================
# STEP 4: TEST CONNESSIONE RASPBERRY
# ====================================================

print_header "STEP 4/8: Test Connessione Raspberry"

print_step "Test SSH su $RASPBERRY_IP..."

if sshpass -p "$RASPBERRY_PASS" ssh -o ConnectTimeout=5 -o StrictHostKeyChecking=no \
   "$RASPBERRY_USER@$RASPBERRY_IP" "echo 'OK'" &>/dev/null; then
    print_success "Connessione SSH OK"
else
    print_error "Impossibile connettersi a $RASPBERRY_IP"
    print_error "Verifica che il Raspberry sia acceso e raggiungibile"
    rm -f "$ARCHIVE_PATH"
    exit 1
fi

# ====================================================
# STEP 5: TRASFERIMENTO ARCHIVIO
# ====================================================

print_header "STEP 5/8: Trasferimento su Raspberry"

print_step "Upload archivio ($ARCHIVE_SIZE)..."

sshpass -p "$RASPBERRY_PASS" scp -o StrictHostKeyChecking=no \
    "$ARCHIVE_PATH" \
    "$RASPBERRY_USER@$RASPBERRY_IP:/tmp/$ARCHIVE_NAME"

print_success "Archivio trasferito"

# ====================================================
# STEP 6: BACKUP E ESTRAZIONE
# ====================================================

print_header "STEP 6/8: Backup e Estrazione"

print_step "Backup vecchia versione ed estrazione nuova..."

sshpass -p "$RASPBERRY_PASS" ssh -o StrictHostKeyChecking=no \
    "$RASPBERRY_USER@$RASPBERRY_IP" << ENDSSH
    set -e
    cd /home/pi
    
    # Backup vecchia versione
    if [ -d "escape-room-3d" ]; then
        BACKUP_NAME="escape-room-3d.backup-\$(date +%Y%m%d-%H%M%S)"
        echo "📦 Backup: \$BACKUP_NAME"
        mv escape-room-3d "\$BACKUP_NAME"
        
        # Mantieni solo gli ultimi 3 backup
        ls -dt escape-room-3d.backup-* 2>/dev/null | tail -n +4 | xargs rm -rf 2>/dev/null || true
    fi
    
    # Estrai nuova versione
    echo "📂 Estrazione archivio..."
    mkdir -p escape-room-3d
    tar -xzf /tmp/$ARCHIVE_NAME -C escape-room-3d
    
    # Rimuovi archivio
    rm -f /tmp/$ARCHIVE_NAME
    
    echo "✅ Estrazione completata"
ENDSSH

print_success "Backup e estrazione completati"

# ====================================================
# STEP 7: REBUILD DOCKER CONTAINERS
# ====================================================

print_header "STEP 7/8: Rebuild Docker Containers"

print_step "Stop containers..."
print_warning "Questo potrebbe richiedere 3-5 minuti..."

sshpass -p "$RASPBERRY_PASS" ssh -o StrictHostKeyChecking=no \
    "$RASPBERRY_USER@$RASPBERRY_IP" << 'ENDSSH'
    set -e
    cd /home/pi/escape-room-3d
    
    # Stop tutti i container
    echo "⏹️  Stopping containers..."
    docker compose down || true
    
    # Rebuild senza cache
    echo ""
    echo "🔨 Rebuild frontend container..."
    docker compose build --no-cache frontend
    
    echo ""
    echo "🔨 Rebuild backend container..."
    docker compose build --no-cache backend
    
    echo ""
    echo "✅ Rebuild completato"
ENDSSH

print_success "Containers rebuilded"

# ====================================================
# STEP 8: AVVIO E TEST
# ====================================================

print_header "STEP 8/8: Avvio e Verifica"

print_step "Avvio containers..."

sshpass -p "$RASPBERRY_PASS" ssh -o StrictHostKeyChecking=no \
    "$RASPBERRY_USER@$RASPBERRY_IP" << 'ENDSSH'
    set -e
    cd /home/pi/escape-room-3d
    
    # Avvia tutti i servizi
    echo "🚀 Starting containers..."
    docker compose up -d
    
    echo ""
    echo "⏳ Attendo avvio servizi (20 secondi)..."
    sleep 20
    
    echo ""
    echo "📊 Status containers:"
    docker compose ps
ENDSSH

print_success "Containers avviati"

# Test endpoint
print_step "Test endpoint..."
sleep 5

# Test frontend
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://$RASPBERRY_IP/ 2>/dev/null || echo "000")
if [ "$HTTP_CODE" = "200" ]; then
    print_success "Frontend OK (HTTP $HTTP_CODE)"
else
    print_warning "Frontend risponde con HTTP $HTTP_CODE"
fi

# Test backend API
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://$RASPBERRY_IP/api/health 2>/dev/null || echo "000")
if [ "$HTTP_CODE" = "200" ]; then
    print_success "Backend API OK (HTTP $HTTP_CODE)"
else
    print_warning "Backend API risponde con HTTP $HTTP_CODE"
fi

# Pulizia archivio locale
rm -f "$ARCHIVE_PATH"

# ====================================================
# DEPLOY COMPLETATO
# ====================================================

print_header "✅ DEPLOY COMPLETATO!"

echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║           DEPLOY SUCCESSFUL! 🎉                ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════╝${NC}"
echo ""

echo -e "${CYAN}🌐 URLs:${NC}"
echo "   Frontend:    http://$RASPBERRY_IP"
echo "   Admin Panel: http://$RASPBERRY_IP/admin"
echo "   API Docs:    http://$RASPBERRY_IP/api/docs"
echo ""

echo -e "${CYAN}🔧 Comandi Utili:${NC}"
echo "   Logs:        ssh pi@$RASPBERRY_IP 'cd escape-room-3d && docker compose logs -f'"
echo "   Status:      ssh pi@$RASPBERRY_IP 'cd escape-room-3d && docker compose ps'"
echo "   Restart:     ssh pi@$RASPBERRY_IP 'cd escape-room-3d && docker compose restart'"
echo ""

echo -e "${CYAN}📝 Note:${NC}"
echo "   - Archivio: $ARCHIVE_NAME"
echo "   - Backup creato sul Raspberry"
echo "   - Containers rebuilt con --no-cache"
echo ""

echo -e "${YELLOW}💡 Se vedi problemi di cache nel browser:${NC}"
echo "   - Apri DevTools (F12)"
echo "   - Clicca tasto destro su Refresh"
echo "   - Seleziona 'Svuota cache e ricaricamento forzato'"
echo ""