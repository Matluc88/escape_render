#!/bin/bash

# Script di verifica configurazione MQTT/Mosquitto per ESP32 Esterno
# Da eseguire sul Raspberry Pi

echo ""
echo "============================================================"
echo "  🔍 VERIFICA MQTT ESTERNO - ESP32 + FRONTEND"
echo "============================================================"
echo ""

# Colori per output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

ERRORS=0
WARNINGS=0

# ==================================================
# STEP 1: Verifica Docker Containers
# ==================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "STEP 1: Verifica Docker Containers"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Mosquitto
if docker ps | grep -q mosquitto; then
    echo -e "${GREEN}✅ Mosquitto: IN ESECUZIONE${NC}"
    MOSQUITTO_ID=$(docker ps --filter "name=mosquitto" --format "{{.ID}}")
else
    echo -e "${RED}❌ Mosquitto: NON IN ESECUZIONE${NC}"
    ERRORS=$((ERRORS + 1))
fi

# Backend
if docker ps | grep -q backend; then
    echo -e "${GREEN}✅ Backend: IN ESECUZIONE${NC}"
else
    echo -e "${YELLOW}⚠️  Backend: NON IN ESECUZIONE${NC}"
    WARNINGS=$((WARNINGS + 1))
fi

# Frontend
if docker ps | grep -q frontend; then
    echo -e "${GREEN}✅ Frontend: IN ESECUZIONE${NC}"
else
    echo -e "${YELLOW}⚠️  Frontend: NON IN ESECUZIONE${NC}"
    WARNINGS=$((WARNINGS + 1))
fi

echo ""

# ==================================================
# STEP 2: Verifica Porte Mosquitto
# ==================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "STEP 2: Verifica Porte Mosquitto"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Porta 1883 (MQTT)
if netstat -tuln 2>/dev/null | grep -q ":1883" || ss -tuln 2>/dev/null | grep -q ":1883"; then
    echo -e "${GREEN}✅ Porta 1883 (MQTT): APERTA${NC}"
else
    echo -e "${RED}❌ Porta 1883 (MQTT): CHIUSA${NC}"
    ERRORS=$((ERRORS + 1))
fi

# Porta 9001 (WebSocket)
if netstat -tuln 2>/dev/null | grep -q ":9001" || ss -tuln 2>/dev/null | grep -q ":9001"; then
    echo -e "${GREEN}✅ Porta 9001 (WebSocket): APERTA${NC}"
else
    echo -e "${RED}❌ Porta 9001 (WebSocket): CHIUSA${NC}"
    echo -e "${YELLOW}   → Probabile causa: WebSocket non configurato${NC}"
    ERRORS=$((ERRORS + 1))
fi

echo ""

# ==================================================
# STEP 3: Verifica Configurazione Mosquitto
# ==================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "STEP 3: Verifica Configurazione Mosquitto"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if [ ! -z "$MOSQUITTO_ID" ]; then
    echo "📄 Configurazione attuale:"
    echo ""
    
    # Mostra configurazione
    CONFIG=$(docker exec $MOSQUITTO_ID cat /mosquitto/config/mosquitto.conf 2>/dev/null)
    
    if [ $? -eq 0 ]; then
        echo "$CONFIG"
        echo ""
        
        # Verifica listener 1883
        if echo "$CONFIG" | grep -q "listener 1883"; then
            echo -e "${GREEN}✅ Listener 1883 configurato${NC}"
        else
            echo -e "${RED}❌ Listener 1883 NON configurato${NC}"
            ERRORS=$((ERRORS + 1))
        fi
        
        # Verifica listener 9001
        if echo "$CONFIG" | grep -q "listener 9001"; then
            echo -e "${GREEN}✅ Listener 9001 configurato${NC}"
        else
            echo -e "${RED}❌ Listener 9001 NON configurato${NC}"
            ERRORS=$((ERRORS + 1))
        fi
        
        # Verifica protocol websockets
        if echo "$CONFIG" | grep -q "protocol websockets"; then
            echo -e "${GREEN}✅ Protocol WebSocket configurato${NC}"
        else
            echo -e "${RED}❌ Protocol WebSocket NON configurato${NC}"
            ERRORS=$((ERRORS + 1))
        fi
    else
        echo -e "${RED}❌ Impossibile leggere configurazione Mosquitto${NC}"
        ERRORS=$((ERRORS + 1))
    fi
else
    echo -e "${RED}❌ Mosquitto non in esecuzione - skip configurazione${NC}"
fi

echo ""

# ==================================================
# STEP 4: Test Messaggi MQTT (ESP32)
# ==================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "STEP 4: Test Messaggi MQTT da ESP32"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if [ ! -z "$MOSQUITTO_ID" ]; then
    echo "🔍 Ascolto messaggi ESP32 per 5 secondi..."
    echo "   (muovi la fotocellula per vedere messaggi)"
    echo ""
    
    # Timeout 5 secondi per catturare messaggi
    MESSAGES=$(timeout 5 docker exec $MOSQUITTO_ID mosquitto_sub -t "escape/esterno/#" -C 10 2>/dev/null || true)
    
    if [ ! -z "$MESSAGES" ]; then
        echo -e "${GREEN}✅ ESP32 sta pubblicando messaggi!${NC}"
        echo ""
        echo "📥 Messaggi ricevuti:"
        echo "$MESSAGES" | head -5
        echo ""
    else
        echo -e "${YELLOW}⚠️  Nessun messaggio ricevuto da ESP32${NC}"
        echo "   Possibili cause:"
        echo "   - ESP32 non connesso"
        echo "   - WiFi ESP32 disconnesso"
        echo "   - Topic MQTT sbagliati"
        WARNINGS=$((WARNINGS + 1))
    fi
else
    echo -e "${RED}❌ Mosquitto non in esecuzione - skip test messaggi${NC}"
fi

echo ""

# ==================================================
# STEP 5: Info Sistema
# ==================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "STEP 5: Informazioni Sistema"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo "🖥️  IP Raspberry:"
hostname -I | awk '{print "   "$1}'
echo ""

echo "🌐 IP ESP32 (cerca nell'output Serial Monitor)"
echo ""

# ==================================================
# RIEPILOGO FINALE
# ==================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 RIEPILOGO"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}🎉 TUTTO OK! Sistema funzionante${NC}"
    echo ""
    echo "Se l'animazione non parte comunque:"
    echo "1. Controlla console browser per errori WebSocket"
    echo "2. Verifica che frontend punti a ws://localhost:9001"
    echo "3. Ricarica la pagina browser (Ctrl+F5)"
elif [ $ERRORS -eq 0 ]; then
    echo -e "${YELLOW}⚠️  $WARNINGS warning trovati (non critici)${NC}"
    echo ""
    echo "Sistema dovrebbe funzionare, ma controlla i warning sopra."
else
    echo -e "${RED}❌ $ERRORS errori trovati!${NC}"
    echo ""
    echo "🔧 SOLUZIONI:"
    echo ""
    
    # Suggerisci soluzioni basate sugli errori
    if ! docker ps | grep -q mosquitto; then
        echo "1. Avvia Mosquitto:"
        echo "   docker-compose up -d mosquitto"
        echo ""
    fi
    
    if ! netstat -tuln 2>/dev/null | grep -q ":9001" && ! ss -tuln 2>/dev/null | grep -q ":9001"; then
        echo "2. Configura WebSocket su porta 9001:"
        echo "   Vedi file: fix_mosquitto_config.sh"
        echo ""
    fi
    
    echo "3. Dopo le modifiche, riavvia Mosquitto:"
    echo "   docker-compose restart mosquitto"
    echo ""
fi

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Exit code
if [ $ERRORS -gt 0 ]; then
    exit 1
else
    exit 0
fi