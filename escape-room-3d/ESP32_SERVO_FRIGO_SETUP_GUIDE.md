# 🧊 ESP32 Servo Frigo - Guida Setup Completa

## 📋 Indice
1. [Librerie Necessarie](#librerie-necessarie)
2. [Hardware Setup](#hardware-setup)
3. [Configurazione Software](#configurazione-software)
4. [Upload e Test](#upload-e-test)
5. [Troubleshooting](#troubleshooting)

---

## 📚 Librerie Necessarie

### 1. Installa ESP32Servo
```
Arduino IDE → Tools → Manage Libraries
Cerca: "ESP32Servo"
Installa: "ESP32Servo by Kevin Harrington" (latest version)
```

### 2. Installa ArduinoJson
```
Arduino IDE → Tools → Manage Libraries  
Cerca: "ArduinoJson"
Installa: "ArduinoJson by Benoit Blanchon" (v6.x.x o superiore)
```

### 3. Verifica Board ESP32
```
Arduino IDE → Tools → Board → ESP32 Arduino → ESP32 Dev Module
```

**Se ESP32 non compare:**
```
File → Preferences → Additional Board Manager URLs:
https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json

Poi: Tools → Board → Boards Manager → Cerca "ESP32" → Installa
```

---

## 🔌 Hardware Setup

### Componenti Necessari
- 1x ESP32 Dev Module
- 1x Servo SG90 (o compatibile 0-180°)
- 2x Sensore magnetico reed switch (per anta + pentola)
- Breadboard + jumper wires
- Alimentatore 5V (per servo)

### Schema Collegamenti

```
ESP32 PIN 32 (MAG1) ──────► Sensore Reed 1 (Anta mobile)
                             └─► GND

ESP32 PIN 33 (MAG2) ──────► Sensore Reed 2 (Pentola)
                             └─► GND

ESP32 PIN 26 (SERVO) ─────► Servo Signal (giallo/bianco)

Servo VCC (rosso) ─────────► 5V esterno (NON ESP32!)
Servo GND (marrone/nero) ──► GND comune

ESP32 GND ─────────────────► GND comune
```

### ⚠️ IMPORTANTE - Alimentazione Servo
**NON alimentare il servo dai 5V dell'ESP32!**
- Il servo assorbe picchi di corrente che possono danneggiare l'ESP32
- Usa un alimentatore esterno 5V 1-2A
- Collega GND comune tra ESP32 e alimentatore

### Verifica Collegamenti
```
✓ MAG1 (GPIO 32) → Sensore reed switch → GND
✓ MAG2 (GPIO 33) → Sensore reed switch → GND  
✓ SERVO (GPIO 26) → Signal servo
✓ Servo VCC → 5V esterno
✓ Servo GND → GND comune
✓ ESP32 GND → GND comune
```

---

## ⚙️ Configurazione Software

### 1. Apri il File
```
Apri: esp32-cucina-COMPLETO.ino con Arduino IDE
```

### 2. Configura WiFi
```cpp
const char* ssid     = "TUO_WIFI_SSID";
const char* password = "TUA_PASSWORD";
```

### 3. Configura Backend URL
```cpp
const char* backend_url = "http://192.168.1.10:8001";
const int session_id = 999;
```

**Cambia IP se necessario:**
- Sviluppo locale: `http://192.168.1.X:8001`
- Produzione: URL del server

### 4. Verifica Pin (già configurati)
```cpp
#define MAG1 32          // ✅ Anta mobile
#define MAG2 33          // ✅ Pentola
#define SERVO_PIN 26     // ✅ Servo frigo
```

---

## 🚀 Upload e Test

### 1. Compila e Carica
```
1. Seleziona porta: Tools → Port → /dev/cu.usbserial-XXXX
2. Click: Upload (freccia destra)
3. Attendi "Done uploading"
```

### 2. Apri Serial Monitor
```
Tools → Serial Monitor
Baud rate: 115200

Dovresti vedere:
=================================
ESP32 CUCINA - SISTEMA COMPLETO
=================================

📌 Pin configurati:
   - MAG1 (pin 32): Anta mobile
   - MAG2 (pin 33): Pentola
   - SERVO (pin 26): Frigo
   - Servo inizializzato: APERTO (0°)

📡 Connessione WiFi a: ...
✅ WiFi connesso!
   IP: 192.168.1.XXX
   Backend: http://192.168.1.10:8001

✅ Sistema pronto!
```

### 3. Test Funzionalità

#### Test 1: Anta Mobile (MAG1)
```
1. Avvicina/allontana magnete a sensore MAG1
2. Serial Monitor mostra:
   🚨 MAG1 CAMBIATO!
   Da: APERTO → A: CHIUSO
   🗄️ ===== ANTA TOGGLE =====
   📡 HTTP POST → ...
   ✅ Request OK!
3. Frontend: Animazione anta si attiva ✅
```

#### Test 2: Pentola (MAG2)
```
1. Avvicina magnete a sensore MAG2
2. Serial Monitor mostra:
   🚨 MAG2 CAMBIATO!
   Da: APERTO → A: CHIUSO
   → Pentola RILEVATA!
   🍳 ===== PENTOLA FORNELLI =====
   📡 HTTP POST → ...
   ✅ Request OK!
3. Frontend: Pentola si muove ai fornelli ✅
```

#### Test 3: Servo Frigo
```
1. Frontend: Utente clicca frigo → pulsante SI
2. Backend: frigo puzzle completato
3. ESP32 polling rileva (ogni 2 secondi):
   🧊 Frigo status: completed | should_close: true
   🔒 Chiudo sportello frigo...
   ✅ Sportello frigo CHIUSO (90°)
4. Servo ruota a 90° → sportello si chiude! ✅
```

---

## 🔧 Troubleshooting

### Errore: ArduinoJson.h not found
```
✅ Soluzione:
Arduino IDE → Tools → Manage Libraries
Cerca "ArduinoJson" → Installa (v6.x o superiore)
Ricompila
```

### Errore: ESP32Servo.h not found
```
✅ Soluzione:
Arduino IDE → Tools → Manage Libraries
Cerca "ESP32Servo" → Installa
Ricompila
```

### WiFi non si connette
```
1. Verifica SSID e password corrette
2. ESP32 e router sulla stessa rete
3. Prova hotspot mobile per test
4. Controlla Serial Monitor per errori
```

### Servo non si muove
```
1. ⚠️ Verifica alimentazione esterna 5V
2. Controlla collegamento signal (pin 26)
3. Testa con sketch servo esempio:
   File → Examples → ESP32Servo → Sweep
4. Verifica GND comune
```

### Backend non risponde
```
1. Ping IP backend: ping 192.168.1.10
2. Verifica backend attivo: docker ps
3. Test endpoint manuale:
   curl http://192.168.1.10:8001/api/sessions/999/kitchen-puzzles/state
4. Controlla firewall
```

### Errore 500 su /frigo/servo-state
```
❌ ESP32 mostra: Response: 500, Request FAILED!

✅ Soluzione:
Questo era un bug nel backend (metodo get_puzzle mancante).
FIX APPLICATO in backend/app/api/kitchen_puzzles.py

Verifica fix installato:
curl http://192.168.1.10:8001/api/sessions/999/kitchen-puzzles/frigo/servo-state

✅ Response corretta:
{"should_close_servo":true,"frigo_status":"done"}

Se ancora errore 500:
1. Riavvia backend: 
   cd backend && docker-compose -f docker-compose.dev.yml restart web
2. Ricontrolla endpoint
```

### Polling frigo lento
```
// Modifica intervallo in setup.ino:
const unsigned long SERVO_CHECK_INTERVAL = 1000;  // 1 secondo invece di 2
```

### Debug magneti
```
// Aggiungi nel loop() per vedere stato in tempo reale:
Serial.print("MAG1: ");
Serial.print(digitalRead(MAG1) == LOW ? "CHIUSO" : "APERTO");
Serial.print(" | MAG2: ");
Serial.println(digitalRead(MAG2) == LOW ? "CHIUSO" : "APERTO");
delay(500);
```

---

## 📊 Flusso Completo Sistema

### Enigma 1: Fornelli (MAG2)
```
1. Utente posiziona pentola fisica → MAG2 rileva
2. ESP32 → POST /fornelli/animation-trigger
3. Backend → WebSocket broadcast
4. Frontend → Pentola si muove (animazione)
5. Frontend → Auto-trigger POST /fornelli/complete
6. Backend → LED diventa verde ✅
```

### Enigma 2: Frigo (Servo)
```
1. Frontend → Overlay conferma "Chiudi frigo?"
2. Utente → Clicca pulsante SI
3. Frontend → POST /frigo/complete
4. Backend → DB: frigo.status = "completed"
5. ESP32 → Polling GET /frigo/servo-state (ogni 2s)
6. ESP32 → Rileva should_close_servo: true
7. ESP32 → Servo ruota 90° → chiude sportello fisico! ✅
```

---

## 🎯 Comandi Utili

### Reset Totale
```cpp
// In setup(), aggiungi dopo WiFi connect:
Serial.println("🔄 Reset tutto...");
servoFrigo.write(0);  // Apri servo
delay(1000);
// Backend reset via API se necessario
```

### Test Solo Servo
```cpp
void loop() {
  servoFrigo.write(0);    // Aperto
  delay(2000);
  servoFrigo.write(90);   // Chiuso
  delay(2000);
}
```

### Monitor Continuo
```cpp
void loop() {
  Serial.print("Servo: ");
  Serial.print(servoIsClosed ? "CHIUSO" : "APERTO");
  Serial.print(" | WiFi: ");
  Serial.println(WiFi.status() == WL_CONNECTED ? "OK" : "FAIL");
  delay(1000);
}
```

---

## ✅ Checklist Finale

Prima del deploy:
- [ ] Librerie installate (ESP32Servo + ArduinoJson)
- [ ] WiFi configurato correttamente
- [ ] Backend URL aggiornato
- [ ] Servo alimentato esternamente 5V
- [ ] GND comune collegato
- [ ] Test magneti funzionanti
- [ ] Test servo si muove 0°-90°
- [ ] Test endpoint backend risponde
- [ ] Serial Monitor mostra "Sistema pronto!"

---

## 📝 Note Tecniche

**Librerie usate:**
- `WiFi.h` - Connessione rete
- `HTTPClient.h` - Richieste HTTP
- `ESP32Servo.h` - Controllo servo (PWM)
- `ArduinoJson.h` - Parsing JSON response

**Intervalli polling:**
- Servo frigo: 2000ms (2 secondi)
- Loop delay: 100ms
- Debounce magneti: 500ms

**Posizioni servo:**
- SERVO_OPEN = 0° (frigo aperto)
- SERVO_CLOSED = 90° (frigo chiuso)

---

**Guida completata! 🎉**
Sistema ESP32 cucina completo con anta, pentola e servo frigo.
