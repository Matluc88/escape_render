/* =====================================================
   ESP32 BAGNO - RASPBERRY PI - COMPLETE WITH HARDWARE
   IP Backend: 192.168.8.10:8001
   
   🔧 VERSION: FIXED V3 - Servo jitter/pulsazioni fix!
   
   HARDWARE PIN MAPPING:
   - LED PORTA: P4 (verde) + P16 (rosso) - Sistema GLOBALE
   - LED SPECCHIO: P17 (verde) + P5 (rosso) + P33 (bianco)
   - LED PORTA FINESTRA: P18 (verde) + P19 (rosso)
   - LED VENTOLA: P21 (verde) + P22 (rosso)
   - SENSORE MAG1: P23 - Trigger DOCCIA 🧲
   - SERVO PORTA BAGNO: P26 - Apertura a game_won 🚪
   - SERVO FINESTRA: P25 - 30° → 0° 🌬️
   - VENTOLA: P32 - Attiva a ventola_done 🌀
   
   ✅ FIX APPLICATI:
   1. Timer separati per servo porta e finestra (lastDoorServoPoll + lastWindowServoPoll)
   2. Debounce MAG1 ridotto a 500ms per maggiore reattività
   3. Log dettagliati per debugging sensore e LED
   4. FIX LED color mapping: "red"/"green"/"off" da backend
   5. 🆕 FIX Servo jitter: attach/write/delay/detach pattern per eliminare pulsazioni
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
const unsigned long MAG1_DEBOUNCE = 500;  // ✅ FIX: Ridotto da 1000ms a 500ms

// ================= LED PORTA BLINK =================
String doorLedState = "red";
unsigned long lastBlinkTime = 0;
bool blinkState = false;
const unsigned long BLINK_INTERVAL = 500;

// ================= STATO LOCALE PUZZLES =================
String specchioStatus = "active";
String portafinestraStatus = "off";  // ✅ FIX: Inizializzato a "off" invece di "locked"
String ventolaStatus = "off";        // ✅ FIX: Inizializzato a "off" invece di "locked"

// ================= POLLING =================
unsigned long lastGlobalPoll = 0;
unsigned long lastLocalPoll = 0;
unsigned long lastDoorServoPoll = 0;    // ✅ FIX: Timer dedicato servo porta P26
unsigned long lastWindowServoPoll = 0;  // ✅ FIX: Timer dedicato servo finestra P25
unsigned long lastFanPoll = 0;
unsigned long lastStatusPrint = 0;
const unsigned long POLLING_INTERVAL = 2000;
const unsigned long STATUS_PRINT_INTERVAL = 60000;  // ✅ Ridotto output: ogni 60s invece di 10s

// ================= FETCH ACTIVE SESSION ID =================
int fetchActiveSessionId() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("⚠️ WiFi non connesso, uso session_id fallback: 999");
    return 999;
  }
  
  HTTPClient http;
  String url = String(backend_url) + "/api/sessions/active";
  
  
  http.begin(url);
  http.setTimeout(5000);
  int httpCode = http.GET();
  
  if (httpCode == 200) {
    String payload = http.getString();
    
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
void updateDualLED(int greenPin, int redPin, String color) {
  // ✅ FIX: Accetta "red", "green", "off" dal backend
  if (color == "green") {
    digitalWrite(greenPin, HIGH);
    digitalWrite(redPin, LOW);
  } else if (color == "red") {
    digitalWrite(greenPin, LOW);
    digitalWrite(redPin, HIGH);
  } else {  // "off" o qualsiasi altro valore
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

    Serial.println("🧲 MAG1 → DOCCIA trigger");

    HTTPClient http;
    String url = String(backend_url) +
      "/api/sessions/" + session_id +
      "/bathroom-puzzles/complete";  // ✅ Backend usa endpoint generico

    http.begin(url);
    http.addHeader("Content-Type", "application/json");
    int httpCode = http.POST("{\"puzzle_name\":\"doccia\"}");  // ✅ puzzle_name nel body
    
    if (httpCode == 200) {
      Serial.println("✅ Doccia completato!");
    } else {
      Serial.print("❌ HTTP error MAG1: ");
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
        Serial.println("🪞 Specchio completato ✨");
      } else {
        // Specchio active: ROSSO
        digitalWrite(LED_SPEC_GREEN, LOW);
        digitalWrite(LED_SPEC_RED, HIGH);
        digitalWrite(LED_SPEC_WHITE, LOW);
      }
    }
  }

  // ✅ FIX: PORTA-FINESTRA LED - Usa color mapping da backend
  const char* portafineSt = doc["led_states"]["porta_finestra"];
  if (portafineSt != nullptr) {
    String newColor = String(portafineSt);  // ← "red", "green", "off"
    if (newColor != portafinestraStatus) {
      portafinestraStatus = newColor;
      updateDualLED(LED_FINE_GREEN, LED_FINE_RED, portafinestraStatus);
      Serial.print("🚪 LED Porta-Finestra: ");
      Serial.println(portafinestraStatus);
    }
  }

  // ✅ FIX: VENTOLA LED - Usa color mapping da backend
  const char* ventolaSt = doc["led_states"]["ventola"];
  if (ventolaSt != nullptr) {
    String newColor = String(ventolaSt);  // ← "red", "green", "off"
    if (newColor != ventolaStatus) {
      ventolaStatus = newColor;
      updateDualLED(LED_VENT_GREEN, LED_VENT_RED, ventolaStatus);
      Serial.print("🌀 LED Ventola: ");
      Serial.println(ventolaStatus);
    }
  }
}

// ================= SERVO PORTA =================
void pollDoorServo() {
  // ✅ FIX: Usa timer dedicato lastDoorServoPoll
  if (millis() - lastDoorServoPoll < POLLING_INTERVAL) return;
  lastDoorServoPoll = millis();  // ✅ FIX: Aggiorna SUO timer

  String res = getHTTP(
    "/api/sessions/" + String(session_id) + "/bathroom-puzzles/door-servo-status"
  );
  
  if (res.length() > 0) {
    StaticJsonDocument<256> doc;
    deserializeJson(doc, res);
    
    bool shouldOpen = doc["should_open_servo"];
    
    if (shouldOpen && !servoDoorOpened) {
      Serial.println("🚪 VITTORIA! Porta aperta (P26 → 90°)");
      servoDoor.attach(SERVO_DOOR_PIN);  // ✅ Attach solo quando serve
      servoDoor.write(90);
      delay(500);  // ✅ Tempo per raggiungere posizione
      servoDoor.detach();  // ✅ Detach per eliminare jitter!
      servoDoorOpened = true;
    }
    // Reset al game reset
    if (!shouldOpen && servoDoorOpened) {
      Serial.println("🔄 Reset porta bagno (P26 → 0°)");
      servoDoor.attach(SERVO_DOOR_PIN);
      servoDoor.write(0);
      delay(500);
      servoDoor.detach();
      servoDoorOpened = false;
    }
  }
}

// ================= SERVO FINESTRA =================
void pollWindowServo() {
  // ✅ FIX: Usa timer dedicato lastWindowServoPoll
  if (millis() - lastWindowServoPoll < POLLING_INTERVAL) return;
  lastWindowServoPoll = millis();  // ✅ FIX: Aggiorna SUO timer (MANCAVA!)

  String res = getHTTP(
    "/api/sessions/" + String(session_id) + "/bathroom-puzzles/window-servo-status"
  );
  
  if (res.length() > 0) {
    StaticJsonDocument<256> doc;
    deserializeJson(doc, res);
    
    bool shouldClose = doc["should_close_window"];
    
    if (shouldClose && !servoWindowClosed) {
      Serial.println("🌬️ Finestra chiusa (P25 → 0°)");
      servoWindow.attach(SERVO_WINDOW_PIN);  // ✅ Attach solo quando serve
      servoWindow.write(0);
      delay(500);  // ✅ Tempo per raggiungere posizione
      servoWindow.detach();  // ✅ Detach per eliminare jitter!
      servoWindowClosed = true;
    }
    // Reset al game reset
    if (!shouldClose && servoWindowClosed) {
      Serial.println("🔄 Reset finestra (P25 → 30°)");
      servoWindow.attach(SERVO_WINDOW_PIN);
      servoWindow.write(30);
      delay(500);
      servoWindow.detach();
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
      Serial.println("🌀 Ventola ON (P32)");
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
  
  // ✅ Log minimo: solo info essenziali
  Serial.print("📊 Uptime: ");
  Serial.print(millis() / 1000);
  Serial.print("s | WiFi: ");
  Serial.print(WiFi.status() == WL_CONNECTED ? "OK" : "ERR");
  Serial.print(" | Porta: ");
  Serial.print(doorLedState);
  Serial.print(" | LEDs: Spec=");
  Serial.print(specchioStatus);
  Serial.print(" PFin=");
  Serial.print(portafinestraStatus);
  Serial.print(" Vent=");
  Serial.println(ventolaStatus);
}

// ================= SETUP =================
void setup() {
  Serial.begin(115200);
  Serial.println("\n\n================================================");
  Serial.println("ESP32 BAGNO - RASPBERRY PI - COMPLETE HARDWARE");
  Serial.println("VERSION: FIXED V3 - Servo jitter fix!");
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
  Serial.println("   🧲 MAG1: P23 → ATTIVO (pull-up)");
  Serial.println("   🚪 SERVO PORTA: P26 → DETACHED (no jitter!)");
  Serial.println("   🌬️ SERVO FINESTRA: P25 → DETACHED (no jitter!)");
  Serial.println("   🌀 VENTOLA: P32 → SPENTA\n");

  connectWiFi();
  
  Serial.println("\n🔍 Fetch Active Session ID...");
  session_id = fetchActiveSessionId();
  Serial.print("🎯 Uso Session ID: ");
  Serial.println(session_id);

  // ✅ FIX: Inizializza servo e poi detach per eliminare jitter
  Serial.println("\n🔧 Inizializzazione servo...");
  servoDoor.attach(SERVO_DOOR_PIN);
  servoDoor.write(0);
  delay(500);
  servoDoor.detach();
  Serial.println("   🚪 Servo porta (P26) → 0° e DETACHED");
  
  servoWindow.attach(SERVO_WINDOW_PIN);
  servoWindow.write(30);
  delay(500);
  servoWindow.detach();
  Serial.println("   🌬️ Servo finestra (P25) → 30° e DETACHED");

  Serial.println("\n✅ Sistema pronto! (Servo jitter fix v3)");
  Serial.println("🔗 Backend: http://192.168.8.10:8001");
  Serial.println("🧲 MAG1 (P23) triggera puzzle DOCCIA nella catena:\n");
  Serial.println("   1️⃣ SPECCHIO (frontend) → active iniziale");
  Serial.println("   2️⃣ DOCCIA (MAG1 P23) → unlocked quando specchio done");
  Serial.println("   3️⃣ VENTOLA (frontend) → unlocked quando doccia done\n");
}

// ================= LOOP =================
void loop() {
  printCurrentStatus();
  checkMag1();
  pollDoorLed();
  pollLocalState();
  pollDoorServo();
  pollWindowServo();  // ✅ FIX: Ora eseguito correttamente con timer dedicato!
  pollFan();
  updateDoorLED();
  delay(100);
}