#!/bin/bash
# Script per eseguire migrazioni Alembic su Render
# 
# ISTRUZIONI:
# 1. Vai su Render Dashboard → escape-house-backend
# 2. Clicca su "Shell" nel menu in alto
# 3. Nel terminale che si apre, esegui questi comandi:

echo "🔧 Esecuzione migrazioni Alembic su Render"
echo ""
echo "📋 Comandi da eseguire nel Shell di Render:"
echo ""
echo "# 1. Entra nella directory backend"
echo "cd /opt/render/project/src/escape-room-3d/backend"
echo ""
echo "# 2. Verifica versione corrente del database"
echo "alembic current"
echo ""
echo "# 3. Esegui tutte le migrazioni pending"
echo "alembic upgrade head"
echo ""
echo "# 4. Verifica che le migrazioni siano state applicate"
echo "alembic current"
echo ""
echo "✅ Dopo aver eseguito questi comandi, riprova il puzzle ventola!"