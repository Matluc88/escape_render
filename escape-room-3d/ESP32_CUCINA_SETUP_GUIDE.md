# 🎮 ESP32 Cucina - Guida Setup Completa

**Data**: 8 Gennaio 2026  
**Versione**: 3.0 FINAL FIXED  
**File**: `esp32-cucina-FINAL-FIXED.ino`

---

## ✅ FIX IMPLEMENTATI

### 1. **Frigo Logica Invertita** ✅
- ❌ **PRIMA**: Frigo partiva CHIUSO (90°) e si APRIVA (0°)
- ✅ **ORA**: Frigo parte APERTO (0°) e si CHIUDE (90°) quando utente conferma

### 2. **Polling Chiusura Frigo (OPZIONE B)** ✅
- ESP32 fa polling ogni 1 secondo a `/frigo/servo-state`
- Servo si chiude SOLO quando utente clicca "SI" nel frontend
- Sincronizzazione perfetta con gioco

### 3. **Fix Loop Infinito Case FRIGO** ✅
- Rimosso `delay(2000)` bloccante
- Usato `millis()` per timing non-bloccante
- Flag `frigoCheckStarted` per evitare loop infinito

### 4. **Gestione MAG1 per Animazione Anta** ✅
- MAG1 trigger → POST `/anta/toggle`
- Equivalente fisico del TASTO 1 nel gioco
- Animazione anta mobile sincronizzata

### 5. **Gestione MIC_PIN per Animazione Serra** ✅
- MIC rileva battito → POST `/serra/animation-trigger`
- Equivalente fisico del TASTO Z nel gioco
- Neon serra accende nel frontend

### 6. **LED Porta Lampeggia** ✅
- Quando 3 LED verdi (cucina completa): LED porta LAMPEGGIA
- Quando tutte 4 stanze complete: LED porta VERDE fisso + porta apre

### 7. **Reset Backend Sincronizzato** ✅
- Reset ESP32 chiama anche reset backend
- Tutti i LED e servo tornano a stato iniziale

---

## 🔌 SCHEMA CONNESSIONI HARDWARE

### LED Puzzle
```
GPIO 17 → LED2_VERDE (Fornelli) + Resistenza 220Ω → GND
GPIO 5  → LED2_ROSSO (Fornelli) + Resistenza 220Ω → GND
GPIO 18 → LED3_VERDE (Frigo) + Resistenza 220Ω → GND
GPIO 19 → LED3_ROSSO (Frigo) + Resistenza 220Ω → GND
GPIO 21 → LED4_VERDE (Serra) + Resistenza 220Ω → GND
GPIO 22 → LED4_ROSSO (Serra) + Resistenza 220Ω → GND
```

### LED Porta
```
GPIO 4  → LED1_VERDE (Porta) + Resistenza 220Ω → GND
GPIO 16 → LED1_ROSSO (Porta) + Resistenza 220Ω → GND
```

### Servo Motori
```
GPIO 27 → SERVO_PORTA (signal pin)
GPIO 26 → SERVO_FRIGO (signal pin)
5V      → Servo VCC (entrambi)
GND     → Servo GND (entrambi)
```

### Sensori
```
GPIO 32 → MAG1 (Reed Switch anta mobile)
GPIO 33 → MAG2 (Reed Switch pentola)
GPIO 25 → MIC_PIN (Microfono MAX4466 OUT)
GPIO 23 → STRIP_LED (WS2812B data pin)
```

---

## ⚙️ CONFIGURAZIONE SOFTWARE

### 1. Arduino IDE Setup
```
File → Preferenze → URL Gestione Schede Aggiuntive:
https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json

Strumenti → Scheda → ESP32 Arduino → ESP32 Dev Module

Librerie necessarie:
- ESP32Servo (by Kevin Harrington)
- WiFi (inclusa)
- HTTPClient (inclusa)
```

### 2. Modifica Parametri

#### WiFi (OBBLIGATORIO)
```cpp
const char* ssid     = "TUO_WIFI_SSID";      // ← Cambia
const char* password = "TUA_WIFI_PASSWORD";  // ← Cambia
```

#### Backend URL (VERIFICA!)
```cpp
const char* backend_url = "http://192.168.1.10:8001";  // ← Verifica IP e porta

// Opzioni comuni:
// - Docker Dev: http://192.168.1.X:8000
// - Docker Prod: http://192.168.1.X:3000
// - Locale: http://localhost:8001
```

#### Session ID
```cpp
const int session_id = 999;  // Session test default
```

### 3. Upload su ESP32
```
1. Collega ESP32 via USB
2. Seleziona porta: Strumenti → Porta → /dev/cu.usbserial-XXXX
3. Clicca Upload (→)
4. Apri Serial Monitor (Ctrl+Shift+M) per debug
5. Baud rate: 115200
```

---

## 🎮 SEQUENZA GAMEPLAY

### Stato Iniziale
```
🔴 LED1_ROSSO fisso (Porta chiusa)
🔴 LED2_ROSSO fisso (Fornelli da completare)
🔴 LED3_ROSSO fisso (Frigo da completare)
🔴 LED4_ROSSO fisso (Serra da completare)
🔒 SERVO_FRIGO a 0° (APERTO!)
🔒 SERVO_PORTA a 90° (CHIUSA)
```

### Step 1: Fornelli (MAG2)
```
Azione: Giocatore solleva pentola
Sensore: MAG2 rileva (LOW)
ESP32: POST /fornelli/complete
LED: LED2 ROSSO → VERDE ✅
Stato: FORNELLI → FRIGO
```

### Step 2: Frigo (Polling)
```
Azione: Utente clicca "SI chiudi frigo" nel gioco
Backend: frigo status → "completed"
ESP32: Polling rileva should_close_servo = true
Servo: write(90) - CHIUDE FRIGO ✅
LED: LED3 ROSSO → VERDE ✅
Stato: FRIGO → SERRA
```

### Step 3: Serra (MIC_PIN)
```
Azione: Giocatore batte le mani
Sensore: MIC_PIN rileva picco audio
ESP32: POST /serra/animation-trigger (animazione)
ESP32: POST /serra/complete (puzzle)
LED: LED4 ROSSO → VERDE ✅
Strip: STRIP_LED accende ✅
Stato: SERRA → COMPLETATO
kitchenComplete: true
```

### Step 4: LED Porta Lampeggia
```
Condizione: kitchenComplete = true, allRoomsComplete = false
LED Porta: ROSSO lampeggia (0.5s ON/OFF) 🟡
Servo Porta: Resta chiuso (90°)
Messaggio: "Aspetto altre stanze..."
```

### Step 5: Tutte Stanze Complete
```
Condizione: allRoomsComplete = true
LED Porta: VERDE fisso 🟢
Servo Porta: write(0) - APRE PORTA ✅
Messaggio: "VITTORIA!"
```

---

## 📡 ENDPOINT BACKEND RICHIESTI

### Endpoint Esistenti (già implementati)
```
✅ POST /api/sessions/{id}/kitchen-puzzles/fornelli/complete
✅ POST /api/sessions/{id}/kitchen-puzzles/serra/complete
✅ POST /api/sessions/{id}/kitchen-puzzles/reset
✅ GET  /api/sessions/{id}/game-completion/status
```

### Endpoint NUOVI da Implementare
```
🆕 GET  /api/sessions/{id}/kitchen-puzzles/frigo/servo-state
   Risposta: {"should_close_servo": true/false}
   
🆕 POST /api/sessions/{id}/kitchen-puzzles/anta/toggle
   Trigger animazione anta mobile nel frontend
   
🆕 POST /api/sessions/{id}/kitchen-puzzles/serra/animation-trigger
   Trigger animazione neon serra nel frontend
```

---

## 🐛 TROUBLESHOOTING

### LED Non Si Accendono
```
1. Verifica alimentazione ESP32 (USB o 5V esterno)
2. Controlla resistenze LED (220Ω)
3. Testa LED singolarmente con multimetro
4. Verifica polarità LED (anodo +, catodo -)
```

### WiFi Non Si Connette
```
1. Verifica SSID e password corretti
2. Controlla che sia WiFi 2.4GHz (non 5GHz!)
3. Avvicina ESP32 al router
4. Serial Monitor → vedi "WiFi connesso!" ?
```

### Backend Non Risponde
```
1. Ping backend: ping 192.168.1.10
2. Verifica porta: curl http://192.168.1.10:8001/docs
3. Controlla Docker: docker ps | grep backend
4. Serial Monitor → vedi "❌ HTTP XXX" ?
```

### Servo Non Si Muove
```
1. Alimentazione servo: DEVE essere 5V esterno (non ESP32!)
2. Verifica cablaggio: signal + VCC + GND
3. Test servo: servoFrigo.write(0); delay(1000); servoFrigo.write(90);
4. Controlla corrente: servo richiede min 500mA
```

### Microfono Non Rileva
```
1. Verifica alimentazione microfono (VCC, GND, OUT)
2. Serial Monitor → stampa rumoreFondo (calibrazione)
3. Test manuale: batti mani vicino al mic
4. Regola MARGINE_BATTITO se troppo sensibile/insensibile
```

---

## 📊 SERIAL MONITOR OUTPUT

### Avvio Corretto
```
🚀 ESP32 Cucina - Starting...
Connessione WiFi....
✅ WiFi connesso!
IP: 192.168.1.200
🎤 Calibrazione microfono...
🎤 Rumore fondo: 234
🔄 Resetting backend...
📤 http://192.168.1.10:8001/api/sessions/999/kitchen-puzzles/reset
✅ HTTP 200 OK
✅ Reset completato - Frigo APERTO
🎮 Sistema pronto!
```

### Durante Gioco
```
🗄️ Anta mobile APERTA
📤 http://192.168.1.10:8001/api/sessions/999/kitchen-puzzles/anta/toggle
✅ HTTP 200 OK

🔥 Fornelli completati!
📤 http://192.168.1.10:8001/api/sessions/999/kitchen-puzzles/fornelli/complete
✅ HTTP 200 OK

🧊 Stato FRIGO - Frigo è APERTO, aspetto chiusura utente...
📤 http://192.168.1.10:8001/api/sessions/999/kitchen-puzzles/frigo/servo-state
✅ HTTP 200 OK
🔒 Frigo CHIUSO (user confirmed) + LED verde!

🌿 Serra completata + animazione neon triggered!
🎉 CUCINA COMPLETATA!
```

---

## 🧪 TEST CHECKLIST

### Test Hardware
- [ ] Tutti i LED si accendono (test pin by pin)
- [ ] Servo porta ruota da 0° a 90° e viceversa
- [ ] Servo frigo ruota da 0° a 90° e viceversa
- [ ] MAG1 rileva apertura/chiusura anta
- [ ] MAG2 rileva sollevamento pentola
- [ ] Microfono rileva battito mani
- [ ] Strip LED si accende

### Test Software
- [ ] ESP32 si connette al WiFi
- [ ] Ping al backend funziona
- [ ] Endpoint `/fornelli/complete` risponde 200
- [ ] Endpoint `/frigo/servo-state` risponde 200
- [ ] Endpoint `/serra/complete` risponde 200
- [ ] Polling game completion funziona

### Test Integrazione
- [ ] Sollevo pentola → LED verde + stato FRIGO
- [ ] Clicco "SI chiudi frigo" → servo chiude + LED verde
- [ ] Batto mani → LED verde + neon accende
- [ ] 3 LED verdi → LED porta lampeggia
- [ ] Reset → tutto torna rosso + frigo aperto

---

## 📚 FILE CORRELATI

- **Codice ESP32**: `esp32-cucina-FINAL-FIXED.ino`
- **Backend API**: `backend/app/api/kitchen_puzzles.py`
- **Frontend Hook**: `src/hooks/useKitchenPuzzle.js`
- **Scene 3D**: `src/components/scenes/KitchenScene.jsx`
- **Guida Integrazione**: `ESP32_INTEGRATION_GUIDE.md`

---

## ⚡ QUICK START

```bash
# 1. Verifica backend attivo
curl http://192.168.1.10:8001/docs

# 2. Modifica WiFi nel codice ESP32
# 3. Upload su ESP32
# 4. Apri Serial Monitor (115200 baud)
# 5. Verifica "Sistema pronto!"
# 6. Test sensori uno alla volta
# 7. Gioca!
```

---

**Codice production-ready! 🚀**
