# 🎮 ESP32 RASPBERRY PI - CONFIGURAZIONE COMPLETA

**Data:** 14 Gennaio 2026  
**Status:** ✅ COMPLETATO

---

## 📁 FILE CREATI

Sono stati creati 3 nuovi file `.ino` configurati per il Raspberry Pi:

1. **esp32-cucina-RASPBERRY.ino**
2. **esp32-esterno-RASPBERRY.ino** 
3. **esp32-soggiorno-RASPBERRY.ino**

---

## 🔧 MODIFICHE PRINCIPALI

### IP Backend Aggiornato
```cpp
// VECCHIO (Docker locale con bridge IPv4)
const char* ssid = "Vodafone-E23524170";
const char* password = "JtnLtfg73NXgAt9r";
const char* backend_url = "http://192.168.1.6:8002";
const char* mqtt_server = "192.168.1.10";

// NUOVO (Raspberry Pi)
const char* ssid = "escape";
const char* password = "";  // Rete senza password
const char* backend_url = "http://192.168.8.10:8001";  // ✅ Raspberry Pi
const char* mqtt_server = "192.168.8.10";              // ✅ Raspberry Pi (solo esterno)
```

---

## 📋 DETTAGLI FILE

### 1. **esp32-cucina-RASPBERRY.ino**

**Componenti:**
- ✅ MAG1 (Anta mobile) - GPIO 32
- ✅ MAG2 (Pentola fornelli) - GPIO 33
- ✅ Servo frigo - GPIO 26
- ✅ Microfono adattivo - GPIO 34
- ✅ Strip LED Serra - GPIO 23

**Endpoint:**
- `GET /api/sessions/active` - Fetch session ID dinamico
- `POST /api/sessions/{id}/kitchen-puzzles/anta/toggle`
- `POST /api/sessions/{id}/kitchen-puzzles/fornelli/animation-trigger`
- `POST /api/sessions/{id}/kitchen-puzzles/serra/complete`
- `GET /api/sessions/{id}/kitchen-puzzles/strip-led/state`
- `GET /api/sessions/{id}/kitchen-puzzles/frigo/servo-state`

**Features:**
- ⚡ Session ID dinamico al boot
- 🎤 Microfono con calibrazione adattiva automatica
- 🔄 Polling strip LED ogni 2s
- 🧊 Polling servo frigo ogni 2s

---

### 2. **esp32-esterno-RASPBERRY.ino**

**Componenti:**
- ✅ Fotocellula IR - GPIO 19
- ✅ 4 Servo (cancelli DX/SX, porta, tetto)
- ✅ 2 LED bicolore (cancello + porta)
- ✅ RGB LED festa (GPIO 21/22/23)

**Endpoint:**
- `GET /api/sessions/active` - Fetch session ID
- MQTT: `escape/game-completion/won` (sottoscrizione)
- MQTT: `escape/esterno/{session_id}/*` (pubblicazione)

**Features:**
- ⚡ Session ID dinamico
- 📡 MQTT per sincronizzazione 3D
- 🎊 RGB festa quando gioco completato
- 🚪 Movimento servo smooth (15ms)

---

### 3. **esp32-soggiorno-RASPBERRY.ino**

**Componenti:**
- ✅ LED Porta bicolore (Sistema GLOBALE)
- ✅ LED Pianta bicolore (Sistema LOCALE)
- ✅ LED Condizionatore bicolore (Sistema LOCALE)
- ✅ TV (GPIO 32)

**Endpoint:**
- `GET /api/sessions/active` - Fetch session ID
- `GET /api/sessions/{id}/game-completion/door-leds`
- `GET /api/sessions/{id}/livingroom-puzzles/state`

**Features:**
- ⚡ Session ID dinamico
- 🚪 LED Porta con blinking (500ms)
- 📺 TV ON quando puzzle completato
- 🔄 Polling ogni 2s

---

## 🚀 PROCEDURA DI UPLOAD

### 1. Arduino IDE Setup
```
1. Apri Arduino IDE
2. Installa board ESP32:
   - File → Preferences
   - Additional Boards URL: https://dl.espressif.com/dl/package_esp32_index.json
   - Tools → Board → Boards Manager
   - Cerca "ESP32" e installa
```

### 2. Installa Librerie
```
Tools → Manage Libraries:
- ESP32Servo
- PubSubClient (solo per esterno)
- ArduinoJson
```

### 3. Configurazione Board
```
Tools → Board: "ESP32 Dev Module"
Tools → Upload Speed: "115200"
Tools → Flash Frequency: "80MHz"
Tools → Partition Scheme: "Default 4MB with spiffs"
```

### 4. Upload
```
1. Collega ESP32 via USB
2. Tools → Port: Seleziona porta COM
3. Upload → Attendi "Hard resetting via RTS pin..."
4. Monitor Seriale (115200 baud) per verificare
```

---

## 🔍 VERIFICA FUNZIONAMENTO

### Controlli Serial Monitor

**Cucina:**
```
ESP32 CUCINA - RASPBERRY PI
📡 WiFi connesso!
IP: 192.168.x.x
🔍 Fetch Active Session ID...
✅ Active session ID: 999
🔧 Calibrazione microfono...
✅ Microfono calibrato!
✅ Sistema pronto!
```

**Esterno:**
```
ESP32 ESTERNO - RASPBERRY PI
✅ Connesso!
🔍 Fetch Session ID...
🎯 Session ID: 999
🔌 MQTT... ✅
✅ Sistema pronto!
```

**Soggiorno:**
```
ESP32 SOGGIORNO - RASPBERRY PI
✅ Connesso!
🔍 Fetch Session ID...
🎯 Session ID: 999
✅ Sistema pronto!
```

---

## 📊 TABELLA RIASSUNTIVA

| ESP32 | IP Backend | Porta | MQTT | Session ID |
|-------|------------|-------|------|------------|
| **Cucina** | 192.168.8.10 | 8001 | ❌ | ✅ Dinamico |
| **Esterno** | 192.168.8.10 | 8001 | ✅ | ✅ Dinamico |
| **Soggiorno** | 192.168.8.10 | 8001 | ❌ | ✅ Dinamico |

---

## 🎯 VANTAGGI NUOVA CONFIGURAZIONE

✅ **IP Unico:** Tutti gli ESP32 puntano a 192.168.8.10  
✅ **Session ID Dinamico:** Auto-fetch al boot (no hardcoded)  
✅ **Porta Unificata:** Tutti su porta 8001 (Raspberry Pi standard)  
✅ **Nessun Bridge:** Comunicazione diretta con Raspberry Pi  
✅ **Facilità:** Basta caricare i file .ino e funziona!

---

## 🆚 DIFFERENZE VERSIONI LOCALI VS RASPBERRY

| Parametro | Docker Locale | Raspberry Pi |
|-----------|---------------|--------------|
| **IP Backend** | 192.168.1.6 | 192.168.8.10 |
| **Porta** | 8002 (bridge) | 8001 (standard) |
| **Bridge IPv4** | Necessario | Non necessario |
| **MQTT IP** | 192.168.1.10 | 192.168.8.10 |

---

## 📝 NOTE IMPORTANTI

⚠️ **WiFi:** Verificare che gli ESP32 siano sulla stessa rete del Raspberry Pi  
⚠️ **Firewall:** Porta 8001 e 1883 (MQTT) devono essere aperte  
⚠️ **Session ID:** Gli ESP32 fetchano automaticamente la sessione attiva  
⚠️ **Fallback:** Se nessuna sessione attiva → usa session_id = 999

---

## 🔄 FLUSSO BOOT ESP32

```
1. Connessione WiFi
2. Fetch Active Session ID (http://192.168.8.10:8001/api/sessions/active)
3. Se successo → usa session_id ricevuto
4. Se fallisce → usa fallback 999
5. Setup sensori/attuatori
6. Calibrazione (solo cucina - microfono)
7. Fetch stati iniziali
8. Entra in loop polling
```

---

## 📚 FILE CORRELATI

- `SPAWN_COORDINATES_RASPBERRY_FIX.md` - Fix coordinate spawn
- `MACOS_DEPLOY_RASPBERRY_SUCCESS.md` - Deploy completo Raspberry Pi
- `esp32-cucina-COMPLETO.ino` - Versione Docker locale (bridge)
- `esp32-esterno-GATE-PHOTOCELL-FINAL.ino` - Versione Docker locale
- `esp32-soggiorno-COMPLETO.ino` - Versione Docker locale

---

**Configurazione completata! 🎉**

Tutti gli ESP32 sono pronti per essere caricati e funzionare con il Raspberry Pi!
