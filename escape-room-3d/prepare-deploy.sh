#!/bin/bash
#
# Script Preparazione Deploy Raspberry Pi
# Crea pacchetto pronto per trasferimento e deploy
#

set -e

echo "🍓 Preparazione Deploy Raspberry Pi + Mango"
echo "=========================================="
echo ""

# Directory corrente
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PARENT_DIR="$(dirname "$PROJECT_DIR")"
DEPLOY_FILE="$PARENT_DIR/escape-room-deploy.tar.gz"

echo "📁 Progetto: $PROJECT_DIR"
echo "📦 Output: $DEPLOY_FILE"
echo ""

# Pulizia file temporanei
echo "🧹 Pulizia file temporanei..."
find "$PROJECT_DIR" -name "*.pyc" -delete 2>/dev/null || true
find "$PROJECT_DIR" -name "__pycache__" -type d -exec rm -rf {} + 2>/dev/null || true
find "$PROJECT_DIR" -name ".DS_Store" -delete 2>/dev/null || true

# Build frontend
echo "🔨 Build frontend (npm run build)..."
cd "$PROJECT_DIR"
if [ -f "package.json" ]; then
    echo "   - Installazione dipendenze..."
    npm install
    echo "   - Building frontend..."
    npm run build
    echo "✅ Frontend buildato!"
else
    echo "⚠️  Nessun package.json trovato, skip build frontend"
fi
echo ""

# Creazione archivio
echo "📦 Creazione archivio (questo potrebbe richiedere qualche minuto)..."
cd "$PROJECT_DIR"

# Disabilita metadati Apple (xattr) per evitare null bytes
export COPYFILE_DISABLE=1

tar --exclude='node_modules' \
    --exclude='.git' \
    --exclude='__pycache__' \
    --exclude='*.pyc' \
    --exclude='.DS_Store' \
    --exclude='backups' \
    --exclude='*.log' \
    --exclude='.env.local' \
    -czf "$DEPLOY_FILE" .

# Verifica dimensione
SIZE=$(du -h "$DEPLOY_FILE" | cut -f1)
echo ""
echo "✅ Archivio creato: $DEPLOY_FILE"
echo "📊 Dimensione: $SIZE"
echo ""

# Istruzioni
echo "🚀 PROSSIMI PASSI:"
echo ""
echo "1. Trasferisci il file su Raspberry Pi:"
echo "   scp $DEPLOY_FILE pi@192.168.8.1:/home/pi/"
echo ""
echo "2. SSH su Raspberry:"
echo "   ssh pi@192.168.8.1"
echo ""
echo "3. Estrai e configura:"
echo "   cd /home/pi"
echo "   mkdir -p escape-room-3d"
echo "   tar -xzf escape-room-deploy.tar.gz -C escape-room-3d"
echo "   cd escape-room-3d"
echo ""
echo "4. Segui la guida:"
echo "   Vedi DEPLOY_RASPBERRY_MANGO_COMPLETO.md"
echo ""
echo "=========================================="
echo "✅ Preparazione completata!"
