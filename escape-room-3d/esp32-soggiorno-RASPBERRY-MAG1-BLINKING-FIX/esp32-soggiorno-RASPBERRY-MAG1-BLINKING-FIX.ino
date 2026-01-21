/* =====================================================
   ESP32 SOGGIORNO - RASPBERRY PI - WITH MAG1 SENSOR
   IP Backend: 192.168.8.10:8001
   
   🔧 FIX: LED Porta Blinking corretto!
   
   HARDWARE PIN MAPPING:
   - LED PORTA: P4 (verde) + P16 (rosso) - Sistema GLOBALE
   - LED TV: P17 (verde) + P5 (rosso) + P23 (bianco) - Catodo comune
   - LED PIANTA: P21 (verde) + P22 (rosso) - Sistema LOCALE
   - LED CONDIZIONATORE: P18 (verde) + P19 (rosso) - Sistema LOCALE
   - SENSORE MAG1: P33 - Trigger automatico TV puzzle! 🧲
   - SENSORE MAG2: P25 - Trigger automatico PIANTA puzzle! 🧲
   - SERVO PORTA: P32 - Chiusura automatica porta fisica 🚪
   - VENTOLA: P26 - Ventola fisica si attiva al completamento condizionatore 🌀
   
   NOVITÀ: Sensori magnetici sostituiscono tasti virtuali
   - Magnete vicino a P33 → Trigger automatico TV complete (tasto M)
   - Magnete vicino a P25 → Trigger automatico PIANTA complete (tasto G)
   - Nessun click manuale necessario!
   - Interazione fisica 100% immersiva
   ===================================================== */

#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <ESP32Servo.h>  // 🚪 Libreria servo per porta fisica

// ================= WIFI =================
const char* ssid     = "escape";
const char* password = "";  // Rete senza password

// ================= BACKEND RASPBERRY PI =================
const char* backend_url = "http://192.168.8.10:8001";

// Session ID dinamico
int session_id = 999;

// ================== PIN OUTPUT (LED) ==================
// LED PORTA (Sistema GLOBALE - game_completion)
#define LED_PORTA_GREEN 4   // P4 - Verde
#define LED_PORTA_RED   16  // P16 - Rosso

// LED TV (catodo comune - 3 LED)
#define LED_TV_GREEN 17      // P17 - Verde
#define LED_TV_RED   5       // P5 - Rosso
#define LED_TV_WHITE 23      // P23 - Bianco

// LED PIANTA (Sistema LOCALE - livingroom_puzzle) - INVERTITI per HW fisico!
#define LED_PIANTA_GREEN 22  // P22 - Verde (INVERTITO!)
#define LED_PIANTA_RED   21  // P21 - Rosso (INVERTITO!)

// LED CONDIZIONATORE (Sistema LOCALE - livingroom_puzzle)
#define LED_CONDIZ_GREEN 18  // P18 - Verde
#define LED_CONDIZ_RED   19  // P19 - Rosso

// ================== PIN INPUT (SENSORE) ==================
// 🧲 SENSORE MAGNETICO MAG1 (TV puzzle)
#define MAG1_SENSOR_PIN 33  // P33 - Reed switch o Hall effect sensor
// 🧲 SENSORE MAGNETICO MAG2 (PIANTA puzzle)
#define MAG2_SENSOR_PIN 25  // P25 - Reed switch o Hall effect sensor

// ================== SERVO PORTA FISICA ==================
#define SERVO_DOOR_PIN 32   // P32 - Servo controllo porta fisica
Servo servoDoor;            // Oggetto servo
bool servoDoorClosed = false;  // Stato corrente servo (per evitare movimenti ripetuti)

// ================== VENTOLA FISICA ==================
#define FAN_PIN 26          // P26 - Controllo ventola fisica
bool fanRunning = false;    // Stato corrente ventola (per evitare toggle ripetuti)

// ================== STATO SENSORE MAG1 ==================
bool mag1_triggered = false;           // Flag per evitare trigger multipli
unsigned long lastMag1Trigger = 0;     // Timestamp ultimo trigger
const unsigned long MAG1_DEBOUNCE = 1000;  // 1 secondo debounce

// ================== STATO SENSORE MAG2 ==================
bool mag2_triggered = false;           // Flag per evitare trigger multipli
unsigned long lastMag2Trigger = 0;     // Timestamp ultimo trigger
const unsigned long MAG2_DEBOUNCE = 1000;  // 1 secondo debounce

// ================== STATO LED PORTA (Blinking) ==================
String doorLedState = "red";  // Stati: "red", "blinking", "green"
unsigned long lastBlinkTime = 0;
bool blinkState = false;
const unsigned long BLINK_INTERVAL = 500;  // 500ms ON/OFF

// ================== STATO LOCALE PUZZLES ==================
String tvStatus = "active";        // Stati: active, completed
String piantaStatus = "locked";    // Stati: locked, active, completed
String condizStatus = "locked";    // Stati: locked, active, completed

// ================== POLLING TIMERS ==================
unsigned long lastDoorLedCheck = 0;
unsigned long lastLocalPuzzleCheck = 0;
unsigned long lastDoorServoCheck = 0;  // 🚪 Timer polling servo porta
unsigned long lastFanCheck = 0;        // 🌀 Timer polling ventola
unsigned long lastStatusPrint = 0;
const unsigned long POLLING_INTERVAL = 2000;  // 2 secondi
const unsigned long STATUS_PRINT_INTERVAL = 10000;  // 10 secondi

// ================== FETCH ACTIVE SESSION ID ==================

int fetchActiveSessionId() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("⚠️ WiFi non connesso, uso session_id fallback: 999");
    return 999;
  }
  
  HTTPClient http;
  String url = String(backend_url) + "/api/sessions/active";
  
  Serial.print("📡 Fetch active session da: ");
  Serial.println(url);
  
  http.begin(url);
  http.setTimeout(5000);
  int httpCode = http.GET();
  
  if (httpCode == 200) {
    String payload = http.getString();
    Serial.print("📥 Response: ");
    Serial.println(payload);
    
    StaticJsonDocument<512> doc;
    DeserializationError error = deserializeJson(doc, payload);
    
    if (!error) {
      int sessionId = doc["id"].as<int>();
      Serial.print("✅ Active session ID: ");
      Serial.println(sessionId);
      http.end();
      return sessionId;
    } else {
      Serial.print("❌ JSON parse error: ");
      Serial.println(error.c_str());
    }
  } else if (httpCode == 204) {
    Serial.println("⚠️ Nessuna sessione attiva, uso fallback: 999");
  } else {
    Serial.print("❌ HTTP error: ");
    Serial.println(httpCode);
  }
  
  http.end();
  return 999;
}

// ================== HTTP HELPERS ==================

String getHTTP(const char* endpoint) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("❌ WiFi disconnesso!");
    return "";
  }

  HTTPClient http;
  String url = String(backend_url) + endpoint;
  
  http.begin(url);
  http.setTimeout(5000);
  
  int httpCode = http.GET();
  
  String payload = "";
  if (httpCode > 0 && httpCode < 300) {
    payload = http.getString();
  } else {
    Serial.print("❌ HTTP error ");
    Serial.print(httpCode);
    Serial.print(" on: ");
    Serial.println(url);
  }
  
  http.end();
  return payload;
}

// ================== UPDATE LED FUNCTIONS ==================

void updateDualColorLED(int greenPin, int redPin, String state) {
  /*
   * state può essere:
   * - "off" o "locked" → entrambi LED OFF
   * - "red" o "active" → LED rosso ON, verde OFF
   * - "green" o "completed" → LED verde ON, rosso OFF
   */
  
  if (state == "off" || state == "locked") {
    digitalWrite(greenPin, LOW);
    digitalWrite(redPin, LOW);
  } else if (state == "red" || state == "active") {
    digitalWrite(greenPin, LOW);
    digitalWrite(redPin, HIGH);
  } else if (state == "green" || state == "completed") {
    digitalWrite(greenPin, HIGH);
    digitalWrite(redPin, LOW);
  }
}

void updateDoorLED() {
  /*
   * LED PORTA con supporto BLINKING
   * Stati possibili:
   * - "red" → Rosso fisso (0 stanze completate)
   * - "blinking" → Verde blinking 500ms (1-3 stanze completate)
   * - "green" → Verde fisso (4 stanze completate - VITTORIA!)
   */
  
  if (doorLedState == "red") {
    // Rosso fisso
    digitalWrite(LED_PORTA_GREEN, LOW);
    digitalWrite(LED_PORTA_RED, HIGH);
    
  } else if (doorLedState == "blinking") {
    // Verde blinking locale (500ms)
    unsigned long now = millis();
    if (now - lastBlinkTime >= BLINK_INTERVAL) {
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
    
  } else if (doorLedState == "green") {
    // Verde fisso - VITTORIA!
    digitalWrite(LED_PORTA_GREEN, HIGH);
    digitalWrite(LED_PORTA_RED, LOW);
  }
}

// ================== 🧲 SENSORE MAGNETICO MAG1 ==================

void checkMagneticSensor() {
  /*
   * Legge sensore magnetico su P33
   * Quando magnete vicino:
   *   - GPIO33 va LOW (pull-up interno)
   *   - Trigger automatico TV puzzle complete
   *   - Nessun click manuale necessario!
   */
  
  int sensorState = digitalRead(MAG1_SENSOR_PIN);
  unsigned long now = millis();
  
  // ✨ Magnete rilevato (LOW) e debounce OK
  if (sensorState == LOW && !mag1_triggered && 
      (now - lastMag1Trigger > MAG1_DEBOUNCE)) {
    
    Serial.println("\n🧲 ===== MAG1 TRIGGER RILEVATO =====");
    Serial.print("   Magnete rilevato su P33 alle ");
    Serial.print(millis() / 1000);
    Serial.println(" secondi");
    
    // Chiama endpoint TV complete
    HTTPClient http;
    String url = String(backend_url) + "/api/sessions/" + 
                 String(session_id) + "/livingroom-puzzles/tv/complete";
    
    Serial.print("📡 POST ");
    Serial.println(url);
    
    http.begin(url);
    http.setTimeout(5000);
    http.addHeader("Content-Type", "application/json");  // ✅ FIX: Header JSON come cucina!
    int httpCode = http.POST("{}");  // ✅ FIX: Body JSON come cucina!
    
    if (httpCode == 200) {
      Serial.println("✅ TV puzzle completato via MAG1!");
      Serial.println("⚪ LED TV (P23) si accenderà al prossimo polling...");
      Serial.println("🔴 LED Pianta dovrebbe attivarsi...");
      
      mag1_triggered = true;
      lastMag1Trigger = now;
    } else {
      Serial.print("❌ Errore HTTP: ");
      Serial.println(httpCode);
      Serial.println("   Riproverò al prossimo trigger");
    }
    
    http.end();
    Serial.println("====================================\n");
  }
  
  // Reset quando magnete viene rimosso
  if (sensorState == HIGH && mag1_triggered) {
    mag1_triggered = false;
    Serial.println("🧲 MAG1: Magnete rimosso");
    Serial.println("   Sensore pronto per nuovo trigger");
  }
}

// ================== 🧲 SENSORE MAGNETICO MAG2 ==================

void checkMag2Sensor() {
  /*
   * Legge sensore magnetico su P25
   * Quando magnete vicino:
   *   - GPIO25 va LOW (pull-up interno)
   *   - Trigger automatico PIANTA puzzle complete
   *   - Simula tasto G nel gioco!
   */
  
  int sensorState = digitalRead(MAG2_SENSOR_PIN);
  unsigned long now = millis();
  
  // ✨ Magnete rilevato (LOW) e debounce OK
  if (sensorState == LOW && !mag2_triggered && 
      (now - lastMag2Trigger > MAG2_DEBOUNCE)) {
    
    Serial.println("\n🧲 ===== MAG2 TRIGGER RILEVATO =====");
    Serial.print("   Magnete rilevato su P25 alle ");
    Serial.print(millis() / 1000);
    Serial.println(" secondi");
    
    // Chiama endpoint PIANTA complete
    HTTPClient http;
    String url = String(backend_url) + "/api/sessions/" + 
                 String(session_id) + "/livingroom-puzzles/pianta/complete";
    
    Serial.print("📡 POST ");
    Serial.println(url);
    
    http.begin(url);
    http.setTimeout(5000);
    http.addHeader("Content-Type", "application/json");
    int httpCode = http.POST("{}");
    
    if (httpCode == 200) {
      Serial.println("✅ PIANTA puzzle completato via MAG2!");
      Serial.println("🌱 LED Pianta (P22/P21) diventerà verde al prossimo polling...");
      Serial.println("❄️  LED Condizionatore dovrebbe attivarsi...");
      
      mag2_triggered = true;
      lastMag2Trigger = now;
    } else {
      Serial.print("❌ Errore HTTP: ");
      Serial.println(httpCode);
      Serial.println("   Riproverò al prossimo trigger");
    }
    
    http.end();
    Serial.println("====================================\n");
  }
  
  // Reset quando magnete viene rimosso
  if (sensorState == HIGH && mag2_triggered) {
    mag2_triggered = false;
    Serial.println("🧲 MAG2: Magnete rimosso");
    Serial.println("   Sensore pronto per nuovo trigger");
  }
}

// ================== POLLING BACKEND - SISTEMA GLOBALE (LED PORTA) ==================

void checkDoorLedState() {
  unsigned long now = millis();
  if (now - lastDoorLedCheck < POLLING_INTERVAL) return;
  lastDoorLedCheck = now;
  
  // ✨ Endpoint GLOBALE - auto-resolve sessione attiva
  String endpoint = "/api/game-completion/door-leds";
  
  String response = getHTTP(endpoint.c_str());
  
  // 🔍 DEBUG: Log risposta HTTP completa
  if (response.length() > 0) {
    Serial.print("📥 Door LED HTTP response: ");
    Serial.println(response);
  }
  
  if (response.length() > 0) {
    StaticJsonDocument<512> doc;
    DeserializationError error = deserializeJson(doc, response);
    
    if (!error) {
      // Leggi stato LED porta del soggiorno
      const char* newState = doc["soggiorno"];
      
      if (newState != nullptr) {
        String newStateStr = String(newState);
        
        // 🔍 DEBUG: Log stato prima e dopo
        Serial.print("🔍 Stato precedente: ");
        Serial.print(doorLedState);
        Serial.print(" → Nuovo stato: ");
        Serial.println(newStateStr);
        
        // Aggiorna solo se cambiato
        if (newStateStr != doorLedState) {
          String oldState = doorLedState;  // Salva per debug
          doorLedState = newStateStr;
          
          Serial.println("\n🚪 ===== LED PORTA AGGIORNATO =====");
          Serial.print("   Stato precedente: ");
          Serial.println(oldState);
          Serial.print("   Nuovo stato: ");
          Serial.println(doorLedState);
          
          // 🔧 FIX: Se entra in modalità "blinking", inizializza variabili
          if (doorLedState == "blinking") {
            blinkState = true;  // Inizia con LED ACCESO (verde)
            lastBlinkTime = millis();  // Reset timer blinking
            Serial.println("   💚 Modalità BLINKING attivata!");
            Serial.println("   Inizializzato: blinkState=true, timer reset");
          }
          
          // ✅ FIX PRINCIPALE: Chiama SEMPRE updateDoorLED() quando lo stato cambia
          // (rimosso il check che saltava l'update per "blinking")
          updateDoorLED();
          Serial.println("   ✅ LED aggiornato immediatamente");
          Serial.println("====================================\n");
        }
      }
    } else {
      Serial.println("❌ Errore parsing JSON door-leds response");
    }
  }
}

// ================== 🚪 POLLING BACKEND - SERVO PORTA FISICA ==================

void checkDoorServoStatus() {
  /*
   * Polling endpoint per controllo servo porta fisica (P32)
   * Chiamato ogni 2 secondi
   * 
   * Quando condizionatore completato:
   * - Backend imposta should_close_servo = true
   * - ESP32 chiude porta a 90°
   * 
   * Al reset scena:
   * - Backend imposta should_close_servo = false
   * - ESP32 riapre porta a 45°
   */
  
  unsigned long now = millis();
  if (now - lastDoorServoCheck < POLLING_INTERVAL) return;
  lastDoorServoCheck = now;
  
  String endpoint = "/api/sessions/" + String(session_id) + "/livingroom-puzzles/door-servo-status";
  String response = getHTTP(endpoint.c_str());
  
  if (response.length() > 0) {
    StaticJsonDocument<512> doc;
    DeserializationError error = deserializeJson(doc, response);
    
    if (!error) {
      bool shouldClose = doc["should_close_servo"];
      
      // 🚪 CHIUDI PORTA (condizionatore completato)
      if (shouldClose && !servoDoorClosed) {
        Serial.println("\n🚪 ===== SERVO PORTA: CHIUSURA =====");
        Serial.println("   Condizionatore completato!");
        Serial.println("   Movimento servo: 45° → 90°");
        
        servoDoor.write(90);  // Chiudi porta (calibrare se necessario!)
        servoDoorClosed = true;
        
        Serial.println("   ✅ Porta fisica CHIUSA");
        Serial.println("====================================\n");
      }
      // 🚪 RIAPRI PORTA (reset scena)
      else if (!shouldClose && servoDoorClosed) {
        Serial.println("\n🚪 ===== SERVO PORTA: APERTURA =====");
        Serial.println("   Reset scena rilevato!");
        Serial.println("   Movimento servo: 90° → 45°");
        
        servoDoor.write(45);  // Riapri porta a 45°
        servoDoorClosed = false;
        
        Serial.println("   ✅ Porta fisica RIAPERTA (45°)");
        Serial.println("====================================\n");
      }
      
    } else {
      Serial.println("❌ Errore parsing JSON door-servo-status");
    }
  }
}

// ================== 🌀 POLLING BACKEND - VENTOLA FISICA ==================

void checkFanStatus() {
  /*
   * Polling endpoint per controllo ventola fisica (P26)
   * Chiamato ogni 2 secondi
   * 
   * Quando condizionatore completato:
   * - Backend imposta should_run_fan = true
   * - ESP32 attiva ventola (P26 HIGH)
   * 
   * Al reset scena:
   * - Backend imposta should_run_fan = false
   * - ESP32 spegne ventola (P26 LOW)
   */
  
  unsigned long now = millis();
  if (now - lastFanCheck < POLLING_INTERVAL) return;
  lastFanCheck = now;
  
  String endpoint = "/api/sessions/" + String(session_id) + "/livingroom-puzzles/fan-status";
  String response = getHTTP(endpoint.c_str());
  
  if (response.length() > 0) {
    StaticJsonDocument<512> doc;
    DeserializationError error = deserializeJson(doc, response);
    
    if (!error) {
      bool shouldRun = doc["should_run_fan"];
      
      // 🌀 AVVIA VENTOLA (condizionatore completato)
      if (shouldRun && !fanRunning) {
        Serial.println("\n🌀 ===== VENTOLA: AVVIO =====");
        Serial.println("   Condizionatore completato!");
        Serial.println("   GPIO P26: LOW → HIGH");
        
        digitalWrite(FAN_PIN, HIGH);  // Attiva ventola
        fanRunning = true;
        
        Serial.println("   ✅ Ventola fisica AVVIATA");
        Serial.println("====================================\n");
      }
      // 🌀 FERMA VENTOLA (reset scena)
      else if (!shouldRun && fanRunning) {
        Serial.println("\n🌀 ===== VENTOLA: STOP =====");
        Serial.println("   Reset scena rilevato!");
        Serial.println("   GPIO P26: HIGH → LOW");
        
        digitalWrite(FAN_PIN, LOW);  // Spegni ventola
        fanRunning = false;
        
        Serial.println("   ✅ Ventola fisica FERMATA");
        Serial.println("====================================\n");
      }
      
    } else {
      Serial.println("❌ Errore parsing JSON fan-status");
    }
  }
}

// ================== POLLING BACKEND - SISTEMA LOCALE (PUZZLES SOGGIORNO) ==================

void checkLocalPuzzleState() {
  unsigned long now = millis();
  if (now - lastLocalPuzzleCheck < POLLING_INTERVAL) return;
  lastLocalPuzzleCheck = now;
  
  String endpoint = "/api/sessions/" + String(session_id) + "/livingroom-puzzles/state";
  String response = getHTTP(endpoint.c_str());
  
  if (response.length() > 0) {
    StaticJsonDocument<1024> doc;
    DeserializationError error = deserializeJson(doc, response);
    
    if (!error) {
      // TV Status - Gestisce 3 LED (dual-color + bianco)
      const char* tvSt = doc["states"]["tv"]["status"];
      if (tvSt != nullptr) {
        String newTvStatus = String(tvSt);
        if (newTvStatus != tvStatus) {
          tvStatus = newTvStatus;
          
          // Aggiorna LED TV dual-color (P17/P5) e bianco (P23)
          if (tvStatus == "completed") {
            // TV completato: VERDE + BIANCO
            digitalWrite(LED_TV_GREEN, HIGH);
            digitalWrite(LED_TV_RED, LOW);
            digitalWrite(LED_TV_WHITE, HIGH);
            
            Serial.println("\n📺 TV COMPLETATO! ✨");
            Serial.println("   LED P17 (verde): ON");
            Serial.println("   LED P5 (rosso): OFF");
            Serial.println("   LED P23 (bianco): ON");
          } else {
            // TV active: ROSSO (stato iniziale)
            digitalWrite(LED_TV_GREEN, LOW);
            digitalWrite(LED_TV_RED, HIGH);
            digitalWrite(LED_TV_WHITE, LOW);
            
            Serial.println("\n📺 TV ATTIVO 🔴");
            Serial.println("   LED P17 (verde): OFF");
            Serial.println("   LED P5 (rosso): ON");
            Serial.println("   LED P23 (bianco): OFF");
          }
        }
      }
      
      // Pianta LED
      const char* piantaSt = doc["led_states"]["pianta"];
      if (piantaSt != nullptr) {
        String newPiantaStatus = String(piantaSt);
        if (newPiantaStatus != piantaStatus) {
          piantaStatus = newPiantaStatus;
          updateDualColorLED(LED_PIANTA_GREEN, LED_PIANTA_RED, piantaStatus);
          
          Serial.print("🌱 Pianta LED: ");
          Serial.println(piantaStatus);
        }
      }
      
      // Condizionatore LED
      const char* condizSt = doc["led_states"]["condizionatore"];
      if (condizSt != nullptr) {
        String newCondizStatus = String(condizSt);
        if (newCondizStatus != condizStatus) {
          condizStatus = newCondizStatus;
          updateDualColorLED(LED_CONDIZ_GREEN, LED_CONDIZ_RED, condizStatus);
          
          Serial.print("❄️  Condiz LED: ");
          Serial.println(condizStatus);
        }
      }
      
    } else {
      Serial.print("❌ JSON parse error: ");
      Serial.println(error.c_str());
    }
  }
}

// ================== PRINT STATUS PERIODICO ==================

void printCurrentStatus() {
  unsigned long now = millis();
  if (now - lastStatusPrint < STATUS_PRINT_INTERVAL) return;
  lastStatusPrint = now;
  
  Serial.println("\n\n📊 ===== STATO SOGGIORNO COMPLETO =====");
  Serial.print("   🎯 Session ID: ");
  Serial.println(session_id);
  Serial.print("   📡 WiFi: ");
  Serial.println(WiFi.status() == WL_CONNECTED ? "Connesso ✅" : "Disconnesso ❌");
  Serial.print("   🕒 Uptime: ");
  Serial.print(millis() / 1000);
  Serial.println(" secondi");
  Serial.println();
  
  Serial.println("   🧲 SENSORE MAG1 (P33 - TV):");
  Serial.print("      Stato GPIO: ");
  Serial.println(digitalRead(MAG1_SENSOR_PIN) == HIGH ? "HIGH (no magnete)" : "LOW (magnete rilevato!)");
  Serial.print("      Triggered: ");
  Serial.println(mag1_triggered ? "SI (waiting cooldown)" : "NO (pronto)");
  Serial.println();
  
  Serial.println("   🧲 SENSORE MAG2 (P25 - PIANTA):");
  Serial.print("      Stato GPIO: ");
  Serial.println(digitalRead(MAG2_SENSOR_PIN) == HIGH ? "HIGH (no magnete)" : "LOW (magnete rilevato!)");
  Serial.print("      Triggered: ");
  Serial.println(mag2_triggered ? "SI (waiting cooldown)" : "NO (pronto)");
  Serial.println();
  
  Serial.println("   🚪 LED PORTA:");
  Serial.print("      Stato: ");
  Serial.print(doorLedState);
  if (doorLedState == "blinking") {
    Serial.print(" (LAMPEGGIANTE - blinkState=");
    Serial.print(blinkState ? "ON" : "OFF");
    Serial.println(")");
  } else {
    Serial.println();
  }
  Serial.print("      GPIO P4 (verde): ");
  Serial.println(digitalRead(LED_PORTA_GREEN) ? "HIGH" : "LOW");
  Serial.print("      GPIO P16 (rosso): ");
  Serial.println(digitalRead(LED_PORTA_RED) ? "HIGH" : "LOW");
  Serial.println();
  
  Serial.println("   📺 TV BIANCO (P23):");
  Serial.print("      Status: ");
  Serial.print(tvStatus);
  Serial.print(" | LED: ");
  Serial.println((tvStatus == "completed") ? "ON (BIANCO) ✨" : "OFF");
  Serial.println();
  
  Serial.println("   🌿 LED PIANTA:");
  Serial.print("      Status: ");
  Serial.println(piantaStatus);
  Serial.println();
  
  Serial.println("   ❄️ LED CONDIZIONATORE:");
  Serial.print("      Status: ");
  Serial.println(condizStatus);
  Serial.println();
  
  Serial.println("   🚪 SERVO PORTA (P32):");
  Serial.print("      Status: ");
  Serial.println(servoDoorClosed ? "CHIUSA (90°)" : "APERTA (45°)");
  Serial.println();
  
  Serial.println("   🌀 VENTOLA (P26):");
  Serial.print("      Status: ");
  Serial.print(fanRunning ? "ON (RUNNING) ✅" : "OFF");
  Serial.print(" | GPIO: ");
  Serial.println(digitalRead(FAN_PIN) ? "HIGH" : "LOW");
  
  Serial.println("=========================================\n");
}

// ================== SETUP ==================

void setup() {
  Serial.begin(115200);
  Serial.println("\n\n================================================");
  Serial.println("ESP32 SOGGIORNO - RASPBERRY PI - WITH MAG1");
  Serial.println("VERSION: Blinking FIX + Debug Logging 🔧");
  Serial.println("================================================\n");

  // Configura pin OUTPUT (LED)
  pinMode(LED_PORTA_GREEN, OUTPUT);
  pinMode(LED_PORTA_RED, OUTPUT);
  pinMode(LED_TV_GREEN, OUTPUT);
  pinMode(LED_TV_RED, OUTPUT);
  pinMode(LED_TV_WHITE, OUTPUT);
  pinMode(LED_PIANTA_GREEN, OUTPUT);
  pinMode(LED_PIANTA_RED, OUTPUT);
  pinMode(LED_CONDIZ_GREEN, OUTPUT);
  pinMode(LED_CONDIZ_RED, OUTPUT);
  
  // 🧲 Configura pin INPUT (sensori magnetici)
  pinMode(MAG1_SENSOR_PIN, INPUT_PULLUP);  // Pull-up interno attivo
  pinMode(MAG2_SENSOR_PIN, INPUT_PULLUP);  // Pull-up interno attivo
  
  // 🌀 Configura pin OUTPUT (ventola)
  pinMode(FAN_PIN, OUTPUT);
  digitalWrite(FAN_PIN, LOW);  // Ventola inizialmente spenta
  
  // Stato iniziale LED
  digitalWrite(LED_PORTA_GREEN, LOW);
  digitalWrite(LED_PORTA_RED, HIGH);     // ✅ Porta inizia ROSSA
  
  // LED TV inizia ROSSO (catodo comune)
  digitalWrite(LED_TV_GREEN, LOW);
  digitalWrite(LED_TV_RED, HIGH);        // ✅ TV inizia ROSSA
  digitalWrite(LED_TV_WHITE, LOW);
  
  digitalWrite(LED_PIANTA_GREEN, LOW);
  digitalWrite(LED_PIANTA_RED, LOW);
  digitalWrite(LED_CONDIZ_GREEN, LOW);
  digitalWrite(LED_CONDIZ_RED, LOW);
  
  Serial.println("📌 Pin configurati:");
  Serial.println("   LED PORTA: P4 (verde), P16 (rosso) → ROSSO iniziale ✅");
  Serial.println("   LED TV: P17 (verde), P5 (rosso), P23 (bianco) → ROSSO iniziale ✅");
  Serial.println("   LED PIANTA: P22 (verde), P21 (rosso) → OFF [INVERTITI!]");
  Serial.println("   LED CONDIZIONATORE: P18 (verde), P19 (rosso) → OFF");
  Serial.println("   🧲 SENSORE MAG1: P33 → ATTIVO (pull-up)");
  Serial.println("   🧲 SENSORE MAG2: P25 → ATTIVO (pull-up)");
  Serial.println("   🚪 SERVO PORTA: P32 → CONFIGURATO");
  Serial.println("   🌀 VENTOLA: P26 → SPENTA (iniziale)");
  Serial.print("\n   Backend: ");
  Serial.println(backend_url);

  // Connessione WiFi
  Serial.print("\n📡 Connessione WiFi a: ");
  Serial.println(ssid);
  
  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid, password);
  
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 30) {
    delay(500);
    Serial.print(".");
    attempts++;
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n✅ WiFi connesso!");
    Serial.print("   IP: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("\n❌ WiFi NON connesso!");
    Serial.println("   Riavvio tra 5 secondi...");
    delay(5000);
    ESP.restart();
  }
  
  // ===== FETCH ACTIVE SESSION ID =====
  Serial.println("\n🔍 Fetch Active Session ID...");
  session_id = fetchActiveSessionId();
  Serial.print("🎯 Uso Session ID: ");
  Serial.println(session_id);
  
  // ===== FETCH STATI INIZIALI =====
  Serial.println("\n🔄 Fetch stati iniziali...");
  delay(500);
  checkDoorLedState();
  delay(500);
  checkLocalPuzzleState();
  
  // ===== SETUP SERVO PORTA FISICA (P32) =====
  Serial.println("\n🚪 Setup servo porta fisica...");
  servoDoor.attach(SERVO_DOOR_PIN);
  servoDoor.write(45);  // Posizione iniziale: porta aperta a 45°
  servoDoorClosed = false;
  Serial.println("✅ Servo P32 configurato: posizione iniziale 45° (aperta)");
  
  Serial.println("\n✅ Sistema pronto!");
  Serial.println("🧲 Avvicina il magnete a P33 per triggerare TV puzzle!");
  Serial.println("🧲 Avvicina il magnete a P25 per triggerare PIANTA puzzle!");
  Serial.println("🚪 Servo P32 pronto per chiudere porta al completamento!");
  Serial.println("🌀 Ventola P26 pronta per avviarsi al completamento!");
  Serial.println("🔧 FIX: LED Porta ora lampeggia correttamente!\n");
}

// ================== LOOP ==================

void loop() {
  // ===== PRINT STATUS PERIODICO (ogni 10s) =====
  printCurrentStatus();
  
  // ===== 🧲 CONTROLLO SENSORE MAGNETICO MAG1 (priorità!) =====
  checkMagneticSensor();
  
  // ===== 🧲 CONTROLLO SENSORE MAGNETICO MAG2 (priorità!) =====
  checkMag2Sensor();
  
  // ===== POLLING LED PORTA (Sistema GLOBALE) =====
  checkDoorLedState();
  
  // ===== POLLING PUZZLES LOCALI =====
  checkLocalPuzzleState();
  
  // ===== 🚪 POLLING SERVO PORTA FISICA =====
  checkDoorServoStatus();
  
  // ===== 🌀 POLLING VENTOLA FISICA =====
  checkFanStatus();
  
  // ===== UPDATE LED PORTA (gestisce blinking se necessario) =====
  updateDoorLED();
  
  delay(100);  // Loop delay
}