#!/bin/bash
# 🚀 DEPLOY AUTOMATICO - Fix Completo su Raspberry Pi
# Esegui questo script DOPO aver trasferito il tarball con SCP

set -e  # Exit on error

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🚀 DEPLOY FIX COMPLETO - Raspberry Pi"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Verifica che il tarball esista
if [ ! -f ~/escape-frontend-complete-fix.tar.gz ]; then
    echo "❌ ERRORE: File ~/escape-frontend-complete-fix.tar.gz non trovato!"
    echo ""
    echo "Prima esegui dal Mac:"
    echo "  scp /Users/matteo/Desktop/ESCAPE/escape-frontend-complete-fix.tar.gz pi@192.168.8.10:~/"
    echo ""
    exit 1
fi

echo "✅ Tarball trovato"
echo ""

# Vai nella directory escape-room
echo "📁 Navigazione a ~/escape-room..."
cd ~/escape-room

# Estrai i file
echo "📦 Estrazione file..."
tar -xzf ~/escape-frontend-complete-fix.tar.gz

echo "✅ File estratti:"
ls -lh nginx.conf
ls -lh src/components/3D/CasaModel.jsx
ls -lh src/components/scenes/BedroomScene.jsx
ls -lh src/components/scenes/KitchenScene.jsx
echo ""

# Rebuild frontend Docker (NO cache)
echo "🔨 REBUILD FRONTEND DOCKER (questo richiederà ~10 minuti)..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
docker compose build --no-cache frontend

echo ""
echo "✅ Rebuild completato!"
echo ""

# Spegni container
echo "⏹️  Spegnimento container..."
docker compose down

# Riavvia tutto
echo "▶️  Riavvio container..."
docker compose up -d

echo ""
echo "✅ Container riavviati!"
echo ""

# Verifica status
echo "📊 Verifica status container..."
docker compose ps
echo ""

# Log di verifica
echo "📋 Log frontend (ultime 20 righe):"
docker compose logs frontend | tail -20
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ DEPLOY COMPLETATO CON SUCCESSO!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🧪 ORA PUOI TESTARE:"
echo ""
echo "1. Reset Lobby:"
echo "   http://192.168.8.10/admin"
echo "   Clicca '🔄 RESET ENIGMI' → dovrebbe funzionare (no 404)"
echo ""
echo "2. Console Cleanup:"
echo "   Apri una scena → F12 console → nessun spam log"
echo ""
echo "3. Messaggi Camera:"
echo "   http://192.168.8.10/play/SESSIONE_ID/camera"
echo "   Verifica messaggi enigmi aggiornati"
echo ""
echo "4. Messaggi Cucina:"
echo "   http://192.168.8.10/play/SESSIONE_ID/cucina"
echo "   Verifica messaggi indizi aggiornati"
echo ""
echo "5. MAG1 Bagno:"
echo "   http://192.168.8.10/play/SESSIONE_ID/bagno"
echo "   Testa sensore anta doccia"
echo ""
echo "6. Spawn:"
echo "   Verifica spawn corretto in TUTTE le scene"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"