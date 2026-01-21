#!/bin/bash
# Deploy MAG1 Animation Fix - Bagno
# Fix: bathroom.getPuzzleStatus('doccia') → bathroom.docciaStatus

set -e

echo "🎯 Deploy MAG1 Animation Fix - Bagno"
echo "======================================"

RASPBERRY_IP="192.168.8.10"
RASPBERRY_USER="pi"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo ""
echo -e "${YELLOW}📦 Step 1: Build frontend locale...${NC}"
cd escape-room-3d
npm run build

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Build fallito!${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}✅ Build completato!${NC}"

echo ""
echo -e "${YELLOW}📤 Step 2: Comprimi build per transfer...${NC}"
cd dist
tar -czf ../../escape-frontend-mag1-fix.tar.gz .
cd ../..

echo -e "${GREEN}✅ Archivio creato: escape-frontend-mag1-fix.tar.gz${NC}"

echo ""
echo -e "${YELLOW}🚀 Step 3: Upload al Raspberry Pi...${NC}"
sshpass -p "escape" scp escape-frontend-mag1-fix.tar.gz ${RASPBERRY_USER}@${RASPBERRY_IP}:/tmp/

echo ""
echo -e "${YELLOW}🔄 Step 4: Deploy e restart container...${NC}"
sshpass -p "escape" ssh ${RASPBERRY_USER}@${RASPBERRY_IP} << 'EOF'
    set -e
    
    echo "📦 Estrazione archivio..."
    cd /tmp
    rm -rf frontend-new
    mkdir -p frontend-new
    cd frontend-new
    tar -xzf ../escape-frontend-mag1-fix.tar.gz
    
    echo "🔄 Stop container frontend..."
    docker stop escape-frontend || true
    
    echo "🗑️  Backup vecchio frontend..."
    sudo rm -rf /opt/escape-room/frontend-old
    sudo mv /opt/escape-room/frontend /opt/escape-room/frontend-old || true
    
    echo "📥 Deploy nuovo frontend..."
    sudo mkdir -p /opt/escape-room/frontend
    sudo cp -r * /opt/escape-room/frontend/
    
    echo "🚀 Restart container..."
    docker start escape-frontend
    
    echo "⏳ Attendo 5 secondi..."
    sleep 5
    
    echo "🔍 Verifico stato container..."
    docker ps | grep escape-frontend
    
    echo "✅ Deploy completato!"
    
    # Cleanup
    cd /tmp
    rm -rf frontend-new escape-frontend-mag1-fix.tar.gz
EOF

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Deploy fallito!${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}✅✅✅ DEPLOY COMPLETATO CON SUCCESSO! ✅✅✅${NC}"
echo ""
echo "📋 Riepilogo:"
echo "  - File modificato: BathroomScene.jsx"
echo "  - Fix: bathroom.getPuzzleStatus('doccia') → bathroom.docciaStatus"
echo "  - useEffect ora rileva cambio stato correttamente"
echo ""
echo "🧪 Test da fare:"
echo "  1. Apri http://192.168.8.10 nel browser"
echo "  2. Vai nel bagno"
echo "  3. Completa enigma 1 (specchio)"
echo "  4. Triggera MAG1 fisico (chiudi/apri magnete P23)"
echo "  5. Verifica che l'anta doccia si chiuda automaticamente"
echo ""
echo "🔑 Tasto L ancora disponibile per test manuali"
echo ""

# Cleanup locale
rm -f escape-frontend-mag1-fix.tar.gz

echo -e "${GREEN}🎉 FATTO!${NC}"