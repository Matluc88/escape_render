#!/bin/bash

# Test MQTT Gate Sync - Verifica pubblicazione MQTT dal backend

echo "============================================="
echo "🧪 TEST MQTT GATE SYNC"
echo "============================================="
echo ""

# Attendi che backend sia pronto
echo "⏳ Attesa avvio backend (5 secondi)..."
sleep 5

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "STEP 1: Avvia monitor MQTT (in background)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Monitora topic MQTT in background per 10 secondi
timeout 10 docker exec escape-mqtt mosquitto_sub -h localhost -p 1883 -t "escape/esterno/#" -v > /tmp/mqtt_messages.txt &
MQTT_PID=$!

echo "✅ Monitor MQTT avviato (PID: $MQTT_PID)"
sleep 2

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "STEP 2: Simula chiamata ESP32 (fotocellula LIBERA)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Chiama endpoint come farebbe ESP32
RESPONSE=$(curl -s -X POST "http://192.168.8.10:8001/api/sessions/999/gate-puzzles/photocell/update?is_clear=true")

echo "📥 Response:"
echo "$RESPONSE" | jq . 2>/dev/null || echo "$RESPONSE"

echo ""
echo "⏳ Attesa messaggi MQTT (3 secondi)..."
sleep 3

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "STEP 3: Verifica messaggi MQTT ricevuti"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Aspetta termine monitor
wait $MQTT_PID 2>/dev/null

if [ -f /tmp/mqtt_messages.txt ] && [ -s /tmp/mqtt_messages.txt ]; then
    echo "✅ MESSAGGI MQTT RICEVUTI:"
    echo ""
    cat /tmp/mqtt_messages.txt
    echo ""
    
    # Conta messaggi
    MSG_COUNT=$(wc -l < /tmp/mqtt_messages.txt)
    echo ""
    echo "📊 Totale messaggi: $MSG_COUNT"
    
    # Verifica topic attesi
    echo ""
    echo "🔍 Verifica topic:"
    
    if grep -q "escape/esterno/ir-sensor/stato" /tmp/mqtt_messages.txt; then
        echo "  ✅ IR Sensor"
    else
        echo "  ❌ IR Sensor MANCANTE"
    fi
    
    if grep -q "escape/esterno/cancello1/posizione" /tmp/mqtt_messages.txt; then
        echo "  ✅ Cancello 1"
    else
        echo "  ❌ Cancello 1 MANCANTE"
    fi
    
    if grep -q "escape/esterno/cancello2/posizione" /tmp/mqtt_messages.txt; then
        echo "  ✅ Cancello 2"
    else
        echo "  ❌ Cancello 2 MANCANTE"
    fi
    
    if grep -q "escape/esterno/porta/posizione" /tmp/mqtt_messages.txt; then
        echo "  ✅ Porta"
    else
        echo "  ❌ Porta MANCANTE"
    fi
    
    if grep -q "escape/esterno/tetto/posizione" /tmp/mqtt_messages.txt; then
        echo "  ✅ Tetto"
    else
        echo "  ❌ Tetto MANCANTE"
    fi
    
else
    echo "❌ NESSUN MESSAGGIO MQTT RICEVUTO!"
    echo ""
    echo "Possibili cause:"
    echo "  - Backend non pubblica su MQTT"
    echo "  - Mosquitto non in esecuzione"
    echo "  - Errori nel codice backend"
    echo ""
    echo "Controlla log backend:"
    echo "  docker logs escape-backend --tail 50"
fi

# Cleanup
rm -f /tmp/mqtt_messages.txt

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "STEP 4: Test fotocellula OCCUPATA"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

timeout 10 docker exec escape-mqtt mosquitto_sub -h localhost -p 1883 -t "escape/esterno/#" -v > /tmp/mqtt_messages2.txt &
MQTT_PID2=$!
sleep 2

RESPONSE2=$(curl -s -X POST "http://192.168.8.10:8001/api/sessions/999/gate-puzzles/photocell/update?is_clear=false")
echo "📥 Response:"
echo "$RESPONSE2" | jq . 2>/dev/null || echo "$RESPONSE2"

sleep 3
wait $MQTT_PID2 2>/dev/null

if [ -f /tmp/mqtt_messages2.txt ] && [ -s /tmp/mqtt_messages2.txt ]; then
    echo ""
    echo "✅ MESSAGGI MQTT (chiusura):"
    cat /tmp/mqtt_messages2.txt | head -5
else
    echo "⚠️ Nessun messaggio per chiusura"
fi

rm -f /tmp/mqtt_messages2.txt

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 RIEPILOGO"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Se tutti i messaggi MQTT sono ricevuti:"
echo "  ✅ Backend pubblica correttamente su MQTT"
echo "  ✅ Frontend dovrebbe ricevere aggiornamenti"
echo "  ✅ Animazione dovrebbe partire!"
echo ""
echo "Prossimi passi:"
echo "  1. Ricarica pagina frontend (Ctrl+F5)"
echo "  2. Libera fotocellula ESP32"
echo "  3. Verifica animazione cancello"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"