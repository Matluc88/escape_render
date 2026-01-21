#!/bin/bash

# Fix Doppio Prefix /api/api/ - Rimuove /api/ dalle chiamate fetch
# Poiché BACKEND_URL è già /api, le chiamate non devono aggiungere /api di nuovo

echo "🔧 Fix Doppio Prefix /api/api/"
echo "=============================="
echo ""

cd "$(dirname "$0")" || exit 1

echo "📁 Directory: $(pwd)"
echo ""

# Lista file da modificare
FILES=(
  "src/hooks/useKitchenPuzzle.js"
  "src/hooks/useLivingRoomPuzzle.js"
  "src/hooks/useBedroomPuzzle.js"
  "src/hooks/useBathroomPuzzle.js"
  "src/hooks/useGameCompletion.js"
  "src/utils/api.js"
)

echo "📋 File da modificare:"
for file in "${FILES[@]}"; do
  if [ -f "$file" ]; then
    echo "  ✅ $file"
  else
    echo "  ⚠️  $file (non trovato)"
  fi
done
echo ""

# Backup
echo "💾 Creazione backup..."
for file in "${FILES[@]}"; do
  if [ -f "$file" ]; then
    cp "$file" "$file.backup.$(date +%Y%m%d-%H%M%S)"
  fi
done
echo "✅ Backup completati"
echo ""

# Fix: rimuovi /api/ dalle URL (mantieni il base URL)
echo "🔧 Applicazione fix..."

for file in "${FILES[@]}"; do
  if [ -f "$file" ]; then
    echo "  Fixing: $file"
    
    # Sostituisci /api/sessions/ con /sessions/
    sed -i '' 's|/api/sessions/|/sessions/|g' "$file"
    
    # Sostituisci /api/spawn/ con /spawn/
    sed -i '' 's|/api/spawn/|/spawn/|g' "$file"
    
    # Sostituisci '/api/sessions' con '/sessions' (senza trailing slash)
    sed -i '' "s|'/api/sessions'|'/sessions'|g" "$file"
    
    echo "    ✅ Completato"
  fi
done

echo ""
echo "✅ FIX APPLICATO A TUTTI I FILE"
echo ""
echo "📊 Riepilogo modifiche:"
echo "  - /api/sessions/ → /sessions/"
echo "  - /api/spawn/ → /spawn/"
echo ""
echo "🏗️  Prossimi step:"
echo "  1. Verifica le modifiche con: git diff"
echo "  2. Build frontend: npm run build"
echo "  3. Deploy su Raspberry Pi"
echo ""