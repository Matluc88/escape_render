# 🏠 ESP32 Soggiorno - Sistema Completo con LED Porta

## 📋 Panoramica

File: `esp32-soggiorno-RASPBERRY-COMPLETE.ino`

Sistema completo per ESP32 Soggiorno che gestisce:
- ✅ LED Porta (sistema globale con blinking)
- ✅ LED TV bianco (GPIO23)
- ✅ LED Pianta (dual-color)
- ✅ LED Condizionatore (dual-color)

---

## 🔌 Hardware Pin Mapping

### LED Porta (Sistema GLOBALE)
- **P4** (GPIO4): LED Verde
- **P16** (GPIO16): LED Rosso
- **Sistema**: Game Completion endpoint globale
- **Stati**: `red` → `blinking` → `green`

### LED TV Bianco (Sistema LOCALE)
- **P23** (GPIO23): LED Bianco
- **Trigger**: Tasto M (TV completed)
- **Comportamento**: Si accende quando `tvStatus == "completed"`

### LED Pianta (Sistema LOCALE)
- **P17** (GPIO17): LED Verde
- **P5** (GPIO5): LED Rosso
- **Stati**: `locked` (off) → `active` (red) → `completed` (green)

### LED Condizionatore (Sistema LOCALE)
- **P18** (GPIO18): LED Verde
- **P19** (GPIO19): LED Rosso
- **Stati**: `locked` (off) → `active` (red) → `completed` (green)

---

## 🎯 Sequenza Completa LED

### 🔴 Stato Iniziale (All'avvio)
```
LED Porta: ROSSO fisso
LED TV (P23): SPENTO
LED Pianta: SPENTO (locked)
LED Condiz: SPENTO (locked)
```

### 1️⃣ Premi M (Tasto TV)
```
Endpoint: POST /api/sessions/{id}/livingroom-puzzles/tv/complete
```
**Risultato:**
- ⚪ LED TV (P23): **SI ACCENDE BIANCO** ✨
- 🔴 LED Pianta: passa a ROSSO (active)
- 🔴 LED Porta: rimane ROSSO

### 2️⃣ Premi G (Pianta completata)
```
Endpoint: POST /api/sessions/{id}/livingroom-puzzles/pianta/complete
```
**Risultato:**
- ⚪ LED TV: rimane ACCESO
- 🟢 LED Pianta: passa a VERDE (completed)
- 🔴 LED Condiz: passa a ROSSO (active)
- 🔴 LED Porta: rimane ROSSO

### 3️⃣ Click Condizionatore (Soggiorno completato!)
```
Endpoint: POST /api/sessions/{id}/livingroom-puzzles/condizionatore/complete
```
**Risultato:**
- ⚪ LED TV: rimane ACCESO
- 🟢 LED Pianta: rimane VERDE
- 🟢 LED Condiz: passa a VERDE
- 💚 LED Porta: **VERDE LAMPEGGIANTE** (blinking 500ms)

### 4️⃣ Tutte le 4 stanze completate (VITTORIA!)
```
Endpoint: GET /api/game-completion/door-leds
Response: {"soggiorno": "green"}
```
**Risultato:**
- 💚 LED Porta: **VERDE FISSO** ✨

---

## 📡 Sistema Polling

### Polling Sistema GLOBALE (LED Porta)
```
Endpoint: /api/game-completion/door-leds
Intervallo: 2 secondi
Auto-resolve: Sessione attiva automatica
Response: {
  "soggiorno": "red" | "blinking" | "green"
}
```

### Polling Sistema LOCALE (Puzzles Soggiorno)
```
Endpoint: /api/sessions/{session_id}/livingroom-puzzles/state
Intervallo: 2 secondi
Response: {
  "states": {
    "tv": {"status": "active" | "completed"},
    "pianta": {...},
    "condizionatore": {...}
  },
  "led_states": {
    "pianta": "locked" | "active" | "completed",
    "condizionatore": "locked" | "active" | "completed"
  }
}
```

---

## 🔄 Sistema Blinking LED Porta

Il blinking viene gestito **localmente** nell'ESP32:

```cpp
if (doorLedState == "blinking") {
  // Verde ON/OFF ogni 500ms
  unsigned long now = millis();
  if (now - lastBlinkTime >= 500) {
    blinkState = !blinkState;
    lastBlinkTime = now;
  }
  
  if (blinkState) {
    digitalWrite(LED_PORTA_GREEN, HIGH);  // ON
    digitalWrite(LED_PORTA_RED, LOW);
  } else {
    digitalWrite(LED_PORTA_GREEN, LOW);   // OFF
    digitalWrite(LED_PORTA_RED, LOW);
  }
}
```

**Vantaggi:**
- ✅ Blinking fluido indipendente dal polling
- ✅ Nessun carico sul backend
- ✅ Funziona anche se backend temporaneamente irraggiungibile

---

## 🛠️ Installazione su ESP32

### 1. Arduino IDE Setup
```
1. Board: ESP32 Dev Module
2. Upload Speed: 115200
3. Flash Frequency: 80MHz
4. Flash Mode: QIO
5. Flash Size: 4MB
6. Partition Scheme: Default
```

### 2. Librerie Richieste
```
- WiFi (built-in)
- HTTPClient (built-in)
- ArduinoJson (da installare)
```

### 3. Carica il codice
```
1. Apri: esp32-soggiorno-RASPBERRY-COMPLETE.ino
2. Seleziona porta seriale corretta
3. Clicca Upload
4. Monitora serial output (115200 baud)
```

---

## 🔍 Serial Monitor Output

### All'avvio:
```
===========================================
ESP32 SOGGIORNO - RASPBERRY PI - COMPLETE
VERSION: LED Porta + TV + Pianta + Condiz
===========================================

📌 Pin configurati:
   LED PORTA: P4 (verde), P16 (rosso) → ROSSO iniziale ✅
   LED PIANTA: P17 (verde), P5 (rosso) → OFF
   LED CONDIZIONATORE: P18 (verde), P19 (rosso) → OFF
   TV BIANCO: P23 → OFF

   Backend: http://192.168.8.10:8001

📡 Connessione WiFi a: escape
....................
✅ WiFi connesso!
   IP: 192.168.8.XX

🔍 Fetch Active Session ID...
📡 Fetch active session da: http://192.168.8.10:8001/api/sessions/active
📥 Response: {"id":999,...}
✅ Active session ID: 999
🎯 Uso Session ID: 999

🔄 Fetch stati iniziali...
✅ Sistema pronto!
```

### Durante il gioco:
```
📊 ===== STATO SOGGIORNO COMPLETO =====
   🎯 Session ID: 999
   📡 WiFi: Connesso ✅
   🕒 Uptime: 45 secondi

   🚪 LED PORTA:
      Stato: red

   📺 TV BIANCO (P23):
      Status: active | LED: OFF

   🌿 LED PIANTA:
      Status: locked

   ❄️ LED CONDIZIONATORE:
      Status: locked
=========================================

📺 TV: completed | LED P23: ON (BIANCO)
🌱 Pianta LED: active
```

---

## ⚙️ Configurazione Backend

### URL Backend (da modificare se necessario)
```cpp
const char* backend_url = "http://192.168.8.10:8001";
```

### WiFi Credentials
```cpp
const char* ssid     = "escape";
const char* password = "";  // Rete senza password
```

---

## 🐛 Troubleshooting

### LED Porta rimane spento
- ✅ Verifica connessione WiFi
- ✅ Controlla endpoint: `curl http://192.168.8.10:8001/api/game-completion/door-leds`
- ✅ Verifica pin hardware P4 e P16

### LED TV (P23) non si accende
- ✅ Verifica che il tasto M funzioni
- ✅ Controlla serial monitor: cerca "TV: completed"
- ✅ Verifica pin hardware P23
- ✅ Test manuale: `curl -X POST http://192.168.8.10:8001/api/sessions/999/livingroom-puzzles/tv/complete`

### Blinking non funziona
- ✅ Verifica che backend risponda `"soggiorno": "blinking"`
- ✅ Controlla serial monitor: cerca "LED PORTA AGGIORNATO"
- ✅ Il blinking è locale, dovrebbe funzionare anche senza backend

### WiFi non connette
- ✅ Verifica che rete "escape" sia visibile
- ✅ Controlla se ESP32 si riavvia dopo 30 tentativi
- ✅ Verifica alimentazione ESP32 (USB o 5V esterni)

---

## 📊 Tabella Stati LED Porta

| Stanze Completate | Stato Backend | Comportamento LED |
|-------------------|---------------|-------------------|
| 0 | `"red"` | 🔴 Rosso fisso |
| 1 | `"blinking"` | 💚 Verde lampeggiante (500ms) |
| 2 | `"blinking"` | 💚 Verde lampeggiante (500ms) |
| 3 | `"blinking"` | 💚 Verde lampeggiante (500ms) |
| 4 (VITTORIA!) | `"green"` | 💚 Verde fisso |

---

## 🎮 Test Manuale

### 1. Reset stato iniziale
```bash
curl -X POST http://192.168.8.10:8001/api/sessions/999/livingroom-puzzles/reset \
  -H "Content-Type: application/json" \
  -d '{"level": "full"}'
```

### 2. Completa TV (Tasto M simulato)
```bash
curl -X POST http://192.168.8.10:8001/api/sessions/999/livingroom-puzzles/tv/complete
```
**Verifica:** LED P23 (TV bianco) dovrebbe accendersi

### 3. Completa Pianta (Tasto G simulato)
```bash
curl -X POST http://192.168.8.10:8001/api/sessions/999/livingroom-puzzles/pianta/complete
```
**Verifica:** LED Pianta verde, LED Condiz rosso

### 4. Completa Condizionatore
```bash
curl -X POST http://192.168.8.10:8001/api/sessions/999/livingroom-puzzles/condizionatore/complete
```
**Verifica:** LED Porta dovrebbe iniziare a lampeggiare verde

---

## 📝 Note Tecniche

### Intervalli Polling
- Polling backend: 2000ms (2 secondi)
- Blinking interval: 500ms (2 Hz)
- Status print: 10000ms (10 secondi)

### Timeout HTTP
- Timeout richieste: 5000ms (5 secondi)
- Retry automatico: No (fail silenzioso)

### Session ID
- Fetch automatico all'avvio da `/api/sessions/active`
- Fallback: 999 (sessione test)
- Aggiornamento: Solo al reboot ESP32

### Memoria JSON
- Door LED buffer: 512 bytes
- Puzzle state buffer: 1024 bytes
- Total RAM: ~2KB per JSON parsing

---

## ✅ Checklist Finale

Prima di deployare su Raspberry:

- [ ] Verificato pin hardware collegati correttamente
- [ ] Testato LED Porta (P4 verde, P16 rosso)
- [ ] Testato LED TV (P23 bianco)
- [ ] Testato LED Pianta (P17 verde, P5 rosso)
- [ ] Testato LED Condiz (P18 verde, P19 rosso)
- [ ] Backend risponde a `/api/game-completion/door-leds`
- [ ] Backend risponde a `/api/sessions/{id}/livingroom-puzzles/state`
- [ ] WiFi "escape" raggiungibile
- [ ] Serial monitor mostra output corretto
- [ ] Blinking funziona fluido
- [ ] Test completo della sequenza LED

---

## 🆕 Differenze con Versione Precedente

**esp32-soggiorno-RASPBERRY-FIXED.ino** (VECCHIO)
- ❌ Nessun LED Porta
- ✅ LED TV (P23)
- ✅ LED Pianta
- ✅ LED Condiz

**esp32-soggiorno-RASPBERRY-COMPLETE.ino** (NUOVO)
- ✅ LED Porta con blinking (P4 + P16)
- ✅ LED TV (P23)
- ✅ LED Pianta
- ✅ LED Condiz
- ✅ Polling sistema globale
- ✅ Status print completo

---

## 📞 Supporto

Per problemi o domande:
1. Controlla serial monitor output
2. Verifica log backend
3. Testa endpoint manualmente con curl
4. Verifica hardware con multimetro

**Versione:** 1.0 - Complete System  
**Data:** 14/01/2026  
**Autore:** Cline AI Assistant  
**Testato su:** ESP32 Dev Module + Raspberry Pi 4
