# 📺 ESP32 SOGGIORNO - Guida Setup Completa

## 📋 Indice
1. [Overview Sistema](#overview-sistema)
2. [Hardware Requirements](#hardware-requirements)
3. [Configurazione PIN](#configurazione-pin)
4. [Architettura Software](#architettura-software)
5. [Installazione](#installazione)
6. [Test e Debug](#test-e-debug)
7. [Troubleshooting](#troubleshooting)

---

## 🎯 Overview Sistema

L'ESP32 SOGGIORNO gestisce **DUE sistemi LED separati**:

### 1️⃣ LED PORTA (Sistema GLOBALE)
- **Endpoint:** `/api/sessions/{id}/game-completion/door-leds`
- **Colore basato su:** Numero totale stanze completate (0-4)
- **Stati:**
  - 🔴 Rosso fisso: 0 stanze completate
  - 🟢⚡ Verde blinking (500ms): 1-3 stanze completate
  - 🟢 Verde fisso: 4 stanze completate (VITTORIA!)

### 2️⃣ LED INDIZI (Sistema LOCALE)
- **Endpoint:** `/api/sessions/{id}/livingroom-puzzles/state`
- **LED controllati:**
  - 🌿 LED Pianta
  - ❄️ LED Condizionatore
  - 📺 TV (P32)

---

## 🔧 Hardware Requirements

### Componenti Necessari

| Componente | Quantità | Specifiche |
|------------|----------|------------|
| ESP32 DevKit | 1 | 30 pin |
| LED bicolore (verde/rosso) | 3 | Comune catodo |
| Resistenze | 6 | 220Ω per LED |
| Relè / Transistor | 1 | Per controllo TV (P32) |
| Cavi jumper | ~15 | Maschio-Femmina |
| Breadboard | 1 | Opzionale per test |

### Schema Collegamenti

```
ESP32 PIN    →    COMPONENTE
═══════════════════════════════════════
P4  (GPIO4)  →    LED PORTA verde (+)
P16 (GPIO16) →    LED PORTA rosso (+)

P17 (GPIO17) →    LED PIANTA verde (+)
P5  (GPIO5)  →    LED PIANTA rosso (+)

P18 (GPIO18) →    LED CONDIZIONATORE verde (+)
P19 (GPIO19) →    LED CONDIZIONATORE rosso (+)

P32 (GPIO32) →    TV / Relè controllo

GND          →    LED comuni catodi (-)
```

---

## 📌 Configurazione PIN

### Mapping Completo

```cpp
// LED PORTA (Sistema GLOBALE)
#define LED_PORTA_GREEN 4   // P4
#define LED_PORTA_RED   16  // P16

// LED PIANTA (Sistema LOCALE)
#define LED_PIANTA_GREEN 17  // P17
#define LED_PIANTA_RED   5   // P5

// LED CONDIZIONATORE (Sistema LOCALE)
#define LED_CONDIZ_GREEN 18  // P18
#define LED_CONDIZ_RED   19  // P19

// TV
#define TV_PIN 32  // P32
```

### UUID Riferimento

| Componente | UUID Backend |
|------------|--------------|
| LED Porta | (sistema globale - no UUID) |
| LED Pianta | `768647C9-916F-451D-A728-DFA085C7B9B6` |
| LED Condizionatore | `C715B901-3B65-4D33-8F01-9548A...` |
| TV | (parte di puzzle state) |

---

## 🏗️ Architettura Software

### Due Loop di Polling Indipendenti

```
┌─────────────────────────────────────────┐
│         ESP32 MAIN LOOP                 │
├─────────────────────────────────────────┤
│                                         │
│  ┌───────────────────────────────────┐ │
│  │  checkDoorLedState()              │ │
│  │  ogni 2 secondi                   │ │
│  │  ↓                                │ │
│  │  GET /game-completion/door-leds   │ │
│  │  ↓                                │ │
│  │  Aggiorna: doorLedState           │ │
│  │  ("red"/"blinking_green"/"green") │ │
│  └───────────────────────────────────┘ │
│                                         │
│  ┌───────────────────────────────────┐ │
│  │  checkLocalPuzzleState()          │ │
│  │  ogni 2 secondi (offset +1s)     │ │
│  │  ↓                                │ │
│  │  GET /livingroom-puzzles/state    │ │
│  │  ↓                                │ │
│  │  Aggiorna: tvStatus, piantaStatus,│ │
│  │            condizStatus           │ │
│  └───────────────────────────────────┘ │
│                                         │
│  ┌───────────────────────────────────┐ │
│  │  updateDoorLED()                  │ │
│  │  ogni loop (100ms)                │ │
│  │  ↓                                │ │
│  │  Se doorLedState == "blinking":   │ │
│  │    Alterna LED ogni 500ms         │ │
│  │  Altrimenti:                      │ │
│  │    Set LED fisso                  │ │
│  └───────────────────────────────────┘ │
│                                         │
└─────────────────────────────────────────┘
```

### Gestione Blinking Locale

Il blinking LED Porta è gestito **localmente** su ESP32:

```cpp
// Backend invia stato: "blinking_green"
// ESP32 alterna LED ogni 500ms usando millis()

if (doorLedState == "blinking_green") {
  unsigned long now = millis();
  if (now - lastBlinkTime >= 500) {
    blinkState = !blinkState;
    lastBlinkTime = now;
  }
  
  if (blinkState) {
    digitalWrite(LED_PORTA_GREEN, HIGH);
    digitalWrite(LED_PORTA_RED, LOW);
  } else {
    digitalWrite(LED_PORTA_GREEN, LOW);
    digitalWrite(LED_PORTA_RED, LOW);
  }
}
```

Questo garantisce blinking **fluido** anche tra i polling (ogni 2s).

---

## 🚀 Installazione

### Step 1: Preparazione Arduino IDE

```bash
# 1. Scarica Arduino IDE
# https://www.arduino.cc/en/software

# 2. Aggiungi ESP32 Boards
# File → Preferences → Additional Boards Manager URLs:
https://dl.espressif.com/dl/package_esp32_index.json

# 3. Installa ESP32 Board
# Tools → Board → Boards Manager → cerca "esp32" → Install

# 4. Installa librerie necessarie
# Tools → Manage Libraries:
- ArduinoJson (by Benoit Blanchon) versione 6.x
```

### Step 2: Configurazione WiFi

Modifica nel file `.ino`:

```cpp
// ================= WIFI =================
const char* ssid     = "Vodafone-E23524170";      // ← IL TUO SSID
const char* password = "JtnLtfg73NXgAt9r";        // ← LA TUA PASSWORD

// ================= BACKEND =================
const char* backend_url = "http://192.168.1.10:8001";  // ← IP BACKEND
```

**IMPORTANTE:** L'IP backend deve essere raggiungibile dalla rete WiFi!

### Step 3: Upload Codice

1. Connetti ESP32 via USB
2. Seleziona Board: `Tools → Board → ESP32 Dev Module`
3. Seleziona Porta: `Tools → Port → /dev/cu.usbserial-...` (macOS) o `COM3` (Windows)
4. Click Upload (freccia →)

### Step 4: Verifica Upload

```bash
# Apri Serial Monitor
Tools → Serial Monitor
Baud rate: 115200

# Dovresti vedere:
=================================
ESP32 SOGGIORNO - SISTEMA COMPLETO
=================================

📌 Pin configurati:
   LED PORTA: P4 (verde), P16 (rosso)
   ...
   
📡 Connessione WiFi a: Vodafone-E23524170
.....
✅ WiFi connesso!
   IP: 192.168.1.25
   
🔍 Fetch Active Session ID...
✅ Active session ID: 999
🎯 Uso Session ID: 999

✅ Sistema pronto!
```

---

## 🧪 Test e Debug

### Test 1: Connessione Backend

```bash
# Nel Serial Monitor dovresti vedere ogni 2 secondi:
.  # ← Polling senza cambiamenti
```

Se vedi **solo punti**, il sistema sta facendo polling correttamente!

### Test 2: LED PORTA (Sistema Globale)

**Test con curl:**

```bash
# Simula completion di una stanza
curl -X POST http://192.168.1.10:8001/api/sessions/999/kitchen-puzzles/complete \
  -H "Content-Type: application/json" \
  -d '{"puzzle_name": "serra"}'

# Verifica stato LED porta
curl http://192.168.1.10:8001/api/sessions/999/game-completion/door-leds | jq
```

**Risultato atteso nel Serial Monitor:**

```
🚪 ===== LED PORTA AGGIORNATO =====
   Nuovo stato: blinking_green
```

**LED fisico:** Dovrebbe iniziare a lampeggiare verde (500ms ON/OFF)

### Test 3: LED PIANTA (Sistema Locale)

**Premi Tasto G nel gioco** (completamento indizio pianta)

**Serial Monitor:**

```
🌿 ===== LED PIANTA AGGIORNATO =====
   Status: completed
```

**LED fisico:** Verde fisso

### Test 4: TV

**Premi Tasto M nel gioco** (completamento puzzle TV)

**Serial Monitor:**

```
📺 ===== TV AGGIORNATA =====
   Status: completed
   TV PIN P32: HIGH (ON)
```

**P32:** Dovrebbe passare a HIGH (5V)

### Test Sequenza Completa

```bash
# 1. Stato iniziale
# LED Porta: 🔴 Rosso
# LED Pianta: ⚫ OFF
# LED Condizionatore: ⚫ OFF
# TV: ⚫ SPENTA

# 2. Completa puzzle TV (Tasto M)
# TV P32: ⚡ ACCESA

# 3. Completa puzzle Pianta (Tasto G)
# LED Pianta: 🟢 Verde

# 4. Completa puzzle Condizionatore (Click)
# LED Condizionatore: 🟢 Verde
# → ROOM COMPLETED!
# LED Porta: 🟢⚡ Blinking (perché 1/4 stanze completate)
```

---

## 🐛 Troubleshooting

### Problema: WiFi non si connette

**Sintomi:**
```
📡 Connessione WiFi a: Vodafone-E23524170
..............................
❌ WiFi NON connesso!
   Riavvio tra 5 secondi...
```

**Cause possibili:**

1. **SSID o password errati**
   - Verifica nel file `.ino`
   - Case-sensitive!

2. **ESP32 troppo lontano dal router**
   - Avvicina ESP32 al router Vodafone

3. **Rete 5GHz**
   - ESP32 supporta **SOLO 2.4GHz**
   - Verifica che il router trasmetta su 2.4GHz

**Fix:**

```cpp
// Aggiungi debug:
Serial.print("SSID: ");
Serial.println(ssid);
Serial.print("Pass length: ");
Serial.println(strlen(password));
```

### Problema: Active Session non trovata

**Sintomi:**
```
📡 Fetch active session da: http://192.168.1.10:8001/api/sessions/active
❌ HTTP error: 204
⚠️ Nessuna sessione attiva, uso fallback: 999
```

**Causa:**
Nessuna sessione con `is_active=true` nel database

**Fix:**

```bash
# Crea sessione attiva
docker exec -it escape-room-3d-postgres-1 psql -U escape_room -d escape_room_db

# SQL:
UPDATE game_sessions SET is_active = true WHERE id = 999;
```

**Oppure:** Usa sempre session_id 999 (già configurato come fallback)

### Problema: LED non si accende

**Check hardware:**

```cpp
// Test manuale nel setup():
void setup() {
  // ... dopo pinMode ...
  
  // Test LED PORTA
  digitalWrite(LED_PORTA_GREEN, HIGH);
  delay(1000);
  digitalWrite(LED_PORTA_GREEN, LOW);
  digitalWrite(LED_PORTA_RED, HIGH);
  delay(1000);
  digitalWrite(LED_PORTA_RED, LOW);
  
  // Se LED non si accende: verifica collegamenti!
}
```

**Verifica:**
1. LED collegato correttamente (+ a pin GPIO, - a GND)
2. Resistenza 220Ω in serie
3. LED non bruciato (prova con multimetro)

### Problema: LED non lampeggia

**Sintomi:**
- Backend dice `"blinking_green"`
- LED rimane spento o fisso

**Debug:**

```cpp
// Aggiungi nel loop():
void loop() {
  // ...
  
  // Debug blinking
  if (doorLedState == "blinking_green") {
    Serial.print("Blink state: ");
    Serial.println(blinkState ? "ON" : "OFF");
  }
  
  // ...
}
```

**Cause:**
1. `millis()` overflow (dopo 50 giorni uptime) → Riavvia ESP32
2. Loop delay troppo alto → Verifica `delay(100)` nel loop

### Problema: JSON Parse Error

**Sintomi:**
```
❌ Errore parsing JSON door-leds response
```

**Debug:**

```cpp
// Stampa response raw:
String response = getHTTP(endpoint.c_str());
Serial.println("Response RAW:");
Serial.println(response);

// Controlla formato JSON
```

**Fix:**
1. Verifica che backend restituisca JSON valido
2. Aumenta dimensione buffer JSON se necessario:

```cpp
StaticJsonDocument<1024> doc;  // ← Aumenta se necessario
```

### Problema: Polling troppo lento

**Sintomi:**
- LED si aggiorna con ritardo >5 secondi

**Check:**

```cpp
const unsigned long POLLING_INTERVAL = 2000;  // ← Dovrebbe essere 2000ms
```

**Cause:**
1. Backend lento a rispondere
2. WiFi instabile
3. Timeout HTTP troppo lungo

**Fix:**

```cpp
http.setTimeout(3000);  // Riduci timeout a 3 secondi
```

---

## 📊 Monitor Stati in Real-Time

### Script di Monitoraggio

```bash
#!/bin/bash
# monitor-soggiorno.sh

while true; do
  echo "╔══════════════════════════════════════╗"
  echo "║  STATO ESP32 SOGGIORNO               ║"
  echo "╚══════════════════════════════════════╝"
  
  # LED PORTA (Globale)
  echo "🚪 LED PORTA:"
  curl -s http://192.168.1.10:8001/api/sessions/999/game-completion/door-leds | \
    jq '.door_led_states.soggiorno'
  
  echo ""
  
  # PUZZLES LOCALI
  echo "🎮 PUZZLES SOGGIORNO:"
  curl -s http://192.168.1.10:8001/api/sessions/999/livingroom-puzzles/state | \
    jq '{tv: .states.tv.status, pianta: .led_states.pianta, condiz: .led_states.condizionatore}'
  
  echo ""
  echo "─────────────────────────────────────────"
  sleep 2
done
```

**Uso:**

```bash
chmod +x monitor-soggiorno.sh
./monitor-soggiorno.sh
```

---

## 🎯 Checklist Pre-Produzione

- [ ] WiFi SSID e password corretti
- [ ] IP backend raggiungibile da rete
- [ ] Tutti i 6 LED testati singolarmente
- [ ] TV P32 testata con relè/transistor
- [ ] Blinking LED porta fluido (500ms)
- [ ] Polling backend funzionante (ogni 2s)
- [ ] Active Session ID fetchato correttamente
- [ ] Test sequenza completa gioco OK
- [ ] Cavi ben saldati (no breadboard in produzione)
- [ ] Alimentazione stabile ESP32 (USB o 5V regolato)

---

## 📚 Riferimenti

- [GAME_COMPLETION_LED_LOGIC.md](./GAME_COMPLETION_LED_LOGIC.md) - Logica LED globale
- [LIVINGROOM_LED_SYSTEM_COMPLETE.md](./LIVINGROOM_LED_SYSTEM_COMPLETE.md) - Sistema LED locale
- [ESP32_CUCINA_SETUP_GUIDE.md](./ESP32_CUCINA_SETUP_GUIDE.md) - Riferimento cucina

---

## 📞 Support

Per problemi specifici:
1. Controlla Serial Monitor (115200 baud)
2. Verifica log backend Docker: `docker logs backend -f`
3. Testa endpoint con curl manualmente

---

**Fine Guida** ✅
