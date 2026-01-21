/* =====================================================
   ESP32 SOGGIORNO - RASPBERRY PI VERSION
   IP Backend: 192.168.8.10:8001
   - LED PORTA + LED PIANTA + LED CONDIZ + TV
   ===================================================== */

#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

// ================= WIFI =================
const char* ssid     = "escape";
const char* password = "";  // Rete senza password

// ================= BACKEND RASPBERRY PI =================
const char* backend_url = "http://192.168.8.10:8001";  // ✅ Raspberry Pi

// Session ID dinamico
int session_id = 999;

// ================== PIN OUTPUT ==================
// LED PORTA (Sistema GLOBALE)
#define LED_PORTA_GREEN 4
#define LED_PORTA_RED   16

// LED PIANTA (Sistema LOCALE)
#define LED_PIANTA_GREEN 17
#define LED_PIANTA_RED   5

// LED CONDIZIONATORE (Sistema LOCALE)
#define LED_CONDIZ_GREEN 18
#define LED_CONDIZ_RED   19

// TV
#define TV_PIN 32

// ================== STATO LED PORTA (Blinking) ==================
String doorLedState = "red";
unsigned long lastBlinkTime = 0;
bool blinkState = false;
const unsigned long BLINK_INTERVAL = 500;

// ================== STATO LOCALE PUZZLES ==================
String tvStatus = "active";
String piantaStatus = "locked";
String condizStatus = "locked";

// ================== POLLING TIMERS ==================
unsigned long lastDoorLedCheck = 0;
unsigned long lastLocalPuzzleCheck = 0;
unsigned long lastStatusPrint = 0;
const unsigned long POLLING_INTERVAL = 2000;
const unsigned long STATUS_PRINT_INTERVAL = 10000;

// ================== FETCH ACTIVE SESSION ID ==================

int fetchActiveSessionId() {
  if (WiFi.status() != WL_CONNECTED) return 999;
  
  HTTPClient http;
  String url = String(backend_url) + "/api/sessions/active";
  
  http.begin(url);
  http.setTimeout(5000);
  int httpCode = http.GET();
  
  if (httpCode == 200) {
    String payload = http.getString();
    StaticJsonDocument<512> doc;
    if (!deserializeJson(doc, payload)) {
      int sessionId = doc["id"].as<int>();
      http.end();
      return sessionId;
    }
  }
  
  http.end();
  return 999;
}

// ================== HTTP HELPERS ==================

String getHTTP(const char* endpoint) {
  if (WiFi.status() != WL_CONNECTED) return "";

  HTTPClient http;
  String url = String(backend_url) + endpoint;
  
  http.begin(url);
  http.setTimeout(5000);
  
  int httpCode = http.GET();
  String payload = "";
  if (httpCode > 0 && httpCode < 300) {
    payload = http.getString();
  }
  
  http.end();
  return payload;
}

// ================== UPDATE LED FUNCTIONS ==================

void updateDualColorLED(int greenPin, int redPin, String state) {
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
  if (doorLedState == "red") {
    digitalWrite(LED_PORTA_GREEN, LOW);
    digitalWrite(LED_PORTA_RED, HIGH);
    
  } else if (doorLedState == "blinking") {
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
    digitalWrite(LED_PORTA_GREEN, HIGH);
    digitalWrite(LED_PORTA_RED, LOW);
  }
}

// ================== POLLING BACKEND ==================

void checkDoorLedState() {
  unsigned long now = millis();
  if (now - lastDoorLedCheck < POLLING_INTERVAL) return;
  lastDoorLedCheck = now;
  
  String endpoint = "/api/sessions/" + String(session_id) + "/game-completion/door-leds";
  String response = getHTTP(endpoint.c_str());
  
  if (response.length() > 0) {
    StaticJsonDocument<512> doc;
    if (!deserializeJson(doc, response)) {
      const char* newState = doc["door_led_states"]["soggiorno"];
      
      if (newState != nullptr) {
        String newStateStr = String(newState);
        if (newStateStr != doorLedState) {
          doorLedState = newStateStr;
          if (doorLedState != "blinking") {
            updateDoorLED();
          }
        }
      }
    }
  }
}

void checkLocalPuzzleState() {
  unsigned long now = millis();
  if (now - lastLocalPuzzleCheck < POLLING_INTERVAL) return;
  lastLocalPuzzleCheck = now;
  
  String endpoint = "/api/sessions/" + String(session_id) + "/livingroom-puzzles/state";
  String response = getHTTP(endpoint.c_str());
  
  if (response.length() > 0) {
    StaticJsonDocument<1024> doc;
    if (!deserializeJson(doc, response)) {
      const char* tvSt = doc["states"]["tv"]["status"];
      const char* piantaSt = doc["led_states"]["pianta"];
      const char* condizSt = doc["led_states"]["condizionatore"];
      
      if (tvSt != nullptr) {
        String newTvStatus = String(tvSt);
        if (newTvStatus != tvStatus) {
          tvStatus = newTvStatus;
          digitalWrite(TV_PIN, (tvStatus == "completed") ? HIGH : LOW);
        }
      }
      
      if (piantaSt != nullptr) {
        String newPiantaStatus = String(piantaSt);
        if (newPiantaStatus != piantaStatus) {
          piantaStatus = newPiantaStatus;
          updateDualColorLED(LED_PIANTA_GREEN, LED_PIANTA_RED, piantaStatus);
        }
      }
      
      if (condizSt != nullptr) {
        String newCondizStatus = String(condizSt);
        if (newCondizStatus != condizStatus) {
          condizStatus = newCondizStatus;
          updateDualColorLED(LED_CONDIZ_GREEN, LED_CONDIZ_RED, condizStatus);
        }
      }
    }
  }
}

void printCurrentStatus() {
  unsigned long now = millis();
  if (now - lastStatusPrint < STATUS_PRINT_INTERVAL) return;
  lastStatusPrint = now;
  
  Serial.println("\n📊 STATO SOGGIORNO");
  Serial.print("Session: ");
  Serial.println(session_id);
  Serial.print("LED Porta: ");
  Serial.println(doorLedState);
  Serial.print("TV: ");
  Serial.println(tvStatus);
}

// ================== SETUP ==================

void setup() {
  Serial.begin(115200);
  Serial.println("\n=================================");
  Serial.println("ESP32 SOGGIORNO - RASPBERRY PI");
  Serial.println("=================================");

  pinMode(LED_PORTA_GREEN, OUTPUT);
  pinMode(LED_PORTA_RED, OUTPUT);
  pinMode(LED_PIANTA_GREEN, OUTPUT);
  pinMode(LED_PIANTA_RED, OUTPUT);
  pinMode(LED_CONDIZ_GREEN, OUTPUT);
  pinMode(LED_CONDIZ_RED, OUTPUT);
  pinMode(TV_PIN, OUTPUT);
  
  digitalWrite(LED_PORTA_GREEN, LOW);
  digitalWrite(LED_PORTA_RED, HIGH);
  digitalWrite(LED_PIANTA_GREEN, LOW);
  digitalWrite(LED_PIANTA_RED, LOW);
  digitalWrite(LED_CONDIZ_GREEN, LOW);
  digitalWrite(LED_CONDIZ_RED, LOW);
  digitalWrite(TV_PIN, LOW);
  
  Serial.print("Backend: ");
  Serial.println(backend_url);

  Serial.print("\n📡 WiFi: ");
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
    Serial.println("\n✅ Connesso!");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("\n❌ WiFi FAILED!");
    delay(5000);
    ESP.restart();
  }
  
  Serial.println("\n🔍 Fetch Session ID...");
  session_id = fetchActiveSessionId();
  Serial.print("🎯 Session ID: ");
  Serial.println(session_id);
  
  Serial.println("\n🔄 Fetch stati iniziali...");
  checkDoorLedState();
  delay(500);
  checkLocalPuzzleState();
  
  Serial.println("\n✅ Sistema pronto!\n");
}

// ================== LOOP ==================

void loop() {
  printCurrentStatus();
  checkDoorLedState();
  checkLocalPuzzleState();
  updateDoorLED();
  delay(100);
}
