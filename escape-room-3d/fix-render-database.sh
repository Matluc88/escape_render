#!/bin/bash

# ========================================
# FIX DATABASE RENDER - SPAWN & DIAGNOSTICA
# ========================================
# Script per fixare coordinate spawn e diagnosticare errori su Render

set -e

echo "🔧 FIX DATABASE RENDER - SPAWN COORDINATES"
echo "=========================================="
echo ""

# Colori per output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Controlla se è stata fornita la DATABASE_URL
if [ -z "$DATABASE_URL" ]; then
    echo -e "${RED}❌ ERROR: DATABASE_URL non impostata${NC}"
    echo ""
    echo "Per usare questo script:"
    echo "1. Vai su Render Dashboard -> Database"
    echo "2. Copia l'External Database URL"
    echo "3. Esegui:"
    echo "   export DATABASE_URL='postgresql://...'"
    echo "   ./fix-render-database.sh"
    echo ""
    exit 1
fi

echo -e "${YELLOW}📊 Verifica stato corrente...${NC}"
echo ""

# Query per vedere lo stato attuale
psql "$DATABASE_URL" -c "SELECT name, spawn_data FROM room_spawn_coordinates ORDER BY name;"

echo ""
echo -e "${YELLOW}🔄 Applico coordinate corrette...${NC}"
echo ""

# Applica il fix
psql "$DATABASE_URL" -f fix-spawn-coordinates-FINALI.sql

echo ""
echo -e "${GREEN}✅ Fix applicato con successo!${NC}"
echo ""

echo -e "${YELLOW}📊 Verifica finale - Coordinate aggiornate:${NC}"
echo ""

# Verifica finale con output formattato
psql "$DATABASE_URL" -c "
SELECT 
    name,
    spawn_data->>'position' as position,
    spawn_data->>'yaw' as yaw
FROM room_spawn_coordinates 
ORDER BY name;
"

echo ""
echo -e "${GREEN}🎉 Database Render aggiornato!${NC}"
echo ""
echo "Passi successivi:"
echo "1. Vai su Render Dashboard -> Web Service"
echo "2. Clicca 'Manual Deploy' -> 'Clear build cache & deploy'"
echo "3. Testa l'applicazione"
echo ""
