# 🔌 ESP32 MQTT INTEGRATION - Scena Esterno

Documentazione completa per l'integrazione ESP32 con sistema MQTT per la scena esterno dell'Escape Room 3D.

## 📋 Indice

1. [Architettura Sistema](#architettura-sistema)
2. [Hardware Richiesto](#hardware-richiesto)
3. [Setup Backend](#setup-backend)
4. [Setup Frontend](#setup-frontend)
5. [Configurazione ESP32](#configurazione-esp32)
6. [Testing](#testing)
7. [Deploy Produzione](#deploy-produzione)
8. [Troubleshooting](#troubleshooting)

---

## 🏗️ Architettura Sistema

```
┌──────────────┐         MQTT (1883)         ┌─────────────────┐
│   ESP32      │◄──────────────────────────►│  Broker MQTT    │
│   Hardware   │        WiFi LAN             │  (Docker)       │
└──────────────┘                             └─────────────────┘
      │                                               │
      │                                               │
      │ Sensore IR                          WebSocket (9001)
      │ 4x Servo                                      │
      │ 2x LED                                        ▼
      │                                     ┌─────────────────┐
      └─────────────────────────────────────►│   Frontend      │
               Controllo Fisico              │   React + R3F   │
                                             └─────────────────┘
                                                      │
                                                      │ REST API
                                                      ▼
                                             ┌─────────────────┐
                                             │   Backend       │
                                             │   FastAPI       │
                                             └─────────────────┘
                                                      │
                                                      ▼
                                             ┌─────────────────┐
                                             │   PostgreSQL    │
                                             │   Database      │
                                             └─────────────────┘
```

### Flusso Dati

1. **ESP32** → legge sensore IR e controlla servo/LED
2. **ESP32** → pubblica stati su **MQTT** (porta 1883)
3. **Frontend** → si sottoscrive via **WebSocket** (porta 9001)
4. **Frontend** → aggiorna UI 3D in tempo reale
5. **Frontend** → salva stati su **Backend** (PostgreSQL)

---

## 🔧 Hardware Richiesto

### Componenti ESP32

| Componente | Quantità | Pin | Note |
|------------|----------|-----|------|
| ESP32 DevKit | 1 | - | Qualsiasi modello |
| Sensore IR | 1 | GPIO 18 | Fotocellula (LOW=libero) |
| LED Rosso | 1 | GPIO 23 | Fotocellula bloccata |
| LED Verde | 1 | GPIO 22 | Fotocellula libera |
| Servo MG996R | 2 | GPIO 19, 21 | Cancelli |
| Servo DS3225MG | 1 | GPIO 5 | Tetto serra (più potente) |
| Servo SG90 | 1 | GPIO 4 | Porta casa |
| Alimentatore | 1 | - | 5V 3A per servo |

### Schema Collegamenti

```
ESP32                Hardware
─────────────────────────────────
GPIO 18 ────────────► Sensore IR (OUT)
GPIO 22 ────────────► LED Verde (+)
GPIO 23 ────────────► LED Rosso (+)
GPIO 19 ────────────► Servo Cancello 1 (Signal)
GPIO 21 ────────────► Servo Cancello 2 (Signal)
GPIO 5  ────────────► Servo Tetto (Signal)
GPIO 4  ────────────► Servo Porta (Signal)
GND     ────────────► Tutti i GND
5V      ────────────► Alimentatore esterno (NO ESP32!)
```

⚠️ **IMPORTANTE**: Alimenta i servo con alimentatore esterno 5V, NON dall'ESP32!

---

## 🗄️ Setup Backend

### 1. Database Seed

Il seed è già aggiornato con 6 elementi ESP32:

```python
# backend/app/services/seed_service.py
{"room": "gate", "name": "esp32-ir-sensor", ...},
{"room": "gate", "name": "esp32-led-status", ...},
{"room": "gate", "name": "esp32-cancello1", ...},
{"room": "gate", "name": "esp32-cancello2", ...},
{"room": "gate", "name": "esp32-tetto-serra", ...},
{"room": "gate", "name": "esp32-porta-casa", ...}
```

### 2. Avviare Backend con MQTT

```bash
cd escape-room-3d/backend
docker-compose up -d
```

Verifica che 3 container siano attivi:
- `escape-backend` (FastAPI)
- `escape-db` (PostgreSQL)
- `escape-mqtt` (Mosquitto)

### 3. Verifica Broker MQTT

```bash
# Test connessione
docker logs escape-mqtt

# Output atteso:
# mosquitto version 2.x starting
# Opening ipv4 listen socket on port 1883
# Opening ipv4 listen socket on port 9001
```

---

## ⚛️ Setup Frontend

### 1. Hook MQTT

Il hook `useMqttEsterno.js` è già creato e si connette automaticamente:

```javascript
// src/hooks/useMqttEsterno.js
const MQTT_URL = 'ws://localhost:9001'  // Dev locale
```

### 2. Integrazione Scena

La `EsternoScene.jsx` usa il hook per sincronizzare stati:

```javascript
const mqtt = useMqttEsterno()

// Stati derivati da MQTT
const fotocellulaSbloccata = mqtt.fotocellulaSbloccata
const cancelloAperto = mqtt.cancelloAperto
const ledVerde = mqtt.ledVerde
```

### 3. Avviare Frontend

```bash
cd escape-room-3d
npm run dev
```

Frontend disponibile su: `http://localhost:5173`

---

## 📡 Configurazione ESP32

### 1. Librerie Arduino Richieste

Installa da Arduino IDE Library Manager:

```
- WiFi (built-in)
- PubSubClient by Nick O'Leary
- ESP32Servo by Kevin Harrington
```

### 2. Modificare MQTT_SERVER

Apri `esp32-esterno-mqtt.ino` e modifica:

```cpp
// ⚠️ IMPORTANTE: Sostituisci con IP del computer che esegue Docker
const char* MQTT_SERVER = "192.168.1.XXX";  // <-- TUO IP
```

**Come trovare l'IP:**

```bash
# macOS
ifconfig | grep "inet " | grep -v 127.0.0.1

# Windows
ipconfig | findstr IPv4

# Linux
ip addr show | grep "inet "
```

### 3. Carica Codice su ESP32

1. Apri `esp32-esterno-mqtt.ino` in Arduino IDE
2. Seleziona **Board**: ESP32 Dev Module
3. Seleziona **Port**: (porta USB dove è connesso ESP32)
4. Click **Upload** (freccia →)

### 4. Monitor Seriale

Apri Serial Monitor (115200 baud) per vedere log:

```
╔════════════════════════════════════════╗
║  ESP32 ESTERNO - MQTT Integration     ║
║  Escape Room 3D System                 ║
╚════════════════════════════════════════╝

📡 Connessione WiFi a: Vodafone-E23524170
✅ WiFi connesso!
   IP Address: 192.168.1.123
   Signal: -45 dBm
✅ MQTT configurato
✅ PWM timers allocati
✅ Pin configurati
✅ Servo motori collegati
✅ Stato iniziale impostato

🚀 Sistema pronto!

🔄 Connessione MQTT broker (192.168.1.100:1883)...
✅ MQTT connesso!
📤 Stato iniziale pubblicato
```

---

## 🧪 Testing

### Scenario 1: Simulatore MQTT (senza hardware)

**Più rapido per sviluppo frontend:**

```bash
cd escape-room-3d

# Installa dipendenze simulatore (prima volta)
npm install mqtt

# Modalità interattiva (controllo da terminale)
node simulate-esp32.js

# Demo automatica
node simulate-esp32.js demo

# Sensore sempre libero
node simulate-esp32.js free

# Sensore sempre bloccato
node simulate-esp32.js blocked
```

**Comandi modalità interattiva:**
```
f - Libera fotocellula (IR libero)
b - Blocca fotocellula (IR occupato)
o - Apri cancelli (0° → 90°)
c - Chiudi cancelli (90° → 0°)
t - Toggle tetto serra
p - Toggle porta casa
r - Reset tutto
s - Mostra stato corrente
q - Esci
```

### Scenario 2: Test con ESP32 Reale

1. **Avvia Backend**:
   ```bash
   cd backend && docker-compose up
   ```

2. **Avvia Frontend**:
   ```bash
   npm run dev
   ```

3. **Carica codice su ESP32** (vedi sezione sopra)

4. **Testa sensore IR**:
   - Copri sensore → LED rosso, cancelli chiusi
   - Scopri sensore → LED verde, cancelli aperti (smooth animation)

5. **Verifica frontend**:
   - Apri `http://localhost:5173`
   - Vai alla scena Esterno
   - LED nella UI si aggiorna in tempo reale
   - Cancelli si animano quando ESP32 muove servo

### Verifica MQTT Topics

```bash
# Sottoscrivi a tutti i topic per vedere messaggi
docker exec -it escape-mqtt mosquitto_sub -t 'escape/esterno/#' -v

# Output atteso:
escape/esterno/ir-sensor/stato OCCUPATO
escape/esterno/led/stato ROSSO
escape/esterno/cancello1/posizione 0
escape/esterno/cancello2/posizione 0
escape/esterno/tetto/posizione 0
escape/esterno/porta/posizione 0
```

---

## 🚀 Deploy Produzione

### Su Raspberry Pi

#### 1. Setup Raspberry

```bash
# SSH nel Raspberry
ssh pi@raspberry.local

# Clona repo
git clone <your-repo-url>
cd escape-room-3d
```

#### 2. Configura IP Raspberry

```bash
# Trova IP Raspberry nella LAN
hostname -I
# Output esempio: 192.168.1.50
```

#### 3. Modifica Frontend per Produzione

```javascript
// src/hooks/useMqttEsterno.js
const MQTT_URL = 'ws://192.168.1.50:9001'  // IP Raspberry
```

#### 4. Modifica ESP32

```cpp
// esp32-esterno-mqtt.ino
const char* MQTT_SERVER = "192.168.1.50";  // IP Raspberry
```

#### 5. Build e Deploy

```bash
# Sul Raspberry
cd escape-room-3d

# Build frontend
npm run build

# Avvia tutto con Docker
docker-compose -f docker-compose.yml up -d

# Verifica container
docker ps
```

#### 6. Carica ESP32

Ricarica il codice modificato sull'ESP32 con il nuovo IP del Raspberry.

---

## 🐛 Troubleshooting

### ESP32 non si connette a WiFi

```
❌ Errore connessione WiFi!
```

**Soluzioni:**
1. Verifica SSID e password in `esp32-esterno-mqtt.ino`
2. Verifica che WiFi sia 2.4GHz (ESP32 non supporta 5GHz)
3. Avvicina ESP32 al router
4. Controlla Serial Monitor per dettagli errore

### ESP32 non si connette a MQTT

```
❌ Errore MQTT (rc=-2)
```

**Soluzioni:**
1. Verifica che `MQTT_SERVER` abbia IP corretto
2. Controlla che Docker backend sia running:
   ```bash
   docker ps | grep escape-mqtt
   ```
3. Verifica firewall non blocchi porta 1883:
   ```bash
   # macOS
   sudo lsof -i :1883
   
   # Linux
   sudo netstat -tlnp | grep 1883
   ```
4. Testa connessione MQTT:
   ```bash
   mosquitto_pub -h localhost -t test -m "hello"
   ```

### Frontend non riceve messaggi MQTT

**Verifica Console Browser (F12):**

```
[useMqttEsterno] 🔌 Connessione al broker MQTT via WebSocket...
[useMqttEsterno] ✅ Connesso al broker MQTT
[useMqttEsterno] 📡 Sottoscritto a: escape/esterno/ir-sensor/stato
```

**Se vedi errori di connessione:**
1. Verifica backend Docker sia running
2. Controlla porta 9001 sia aperta:
   ```bash
   docker exec -it escape-mqtt netstat -tlnp | grep 9001
   ```
3. Verifica URL in `useMqttEsterno.js` sia corretto

### Servo non si muovono

1. Verifica alimentazione 5V esterna (NO USB!)
2. Controlla pin connections nel Serial Monitor
3. Testa servo singolarmente:
   ```cpp
   // Test manuale in setup()
   cancello1.write(90);
   delay(1000);
   cancello1.write(0);
   ```

### LED non funzionano

1. Verifica resistenze (220Ω raccomandato)
2. Controlla polarità LED
3. Testa con digitalWrite diretto:
   ```cpp
   digitalWrite(LED_VERDE, HIGH);
   delay(1000);
   digitalWrite(LED_VERDE, LOW);
   ```

---

## 📊 Stati Tracciati nel Database

Tutti gli stati ESP32 vengono salvati automaticamente nel backend:

```sql
-- Query per vedere stati correnti
SELECT name, current_state 
FROM elements 
WHERE room_id = (SELECT id FROM rooms WHERE name = 'gate')
  AND name LIKE 'esp32-%';
```

Output:
```
esp32-ir-sensor    | {"libero": false, "raw_value": 1}
esp32-led-status   | {"color": "rosso"}
esp32-cancello1    | {"position": 0, "target": 90}
esp32-cancello2    | {"position": 0, "target": 90}
esp32-tetto-serra  | {"position": 0, "target": 180}
esp32-porta-casa   | {"position": 0, "target": 90}
```

---

## 🎯 Topics MQTT Completi

| Topic | Direzione | Formato | Retained | Descrizione |
|-------|-----------|---------|----------|-------------|
| `escape/esterno/ir-sensor/stato` | ESP32 → Broker | LIBERO/OCCUPATO | ✅ | Stato sensore IR |
| `escape/esterno/led/stato` | ESP32 → Broker | VERDE/ROSSO | ✅ | Colore LED |
| `escape/esterno/cancello1/posizione` | ESP32 → Broker | 0-90 | ✅ | Posizione servo cancello 1 |
| `escape/esterno/cancello2/posizione` | ESP32 → Broker | 0-90 | ✅ | Posizione servo cancello 2 |
| `escape/esterno/tetto/posizione` | ESP32 → Broker | 0-180 | ✅ | Posizione servo tetto |
| `escape/esterno/porta/posizione` | ESP32 → Broker | 0-90 | ✅ | Posizione servo porta |

---

## ✅ Checklist Finale

### Sviluppo Locale

- [ ] Backend Docker running (`docker ps`)
- [ ] Frontend dev server running (`npm run dev`)
- [ ] Simulatore MQTT funzionante (`node simulate-esp32.js`)
- [ ] Console browser mostra connessione MQTT
- [ ] LED UI cambia colore quando simuli fotocellula
- [ ] Cancelli si animano nella scena 3D

### Con ESP32 Reale

- [ ] ESP32 connesso a WiFi (Serial Monitor)
- [ ] ESP32 connesso a MQTT (Serial Monitor)
- [ ] Sensore IR funziona (copri/scopri)
- [ ] LED fisici cambiano colore
- [ ] Servo si muovono smooth
- [ ] Frontend riceve aggiornamenti real-time
- [ ] Stati salvati nel database

### Produzione Raspberry

- [ ] Docker running su Raspberry
- [ ] ESP32 configurato con IP Raspberry
- [ ] Frontend configurato con IP Raspberry
- [ ] Tutto funziona senza computer di sviluppo

---

## 📚 File Importanti

| File | Descrizione |
|------|-------------|
| `backend/app/services/seed_service.py` | Seed database con elementi ESP32 |
| `src/hooks/useMqttEsterno.js` | Hook React per MQTT |
| `src/components/scenes/EsternoScene.jsx` | Scena 3D con integrazione MQTT |
| `simulate-esp32.js` | Simulatore per testing |
| `esp32-esterno-mqtt.ino` | Codice Arduino per ESP32 |
| `backend/mosquitto/config/mosquitto.conf` | Configurazione broker MQTT |

---

## 🆘 Supporto

Per problemi o domande:

1. Controlla questa documentazione
2. Verifica Serial Monitor ESP32
3. Verifica Console Browser (F12)
4. Controlla log Docker: `docker logs escape-mqtt`
5. Usa simulatore per isolare problema (frontend vs hardware)

---

**🎉 Sistema completo e funzionante! Tutti gli stati tracciati nel backend come richiesto!**
