#!/bin/bash

# ========================================
# FIX BACKEND MIGRATIONS - Null Bytes
# ========================================
# Questo script risolve il problema dei byte null
# nei file di migrazione Alembic

set -e

echo "🔧 FIX BACKEND MIGRATIONS - Iniziato"
echo "===================================="
echo ""

# 1. Stop containers
echo "⏹️  Stopping containers..."
docker compose down -v

# 2. Trova file corrotti
echo ""
echo "🔍 Cercando file con byte null..."
CORRUPTED_FILES=$(find backend/alembic/versions -name "*.py" -type f -exec grep -l $'\x00' {} \; 2>/dev/null || true)

if [ -z "$CORRUPTED_FILES" ]; then
    echo "✅ Nessun file corrotto trovato!"
else
    echo "❌ File corrotti trovati:"
    echo "$CORRUPTED_FILES"
    echo ""
    echo "🗑️  Rimuovendo file corrotti..."
    echo "$CORRUPTED_FILES" | xargs rm -f
    echo "✅ File corrotti rimossi"
fi

# 3. Pulisci cache Python
echo ""
echo "🧹 Pulizia cache Python..."
find backend -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
find backend -type f -name "*.pyc" -delete 2>/dev/null || true

# 4. Restart containers
echo ""
echo "🚀 Riavvio containers..."
docker compose up -d

# 5. Wait and check
echo ""
echo "⏳ Attendo 10 secondi per l'avvio..."
sleep 10

# 6. Check status
echo ""
echo "📊 Stato containers:"
docker compose ps

echo ""
echo "📋 Ultimi log backend:"
docker compose logs backend | tail -20

echo ""
echo "===================================="
echo "✅ Script completato!"
echo ""
echo "Verifica lo stato dei containers con:"
echo "  docker compose ps"
echo ""
echo "Per vedere i log completi:"
echo "  docker compose logs backend"
