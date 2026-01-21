#!/bin/bash
# ==================================================
# Deploy Completo Escape Room su Raspberry Pi
# Versione INTERATTIVA (con password SSH)
# ==================================================
# Fix: Nginx proxy API + MAG1 Soggiorno Animation
# Data: 15/01/2026 06:38

set -e  # Exit on error

# Configurazione
RASPBERRY_IP="192.168.8.10"
RASPBERRY_USER="pi"
RASPBERRY_PATH="/home/pi"
ARCHIVE_NAME="escape-room-deploy-sessions-fix.tar.gz"

echo "🚀 Deploy Completo Escape Room"
echo "================================"
echo "Target: $RASPBERRY_USER@$RASPBERRY_IP"
echo "Fix: Nginx API Proxy + MAG1 Animation"
echo ""
echo "⚠️  Ti verrà chiesta la password SSH più volte durante il processo"
echo ""

# Step 1: Crea archivio
echo "📦 Step 1/5: Creazione archivio..."
cd "$(dirname "$0")"
tar -czf "$ARCHIVE_NAME" \
    --exclude='node_modules' \
    --exclude='.git' \
    --exclude='*.tar.gz' \
    --exclude='dist' \
    --exclude='build' \
    --exclude='.DS_Store' \
    --exclude='__pycache__' \
    --exclude='*.pyc' \
    --exclude='.pytest_cache' \
    --exclude='backups' \
    .

ARCHIVE_SIZE=$(du -h "$ARCHIVE_NAME" | cut -f1)
echo "✅ Archivio creato: $ARCHIVE_NAME ($ARCHIVE_SIZE)"

# Step 2: Trasferisci su Raspberry
echo ""
echo "📤 Step 2/5: Trasferimento su Raspberry Pi..."
echo "Inserisci la password per pi@$RASPBERRY_IP:"
scp "$ARCHIVE_NAME" "$RASPBERRY_USER@$RASPBERRY_IP:$RASPBERRY_PATH/"
echo "✅ Trasferimento completato"

# Step 3: Backup e Deploy
echo ""
echo "💾 Step 3/5: Backup e deploy remoto..."
echo "Inserisci la password per pi@$RASPBERRY_IP:"
ssh -t "$RASPBERRY_USER@$RASPBERRY_IP" bash << 'ENDSSH'
    set -e
    cd /home/pi
    
    # Backup vecchia versione
    BACKUP_NAME="escape-room-3d.backup-$(date +%Y%m%d-%H%M%S)"
    echo "📦 Backup: $BACKUP_NAME"
    if [ -d "escape-room-3d" ]; then
        mv escape-room-3d "$BACKUP_NAME"
    fi
    
    # Estrai nuova versione
    echo "📂 Estrazione archivio..."
    mkdir -p escape-room-3d
    tar -xzf escape-room-deploy-sessions-fix.tar.gz -C escape-room-3d
    cd escape-room-3d
    
    echo "✅ Deploy completato"
ENDSSH

# Step 4: Rebuild containers
echo ""
echo "🔨 Step 4/5: Rebuild containers Docker..."
echo "⏰ Questo passaggio richiede 3-5 minuti su Raspberry Pi"
echo "Inserisci la password per pi@$RASPBERRY_IP:"
ssh -t "$RASPBERRY_USER@$RASPBERRY_IP" bash << 'ENDSSH'
    set -e
    cd /home/pi/escape-room-3d
    
    # Stop containers
    echo "⏹️  Stop containers..."
    docker compose down
    
    # Rebuild senza cache
    echo "🔨 Rebuild frontend (con nuovo nginx.conf)..."
    docker compose build --no-cache frontend
    
    echo "🔨 Rebuild backend..."
    docker compose build --no-cache backend
    
    echo "✅ Rebuild completato"
ENDSSH

# Step 5: Avvia containers
echo ""
echo "🚀 Step 5/5: Avvio containers..."
echo "Inserisci la password per pi@$RASPBERRY_IP:"
ssh -t "$RASPBERRY_USER@$RASPBERRY_IP" bash << 'ENDSSH'
    set -e
    cd /home/pi/escape-room-3d
    
    # Avvia tutto
    echo "🚀 Avvio containers..."
    docker compose up -d
    
    echo ""
    echo "⏳ Attendo avvio containers (15 secondi)..."
    sleep 15
    
    echo ""
    echo "📊 Status containers:"
    docker compose ps
    
    echo ""
    echo "🔍 Health check:"
    docker compose ps | grep -E "(healthy|Up)" || echo "⚠️ Alcuni container potrebbero ancora avviarsi"
ENDSSH

# Cleanup locale
echo ""
echo "🧹 Pulizia archivio locale..."
rm -f "$ARCHIVE_NAME"

# Test finale
echo ""
echo "✅ DEPLOY COMPLETATO!"
echo ""
echo "🧪 Test consigliati:"
echo "1. Admin Panel: http://$RASPBERRY_IP/admin"
echo "2. Test API: curl -X POST http://$RASPBERRY_IP/api/sessions"
echo "3. Console browser: Verifica nessun errore 404"
echo ""
echo "📋 Fix applicati:"
echo "  ✅ Nginx proxy API: /api/ → backend/api/"
echo "  ✅ Backend router: prefix='/api/sessions'"
echo "  ✅ MAG1 Soggiorno: Animation hook fix"
echo ""
echo "🔧 Comandi utili:"
echo "  - Logs: ssh $RASPBERRY_USER@$RASPBERRY_IP 'cd escape-room-3d && docker compose logs -f'"
echo "  - Status: ssh $RASPBERRY_USER@$RASPBERRY_IP 'cd escape-room-3d && docker compose ps'"
echo "  - Restart: ssh $RASPBERRY_USER@$RASPBERRY_IP 'cd escape-room-3d && docker compose restart'"
echo ""