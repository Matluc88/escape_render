#!/usr/bin/env bash
# ============================================
# VERIFICA SINCRONIZZAZIONE COORDINATE SPAWN
# ============================================
# Controlla che tutte le fonti abbiano le stesse coordinate
# ============================================

# Colori
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}════════════════════════════════════════════${NC}"
echo -e "${BLUE}  VERIFICA SINCRONIZZAZIONE SPAWN${NC}"
echo -e "${BLUE}════════════════════════════════════════════${NC}"
echo ""

ERRORS=0

# 1. Verifica fallback frontend
echo -e "${YELLOW}[1/3]${NC} Verifica fallback frontend (cameraPositioning.js)..."
if grep -q "position: { x: -1.5, y: 0, z: 1.2 }" src/utils/cameraPositioning.js; then
    echo -e "${GREEN}✓ Kitchen coordinates OK${NC}"
else
    echo -e "${RED}✗ Kitchen coordinates WRONG in fallback${NC}"
    ((ERRORS++))
fi

if grep -q "position: { x: 0.53, y: 0, z: 1.52 }" src/utils/cameraPositioning.js; then
    echo -e "${GREEN}✓ Livingroom coordinates OK${NC}"
else
    echo -e "${RED}✗ Livingroom coordinates WRONG in fallback${NC}"
    ((ERRORS++))
fi

if grep -q "position: { x: 1.18, y: 0, z: 2.59 }" src/utils/cameraPositioning.js; then
    echo -e "${GREEN}✓ Bathroom coordinates OK${NC}"
else
    echo -e "${RED}✗ Bathroom coordinates WRONG in fallback${NC}"
    ((ERRORS++))
fi

if grep -q "position: { x: -0.21, y: 0, z: 1.46 }" src/utils/cameraPositioning.js; then
    echo -e "${GREEN}✓ Bedroom coordinates OK${NC}"
else
    echo -e "${RED}✗ Bedroom coordinates WRONG in fallback${NC}"
    ((ERRORS++))
fi
echo ""

# 2. Verifica migration database
echo -e "${YELLOW}[2/3]${NC} Verifica migration (002_add_spawn_data.py)..."
if grep -q '"x": -1.5, "y": 0, "z": 1.2' backend/alembic/versions/002_add_spawn_data.py; then
    echo -e "${GREEN}✓ Kitchen coordinates OK${NC}"
else
    echo -e "${RED}✗ Kitchen coordinates WRONG in migration${NC}"
    ((ERRORS++))
fi

if grep -q '"x": 0.53, "y": 0, "z": 1.52' backend/alembic/versions/002_add_spawn_data.py; then
    echo -e "${GREEN}✓ Livingroom coordinates OK${NC}"
else
    echo -e "${RED}✗ Livingroom coordinates WRONG in migration${NC}"
    ((ERRORS++))
fi

if grep -q '"x": 1.18, "y": 0, "z": 2.59' backend/alembic/versions/002_add_spawn_data.py; then
    echo -e "${GREEN}✓ Bathroom coordinates OK${NC}"
else
    echo -e "${RED}✗ Bathroom coordinates WRONG in migration${NC}"
    ((ERRORS++))
fi

if grep -q '"x": -0.21, "y": 0, "z": 1.46' backend/alembic/versions/002_add_spawn_data.py; then
    echo -e "${GREEN}✓ Bedroom coordinates OK${NC}"
else
    echo -e "${RED}✗ Bedroom coordinates WRONG in migration${NC}"
    ((ERRORS++))
fi
echo ""

# 3. Verifica database locale (se Docker è attivo)
echo -e "${YELLOW}[3/3]${NC} Verifica database locale..."
if docker-compose ps db | grep -q "Up"; then
    DB_CHECK=$(docker-compose exec -T db psql -U escape_user -d escape_db -t -c "SELECT name, spawn_data::jsonb->'position'->>'x' as x, spawn_data::jsonb->'position'->>'z' as z FROM rooms WHERE name='kitchen';")
    
    if echo "$DB_CHECK" | grep -q "kitchen.*-1.5.*1.2"; then
        echo -e "${GREEN}✓ Kitchen coordinates OK${NC}"
    else
        echo -e "${RED}✗ Kitchen coordinates WRONG in database${NC}"
        echo -e "${YELLOW}Run: docker-compose exec -T db psql -U escape_user -d escape_db < fix-spawn-raspberry-CORRETTE-2026.sql${NC}"
        ((ERRORS++))
    fi
    
    DB_CHECK=$(docker-compose exec -T db psql -U escape_user -d escape_db -t -c "SELECT name, spawn_data::jsonb->'position'->>'x' as x, spawn_data::jsonb->'position'->>'z' as z FROM rooms WHERE name='livingroom';")
    
    if echo "$DB_CHECK" | grep -q "livingroom.*0.53.*1.52"; then
        echo -e "${GREEN}✓ Livingroom coordinates OK${NC}"
    else
        echo -e "${RED}✗ Livingroom coordinates WRONG in database${NC}"
        ((ERRORS++))
    fi
    
    DB_CHECK=$(docker-compose exec -T db psql -U escape_user -d escape_db -t -c "SELECT name, spawn_data::jsonb->'position'->>'x' as x, spawn_data::jsonb->'position'->>'z' as z FROM rooms WHERE name='bathroom';")
    
    if echo "$DB_CHECK" | grep -q "bathroom.*1.18.*2.59"; then
        echo -e "${GREEN}✓ Bathroom coordinates OK${NC}"
    else
        echo -e "${RED}✗ Bathroom coordinates WRONG in database${NC}"
        ((ERRORS++))
    fi
    
    DB_CHECK=$(docker-compose exec -T db psql -U escape_user -d escape_db -t -c "SELECT name, spawn_data::jsonb->'position'->>'x' as x, spawn_data::jsonb->'position'->>'z' as z FROM rooms WHERE name='bedroom';")
    
    if echo "$DB_CHECK" | grep -q "bedroom.*-0.21.*1.46"; then
        echo -e "${GREEN}✓ Bedroom coordinates OK${NC}"
    else
        echo -e "${RED}✗ Bedroom coordinates WRONG in database${NC}"
        ((ERRORS++))
    fi
else
    echo -e "${YELLOW}⚠ Database container non attivo, skip verifica${NC}"
fi
echo ""

# Risultato finale
echo -e "${BLUE}════════════════════════════════════════════${NC}"
if [ $ERRORS -eq 0 ]; then
    echo -e "${GREEN}✅ TUTTO SINCRONIZZATO!${NC}"
    echo -e "${GREEN}Tutte le fonti hanno le coordinate corrette${NC}"
    exit 0
else
    echo -e "${RED}❌ TROVATI $ERRORS ERRORI${NC}"
    echo -e "${YELLOW}Le coordinate NON sono sincronizzate!${NC}"
    echo ""
    echo -e "${YELLOW}Per risolvere:${NC}"
    echo "1. Se database locale errato: docker-compose exec -T db psql -U escape_user -d escape_db < fix-spawn-raspberry-CORRETTE-2026.sql"
    echo "2. Se codice errato: controlla SPAWN_FIX_RASPBERRY_2026_FINALE.md"
    exit 1
fi