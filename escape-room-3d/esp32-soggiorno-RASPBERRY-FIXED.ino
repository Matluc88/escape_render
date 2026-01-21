/* =====================================================
   ESP32 SOGGIORNO - RASPBERRY PI VERSION - FIXED
   IP Backend: 192.168.8.10:8001
   - LED PIANTA + LED CONDIZ + TV
   ❌ RIMOSSO: Polling LED porta globale (endpoint non esistente)
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
// LED PIANTA (Sistema LOCALE)
#define LED_PIANTA_GREEN 17
#define LED_PIANTA_RED   5

// LED CONDIZIONATORE (Sistema LOCALE)
#define LED_CONDIZ_GREEN 18
#define LED_CONDIZ_RED   19

// TV
#define TV_PIN 32

// ================== STATO LOCALE PUZZLES ==================
String tvStatus = "active";
String piantaStatus = "locked";
String condizStatus = "locked";

// ================== POLLING TIMERS ==================
unsigned long lastLocalPuzzleCheck = 0;
unsigned long lastStatusPrint = 0;
const unsigned long POLLING_INTERVAL = 2000;
const unsigned long STATUS_PRINT_INTERVAL = 10000;

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

// ================== POLLING BACKEND ==================

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
          digitalWrite(TV_PIN, (tvStatus == "completed") ? HIGH : LOW);
          
          Serial.print("\n📺 TV: ");
          Serial.println(tvStatus);
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

void printCurrentStatus() {
  unsigned long now = millis();
  if (now - lastStatusPrint < STATUS_PRINT_INTERVAL) return;
  lastStatusPrint = now;
  
  Serial.println("\n📊 ===== STATO SOGGIORNO =====");
  Serial.print("Session ID: ");
  Serial.println(session_id);
  Serial.print("TV: ");
  Serial.println(tvStatus);
  Serial.print("Pianta: ");
  Serial.println(piantaStatus);
  Serial.print("Condiz: ");
  Serial.println(condizStatus);
  Serial.println("=============================\n");
}

// ================== SETUP ==================

void setup() {
  Serial.begin(115200);
  Serial.println("\n\n=================================");
  Serial.println("ESP32 SOGGIORNO - RASPBERRY PI");
  Serial.println("VERSION: FIXED (no door LED)");
  Serial.println("=================================\n");

  // Configura pin OUTPUT
  pinMode(LED_PIANTA_GREEN, OUTPUT);
  pinMode(LED_PIANTA_RED, OUTPUT);
  pinMode(LED_CONDIZ_GREEN, OUTPUT);
  pinMode(LED_CONDIZ_RED, OUTPUT);
  pinMode(TV_PIN, OUTPUT);
  
  // Stato iniziale: tutti LED OFF/LOCKED
  digitalWrite(LED_PIANTA_GREEN, LOW);
  digitalWrite(LED_PIANTA_RED, LOW);
  digitalWrite(LED_CONDIZ_GREEN, LOW);
  digitalWrite(LED_CONDIZ_RED, LOW);
  digitalWrite(TV_PIN, LOW);
  
  Serial.println("📌 Pin configurati");
  Serial.print("   Backend: ");
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
  Serial.println("\n🔄 Fetch stati iniziali puzzle...");
  delay(500);
  checkLocalPuzzleState();
  
  Serial.println("\n✅ Sistema pronto!\n");
}

// ================== LOOP ==================

void loop() {
  printCurrentStatus();
  checkLocalPuzzleState();
  
  delay(100);
}
