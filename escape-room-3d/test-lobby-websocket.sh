#!/bin/bash

# 🧪 LOBBY WEBSOCKET - Script di Test Rapido
# Verifica che il sistema di lobby WebSocket funzioni correttamente
# Data: 09/01/2026

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🧪 LOBBY WEBSOCKET - TEST RAPIDO"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# ✅ STEP 1: Verifica container attivi
echo "📦 STEP 1: Verifica Container Docker..."
docker-compose ps | grep -E "escape-(frontend|backend|db)"
if [ $? -ne 0 ]; then
    echo "❌ Container non attivi! Avvia con: docker-compose up -d"
    exit 1
fi
echo "✅ Container attivi"
echo ""

# ✅ STEP 2: Verifica backend risponde
echo "🔌 STEP 2: Verifica Backend..."
BACKEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8001/health 2>/dev/null)
if [ "$BACKEND_STATUS" == "200" ]; then
    echo "✅ Backend risponde: http://localhost:8001"
else
    echo "⚠️ Backend potrebbe non rispondere (status: $BACKEND_STATUS)"
fi
echo ""

# ✅ STEP 3: Verifica frontend risponde
echo "🌐 STEP 3: Verifica Frontend..."
FRONTEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost/ 2>/dev/null)
if [ "$FRONTEND_STATUS" == "200" ]; then
    echo "✅ Frontend risponde: http://localhost"
else
    echo "⚠️ Frontend potrebbe non rispondere (status: $FRONTEND_STATUS)"
fi
echo ""

# ✅ STEP 4: Verifica WebSocket endpoint
echo "🔌 STEP 4: Verifica WebSocket Endpoint..."
WS_CHECK=$(curl -s http://localhost:8001/socket.io/ 2>/dev/null | grep -o "Missing" || echo "OK")
if [ "$WS_CHECK" != "" ]; then
    echo "✅ WebSocket endpoint disponibile"
else
    echo "⚠️ WebSocket endpoint potrebbe non essere disponibile"
fi
echo ""

# ✅ STEP 5: Mostra logs recenti backend (registerPlayer)
echo "📋 STEP 5: Ultimi 20 logs backend (registerPlayer)..."
docker logs escape-backend --tail 20 2>/dev/null | grep -E "registerPlayer|updatePlayersList|playerConnected" || echo "⚠️ Nessun evento lobby nei logs recenti"
echo ""

# ✅ STEP 6: Verifica file chiave esistono
echo "📁 STEP 6: Verifica File Chiave..."

FILES=(
    "src/pages/JoinGame.jsx"
    "src/pages/admin/Lobby.jsx"
    "backend/app/websocket/handler.py"
)

for file in "${FILES[@]}"; do
    if [ -f "$file" ]; then
        echo "  ✅ $file"
    else
        echo "  ❌ $file MANCANTE!"
    fi
done
echo ""

# ✅ STEP 7: Istruzioni test manuale
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📝 TEST MANUALE - ISTRUZIONI"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "1️⃣  Admin Dashboard:"
echo "   → Apri: http://localhost/admin"
echo "   → Clicca 'Crea Nuova Sessione'"
echo "   → Annota il PIN generato"
echo ""
echo "2️⃣  Student Join (in incognito o altro browser):"
echo "   → Apri: http://localhost/join?pin=XXXX"
echo "   → Inserisci nome studente"
echo "   → Clicca 'ENTRA'"
echo ""
echo "3️⃣  Verifica Waiting Room Studente:"
echo "   → Deve mostrare: '👥 Giocatori connessi: 1'"
echo "   → Deve mostrare badge verde con nome studente"
echo "   → Apri Console Browser (F12) → Verifica logs:"
echo "     • 'Connected to waiting room'"
echo "     • '[JoinGame] ✅ Registration successful'"
echo ""
echo "4️⃣  Verifica Admin Lobby:"
echo "   → Deve mostrare: '👥 Giocatori connessi: 1'"
echo "   → Deve mostrare: '[NomeStudente] ✓ CONNESSO'"
echo "   → Pulsante 'VIA!' deve essere verde (attivo)"
echo ""
echo "5️⃣  Start Game:"
echo "   → Admin clicca 'VIA!'"
echo "   → Countdown 5...4...3...2...1"
echo "   → Redirect a scena esterno"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🚨 SE IL CONTATORE MOSTRA 0:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "➡️  HARD REFRESH browser:"
echo "    Mac:     Cmd + Shift + R"
echo "    Windows: Ctrl + Shift + R"
echo ""
echo "➡️  CLEAR cache completo:"
echo "    1. F12 → Application tab"
echo "    2. 'Clear storage'"
echo "    3. Clicca 'Clear site data'"
echo "    4. Ricarica pagina"
echo ""
echo "➡️  REBUILD frontend (se necessario):"
echo "    cd /Users/matteo/Desktop/ESCAPE/escape-room-3d"
echo "    docker-compose stop frontend"
echo "    docker-compose rm -f frontend"
echo "    docker-compose build --no-cache frontend"
echo "    docker-compose up -d frontend"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Test completato! Sistema pronto per il test manuale."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
