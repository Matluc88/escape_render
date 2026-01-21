# 🎉 ESP32 Esterno - Sistema Completo con MQTT

## 📋 Panoramica

Sistema completo per l'ESP32 esterno che controlla:
- **4 LED bicolore** (cancello + porta)
- **4 Servo** (cancelli DX/SX, porta, tetto)
- **RGB LED Festa** (si accende SOLO alla vittoria di tutte le 4 stanze)
- **Fotocellula** (logica invertita: LOW = occupato)
- **MQTT** per ricevere stato vittoria dal backend

---

## 🔧 Hardware

### Pin Configuration

```cpp
// LED BICOLORE (2 componenti)
#define LED_CANCELLO_VERDE   4    // LED verde cancello (segue fotocellula)
#define LED_CANCELLO_ROSSO   16   // LED rosso cancello (opposto)
#define LED_PORTA_VERDE      33   // LED verde porta (segue apertura)
#define LED_PORTA_ROSSO      25   // LED rosso porta (opposto)

// FOTOCELLULA (LOW = occupato)
#define IR_PIN               19

// SERVO
#define SERVO_DX             5    // Cancello destro
#define SERVO_SX             17   // Cancello sinistro
#define SERVO_PORTA          18   // Porta ingresso
#define SERVO_TETTO          32   // Tetto (DS3225MG)

// RGB FESTA (SI ACCENDE SOLO ALLA VITTORIA)
#define RGB_R                21
#define RGB_G                22
#define RGB_B                23
```

---

## 🎯 Logica Sistema

### 1. LED CANCELLO (Verde/Rosso)
```
irLibero (HIGH)  → LED VERDE acceso
irLibero (LOW)   → LED ROSSO acceso
```

### 2. LED PORTA (Verde/Rosso)
```
portaAperta (HIGH) → LED VERDE acceso
portaAperta (LOW)  → LED ROSSO acceso
```

### 3. Animazione Servo
- **Smooth movement** con incrementi ogni 15ms
- **Apertura**: 0° → 90° (cancelli/porta), 0° → 180° (tetto)
- **Chiusura**: Al contrario

### 4. RGB FESTA ✨
```cpp
// ❌ PRIMA (sbagliata): if (irLibero) { accendi RGB }
// ✅ ADESSO (corretta): if (gameWon) { accendi RGB }
```

**L'RGB si accende SOLO quando tutte e 4 le stanze sono completate!**

---

## 📡 Sistema MQTT

### ESP32 → Backend (Pubblicazione Stati)

**Topic Format**: `escape/esterno/{session_id}/{elemento}`

Esempio con session_id = 999:
- `escape/esterno/999/led/stato` → "VERDE" o "ROSSO"
- `escape/esterno/999/ir-sensor/stato` → "LIBERO" o "OCCUPATO"
- `escape/esterno/999/cancello1/posizione` → "0" a "90"
- `escape/esterno/999/cancello2/posizione` → "0" a "90"
- `escape/esterno/999/porta/posizione` → "0" a "90"
- `escape/esterno/999/tetto/posizione` → "0" a "180"

### Backend → ESP32 (Ricezione Vittoria)

**Topic**: `escape/game-completion/won` (GLOBALE - nessun session_id)
**Payload**: `"true"` o `"false"`

### Flusso Completo

```
=== AVVIO ===
1. ESP32 si connette a WiFi
2. ESP32 fa HTTP GET a /api/sessions/active
3. Backend risponde con session_id attivo (es. 999)
4. ESP32 usa questo session_id per tutti i topic MQTT

=== PUBBLICAZIONE STATI ===
5. ESP32 pubblica ogni 500ms su: escape/esterno/999/...
6. Backend (opzionale) può subscribersi a questi topic

=== VITTORIA ===
7. Giocatori completano tutte le 4 stanze
8. Backend calcola game_won = true
9. Backend pubblica MQTT: "escape/game-completion/won" → "true"
10. ESP32 riceve messaggio MQTT
11. ESP32 aggiorna variabile gameWon = true
12. RGB inizia animazione festa! 🎉
```

### Configurazione MQTT

```cpp
#define MQTT_SERVER "192.168.1.10"  // IP del backend (stesso PC)
#define MQTT_PORT   1883
const char* backend_url = "http://192.168.1.10:8001";

// Session ID dinamico (fetchato da backend al boot)
int session_id = 999;  // Default fallback
```

---

## 🚀 Setup

### 1. Installare Librerie Arduino

```
- ESP32Servo
- PubSubClient
- WiFi (inclusa in ESP32 core)
```

### 2. Configurare WiFi

```cpp
const char* ssid = "Vodafone-E23524170";
const char* password = "YOUR_PASSWORD";
```

### 3. Installare MQTT Broker (Mosquitto)

**macOS**:
```bash
brew install mosquitto
brew services start mosquitto
```

**Linux**:
```bash
sudo apt install mosquitto mosquitto-clients
sudo systemctl start mosquitto
sudo systemctl enable mosquitto
```

**Docker** (alternativa):
```bash
docker run -d --name mosquitto -p 1883:1883 eclipse-mosquitto
```

### 4. Verificare Broker MQTT

```bash
# Terminal 1: Subscribe (ricevi messaggi)
mosquitto_sub -h localhost -t "escape/game-completion/won"

# Terminal 2: Publish (invia test)
mosquitto_pub -h localhost -t "escape/game-completion/won" -m "true"
```

### 5. Caricare ESP32

1. Apri `esp32-esterno-GATE-PHOTOCELL-FINAL.ino` in Arduino IDE
2. Seleziona **Board**: ESP32 Dev Module
3. Seleziona **Port**: /dev/cu.usbserial-* (o COM*)
4. Click **Upload** ⬆️

---

## 🧪 Test Sistema

### Test 1: LED e Fotocellula

```
1. Avvia ESP32
2. Copri fotocellula con mano
   → LED ROSSO cancello acceso
   → Cancelli chiusi
3. Rimuovi mano
   → LED VERDE cancello acceso
   → Cancelli aperti (animazione smooth)
```

### Test 2: MQTT e RGB

**Opzione A: Test Manuale (senza gioco)**
```bash
# Accendi RGB
mosquitto_pub -h 192.168.1.10 -t "escape/game-completion/won" -m "true"

# Spegni RGB
mosquitto_pub -h 192.168.1.10 -t "escape/game-completion/won" -m "false"
```

**Opzione B: Test con Gioco**
```
1. Avvia gioco con sessione test (999)
2. Completa tutte e 4 le stanze
3. Backend pubblica automaticamente MQTT
4. RGB ESP32 si accende! 🎉
```

### Test 3: Serial Monitor

```
📡 [MQTT] Attempting to connect...
✅ [MQTT] Connected to broker!
✅ [MQTT] Subscribed to: escape/game-completion/won
📩 [MQTT] Message arrived on topic: escape/game-completion/won
📩 [MQTT] Payload: true
🏆 [MQTT] Game WON! RGB festa attivato!
```

---

## 🔍 Troubleshooting

### ❌ ESP32 non si connette a WiFi

```cpp
// Verifica credenziali
const char* ssid = "Vodafone-E23524170";
const char* password = "CORRECT_PASSWORD";

// Check serial monitor per errori
Serial.begin(115200);
```

### ❌ MQTT non funziona

1. **Verifica broker in esecuzione**:
   ```bash
   brew services list | grep mosquitto
   # Output: mosquitto started
   ```

2. **Verifica IP server**:
   ```bash
   ifconfig | grep "inet "
   # Usa l'IP locale (192.168.x.x)
   ```

3. **Test connessione manuale**:
   ```bash
   mosquitto_pub -h 192.168.1.10 -t "test" -m "hello"
   ```

### ❌ RGB non si accende

1. **Check variabile gameWon**:
   ```cpp
   // Nel loop, aggiungi debug:
   if (gameWon) {
     Serial.println("🏆 Game WON - RGB dovrebbe essere acceso!");
   }
   ```

2. **Test RGB diretto**:
   ```cpp
   // Nel setup(), forza RGB rosso
   analogWrite(RGB_R, 255);
   delay(1000);
   ```

3. **Verifica topic MQTT**:
   ```cpp
   // Deve essere esattamente:
   client.subscribe("escape/game-completion/won");
   ```

---

## 📂 File Correlati

- **ESP32 Code**: `esp32-esterno-GATE-PHOTOCELL-FINAL.ino`
- **Backend MQTT**: `backend/app/mqtt_client.py`
- **WebSocket Handler**: `backend/app/websocket/handler.py`
- **3D Scene**: `src/components/scenes/EsternoScene.jsx`
- **Casa Model**: `src/components/3D/CasaModel.jsx`

---

## 🎊 Checklist Finale

- [ ] ESP32 caricato con codice aggiornato
- [ ] WiFi configurato e connesso
- [ ] Mosquitto broker in esecuzione
- [ ] Backend Docker riavviato (`docker-compose restart backend`)
- [ ] Fotocellula testata (LED rosso/verde)
- [ ] Servo animati correttamente
- [ ] MQTT testato manualmente
- [ ] RGB si accende SOLO alla vittoria (non alla fotocellula!)

---

## 🏆 Sistema Completo!

Quando tutte e 4 le stanze sono completate:

```
Backend → Calcola game_won = true
       ↓
Backend → Pubblica MQTT "escape/game-completion/won" = "true"
       ↓
ESP32   → Riceve MQTT
       ↓
ESP32   → gameWon = true
       ↓
RGB     → 🎉 FESTA! Ciclo colori rosso/verde/blu/giallo/magenta/ciano
```

**Buon divertimento! 🚀**
