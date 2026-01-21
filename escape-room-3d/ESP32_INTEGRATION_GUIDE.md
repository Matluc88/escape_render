# ESP32 Integration Guide
# Guida all'Integrazione ESP32 con Backend Escape Room

**Data**: 30 Dicembre 2025  
**Versione**: 1.0  
**Stato**: Production Ready

---

## 📋 Indice

1. [Architettura Sistema](#architettura-sistema)
2. [Pattern HTTP/MQTT](#pattern-http-mqtt)
3. [Mapping Stanze → Endpoints](#mapping-stanze-endpoints)
4. [Esempi Codice ESP32](#esempi-codice-esp32)
5. [Testing & Simulazione](#testing-simulazione)
6. [Troubleshooting](#troubleshooting)

---

## 🏗️ Architettura Sistema

### Flusso Completo Sensor → LED

```
ESP32 Sensore
    ↓ (HTTP POST o MQTT publish)
Backend API /api/sessions/{id}/{room}-puzzles/{puzzle}/complete
    ↓
{room}_puzzle_service.validate_{puzzle}_complete()
    ↓
UPDATE {room}_puzzles SET puzzle_states
    ↓
game_completion_service.mark_room_completed() [se stanza completa]
    ↓
game_completion_service.get_door_led_states() [calcola LED]
    ↓
WebSocket broadcast → Frontend
    ↓
PuzzleLED component aggiorna colore
```

### Database Tables (Source of Truth)

```sql
kitchen_puzzles   → stati cucina (fornelli, frigo, serra, porta)
bedroom_puzzles   → stati camera (comodino, materasso, poltrona, ventola, porta)
bathroom_puzzles  → stati bagno (TODO)
living_puzzles    → stati soggiorno (TODO)
game_completion   → tracking globale vittoria + LED porte
```

### Stati LED Porta

```
"red"      → Stanza NON completata
"blinking" → Stanza completata, gioco NON vinto (altre stanze incomplete)
"green"    → Gioco vinto (tutte 4 stanze completate)
```

---

## 🔌 Pattern HTTP/MQTT

### Opzione 1: HTTP Direct (Raccomandato per Simplicità)

**Pro**:
- Semplice da implementare
- Retry automatico
- Conferma immediata

**Contro**:
- Richiede WiFi stabile

```cpp
#include <WiFi.h>
#include <HTTPClient.h>

const char* ssid = "YOUR_WIFI";
const char* password = "YOUR_PASSWORD";
const char* backend_url = "http://192.168.1.100:3000"; // Indirizzo backend
const int session_id = 999; // Session ID test

void completeKitchenFornelli() {
    if (WiFi.status() == WL_CONNECTED) {
        HTTPClient http;
        
        String url = String(backend_url) + "/api/sessions/" + 
                     String(session_id) + "/kitchen-puzzles/fornelli/complete";
        
        http.begin(url);
        http.addHeader("Content-Type", "application/json");
        
        int httpCode = http.POST("{}"); // Empty body
        
        if (httpCode == 200) {
            Serial.println("✅ Fornelli completato!");
        } else {
            Serial.printf("❌ Errore HTTP: %d\n", httpCode);
        }
        
        http.end();
    }
}
```

### Opzione 2: MQTT (Per Sistema Distribuito)

**Pro**:
- Fire-and-forget (non blocca ESP32)
- Supporta molti sensori contemporaneamente
- Decoupling perfetto

**Contro**:
- Broker MQTT necessario
- Debug più complesso

```cpp
#include <PubSubClient.h>

WiFiClient espClient;
PubSubClient mqtt(espClient);

const char* mqtt_server = "192.168.1.100";
const int mqtt_port = 1883;

void setup() {
    mqtt.setServer(mqtt_server, mqtt_port);
    mqtt.connect("ESP32_Kitchen_Fornelli");
}

void completeKitchenFornelli() {
    String topic = "escape/session/999/kitchen/fornelli/complete";
    mqtt.publish(topic.c_str(), "{}");
    Serial.println("📤 MQTT pubblicato");
}
```

---

## 🗺️ Mapping Stanze → Endpoints

### Cucina (Kitchen)

| Sensore/Azione | Endpoint HTTP | MQTT Topic |
|---|---|---|
| Fornelli Completato | `POST /api/sessions/{id}/kitchen-puzzles/fornelli/complete` | `escape/session/{id}/kitchen/fornelli/complete` |
| Frigo Completato | `POST /api/sessions/{id}/kitchen-puzzles/frigo/complete` | `escape/session/{id}/kitchen/frigo/complete` |
| Serra Completata | `POST /api/sessions/{id}/kitchen-puzzles/serra/complete` | `escape/session/{id}/kitchen/serra/complete` |
| Reset Cucina | `POST /api/sessions/{id}/kitchen-puzzles/reset` | - |

**Sequenza FSM Cucina**:
```
fornelli(5) → frigo(4) → serra(Z) → porta(unlocked) ✅
```

### Camera (Bedroom)

| Sensore/Azione | Endpoint HTTP | MQTT Topic |
|---|---|---|
| Comodino Completato | `POST /api/sessions/{id}/bedroom-puzzles/comodino/complete` | `escape/session/{id}/bedroom/comodino/complete` |
| Materasso Completato | `POST /api/sessions/{id}/bedroom-puzzles/materasso/complete` | `escape/session/{id}/bedroom/materasso/complete` |
| Poltrona Completata | `POST /api/sessions/{id}/bedroom-puzzles/poltrona/complete` | `escape/session/{id}/bedroom/poltrona/complete` |
| Ventola Completata | `POST /api/sessions/{id}/bedroom-puzzles/ventola/complete` | `escape/session/{id}/bedroom/ventola/complete` |
| Reset Camera | `POST /api/sessions/{id}/bedroom-puzzles/reset` | - |

**Sequenza FSM Camera**:
```
comodino(K) → materasso(M) → poltrona(L) → ventola(J) → porta(unlocked) ✅
```

### Bagno (TODO)

_Da implementare seguendo stesso pattern_

### Soggiorno (TODO)

_Da implementare seguendo stesso pattern_

---

## 💻 Esempi Codice ESP32

### ESP32 Completo - Sensore Fornelli

```cpp
/**
 * ESP32 - Fornelli Cucina
 * 
 * Hardware:
 * - Pin 2: LED stato (blu = WiFi OK, rosso = errore)
 * - Pin 34: Sensore temperatura/pulsante (INPUT_PULLUP)
 */

#include <WiFi.h>
#include <HTTPClient.h>

// Config WiFi
const char* ssid = "EscapeRoom_WiFi";
const char* password = "SecurePassword123";

// Config Backend
const char* backend_url = "http://192.168.1.100:3000";
const int session_id = 999;

// Hardware pins
const int LED_PIN = 2;
const int SENSOR_PIN = 34;

// State
bool puzzle_completed = false;

void setup() {
    Serial.begin(115200);
    
    pinMode(LED_PIN, OUTPUT);
    pinMode(SENSOR_PIN, INPUT_PULLUP);
    
    connectWiFi();
}

void loop() {
    // Check sensor trigger (button press or temp threshold)
    if (digitalRead(SENSOR_PIN) == LOW && !puzzle_completed) {
        Serial.println("🔥 Fornelli attivati!");
        delay(50); // Debounce
        
        if (completePuzzle()) {
            puzzle_completed = true;
            blinkSuccess();
        } else {
            blinkError();
        }
    }
    
    delay(100);
}

void connectWiFi() {
    Serial.print("Connessione WiFi...");
    WiFi.begin(ssid, password);
    
    while (WiFi.status() != WL_CONNECTED) {
        delay(500);
        Serial.print(".");
    }
    
    Serial.println("\n✅ WiFi connesso!");
    Serial.print("IP: ");
    Serial.println(WiFi.localIP());
    
    digitalWrite(LED_PIN, HIGH); // WiFi OK
}

bool completePuzzle() {
    if (WiFi.status() != WL_CONNECTED) {
        Serial.println("❌ WiFi disconnesso!");
        return false;
    }
    
    HTTPClient http;
    
    String url = String(backend_url) + "/api/sessions/" + 
                 String(session_id) + "/kitchen-puzzles/fornelli/complete";
    
    Serial.print("📤 POST ");
    Serial.println(url);
    
    http.begin(url);
    http.addHeader("Content-Type", "application/json");
    http.setTimeout(5000); // 5 secondi timeout
    
    int httpCode = http.POST("{}");
    
    if (httpCode == 200) {
        String payload = http.getString();
        Serial.println("✅ Risposta backend:");
        Serial.println(payload);
        http.end();
        return true;
    } else {
        Serial.printf("❌ Errore HTTP: %d\n", httpCode);
        if (httpCode > 0) {
            Serial.println(http.getString());
        }
        http.end();
        return false;
    }
}

void blinkSuccess() {
    for (int i = 0; i < 5; i++) {
        digitalWrite(LED_PIN, HIGH);
        delay(100);
        digitalWrite(LED_PIN, LOW);
        delay(100);
    }
    digitalWrite(LED_PIN, HIGH); // Stay on
}

void blinkError() {
    for (int i = 0; i < 3; i++) {
        digitalWrite(LED_PIN, HIGH);
        delay(500);
        digitalWrite(LED_PIN, LOW);
        delay(500);
    }
}
```

### ESP32 con Retry Logic

```cpp
bool completePuzzleWithRetry(int maxRetries = 3) {
    for (int attempt = 1; attempt <= maxRetries; attempt++) {
        Serial.printf("🔄 Tentativo %d/%d\n", attempt, maxRetries);
        
        if (completePuzzle()) {
            return true;
        }
        
        if (attempt < maxRetries) {
            Serial.println("⏳ Retry tra 2 secondi...");
            delay(2000);
        }
    }
    
    Serial.println("❌ Tutti i tentativi falliti");
    return false;
}
```

---

## 🧪 Testing & Simulazione

### Test con cURL

```bash
# Test completamento fornelli
curl -X POST http://localhost:3000/api/sessions/999/kitchen-puzzles/fornelli/complete \
  -H "Content-Type: application/json" \
  -d '{}'

# Verifica stato
curl http://localhost:3000/api/sessions/999/kitchen-puzzles/state | jq

# Verifica LED porte
curl http://localhost:3000/api/sessions/999/game-completion/state | jq '.door_led_states'
```

### Simulatore Python

```python
import requests
import time

BACKEND = "http://localhost:3000"
SESSION_ID = 999

def complete_puzzle(room, puzzle):
    url = f"{BACKEND}/api/sessions/{SESSION_ID}/{room}-puzzles/{puzzle}/complete"
    response = requests.post(url, json={})
    
    if response.status_code == 200:
        print(f"✅ {room}/{puzzle} completato!")
        return True
    else:
        print(f"❌ Errore {response.status_code}: {response.text}")
        return False

def get_door_leds():
    url = f"{BACKEND}/api/sessions/{SESSION_ID}/game-completion/state"
    response = requests.get(url)
    return response.json()["door_led_states"]

# Simula sequenza cucina
print("🔥 Test Cucina")
complete_puzzle("kitchen", "fornelli")
time.sleep(1)
complete_puzzle("kitchen", "frigo")
time.sleep(1)
complete_puzzle("kitchen", "serra")

print("\n🚪 LED Porte:")
leds = get_door_leds()
for room, color in leds.items():
    print(f"  {room}: {color}")
```

---

## 🛠️ Troubleshooting

### Problema: ESP32 non si connette al WiFi

**Soluzioni**:
1. Verifica SSID e password
2. Controlla che sia WiFi 2.4GHz (non 5GHz)
3. Usa IP statico se DHCP fallisce

```cpp
// IP statico
IPAddress local_IP(192, 168, 1, 200);
IPAddress gateway(192, 168, 1, 1);
IPAddress subnet(255, 255, 255, 0);
WiFi.config(local_IP, gateway, subnet);
```

### Problema: HTTP 400 Bad Request

**Causa**: Schema Pydantic validation fallita

**Soluzione**: Verifica che lo schema accetti il valore inviato

### Problema: HTTP 500 Internal Server Error

**Causa**: Errore backend (probabile race condition o DB)

**Soluzione**: Controlla log backend Docker

```bash
docker logs escape-room-backend-dev -f
```

### Problema: LED non aggiornati dopo completamento

**Causa**: Frontend non riceve WebSocket update

**Soluzione**: Verifica WebSocket connessione in console browser

```javascript
// In browser console
console.log('WebSocket connected:', window.socketConnected);
```

---

## 📊 Checklist Pre-Produzione

- [ ] Test WiFi stabilità (almeno 8 ore)
- [ ] Test retry logic (disconnetti WiFi temporaneamente)
- [ ] Test sequenza completa per ogni stanza
- [ ] Verifica LED porte cambiano correttamente
- [ ] Test con 4 ESP32 simultanei
- [ ] Backup batteria ESP32 (opzionale)
- [ ] Documentazione pin mapping per ogni ESP32
- [ ] Etichettatura ESP32 (es. "CUCINA-FORNELLI")

---

## 🎯 Best Practices

1. **Idempotenza**: Il backend gestisce già double-trigger (FSM guard)
2. **Timeout**: Usa sempre timeout HTTP (5-10 secondi)
3. **LED Feedback**: Implementa LED su ESP32 per debug visivo
4. **Logging**: Serial.print() abbondanti per debug
5. **Power Management**: Deep sleep tra letture se alimentato a batteria
6. **Error Handling**: Gestisci tutti i casi di errore

---

## 📚 Risorse

- **Backend API**: `http://localhost:3000/docs` (Swagger/ReDoc)
- **Database Schema**: Vedi `backend/app/models/`
- **Service Logic**: Vedi `backend/app/services/`
- **Test Session**: Session ID `999` sempre disponibile per test

---

**Documento creato per garantire integrazione ESP32 robusta e production-ready**
