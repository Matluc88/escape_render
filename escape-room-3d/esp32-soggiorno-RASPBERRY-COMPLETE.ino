/* =====================================================
   ESP32 SOGGIORNO - RASPBERRY PI VERSION - COMPLETE
   IP Backend: 192.168.8.10:8001
   
   HARDWARE PIN MAPPING:
   - LED PORTA: P4 (verde) + P16 (rosso) - Sistema GLOBALE
   - LED PIANTA: P17 (verde) + P5 (rosso) - Sistema LOCALE
   - LED CONDIZIONATORE: P18 (verde) + P19 (rosso) - Sistema LOCALE
   - TV BIANCO: P23 - Sistema LOCALE
   
   SISTEMA LED PORTA:
   - Polling endpoint globale: /api/game-completion/door-leds
   - Stati: "red" (0 stanze) → "blinking" (1-3 stanze) → "green" (4 stanze)
   - Blinking: verde lampeggiante 500ms ON/OFF
   ===================================================== */

#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

// ================= WIFI =================
const char* ssid     = "escape";
const char* password = "";  // Rete senza password

// ================= BACKEND RASPBERRY PI =================
const char* backend_url = "http://192.168.8.10:8001";

// Session ID dinamico
int session_id = 999;

// ================== PIN OUTPUT ==================
// LED PORTA (Sistema GLOBALE - game_completion)
#define LED_PORTA_GREEN 4   // P4 - Verde
#define LED_PORTA_RED   16  // P16 - Rosso

// LED PIANTA (Sistema LOCALE - livingroom_puzzle)
#define LED_PIANTA_GREEN 17  // P17 - Verde
#define LED_PIANTA_RED   5   // P5 - Rosso

// LED CONDIZIONATORE (Sistema LOCALE - livingroom_puzzle)
#define LED_CONDIZ_GREEN 18  // P18 - Verde
#define LED_CONDIZ_RED   19  // P19 - Rosso

// TV BIANCO
#define TV_PIN 23  // P23 - LED bianco

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

// ================== POLLING BACKEND - SISTEMA GLOBALE (LED PORTA) ==================

void checkDoorLedState() {
  unsigned long now = millis();
  if (now - lastDoorLedCheck < POLLING_INTERVAL) return;
  lastDoorLedCheck = now;
  
  // ✨ Endpoint GLOBALE - auto-resolve sessione attiva
  String endpoint = "/api/game-completion/door-leds";
  
  String response = getHTTP(endpoint.c_str());
  
  if (response.length() > 0) {
    StaticJsonDocument<512> doc;
    DeserializationError error = deserializeJson(doc, response);
    
    if (!error) {
      // Leggi stato LED porta del soggiorno
      const char* newState = doc["soggiorno"];
      
      if (newState != nullptr) {
        String newStateStr = String(newState);
        
        // Aggiorna solo se cambiato
        if (newStateStr != doorLedState) {
          doorLedState = newStateStr;
          
          Serial.println("\n🚪 ===== LED PORTA AGGIORNATO =====");
          Serial.print("   Nuovo stato: ");
          Serial.println(doorLedState);
          
          // Se NON è blinking, aggiorna subito il LED
          if (doorLedState != "blinking") {
            updateDoorLED();
          }
        }
      }
    } else {
      Serial.println("❌ Errore parsing JSON door-leds response");
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
      // TV Status
      const char* tvSt = doc["states"]["tv"]["status"];
      if (tvSt != nullptr) {
        String newTvStatus = String(tvSt);
        if (newTvStatus != tvStatus) {
          tvStatus = newTvStatus;
          
          // Accendi TV bianco quando completed
          digitalWrite(TV_PIN, (tvStatus == "completed") ? HIGH : LOW);
          
          Serial.print("\n📺 TV: ");
          Serial.print(tvStatus);
          Serial.print(" | LED P23: ");
          Serial.println((tvStatus == "completed") ? "ON (BIANCO)" : "OFF");
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
  
  Serial.println("   🚪 LED PORTA:");
  Serial.print("      Stato: ");
  Serial.print(doorLedState);
  if (doorLedState == "blinking") {
    Serial.println(" (LAMPEGGIANTE)");
  } else {
    Serial.println();
  }
  Serial.println();
  
  Serial.println("   📺 TV BIANCO (P23):");
  Serial.print("      Status: ");
  Serial.print(tvStatus);
  Serial.print(" | LED: ");
  Serial.println((tvStatus == "completed") ? "ON (BIANCO)" : "OFF");
  Serial.println();
  
  Serial.println("   🌿 LED PIANTA:");
  Serial.print("      Status: ");
  Serial.println(piantaStatus);
  Serial.println();
  
  Serial.println("   ❄️ LED CONDIZIONATORE:");
  Serial.print("      Status: ");
  Serial.println(condizStatus);
  
  Serial.println("=========================================\n");
}

// ================== SETUP ==================

void setup() {
  Serial.begin(115200);
  Serial.println("\n\n===========================================");
  Serial.println("ESP32 SOGGIORNO - RASPBERRY PI - COMPLETE");
  Serial.println("VERSION: LED Porta + TV + Pianta + Condiz");
  Serial.println("===========================================\n");

  // Configura pin OUTPUT
  pinMode(LED_PORTA_GREEN, OUTPUT);
  pinMode(LED_PORTA_RED, OUTPUT);
  pinMode(LED_PIANTA_GREEN, OUTPUT);
  pinMode(LED_PIANTA_RED, OUTPUT);
  pinMode(LED_CONDIZ_GREEN, OUTPUT);
  pinMode(LED_CONDIZ_RED, OUTPUT);
  pinMode(TV_PIN, OUTPUT);
  
  // Stato iniziale
  digitalWrite(LED_PORTA_GREEN, LOW);
  digitalWrite(LED_PORTA_RED, HIGH);   // ✅ Porta inizia ROSSA
  digitalWrite(LED_PIANTA_GREEN, LOW);
  digitalWrite(LED_PIANTA_RED, LOW);
  digitalWrite(LED_CONDIZ_GREEN, LOW);
  digitalWrite(LED_CONDIZ_RED, LOW);
  digitalWrite(TV_PIN, LOW);
  
  Serial.println("📌 Pin configurati:");
  Serial.println("   LED PORTA: P4 (verde), P16 (rosso) → ROSSO iniziale ✅");
  Serial.println("   LED PIANTA: P17 (verde), P5 (rosso) → OFF");
  Serial.println("   LED CONDIZIONATORE: P18 (verde), P19 (rosso) → OFF");
  Serial.println("   TV BIANCO: P23 → OFF");
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
  
  Serial.println("\n✅ Sistema pronto!\n");
}

// ================== LOOP ==================

void loop() {
  // ===== PRINT STATUS PERIODICO (ogni 10s) =====
  printCurrentStatus();
  
  // ===== POLLING LED PORTA (Sistema GLOBALE) =====
  checkDoorLedState();
  
  // ===== POLLING PUZZLES LOCALI =====
  checkLocalPuzzleState();
  
  // ===== UPDATE LED PORTA (gestisce blinking se necessario) =====
  updateDoorLED();
  
  delay(100);  // Loop delay
}
