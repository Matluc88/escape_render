/* =====================================================
   ESP32 BAGNO - RASPBERRY PI - COMPLETE WITH HARDWARE
   IP Backend: 192.168.8.10:8001

   HARDWARE PIN MAPPING:
   - LED PORTA: P4 (verde) + P16 (rosso) - Sistema GLOBALE
   - LED SPECCHIO: P17 (verde) + P5 (rosso) + P33 (bianco)
   - LED PORTA FINESTRA: P18 (verde) + P19 (rosso)
   - LED VENTOLA: P21 (verde) + P22 (rosso)
   - SENSORE MAG1: P23 - Trigger DOCCIA 🧲
   - SERVO PORTA BAGNO: P26 - Apertura a game_won 🚪
   - SERVO FINESTRA: P25 - 30° → 0° 🌬️
   - VENTOLA: P32 - Attiva a ventola_done 🌀
   ===================================================== */

#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <ESP32Servo.h>

// ================= WIFI =================
const char* ssid     = "escape";
const char* password = "";

// ================= BACKEND =================
const char* backend_url = "http://192.168.8.10:8001";
int session_id = 999;

// ================= LED =================
// Porta (globale)
#define LED_PORTA_GREEN 4
#define LED_PORTA_RED   16

// Specchio (con LED bianco)
#define LED_SPEC_GREEN 17
#define LED_SPEC_RED   5
#define LED_SPEC_WHITE 33

// Porta finestra
#define LED_FINE_GREEN 18
#define LED_FINE_RED   19

// Ventola
#define LED_VENT_GREEN 21
#define LED_VENT_RED   22

// ================= SENSORI =================
#define MAG1_SENSOR_PIN 23

// ================= SERVO =================
#define SERVO_DOOR_PIN   26
#define SERVO_WINDOW_PIN 25
Servo servoDoor;
Servo servoWindow;

bool servoDoorOpened = false;
bool servoWindowClosed = false;

// ================= VENTOLA =================
#define FAN_PIN 32
bool fanRunning = false;

// ================= MAG1 DEBOUNCE =================
bool mag1_triggered = false;
unsigned long lastMag1Trigger = 0;
const unsigned long MAG1_DEBOUNCE = 1000;

// ================= LED PORTA BLINK =================
String doorLedState = "red";
unsigned long lastBlinkTime = 0;
bool blinkState = false;
const unsigned long BLINK_INTERVAL = 500;

// ================= STATO LOCALE PUZZLES =================
String specchioStatus = "active";
String portafinestraStatus = "locked";
String ventolaStatus = "locked";

// ================= POLLING =================
unsigned long lastGlobalPoll = 0;
unsigned long lastLocalPoll = 0;
unsigned long lastServoPoll = 0;
unsigned long lastFanPoll   = 0;
unsigned long lastStatusPrint = 0;
const unsigned long POLLING_INTERVAL = 2000;
const unsigned long STATUS_PRINT_INTERVAL = 10000;

// ================= FETCH ACTIVE SESSION ID =================
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

// ================= WIFI =================
void connectWiFi() {
  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid, password);

  Serial.print("📡 WiFi");
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 30) {
    delay(500);
    Serial.print(".");
    attempts++;
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println(" ✅");
    Serial.print("IP: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println(" ❌");
    Serial.println("Riavvio tra 5 secondi...");
    delay(5000);
    ESP.restart();
  }
}

// ================= HTTP HELPER =================
String getHTTP(String endpoint) {
  HTTPClient http;
  String url = String(backend_url) + endpoint;
  http.begin(url);
  http.setTimeout(5000);

  int code = http.GET();
  String payload = (code == 200) ? http.getString() : "";

  http.end();
  return payload;
}

// ================= LED UTILS =================
void updateDualLED(int greenPin, int redPin, String state) {
  if (state == "completed" || state == "done") {
    digitalWrite(greenPin, HIGH);
    digitalWrite(redPin, LOW);
  } else if (state == "active") {
    digitalWrite(greenPin, LOW);
    digitalWrite(redPin, HIGH);
  } else {
    digitalWrite(greenPin, LOW);
    digitalWrite(redPin, LOW);
  }
}

// ================= LED PORTA =================
void updateDoorLED() {
  if (doorLedState == "red") {
    digitalWrite(LED_PORTA_GREEN, LOW);
    digitalWrite(LED_PORTA_RED, HIGH);
  } 
  else if (doorLedState == "blinking") {
    unsigned long now = millis();
    if (now - lastBlinkTime > BLINK_INTERVAL) {
      blinkState = !blinkState;
      lastBlinkTime = now;
    }
    digitalWrite(LED_PORTA_GREEN, blinkState);
    digitalWrite(LED_PORTA_RED, LOW);
  } 
  else if (doorLedState == "green") {
    digitalWrite(LED_PORTA_GREEN, HIGH);
    digitalWrite(LED_PORTA_RED, LOW);
  }
}

// ================= MAG1 =================
void checkMag1() {
  int state = digitalRead(MAG1_SENSOR_PIN);
  unsigned long now = millis();

  if (state == LOW && !mag1_triggered &&
      now - lastMag1Trigger > MAG1_DEBOUNCE) {

    Serial.println("🧲 MAG1 → DOCCIA");

    HTTPClient http;
    String url = String(backend_url) +
      "/api/sessions/" + session_id +
      "/bathroom-puzzles/complete";  // ✅ FIX: Endpoint corretto

    http.begin(url);
    http.addHeader("Content-Type", "application/json");
    // ✅ FIX: Body JSON con puzzle_name
    int httpCode = http.POST("{\"puzzle_name\":\"doccia\"}");
    
    if (httpCode == 200) {
      Serial.println("✅ Doccia completato via MAG1!");
    } else {
      Serial.print("❌ HTTP error: ");
      Serial.println(httpCode);
    }
    
    http.end();

    mag1_triggered = true;
    lastMag1Trigger = now;
  }

  if (state == HIGH) mag1_triggered = false;
}

// ================= GLOBAL LED =================
void pollDoorLed() {
  if (millis() - lastGlobalPoll < POLLING_INTERVAL) return;
  lastGlobalPoll = millis();

  String res = getHTTP("/api/game-completion/door-leds");
  if (res.length() == 0) return;

  StaticJsonDocument<256> doc;
  deserializeJson(doc, res);

  String newState = doc["bagno"];
  if (newState != doorLedState) {
    doorLedState = newState;
    blinkState = true;
    lastBlinkTime = millis();
  }
}

// ================= LOCAL PUZZLES =================
void pollLocalState() {
  if (millis() - lastLocalPoll < POLLING_INTERVAL) return;
  lastLocalPoll = millis();

  String res = getHTTP(
    "/api/sessions/" + String(session_id) + "/bathroom-puzzles/state"
  );
  if (res.length() == 0) return;

  StaticJsonDocument<512> doc;
  deserializeJson(doc, res);

  // SPECCHIO Status - Gestisce 3 LED (dual-color + bianco)
  const char* specchioSt = doc["states"]["specchio"]["status"];
  if (specchioSt != nullptr) {
    String newSpecchioStatus = String(specchioSt);
    if (newSpecchioStatus != specchioStatus) {
      specchioStatus = newSpecchioStatus;
      
      if (specchioStatus == "done") {
        // Specchio completato: VERDE + BIANCO
        digitalWrite(LED_SPEC_GREEN, HIGH);
        digitalWrite(LED_SPEC_RED, LOW);
        digitalWrite(LED_SPEC_WHITE, HIGH);
        Serial.println("🪞 SPECCHIO COMPLETATO! ✨");
      } else {
        // Specchio active: ROSSO
        digitalWrite(LED_SPEC_GREEN, LOW);
        digitalWrite(LED_SPEC_RED, HIGH);
        digitalWrite(LED_SPEC_WHITE, LOW);
      }
    }
  }

  // PORTA-FINESTRA LED
  const char* portafineSt = doc["led_states"]["porta_finestra"];
  if (portafineSt != nullptr) {
    String newStatus = String(portafineSt);
    if (newStatus != portafinestraStatus) {
      portafinestraStatus = newStatus;
      updateDualLED(LED_FINE_GREEN, LED_FINE_RED, portafinestraStatus);
      Serial.print("🚪 Porta-Finestra LED: ");
      Serial.println(portafinestraStatus);
    }
  }

  // VENTOLA LED
  const char* ventolaSt = doc["led_states"]["ventola"];
  if (ventolaSt != nullptr) {
    String newStatus = String(ventolaSt);
    if (newStatus != ventolaStatus) {
      ventolaStatus = newStatus;
      updateDualLED(LED_VENT_GREEN, LED_VENT_RED, ventolaStatus);
      Serial.print("🌀 Ventola LED: ");
      Serial.println(ventolaStatus);
    }
  }
}

// ================= SERVO PORTA =================
void pollDoorServo() {
  if (millis() - lastServoPoll < POLLING_INTERVAL) return;
  lastServoPoll = millis();

  String res = getHTTP(
    "/api/sessions/" + String(session_id) + "/bathroom-puzzles/door-servo-status"
  );
  
  if (res.length() > 0) {
    StaticJsonDocument<256> doc;
    deserializeJson(doc, res);
    
    bool shouldOpen = doc["should_open_servo"];
    
    if (shouldOpen && !servoDoorOpened) {
      Serial.println("🚪 VITTORIA! Porta si apre!");
      servoDoor.write(90);
      servoDoorOpened = true;
    }
    // Reset al game reset
    if (!shouldOpen && servoDoorOpened) {
      servoDoor.write(0);
      servoDoorOpened = false;
    }
  }
}

// ================= SERVO FINESTRA =================
void pollWindowServo() {
  if (millis() - lastServoPoll < POLLING_INTERVAL) return;

  String res = getHTTP(
    "/api/sessions/" + String(session_id) + "/bathroom-puzzles/window-servo-status"
  );
  
  if (res.length() > 0) {
    StaticJsonDocument<256> doc;
    deserializeJson(doc, res);
    
    bool shouldClose = doc["should_close_window"];
    
    if (shouldClose && !servoWindowClosed) {
      Serial.println("🌬️ Finestra si chiude!");
      servoWindow.write(0);
      servoWindowClosed = true;
    }
    // Reset al game reset
    if (!shouldClose && servoWindowClosed) {
      servoWindow.write(30);
      servoWindowClosed = false;
    }
  }
}

// ================= FAN =================
void pollFan() {
  if (millis() - lastFanPoll < POLLING_INTERVAL) return;
  lastFanPoll = millis();

  String res = getHTTP(
    "/api/sessions/" + String(session_id) + "/bathroom-puzzles/fan-status"
  );
  
  if (res.length() > 0) {
    StaticJsonDocument<256> doc;
    deserializeJson(doc, res);
    
    bool shouldRun = doc["should_run_fan"];

    if (shouldRun && !fanRunning) {
      Serial.println("🌀 Ventola si attiva!");
      digitalWrite(FAN_PIN, HIGH);
      fanRunning = true;
    }
    if (!shouldRun && fanRunning) {
      digitalWrite(FAN_PIN, LOW);
      fanRunning = false;
    }
  }
}

// ================= PRINT STATUS =================
void printCurrentStatus() {
  unsigned long now = millis();
  if (now - lastStatusPrint < STATUS_PRINT_INTERVAL) return;
  lastStatusPrint = now;
  
  Serial.println("\n\n📊 ===== STATO BAGNO COMPLETO =====");
  Serial.print("   🎯 Session ID: ");
  Serial.println(session_id);
  Serial.print("   📡 WiFi: ");
  Serial.println(WiFi.status() == WL_CONNECTED ? "Connesso ✅" : "Disconnesso ❌");
  Serial.print("   🕒 Uptime: ");
  Serial.print(millis() / 1000);
  Serial.println(" secondi\n");
  
  Serial.println("   🧲 SENSORE MAG1 (P23 - DOCCIA):");
  Serial.print("      Stato GPIO: ");
  Serial.println(digitalRead(MAG1_SENSOR_PIN) == HIGH ? "HIGH (no magnete)" : "LOW (magnete!)");
  Serial.print("      Triggered: ");
  Serial.println(mag1_triggered ? "SI (waiting cooldown)" : "NO (pronto)\n");
  
  Serial.println("   🚪 LED PORTA:");
  Serial.print("      Stato: ");
  Serial.print(doorLedState);
  if (doorLedState == "blinking") {
    Serial.println(" (LAMPEGGIANTE)");
  } else {
    Serial.println();
  }
  
  Serial.println("\n   🪞 LED SPECCHIO:");
  Serial.print("      Status: ");
  Serial.println(specchioStatus);
  
  Serial.println("\n   🚪 LED PORTA-FINESTRA:");
  Serial.print("      Status: ");
  Serial.println(portafinestraStatus);
  
  Serial.println("\n   🌀 LED VENTOLA:");
  Serial.print("      Status: ");
  Serial.println(ventolaStatus);
  
  Serial.println("\n   🚪 SERVO PORTA (P26):");
  Serial.print("      Status: ");
  Serial.println(servoDoorOpened ? "APERTA (90°) - VITTORIA!" : "CHIUSA (0°)");
  
  Serial.println("\n   🌬️ SERVO FINESTRA (P25):");
  Serial.print("      Status: ");
  Serial.println(servoWindowClosed ? "CHIUSA (0°)" : "APERTA (30°)");
  
  Serial.println("\n   🌀 VENTOLA (P32):");
  Serial.print("      Status: ");
  Serial.println(fanRunning ? "ON (RUNNING) ✅" : "OFF");
  
  Serial.println("=========================================\n");
}

// ================= SETUP =================
void setup() {
  Serial.begin(115200);
  Serial.println("\n\n================================================");
  Serial.println("ESP32 BAGNO - RASPBERRY PI - COMPLETE HARDWARE");
  Serial.println("================================================\n");

  // LED output
  pinMode(LED_PORTA_GREEN, OUTPUT);
  pinMode(LED_PORTA_RED, OUTPUT);
  pinMode(LED_SPEC_GREEN, OUTPUT);
  pinMode(LED_SPEC_RED, OUTPUT);
  pinMode(LED_SPEC_WHITE, OUTPUT);
  pinMode(LED_FINE_GREEN, OUTPUT);
  pinMode(LED_FINE_RED, OUTPUT);
  pinMode(LED_VENT_GREEN, OUTPUT);
  pinMode(LED_VENT_RED, OUTPUT);

  // Sensore input
  pinMode(MAG1_SENSOR_PIN, INPUT_PULLUP);
  
  // Ventola output
  pinMode(FAN_PIN, OUTPUT);

  // Stato iniziale
  digitalWrite(LED_PORTA_GREEN, LOW);
  digitalWrite(LED_PORTA_RED, HIGH);
  digitalWrite(LED_SPEC_GREEN, LOW);
  digitalWrite(LED_SPEC_RED, HIGH);
  digitalWrite(LED_SPEC_WHITE, LOW);
  digitalWrite(LED_FINE_GREEN, LOW);
  digitalWrite(LED_FINE_RED, LOW);
  digitalWrite(LED_VENT_GREEN, LOW);
  digitalWrite(LED_VENT_RED, LOW);
  digitalWrite(FAN_PIN, LOW);

  Serial.println("📌 Pin configurati:");
  Serial.println("   LED PORTA: P4 (verde), P16 (rosso) → ROSSO ✅");
  Serial.println("   LED SPECCHIO: P17/P5/P33 → ROSSO ✅");
  Serial.println("   LED PORTA-FINESTRA: P18/P19 → OFF");
  Serial.println("   LED VENTOLA: P21/P22 → OFF");
  Serial.println("   🧲 MAG1: P23 → ATTIVO");
  Serial.println("   🚪 SERVO PORTA: P26 → CONFIGURATO");
  Serial.println("   🌬️ SERVO FINESTRA: P25 → CONFIGURATO");
  Serial.println("   🌀 VENTOLA: P32 → SPENTA\n");

  connectWiFi();
  
  Serial.println("\n🔍 Fetch Active Session ID...");
  session_id = fetchActiveSessionId();
  Serial.print("🎯 Uso Session ID: ");
  Serial.println(session_id);

  // Setup servo
  servoDoor.attach(SERVO_DOOR_PIN);
  servoWindow.attach(SERVO_WINDOW_PIN);
  servoDoor.write(0);
  servoWindow.write(30);

  Serial.println("\n✅ Sistema pronto!");
  Serial.println("🧲 Avvicina magnete a P23 per triggerare DOCCIA puzzle!\n");
}

// ================= LOOP =================
void loop() {
  printCurrentStatus();
  checkMag1();
  pollDoorLed();
  pollLocalState();
  pollDoorServo();
  pollWindowServo();
  pollFan();
  updateDoorLED();
  delay(100);
}