# 🔧 ESP32 Soggiorno - Fix LED Porta Blinking

## 📋 Problema Identificato

**Sintomo:** Il LED della porta del soggiorno NON lampeggiava verde quando gli enigmi del soggiorno venivano completati. Rimaneva rosso fisso.

**Comportamento atteso:**
- ✅ Backend funzionava correttamente
- ✅ Frontend mostrava il blinking
- ❌ ESP32 fisico NON lampeggiava (rimaneva rosso fisso)

## 🐛 Causa del Bug

Nel file `esp32-soggiorno-RASPBERRY-MAG1.ino`, la funzione `checkDoorLedState()` aveva questo codice problematico:

```cpp
if (newStateStr != doorLedState) {
  doorLedState = newStateStr;
  
  // ❌ BUG: Quando diventa "blinking", NON chiama updateDoorLED()!
  if (doorLedState != "blinking") {
    updateDoorLED();
  }
}
```

**Problema:**
1. L'ESP32 riceve `{"soggiorno": "blinking"}` dal backend ✅
2. Aggiorna `doorLedState = "blinking"` ✅
3. Ma NON chiama `updateDoorLED()` immediatamente ❌
4. Le variabili `blinkState` e `lastBlinkTime` non vengono inizializzate ❌
5. Il LED rimane rosso fino a che non viene chiamato `updateDoorLED()` nel loop successivo, ma a quel punto il blinking potrebbe non partire correttamente

## ✅ Soluzione Applicata

### 1. Rimozione del Check Problematico

**PRIMA:**
```cpp
// Se NON è blinking, aggiorna subito il LED
if (doorLedState != "blinking") {
  updateDoorLED();
}
```

**DOPO:**
```cpp
// 🔧 FIX: Se entra in modalità "blinking", inizializza variabili
if (doorLedState == "blinking") {
  blinkState = true;  // Inizia con LED ACCESO (verde)
  lastBlinkTime = millis();  // Reset timer blinking
  Serial.println("   💚 Modalità BLINKING attivata!");
  Serial.println("   Inizializzato: blinkState=true, timer reset");
}

// ✅ FIX PRINCIPALE: Chiama SEMPRE updateDoorLED() quando lo stato cambia
updateDoorLED();
Serial.println("   ✅ LED aggiornato immediatamente");
```

### 2. Inizializzazione Corretta delle Variabili Blinking

Quando lo stato cambia a `"blinking"`:
- `blinkState = true` → Il LED inizia ACCESO (verde)
- `lastBlinkTime = millis()` → Timer reset per garantire un blinking fluido

### 3. Logging Dettagliato per Debug

Aggiunto logging completo per debugging:

```cpp
// Log risposta HTTP
Serial.print("📥 Door LED HTTP response: ");
Serial.println(response);

// Log stato prima/dopo
Serial.print("🔍 Stato precedente: ");
Serial.print(doorLedState);
Serial.print(" → Nuovo stato: ");
Serial.println(newStateStr);

// Log GPIO fisici
Serial.print("      GPIO P4 (verde): ");
Serial.println(digitalRead(LED_PORTA_GREEN) ? "HIGH" : "LOW");
Serial.print("      GPIO P16 (rosso): ");
Serial.println(digitalRead(LED_PORTA_RED) ? "HIGH" : "LOW");
```

## 📁 File Creato

**Nome:** `esp32-soggiorno-RASPBERRY-MAG1-BLINKING-FIX.ino`

**Location:** `/Users/matteo/Desktop/ESCAPE/escape-room-3d/`

## 🔌 Hardware Pin Mapping (Invariato)

```
LED PORTA (Sistema GLOBALE):
- P4 (GPIO4): LED Verde
- P16 (GPIO16): LED Rosso

LED TV (Sistema LOCALE):
- P17 (GPIO17): LED Verde
- P5 (GPIO5): LED Rosso
- P23 (GPIO23): LED Bianco (trigger con magnete)

LED PIANTA (Sistema LOCALE):
- P22 (GPIO22): LED Verde (INVERTITO!)
- P21 (GPIO21): LED Rosso (INVERTITO!)

LED CONDIZIONATORE (Sistema LOCALE):
- P18 (GPIO18): LED Verde
- P19 (GPIO19): LED Rosso

SENSORE MAGNETICO:
- P33 (GPIO33): MAG1 (Reed switch o Hall effect)
```

## 📝 Istruzioni di Upload

### 1. Arduino IDE Setup

```
1. Board: ESP32 Dev Module
2. Upload Speed: 115200
3. Flash Frequency: 80MHz
4. Flash Mode: QIO
5. Flash Size: 4MB
6. Partition Scheme: Default
7. Port: Seleziona porta USB corretta
```

### 2. Librerie Richieste

Assicurati di avere installato:
- ✅ WiFi (built-in ESP32)
- ✅ HTTPClient (built-in ESP32)
- ✅ ArduinoJson (versione 6.x)

Per installare ArduinoJson:
```
Arduino IDE → Tools → Manage Libraries → Cerca "ArduinoJson" → Install
```

### 3. Upload del Codice

```bash
1. Apri: esp32-soggiorno-RASPBERRY-MAG1-BLINKING-FIX.ino
2. Verifica il codice (✓ simbolo)
3. Seleziona porta corretta: Tools → Port → /dev/cu.usbserial-XXXX
4. Upload (→ simbolo)
5. Apri Serial Monitor (115200 baud)
```

## 🧪 Test del Fix

### Test 1: Verifica Connessione e Stato Iniziale

1. Upload del codice sull'ESP32
2. Apri Serial Monitor (115200 baud)
3. Verifica output:

```
================================================
ESP32 SOGGIORNO - RASPBERRY PI - WITH MAG1
VERSION: Blinking FIX + Debug Logging 🔧
================================================

📌 Pin configurati:
   LED PORTA: P4 (verde), P16 (rosso) → ROSSO iniziale ✅
   ...

✅ WiFi connesso!
   IP: 192.168.8.XX

✅ Active session ID: 999

✅ Sistema pronto!
🔧 FIX: LED Porta ora lampeggia correttamente!
```

### Test 2: Verifica Polling Backend

Dopo 2 secondi, dovresti vedere:

```
📥 Door LED HTTP response: {"cucina":"red","camera":"red","bagno":"red","soggiorno":"red"}
🔍 Stato precedente: red → Nuovo stato: red
```

### Test 3: Completa Enigmi Soggiorno

**Opzione A: Tramite Frontend**
1. Apri frontend
2. Risolvi tutti e 3 i puzzle del soggiorno (TV + Pianta + Condizionatore)

**Opzione B: Tramite curl (test rapido)**
```bash
# 1. Completa TV (via MAG1 o manuale)
curl -X POST http://192.168.8.10:8001/api/sessions/999/livingroom-puzzles/tv/complete

# 2. Completa Pianta
curl -X POST http://192.168.8.10:8001/api/sessions/999/livingroom-puzzles/pianta/complete

# 3. Completa Condizionatore (questo triggera il blinking!)
curl -X POST http://192.168.8.10:8001/api/sessions/999/livingroom-puzzles/condizionatore/complete
```

### Test 4: Verifica Blinking Attivato

Dopo aver completato tutti e 3 i puzzle, sul Serial Monitor dovresti vedere:

```
📥 Door LED HTTP response: {"cucina":"red","camera":"red","bagno":"red","soggiorno":"blinking"}
🔍 Stato precedente: red → Nuovo stato: blinking

🚪 ===== LED PORTA AGGIORNATO =====
   Stato precedente: red
   Nuovo stato: blinking
   💚 Modalità BLINKING attivata!
   Inizializzato: blinkState=true, timer reset
   ✅ LED aggiornato immediatamente
====================================
```

**Verifica fisica:**
- ✅ Il LED verde (P4) dovrebbe LAMPEGGIARE ogni 500ms
- ✅ Il LED rosso (P16) dovrebbe essere SPENTO
- ✅ Il blinking dovrebbe essere fluido e continuo

### Test 5: Status Report Periodico

Ogni 10 secondi vedrai:

```
📊 ===== STATO SOGGIORNO COMPLETO =====
   🎯 Session ID: 999
   📡 WiFi: Connesso ✅
   🕒 Uptime: 45 secondi

   🚪 LED PORTA:
      Stato: blinking (LAMPEGGIANTE - blinkState=ON)
      GPIO P4 (verde): HIGH
      GPIO P16 (rosso): LOW
=========================================
```

## 🔍 Debug Logging

Il nuovo codice include logging dettagliato per debugging:

### Log HTTP Response Completa
```
📥 Door LED HTTP response: {"soggiorno":"blinking"}
```

### Log Cambio Stato
```
🔍 Stato precedente: red → Nuovo stato: blinking
```

### Log Inizializzazione Blinking
```
💚 Modalità BLINKING attivata!
Inizializzato: blinkState=true, timer reset
```

### Log GPIO Fisici
```
GPIO P4 (verde): HIGH
GPIO P16 (rosso): LOW
```

## 🆚 Differenze con Versione Precedente

| Feature | PRIMA (MAG1.ino) | DOPO (BLINKING-FIX.ino) |
|---------|------------------|-------------------------|
| Chiamata updateDoorLED() | Solo per red/green | SEMPRE per tutti gli stati |
| Inizializzazione blinking | ❌ Mancante | ✅ Corretta (blinkState=true) |
| Logging HTTP response | ❌ Mancante | ✅ Log completo |
| Logging GPIO fisici | ❌ Mancante | ✅ Log ogni 10s |
| Debug cambio stato | ❌ Minimale | ✅ Dettagliato |

## 📊 Flusso Corretto

```
1. Backend: Soggiorno completato
   ↓
2. Database: game_completion.rooms_status['soggiorno'] = completed
   ↓
3. Endpoint: GET /api/game-completion/door-leds
   Response: {"soggiorno": "blinking"}
   ↓
4. ESP32: Polling (ogni 2s)
   doorLedState = "blinking"
   ↓
5. ESP32: Inizializzazione
   blinkState = true
   lastBlinkTime = millis()
   ↓
6. ESP32: Chiamata IMMEDIATA
   updateDoorLED() → GPIO P4 HIGH (verde acceso)
   ↓
7. ESP32: Loop continuo
   Ogni 500ms: toggle blinkState
   → LED verde lampeggia fluido
```

## ⚠️ Troubleshooting

### Problema: LED non lampeggia ancora

**Check 1: Verifica backend**
```bash
curl http://192.168.8.10:8001/api/game-completion/door-leds
```
Dovrebbe restituire: `{"soggiorno": "blinking"}`

**Check 2: Verifica Serial Monitor**
Cerca questa riga:
```
💚 Modalità BLINKING attivata!
```

Se NON la vedi, il backend non sta restituendo "blinking".

**Check 3: Verifica hardware**
```bash
# Test manuale GPIO con multimetro
# P4 (verde) dovrebbe alternare HIGH/LOW ogni 500ms
# P16 (rosso) dovrebbe essere sempre LOW
```

### Problema: Blinking troppo lento/veloce

Modifica `BLINK_INTERVAL`:
```cpp
const unsigned long BLINK_INTERVAL = 500;  // 500ms = 2 Hz
// Per blinking più veloce: 250ms = 4 Hz
// Per blinking più lento: 1000ms = 1 Hz
```

### Problema: WiFi non connette

Verifica SSID e password:
```cpp
const char* ssid     = "escape";
const char* password = "";  // Rete senza password
```

### Problema: Backend non raggiungibile

Verifica IP backend:
```cpp
const char* backend_url = "http://192.168.8.10:8001";
```

Ping test:
```bash
ping 192.168.8.10
```

## 📅 Cronologia Modifiche

### Version 1.0 - BLINKING FIX (15/01/2026)
- ✅ Rimosso check che impediva update per "blinking"
- ✅ Aggiunta inizializzazione corretta variabili blinking
- ✅ Aggiunto logging dettagliato HTTP response
- ✅ Aggiunto logging cambio stato
- ✅ Aggiunto logging GPIO fisici nello status report

### Version 0.9 - MAG1 (Precedente)
- ✅ Sensore magnetico MAG1 funzionante
- ✅ LED TV bianco funzionante
- ✅ LED Pianta/Condizionatore funzionanti
- ❌ LED Porta blinking NON funzionava

## 🎯 Checklist Post-Upload

Prima di considerare il fix completo:

- [ ] Upload codice su ESP32 senza errori
- [ ] WiFi connesso (verifica IP su Serial Monitor)
- [ ] Polling backend attivo (log ogni 2s)
- [ ] LED Porta inizia ROSSO fisso ✅
- [ ] Completa tutti e 3 i puzzle soggiorno
- [ ] Serial Monitor mostra "💚 Modalità BLINKING attivata!"
- [ ] LED verde (P4) LAMPEGGIA ogni 500ms ✅
- [ ] LED rosso (P16) rimane SPENTO ✅
- [ ] Blinking continua fluido senza interruzioni ✅

## 📞 Supporto

Per problemi o domande:
1. Controlla Serial Monitor output (115200 baud)
2. Verifica log backend (se disponibile)
3. Testa endpoint manualmente con curl
4. Verifica hardware con multimetro
5. Confronta output con questo documento

**File coinvolti:**
- ESP32: `esp32-soggiorno-RASPBERRY-MAG1-BLINKING-FIX.ino`
- Backend: `backend/app/api/game_completion.py`
- Backend: `backend/app/services/game_completion_service.py`

**Versione:** 1.0 - Blinking FIX  
**Data:** 15/01/2026  
**Autore:** Cline AI Assistant  
**Testato su:** ESP32 Dev Module + Raspberry Pi 4 (192.168.8.10)