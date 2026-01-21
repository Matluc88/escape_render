# 🗄️🍳 ESP32 CUCINA - ANTA MOBILE + PENTOLA

## ✅ Sistema Completo Implementato!

File creato: `esp32-cucina-ANTA-PENTOLA.ino`

---

## 📋 Hardware Necessario

### Componenti
- **1x ESP32** DevKit
- **2x Sensori Reed magnetici** (interruttori magnetici)
- **2x Magneti** (per attivare i sensori)
- Cavi jumper
- Alimentazione USB

### Collegamento Pin

| Sensore | Pin ESP32 | Funzione |
|---------|-----------|----------|
| **MAG1** | GPIO 32 | Anta mobile decorativa (toggle) |
| **MAG2** | GPIO 33 | Pentola sui fornelli |
| **GND** | GND | Ground comune |
| **VCC** | 3.3V | Alimentazione sensori (opzionale) |

**Nota:** I sensori usano `INPUT_PULLUP`, quindi il pin VCC può non essere collegato.

---

## 🔧 Configurazione

### 1. Modifica WiFi

Nel file `.ino`, aggiorna le credenziali:

```cpp
const char* ssid     = "TUO_WIFI_SSID";
const char* password = "TUA_WIFI_PASSWORD";
```

### 2. Modifica Backend URL

```cpp
const char* backend_url = "http://TUO_IP:8001";
const int session_id = 999;  // O il tuo session_id
```

**Trova il tuo IP backend:**
```bash
# Su Mac/Linux
ifconfig | grep "inet "

# Su Windows
ipconfig
```

---

## 🔄 Logica Sensori

### MAG1 - Anta Mobile (Toggle)

**Comportamento:**
- **OGNI cambio di stato** → Toggle anta
- Magnete si avvicina → Anta cambia stato
- Magnete si allontana → Anta cambia stato di nuovo

**Esempio:**
```
INIZIO: Anta APERTA
MAG1 si chiude → POST /anta/toggle → Anta CHIUSA
MAG1 si apre   → POST /anta/toggle → Anta APERTA
```

### MAG2 - Pentola (Trigger)

**Comportamento:**
- **Solo quando si CHIUDE** → Attiva animazione pentola
- Pentola arriva (magnete vicino) → Animazione + Completa puzzle
- Pentola rimossa (magnete lontano) → Nessuna azione

**Esempio:**
```
INIZIO: Pentola lontana
MAG2 si chiude → POST /fornelli/animation-trigger → Pentola sui fornelli ✅
MAG2 si apre   → Solo log, nessuna azione
```

---

## 🌐 Endpoint API

### Anta Mobile
```
POST /api/sessions/{session_id}/kitchen-puzzles/anta/toggle
```
- **Trigger:** Ogni cambio stato MAG1
- **Effetto:** Toggle animazione anta nel gioco
- **WebSocket:** `animation_type: "anta_toggle"`

### Pentola Fornelli
```
POST /api/sessions/{session_id}/kitchen-puzzles/fornelli/animation-trigger
```
- **Trigger:** MAG2 si chiude (pentola arriva)
- **Effetto:** Animazione pentola + Completa puzzle fornelli
- **WebSocket:** `animation_type: "pentola_fornelli"`

---

## 📊 Monitor Seriale

Apri Serial Monitor (115200 baud) per vedere:

```
=================================
ESP32 CUCINA - ANTA + PENTOLA
=================================

📌 Pin configurati:
   - MAG1 (pin 32): Anta mobile
   - MAG2 (pin 33): Pentola

📡 Connessione WiFi a: Vodafone-E23524170
✅ WiFi connesso!
   IP: 192.168.1.25
   Backend: http://192.168.1.10:8001

📊 Stati iniziali:
   - MAG1: APERTO (lontano)
   - MAG2: APERTO (lontano)

✅ Sistema pronto!

🚨 MAG1 CAMBIATO!
   Da: APERTO → A: CHIUSO

🗄️ ===== ANTA TOGGLE =====
📡 HTTP POST → http://192.168.1.10:8001/api/sessions/999/kitchen-puzzles/anta/toggle
📥 Response: 200
✅ Request OK!

🚨 MAG2 CAMBIATO!
   Da: APERTO → A: CHIUSO
   → Pentola RILEVATA!

🍳 ===== PENTOLA FORNELLI =====
📡 HTTP POST → http://192.168.1.10:8001/api/sessions/999/kitchen-puzzles/fornelli/animation-trigger
📥 Response: 200
✅ Request OK!
```

---

## 🧪 Test

### 1. Test Connessione

```bash
# Verifica che ESP32 raggiunga il backend
ping 192.168.1.10
```

### 2. Test Manuale API

```bash
# Test anta
curl -X POST http://192.168.1.10:8001/api/sessions/999/kitchen-puzzles/anta/toggle

# Test pentola
curl -X POST http://192.168.1.10:8001/api/sessions/999/kitchen-puzzles/fornelli/animation-trigger
```

### 3. Test Sensori

1. **MAG1:** Avvicina/allontana magnete → Anta toggle nel gioco
2. **MAG2:** Avvicina magnete → Pentola sui fornelli + LED verde

---

## 🐛 Troubleshooting

### ESP32 non si connette a WiFi

```cpp
// Verifica SSID e password
const char* ssid     = "...";  // Deve essere esatto!
const char* password = "...";

// Prova a riavviare ESP32
ESP.restart();
```

### Request fallisce (HTTP 500/404)

- ✅ Backend Docker è running?
- ✅ URL corretto? (`http://IP:8001`)
- ✅ Session 999 esiste?

```bash
# Verifica backend
docker-compose ps

# Crea session 999 se non esiste
docker exec -it escape-room-backend-1 python -c "
from app.database import SessionLocal
from app.services.session_service import SessionService
db = SessionLocal()
SessionService.get_or_create_session(db, 999)
db.close()
print('✅ Session 999 creata')
"
```

### Sensore non risponde

```cpp
// Test manuale pin in setup()
Serial.print("MAG1: ");
Serial.println(digitalRead(MAG1));  // Deve cambiare con magnete
```

---

## 🎯 Flusso Completo

```
┌─────────────────┐
│   ESP32 CUCINA  │
└────────┬────────┘
         │
         │ MAG1 cambia → POST /anta/toggle
         │ MAG2 chiude → POST /fornelli/animation-trigger
         │
         ↓
┌─────────────────┐
│     BACKEND     │
│  (Flask/HTTP)   │
└────────┬────────┘
         │
         │ WebSocket Broadcast
         │ - animation_type: "anta_toggle"
         │ - animation_type: "pentola_fornelli"
         │
         ↓
┌─────────────────┐
│    FRONTEND     │
│ (React/Three.js)│
└────────┬────────┘
         │
         │ Listener riceve WebSocket
         │ - setAnimatedDoorOpen(prev => !prev)
         │ - setPentolaSuiFornelli(true)
         │
         ↓
┌─────────────────┐
│   ANIMAZIONI    │
│   NEL GIOCO! 🎮 │
└─────────────────┘
```

---

## 📦 File di Progetto

```
escape-room-3d/
├── esp32-cucina-ANTA-PENTOLA.ino          # ← CODICE ESP32
├── ESP32_ANTA_PENTOLA_GUIDE.md            # ← QUESTA GUIDA
├── backend/app/api/kitchen_puzzles.py      # API endpoints
└── src/components/scenes/KitchenScene.jsx  # Frontend listener
```

---

## 🚀 Deployment

### 1. Carica su ESP32

```
Arduino IDE → Strumenti → Scheda → ESP32 Dev Module
Arduino IDE → Strumenti → Porta → /dev/cu.usbserial-...
Arduino IDE → Sketch → Carica
```

### 2. Verifica Serial Monitor

```
Apri Serial Monitor (115200 baud)
Verifica "✅ Sistema pronto!"
```

### 3. Test Gioco

```bash
# Avvia backend
cd escape-room-3d
docker-compose up

# Avvia frontend
npm run dev
```

**Apri:** `http://localhost:5175`

### 4. Test Sensori LIVE

1. **MAG1:** Apri/chiudi anta → Anta nel gioco toggle ✅
2. **MAG2:** Avvicina pentola → Animazione + LED verde ✅

---

## ✅ Sistema Completo!

**Entrambe le animazioni ESP32 sono operative:**
- 🗄️ **Anta mobile** (MAG1) → Toggle animazione
- 🍳 **Pentola** (MAG2) → Animazione + Puzzle completato

**Buon divertimento! 🎉🚀**
