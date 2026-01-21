/* =====================================================
   ESP32 CAMERA DA LETTO - RASPBERRY PI - COMPLETE
   IP Backend: 192.168.8.10:8001
   
   HARDWARE PIN MAPPING:
   - LED PORTA: P4 (verde) + P16 (rosso) - Sistema GLOBALE con blinking
   - LED MATERASSO: P17 (verde) + P5 (rosso) - Primo enigma
   - LED POLTRONA: P18 (verde) + P19 (rosso) - Secondo enigma
   - LED VENTOLA: P21 (verde) + P22 (rosso) - Terzo enigma
   - LED LAMPADA BIANCA: P32 - Si accende con poltrona active
   - LED VENTOLA FISICA: P14 (verde) + P12 (rosso) - Si accende con ventola done
   - SENSORE MAG1: P27 - Trigger comodino (tasto K) 🧲
   - SERVO PORTA: P25 - Apertura a 90° quando porta unlocked 🚪
   - SERVO LETTO: P33 - Movimento lento 0°→90° quando materasso done 🛏️
   - VENTOLA: P23 - Attiva quando ventola done 🌀
   
   LOGICA FSM:
   1. MAG1 (P27) → /comodino/complete (nessun LED cambia)
   2. Frontend M → /materasso/complete → LED materasso verde + servo letto scende + poltrona rosso + lampada ON
   3. Frontend L → /poltrona/complete → LED poltrona verde + ventola rosso
   4. Frontend J → /ventola/complete → LED ventola verde + ventola fisica ON + LED ventola fisica verde
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

// ================= LED PORTA (GLOBALE) =================
#define LED_PORTA_GREEN 4
#define LED_PORTA_RED   16

// ================= LED MATERASSO (Primo Enigma) =================
#define LED_MATERASSO_GREEN 17
#define LED_MATERASSO_RED   5

// ================= LED POLTRONA (Secondo Enigma) =================
#define LED_POLTRONA_GREEN 18
#define LED_POLTRONA_RED   19

// ================= LED VENTOLA (Terzo Enigma) =================
#define LED_VENTOLA_GREEN 21
#define LED_VENTOLA_RED   22

// ================= LED SUPPLEMENTARI =================
#define LED_LAMPADA_WHITE 32        // Lampada bianca (poltrona active)
#define LED_VENTOLA_FISICA_GREEN 14 // LED ventola fisica verde
#define LED_VENTOLA_FISICA_RED   12 // LED ventola fisica rosso

// ================= SENSORE MAGNETICO =================
#define MAG1_SENSOR_PIN 27  // P27 - Trigger comodino

// ================= SERVO =================
#define SERVO_PORTA_PIN 25  // P25 - Porta camera (apre a 90° quando unlocked)
#define SERVO_LETTO_PIN 33  // P33 - Letto (movimento lento 0°→90° quando materasso done)

Servo servoPorta;
Servo servoLetto;

bool servoPortaOpened = false;
bool servoLettoLowered = false;

// Variabili per movimento lento servo letto
int servoLettoPosTarget = 0;    // Posizione target (0 o 90)
int servoLettoPosCorrente = 0;  // Posizione corrente
unsigned long lastServoLettoMove = 0;
const unsigned long SERVO_LETTO_STEP_DELAY = 30;  // 30ms tra ogni grado = ~2.7s per 90°

// ================= VENTOLA FISICA =================
#define FAN_PIN 23
bool fanRunning = false;

// ================= MAG1 DEBOUNCE =================
bool mag1_triggered = false;
unsigned long lastMag1Trigger = 0;
const unsigned long MAG1_DEBOUNCE = 500;

// ================= LED PORTA BLINK =================
String doorLedState = "red";
unsigned long lastBlinkTime = 0;
bool blinkState = false;
const unsigned long BLINK_INTERVAL = 500;

// ================= STATO LOCALE PUZZLES =================
String materassoStatus = "active";
String poltronaStatus = "locked";
String ventolaStatus = "locked";

// ================= STATO LAMPADA =================
bool lampadaAccesa = false;

// ================= POLLING TIMERS =================
unsigned long lastGlobalPoll = 0;
unsigned long lastLocalPoll = 0;
unsigned long lastDoorServoPoll = 0;
unsigned long lastBedServoPoll = 0;
unsigned long lastFanPoll = 0;
unsigned long lastStatusPrint = 0;
const unsigned long POLLING_INTERVAL = 2000;
const unsigned long STATUS_PRINT_INTERVAL = 60000;

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
    }
  } else if (httpCode == 204) {
    Serial.println("⚠️ Nessuna sessione attiva, uso fallback: 999");
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
  if (color == "green") {
    digitalWrite(greenPin, HIGH);
    digitalWrite(redPin, LOW);
  } else if (color == "red") {
    digitalWrite(greenPin, LOW);
    digitalWrite(redPin, HIGH);
  } else {  // "off"
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

    Serial.println("🧲 MAG1 → COMODINO trigger");

    HTTPClient http;
    String url = String(backend_url) +
      "/api/sessions/" + session_id +
      "/bedroom-puzzles/comodino/complete";

    http.begin(url);
    http.addHeader("Content-Type", "application/json");
    int httpCode = http.POST("{}");
    
    if (httpCode == 200) {
      Serial.println("✅ Comodino completato!");
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

// ================= GLOBAL LED (PORTA) =================
void pollDoorLed() {
  if (millis() - lastGlobalPoll < POLLING_INTERVAL) return;
  lastGlobalPoll = millis();

  String res = getHTTP("/api/game-completion/door-leds");
  if (res.length() == 0) return;

  StaticJsonDocument<256> doc;
  deserializeJson(doc, res);

  String newState = doc["camera"];
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
    "/api/sessions/" + String(session_id) + "/bedroom-puzzles/state"
  );
  if (res.length() == 0) return;

  StaticJsonDocument<1024> doc;
  deserializeJson(doc, res);

  // MATERASSO LED
  const char* materassoSt = doc["led_states"]["materasso"];
  if (materassoSt != nullptr) {
    String newColor = String(materassoSt);
    if (newColor != materassoStatus) {
      materassoStatus = newColor;
      updateDualLED(LED_MATERASSO_GREEN, LED_MATERASSO_RED, materassoStatus);
      Serial.print("🛏️ LED Materasso: ");
      Serial.println(materassoStatus);
    }
  }

  // POLTRONA LED + LAMPADA
  const char* poltronaSt = doc["led_states"]["poltrona"];
  if (poltronaSt != nullptr) {
    String newColor = String(poltronaSt);
    if (newColor != poltronaStatus) {
      poltronaStatus = newColor;
      updateDualLED(LED_POLTRONA_GREEN, LED_POLTRONA_RED, poltronaStatus);
      Serial.print("🪑 LED Poltrona: ");
      Serial.println(poltronaStatus);
      
      // 💡 LAMPADA: Si accende quando poltrona diventa active (rosso)
      bool nuovaLampada = (poltronaStatus == "red");
      if (nuovaLampada != lampadaAccesa) {
        lampadaAccesa = nuovaLampada;
        digitalWrite(LED_LAMPADA_WHITE, lampadaAccesa ? HIGH : LOW);
        Serial.print("💡 Lampada P32: ");
        Serial.println(lampadaAccesa ? "ON" : "OFF");
      }
    }
  }

  // VENTOLA LED
  const char* ventolaSt = doc["led_states"]["ventola"];
  if (ventolaSt != nullptr) {
    String newColor = String(ventolaSt);
    if (newColor != ventolaStatus) {
      ventolaStatus = newColor;
      updateDualLED(LED_VENTOLA_GREEN, LED_VENTOLA_RED, ventolaStatus);
      Serial.print("🌬️ LED Ventola: ");
      Serial.println(ventolaStatus);
    }
  }
}

// ================= SERVO PORTA =================
void pollDoorServo() {
  if (millis() - lastDoorServoPoll < POLLING_INTERVAL) return;
  lastDoorServoPoll = millis();

  String res = getHTTP(
    "/api/sessions/" + String(session_id) + "/bedroom-puzzles/door-servo-status"
  );
  
  if (res.length() > 0) {
    StaticJsonDocument<256> doc;
    deserializeJson(doc, res);
    
    bool shouldOpen = doc["should_open_servo"];
    
    if (shouldOpen && !servoPortaOpened) {
      Serial.println("🚪 VITTORIA! Porta aperta (P25 → 90°)");
      servoPorta.write(90);
      servoPortaOpened = true;
    }
    if (!shouldOpen && servoPortaOpened) {
      servoPorta.write(0);
      servoPortaOpened = false;
    }
  }
}

// ================= SERVO LETTO (MOVIMENTO LENTO) =================
void pollBedServo() {
  if (millis() - lastBedServoPoll < POLLING_INTERVAL) return;
  lastBedServoPoll = millis();

  String res = getHTTP(
    "/api/sessions/" + String(session_id) + "/bedroom-puzzles/bed-servo-status"
  );
  
  if (res.length() > 0) {
    StaticJsonDocument<256> doc;
    deserializeJson(doc, res);
    
    bool shouldLower = doc["should_lower_bed"];
    
    // Imposta target in base allo stato
    if (shouldLower && !servoLettoLowered) {
      Serial.println("🛏️ Letto scende (P33 → 90° LENTO)");
      servoLettoPosTarget = 90;
      servoLettoLowered = true;
    }
    if (!shouldLower && servoLettoLowered) {
      Serial.println("🛏️ Letto sale (P33 → 0°)");
      servoLettoPosTarget = 0;
      servoLettoLowered = false;
    }
  }
}

// Aggiorna movimento lento servo letto (chiamato in loop)
void updateServoLettoMovement() {
  unsigned long now = millis();
  
  // Se siamo già al target, non fare nulla
  if (servoLettoPosCorrente == servoLettoPosTarget) return;
  
  // Controlla se è passato abbastanza tempo per il prossimo step
  if (now - lastServoLettoMove < SERVO_LETTO_STEP_DELAY) return;
  
  // Muovi di 1 grado verso il target
  if (servoLettoPosCorrente < servoLettoPosTarget) {
    servoLettoPosCorrente++;
  } else if (servoLettoPosCorrente > servoLettoPosTarget) {
    servoLettoPosCorrente--;
  }
  
  // Applica nuova posizione
  servoLetto.write(servoLettoPosCorrente);
  lastServoLettoMove = now;
}

// ================= FAN + LED VENTOLA FISICA =================
void pollFan() {
  if (millis() - lastFanPoll < POLLING_INTERVAL) return;
  lastFanPoll = millis();

  String res = getHTTP(
    "/api/sessions/" + String(session_id) + "/bedroom-puzzles/fan-status"
  );
  
  if (res.length() > 0) {
    StaticJsonDocument<256> doc;
    deserializeJson(doc, res);
    
    bool shouldRun = doc["should_run_fan"];

    if (shouldRun && !fanRunning) {
      Serial.println("🌀 Ventola ON (P23)");
      digitalWrite(FAN_PIN, HIGH);
      
      // LED ventola fisica diventa VERDE
      digitalWrite(LED_VENTOLA_FISICA_GREEN, HIGH);
      digitalWrite(LED_VENTOLA_FISICA_RED, LOW);
      
      fanRunning = true;
    }
    if (!shouldRun && fanRunning) {
      digitalWrite(FAN_PIN, LOW);
      digitalWrite(LED_VENTOLA_FISICA_GREEN, LOW);
      digitalWrite(LED_VENTOLA_FISICA_RED, LOW);
      fanRunning = false;
    }
  }
}

// ================= PRINT STATUS =================
void printCurrentStatus() {
  unsigned long now = millis();
  if (now - lastStatusPrint < STATUS_PRINT_INTERVAL) return;
  lastStatusPrint = now;
  
  Serial.print("📊 Uptime: ");
  Serial.print(millis() / 1000);
  Serial.print("s | Porta: ");
  Serial.print(doorLedState);
  Serial.print(" | Materasso: ");
  Serial.print(materassoStatus);
  Serial.print(" | Poltrona: ");
  Serial.print(poltronaStatus);
  Serial.print(" | Ventola: ");
  Serial.print(ventolaStatus);
  Serial.print(" | Lampada: ");
  Serial.print(lampadaAccesa ? "ON" : "OFF");
  Serial.print(" | ServoLetto: ");
  Serial.print(servoLettoPosCorrente);
  Serial.println("°");
}

// ================= SETUP =================
void setup() {
  Serial.begin(115200);
  Serial.println("\n\n================================================");
  Serial.println("ESP32 CAMERA DA LETTO - RASPBERRY PI - COMPLETE");
  Serial.println("================================================\n");

  // LED output
  pinMode(LED_PORTA_GREEN, OUTPUT);
  pinMode(LED_PORTA_RED, OUTPUT);
  pinMode(LED_MATERASSO_GREEN, OUTPUT);
  pinMode(LED_MATERASSO_RED, OUTPUT);
  pinMode(LED_POLTRONA_GREEN, OUTPUT);
  pinMode(LED_POLTRONA_RED, OUTPUT);
  pinMode(LED_VENTOLA_GREEN, OUTPUT);
  pinMode(LED_VENTOLA_RED, OUTPUT);
  pinMode(LED_LAMPADA_WHITE, OUTPUT);
  pinMode(LED_VENTOLA_FISICA_GREEN, OUTPUT);
  pinMode(LED_VENTOLA_FISICA_RED, OUTPUT);

  // Sensore input
  pinMode(MAG1_SENSOR_PIN, INPUT_PULLUP);
  
  // Ventola output
  pinMode(FAN_PIN, OUTPUT);

  // Stato iniziale LED
  digitalWrite(LED_PORTA_GREEN, LOW);
  digitalWrite(LED_PORTA_RED, HIGH);
  digitalWrite(LED_MATERASSO_GREEN, LOW);
  digitalWrite(LED_MATERASSO_RED, HIGH);  // Materasso active inizialmente
  digitalWrite(LED_POLTRONA_GREEN, LOW);
  digitalWrite(LED_POLTRONA_RED, LOW);
  digitalWrite(LED_VENTOLA_GREEN, LOW);
  digitalWrite(LED_VENTOLA_RED, LOW);
  digitalWrite(LED_LAMPADA_WHITE, LOW);
  digitalWrite(LED_VENTOLA_FISICA_GREEN, LOW);
  digitalWrite(LED_VENTOLA_FISICA_RED, LOW);
  digitalWrite(FAN_PIN, LOW);

  Serial.println("📌 Pin configurati:");
  Serial.println("   LED PORTA: P4/P16 → ROSSO ✅");
  Serial.println("   LED MATERASSO: P17/P5 → ROSSO (active) ✅");
  Serial.println("   LED POLTRONA: P18/P19 → OFF");
  Serial.println("   LED VENTOLA: P21/P22 → OFF");
  Serial.println("   LED LAMPADA: P32 → OFF");
  Serial.println("   LED VENTOLA FISICA: P14/P12 → OFF");
  Serial.println("   🧲 MAG1: P27 → ATTIVO (pull-up)");
  Serial.println("   🚪 SERVO PORTA: P25 → CONFIGURATO");
  Serial.println("   🛏️ SERVO LETTO: P33 → CONFIGURATO");
  Serial.println("   🌀 VENTOLA: P23 → SPENTA\n");

  connectWiFi();
  
  Serial.println("\n🔍 Fetch Active Session ID...");
  session_id = fetchActiveSessionId();
  Serial.print("🎯 Uso Session ID: ");
  Serial.println(session_id);

  // Setup servo
  servoPorta.attach(SERVO_PORTA_PIN);
  servoLetto.attach(SERVO_LETTO_PIN);
  servoPorta.write(0);
  servoLetto.write(0);
  servoLettoPosCorrente = 0;
  servoLettoPosTarget = 0;

  Serial.println("\n✅ Sistema pronto!");
  Serial.println("🔗 Backend: http://192.168.8.10:8001");
  Serial.println("🧲 MAG1 (P27) triggera comodino puzzle");
  Serial.println("🛏️ Servo letto (P33) movimento lento 0°→90°\n");
}

// ================= LOOP =================
void loop() {
  printCurrentStatus();
  checkMag1();
  pollDoorLed();
  pollLocalState();
  pollDoorServo();
  pollBedServo();
  pollFan();
  updateDoorLED();
  updateServoLettoMovement();  // Movimento lento continuo
  delay(100);
}