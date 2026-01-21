/* =====================================================
   ESP32 CUCINA - SISTEMA COMPLETO CON LED SYNC + DEBUG
   Versione: 3.0 - Con print status periodico e debounce uniformato
   
   HARDWARE:
   - 4 LED bicolore sincronizzati con database
   - Anta mobile (MAG1 - GPIO 32)
   - Pentola fornelli (MAG2 - GPIO 33)  
   - Servo frigo (GPIO 26)
   - Microfono serra con calibrazione adattiva (GPIO 34)
   - Strip LED serra (GPIO 23)
   
   NOVITÀ V3.0:
   - Print status periodico ogni 10 secondi
   - Debounce sensori uniformato a 1000ms
   - Diagnostica microfono completa
   ===================================================== */

#include <WiFi.h>
#include <HTTPClient.h>
#include <ESP32Servo.h>
#include <ArduinoJson.h>

// ================= WIFI =================
const char* ssid     = "escape";
const char* password = "";  // Rete senza password

// ================= BACKEND =================
const char* backend_url = "http://192.168.8.10:8001";
int session_id = 999;  // ← Rimosso const per permettere aggiornamento dinamico

// ================== PIN SENSORI & ATTUATORI ==================
#define MAG1 32   // Anta mobile decorativa
#define MAG2 33   // Pentola sui fornelli
#define SERVO_PIN 26  // Servo frigo
#define STRIP_LED_PIN 23  // Strip LED output (serra)
#define MICROPHONE_PIN 34  // Microfono input (ADC1)

// ================== PIN LED BICOLORE ==================
// LED 1 - PORTA CUCINA
#define LED1_VERDE 4
#define LED1_ROSSO 16

// LED 2 - INDIZIO FORNELLI (invertito fisicamente)
#define LED2_VERDE 17
#define LED2_ROSSO 5

// LED 3 - INDIZIO FRIGO
#define LED3_VERDE 18
#define LED3_ROSSO 19

// LED 4 - INDIZIO SERRA
#define LED4_VERDE 21
#define LED4_ROSSO 22

// ================== SERVO ==================
Servo servoFrigo;
const int SERVO_OPEN = 90;    // Aperto = 90°
const int SERVO_CLOSED = 0;   // Chiuso = 0°

// ================== STATI ==================
bool prevMag1 = HIGH;
bool prevMag2 = HIGH;
bool servoIsClosed = false;
bool stripLedOn = false;

// 🆕 Stati LED per diagnostica
String led1Color = "red";
String led2Color = "red";
String led3Color = "red";
String led4Color = "red";

// ================== STATO LED PORTA (Blinking) ==================
unsigned long lastBlinkTime = 0;
bool blinkState = false;
const unsigned long BLINK_INTERVAL = 500;  // 500ms ON/OFF per lampeggio verde

// ================== TIMING ==================
unsigned long lastLEDSyncTime = 0;
unsigned long lastServoCheck = 0;
unsigned long lastStripCheck = 0;
unsigned long lastMicCheck = 0;
unsigned long lastPeakTime = 0;
unsigned long lastStatusPrint = 0;  // 🆕 Timer print status

const unsigned long LED_SYNC_INTERVAL = 2000;    // Polling LED ogni 2s
const unsigned long SERVO_CHECK_INTERVAL = 2000; // Polling servo ogni 2s
const unsigned long STRIP_CHECK_INTERVAL = 2000; // Polling strip ogni 2s
const unsigned long MIC_CHECK_INTERVAL = 100;    // Check microfono ogni 100ms
const unsigned long PEAK_COOLDOWN = 2000;        // Cooldown tra picchi
const unsigned long STATUS_PRINT_INTERVAL = 10000;  // 🆕 Print status ogni 10s

// ================== MICROFONO (CALIBRAZIONE ADATTIVA) ==================
float baselineNoise = 0;
const int BASELINE_SAMPLES = 50;
const float BASELINE_ALPHA = 0.98;
const int PEAK_MARGIN = 800;
const int MIN_THRESHOLD = 500;
const int MAX_THRESHOLD = 3500;

// 🆕 Tracking ultima soglia per diagnostica
float lastThreshold = 0;

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

bool chiamataHTTP(const char* endpoint, const char* method = "POST") {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("❌ WiFi disconnesso!");
    return false;
  }

  HTTPClient http;
  String url = String(backend_url) + endpoint;
  
  Serial.print("📡 HTTP ");
  Serial.print(method);
  Serial.print(" → ");
  Serial.println(url);
  
  http.begin(url);
  http.setTimeout(5000);

  int httpCode;
  if (strcmp(method, "POST") == 0) {
    http.addHeader("Content-Type", "application/json");
    httpCode = http.POST("{}");
  } else {
    httpCode = http.GET();
  }

  Serial.print("📥 Response: ");
  Serial.println(httpCode);

  bool success = (httpCode > 0 && httpCode < 300);
  
  if (success) {
    Serial.println("✅ Request OK!");
  } else {
    Serial.println("❌ Request FAILED!");
  }

  http.end();
  return success;
}

String getHTTP(const char* endpoint) {
  if (WiFi.status() != WL_CONNECTED) {
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
  }
  
  http.end();
  return payload;
}

// ================== LED CONTROL ==================

void setLED(int pinVerde, int pinRosso, const char* color, String* stateVar = nullptr) {
  // 🆕 Salva stato per diagnostica
  if (stateVar != nullptr) {
    *stateVar = String(color);
  }
  
  if (strcmp(color, "green") == 0) {
    digitalWrite(pinVerde, HIGH);
    digitalWrite(pinRosso, LOW);
  } else if (strcmp(color, "red") == 0) {
    digitalWrite(pinVerde, LOW);
    digitalWrite(pinRosso, HIGH);
  } else if (strcmp(color, "yellow") == 0) {
    // Giallo = rosso + verde insieme
    digitalWrite(pinVerde, HIGH);
    digitalWrite(pinRosso, HIGH);
  } else if (strcmp(color, "blinking") == 0) {
    // 🔧 Blinking gestito da updateDoorLED() nel loop
    // Non fare nulla qui, il LED porta viene aggiornato continuamente
  } else {
    // Off
    digitalWrite(pinVerde, LOW);
    digitalWrite(pinRosso, LOW);
  }
}

// ================== UPDATE LED PORTA CON BLINKING ==================

void updateDoorLED() {
  /*
   * LED PORTA con supporto BLINKING
   * Stati possibili:
   * - "red" → Rosso fisso (0 stanze completate)
   * - "blinking" → Verde blinking 500ms (1-3 stanze completate)
   * - "green" → Verde fisso (4 stanze completate - VITTORIA!)
   */
  
  if (led1Color == "red") {
    // Rosso fisso
    digitalWrite(LED1_VERDE, LOW);
    digitalWrite(LED1_ROSSO, HIGH);
    
  } else if (led1Color == "blinking") {
    // Verde blinking locale (500ms ON/OFF)
    unsigned long now = millis();
    if (now - lastBlinkTime >= BLINK_INTERVAL) {
      blinkState = !blinkState;
      lastBlinkTime = now;
    }
    
    if (blinkState) {
      // LED VERDE ON
      digitalWrite(LED1_VERDE, HIGH);
      digitalWrite(LED1_ROSSO, LOW);
    } else {
      // LED OFF (completo spegnimento)
      digitalWrite(LED1_VERDE, LOW);
      digitalWrite(LED1_ROSSO, LOW);
    }
    
  } else if (led1Color == "green") {
    // Verde fisso - VITTORIA!
    digitalWrite(LED1_VERDE, HIGH);
    digitalWrite(LED1_ROSSO, LOW);
  }
}

// ================== LED SYNC FUNCTION ==================

void syncLEDWithBackend() {
  unsigned long now = millis();
  if (now - lastLEDSyncTime < LED_SYNC_INTERVAL) return;
  lastLEDSyncTime = now;
  
  String endpoint = "/api/sessions/" + String(session_id) + "/kitchen-puzzles/state";
  String response = getHTTP(endpoint.c_str());
  
  if (response.length() == 0) {
    Serial.println("⚠️ [LED SYNC] Nessuna risposta dal backend");
    return;
  }
  
  // Parse JSON response
  StaticJsonDocument<1024> doc;
  DeserializationError error = deserializeJson(doc, response);
  
  if (error) {
    Serial.print("❌ [LED SYNC] Errore parsing JSON: ");
    Serial.println(error.c_str());
    return;
  }
  
  // PORTA (LED 1)
  const char* portaColor = doc["led_states"]["porta"];
  if (portaColor) {
    setLED(LED1_VERDE, LED1_ROSSO, portaColor, &led1Color);
  }
  
  // FORNELLI (LED 2)
  const char* fornelliColor = doc["led_states"]["fornelli"];
  if (fornelliColor) {
    setLED(LED2_VERDE, LED2_ROSSO, fornelliColor, &led2Color);
  }
  
  // FRIGO (LED 3)
  const char* frigoColor = doc["led_states"]["frigo"];
  if (frigoColor) {
    setLED(LED3_VERDE, LED3_ROSSO, frigoColor, &led3Color);
  }
  
  // SERRA (LED 4)
  const char* serraColor = doc["led_states"]["serra"];
  if (serraColor) {
    setLED(LED4_VERDE, LED4_ROSSO, serraColor, &led4Color);
  }
}

// ================== NOTIFICHE ANIMAZIONI ==================

bool notificaAnta() {
  String endpoint = "/api/sessions/" + String(session_id) + 
                    "/kitchen-puzzles/anta/toggle";
  Serial.println("\n🗄️ ===== ANTA TOGGLE =====");
  return chiamataHTTP(endpoint.c_str());
}

bool notificaPentola() {
  String endpoint = "/api/sessions/" + String(session_id) + 
                    "/kitchen-puzzles/fornelli/animation-trigger";
  Serial.println("\n🍳 ===== PENTOLA FORNELLI =====");
  return chiamataHTTP(endpoint.c_str());
}

bool notificaSerra() {
  String endpoint = "/api/sessions/" + String(session_id) + 
                    "/kitchen-puzzles/serra/complete";
  Serial.println("\n🌿 ===== SERRA ATTIVATA =====");
  return chiamataHTTP(endpoint.c_str());
}

// ================== CHECK MICROFONO ==================

void checkMicrophonePeak() {
  unsigned long now = millis();
  if (now - lastMicCheck < MIC_CHECK_INTERVAL) return;
  lastMicCheck = now;
  
  int soundLevel = analogRead(MICROPHONE_PIN);
  
  float currentThreshold = baselineNoise + PEAK_MARGIN;
  currentThreshold = constrain(currentThreshold, MIN_THRESHOLD, MAX_THRESHOLD);
  
  // 🆕 Salva soglia per diagnostica
  lastThreshold = currentThreshold;
  
  if (soundLevel < currentThreshold) {
    baselineNoise = (BASELINE_ALPHA * baselineNoise) + ((1 - BASELINE_ALPHA) * soundLevel);
  }
  
  if (soundLevel > currentThreshold && (now - lastPeakTime > PEAK_COOLDOWN)) {
    lastPeakTime = now;
    
    Serial.println("\n🎤 ===== PICCO SONORO RILEVATO! =====");
    Serial.print("   Sound level: ");
    Serial.println(soundLevel);
    Serial.print("   Baseline: ");
    Serial.println(baselineNoise, 0);
    Serial.print("   Soglia: ");
    Serial.println(currentThreshold, 0);
    
    notificaSerra();
  }
}

// ================== POLLING STRIP LED ==================

void checkStripLedState() {
  unsigned long now = millis();
  if (now - lastStripCheck < STRIP_CHECK_INTERVAL) return;
  lastStripCheck = now;
  
  String endpoint = "/api/sessions/" + String(session_id) + 
                    "/kitchen-puzzles/strip-led/state";
  
  String response = getHTTP(endpoint.c_str());
  
  if (response.length() > 0) {
    StaticJsonDocument<200> doc;
    DeserializationError error = deserializeJson(doc, response);
    
    if (!error) {
      bool should_be_on = doc["is_on"];
      
      if (should_be_on != stripLedOn) {
        stripLedOn = should_be_on;
        digitalWrite(STRIP_LED_PIN, stripLedOn ? HIGH : LOW);
        
        Serial.print("💡 Strip LED: ");
        Serial.println(stripLedOn ? "ACCESA ✅" : "SPENTA ⚫");
      }
    }
  }
}

// ================== POLLING SERVO FRIGO ==================

void checkServoState() {
  unsigned long now = millis();
  if (now - lastServoCheck < SERVO_CHECK_INTERVAL) return;
  lastServoCheck = now;
  
  String endpoint = "/api/sessions/" + String(session_id) + 
                    "/kitchen-puzzles/frigo/servo-state";
  
  String response = getHTTP(endpoint.c_str());
  
  if (response.length() > 0) {
    StaticJsonDocument<200> doc;
    DeserializationError error = deserializeJson(doc, response);
    
    if (!error) {
      bool should_close = doc["should_close_servo"];
      
      if (should_close && !servoIsClosed) {
        Serial.println("🔒 Chiudo sportello frigo...");
        servoFrigo.write(SERVO_CLOSED);
        servoIsClosed = true;
        Serial.println("✅ Sportello frigo CHIUSO (90°)");
        
      } else if (!should_close && servoIsClosed) {
        Serial.println("🔓 Apro sportello frigo...");
        servoFrigo.write(SERVO_OPEN);
        servoIsClosed = false;
        Serial.println("✅ Sportello frigo APERTO (0°)");
      }
    }
  }
}

// 🆕 ================== PRINT STATUS PERIODICO ==================

void printCurrentStatus() {
  unsigned long now = millis();
  if (now - lastStatusPrint < STATUS_PRINT_INTERVAL) return;
  lastStatusPrint = now;
  
  Serial.println("\n\n📊 ===== STATO CUCINA COMPLETO =====");
  Serial.print("   🎯 Session ID: ");
  Serial.println(session_id);
  Serial.print("   📡 WiFi: ");
  Serial.println(WiFi.status() == WL_CONNECTED ? "Connesso ✅" : "Disconnesso ❌");
  if (WiFi.status() == WL_CONNECTED) {
    Serial.print("   📶 RSSI: ");
    Serial.print(WiFi.RSSI());
    Serial.println(" dBm");
  }
  Serial.print("   🕒 Uptime: ");
  Serial.print(millis() / 1000);
  Serial.println(" secondi");
  Serial.println();
  
  Serial.println("   🧲 SENSORE MAG1 (GPIO 32 - Anta mobile):");
  Serial.print("      Stato GPIO: ");
  Serial.println(digitalRead(MAG1) == HIGH ? "HIGH (aperta)" : "LOW (chiusa)");
  Serial.print("      Ultimo stato: ");
  Serial.println(prevMag1 == HIGH ? "HIGH" : "LOW");
  Serial.println();
  
  Serial.println("   🧲 SENSORE MAG2 (GPIO 33 - Pentola):");
  Serial.print("      Stato GPIO: ");
  Serial.println(digitalRead(MAG2) == HIGH ? "HIGH (no pentola)" : "LOW (pentola rilevata!)");
  Serial.print("      Ultimo stato: ");
  Serial.println(prevMag2 == HIGH ? "HIGH" : "LOW");
  Serial.println();
  
  Serial.println("   🚪 LED1 PORTA:");
  Serial.print("      Colore: ");
  Serial.print(led1Color);
  if (led1Color == "blinking") {
    Serial.print(" (LAMPEGGIANTE - blinkState=");
    Serial.print(blinkState ? "ON" : "OFF");
    Serial.println(")");
  } else {
    Serial.println();
  }
  Serial.print("      GPIO 4 (verde): ");
  Serial.println(digitalRead(LED1_VERDE) ? "HIGH" : "LOW");
  Serial.print("      GPIO 16 (rosso): ");
  Serial.println(digitalRead(LED1_ROSSO) ? "HIGH" : "LOW");
  Serial.println();
  
  Serial.println("   🍳 LED2 FORNELLI:");
  Serial.print("      Colore: ");
  Serial.println(led2Color);
  Serial.print("      GPIO 17 (verde): ");
  Serial.println(digitalRead(LED2_VERDE) ? "HIGH" : "LOW");
  Serial.print("      GPIO 5 (rosso): ");
  Serial.println(digitalRead(LED2_ROSSO) ? "HIGH" : "LOW");
  Serial.println();
  
  Serial.println("   🧊 LED3 FRIGO:");
  Serial.print("      Colore: ");
  Serial.println(led3Color);
  Serial.print("      GPIO 18 (verde): ");
  Serial.println(digitalRead(LED3_VERDE) ? "HIGH" : "LOW");
  Serial.print("      GPIO 19 (rosso): ");
  Serial.println(digitalRead(LED3_ROSSO) ? "HIGH" : "LOW");
  Serial.println();
  
  Serial.println("   🌿 LED4 SERRA:");
  Serial.print("      Colore: ");
  Serial.println(led4Color);
  Serial.print("      GPIO 21 (verde): ");
  Serial.println(digitalRead(LED4_VERDE) ? "HIGH" : "LOW");
  Serial.print("      GPIO 22 (rosso): ");
  Serial.println(digitalRead(LED4_ROSSO) ? "HIGH" : "LOW");
  Serial.println();
  
  Serial.println("   🚪 SERVO FRIGO (GPIO 26):");
  Serial.print("      Stato: ");
  Serial.println(servoIsClosed ? "CHIUSO (90°)" : "APERTO (0°)");
  Serial.println();
  
  Serial.println("   💡 STRIP LED SERRA (GPIO 23):");
  Serial.print("      Stato: ");
  Serial.print(stripLedOn ? "ACCESA ✅" : "SPENTA ⚫");
  Serial.print(" | GPIO: ");
  Serial.println(digitalRead(STRIP_LED_PIN) ? "HIGH" : "LOW");
  Serial.println();
  
  Serial.println("   🎤 MICROFONO (GPIO 34):");
  Serial.print("      Baseline: ");
  Serial.println(baselineNoise, 0);
  Serial.print("      Ultima soglia: ");
  Serial.println(lastThreshold, 0);
  Serial.print("      Ultimo picco: ");
  if (lastPeakTime > 0) {
    Serial.print((millis() - lastPeakTime) / 1000);
    Serial.println(" secondi fa");
  } else {
    Serial.println("mai");
  }
  
  Serial.println("=========================================\n");
}

// ================== SETUP ==================

void setup() {
  Serial.begin(115200);
  Serial.println("\n\n============================================");
  Serial.println("ESP32 CUCINA - V3.0 + STATUS DEBUG");
  Serial.println("============================================\n");

  // Configura pin sensori
  pinMode(MAG1, INPUT_PULLUP);
  pinMode(MAG2, INPUT_PULLUP);
  
  // Configura pin LED come OUTPUT
  pinMode(LED1_VERDE, OUTPUT);
  pinMode(LED1_ROSSO, OUTPUT);
  pinMode(LED2_VERDE, OUTPUT);
  pinMode(LED2_ROSSO, OUTPUT);
  pinMode(LED3_VERDE, OUTPUT);
  pinMode(LED3_ROSSO, OUTPUT);
  pinMode(LED4_VERDE, OUTPUT);
  pinMode(LED4_ROSSO, OUTPUT);
  
  // LED iniziali tutti ROSSI
  setLED(LED1_VERDE, LED1_ROSSO, "red", &led1Color);
  setLED(LED2_VERDE, LED2_ROSSO, "red", &led2Color);
  setLED(LED3_VERDE, LED3_ROSSO, "red", &led3Color);
  setLED(LED4_VERDE, LED4_ROSSO, "red", &led4Color);
  
  // Configura output strip LED
  pinMode(STRIP_LED_PIN, OUTPUT);
  digitalWrite(STRIP_LED_PIN, LOW);
  
  // Configura servo frigo
  servoFrigo.attach(SERVO_PIN);
  servoFrigo.write(SERVO_OPEN);
  servoIsClosed = false;
  
  Serial.println("📌 Pin configurati:");
  Serial.println("   - MAG1 (pin 32): Anta mobile");
  Serial.println("   - MAG2 (pin 33): Pentola");
  Serial.println("   - SERVO (pin 26): Frigo");
  Serial.println("   - MICROPHONE (pin 34): Input analogico");
  Serial.println("   - STRIP LED (pin 23): Output digitale");
  Serial.println("\n🔴 LED fisici configurati:");
  Serial.println("   LED1 (Porta): GPIO 4 (V) + 16 (R)");
  Serial.println("   LED2 (Fornelli): GPIO 17 (V) + 5 (R)");
  Serial.println("   LED3 (Frigo): GPIO 18 (V) + 19 (R)");
  Serial.println("   LED4 (Serra): GPIO 21 (V) + 22 (R)");
  Serial.println("   Tutti inizializzati ROSSI");

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
    Serial.print("   Backend: ");
    Serial.println(backend_url);
    Serial.print("   RSSI: ");
    Serial.print(WiFi.RSSI());
    Serial.println(" dBm");
  } else {
    Serial.println("\n❌ WiFi NON connesso!");
    Serial.println("   Riavvio tra 5 secondi...");
    delay(5000);
    ESP.restart();
  }
  
  // Calibrazione microfono
  Serial.println("\n🔧 Calibrazione microfono...");
  
  long sum = 0;
  for(int i = 0; i < BASELINE_SAMPLES; i++) {
    sum += analogRead(MICROPHONE_PIN);
    delay(20);
    if (i % 10 == 0) Serial.print(".");
  }
  
  baselineNoise = sum / (float)BASELINE_SAMPLES;
  
  Serial.println("\n✅ Microfono calibrato!");
  Serial.print("   📊 Baseline: ");
  Serial.println(baselineNoise, 0);
  Serial.print("   📊 Soglia dinamica: ");
  Serial.print(baselineNoise + PEAK_MARGIN, 0);
  Serial.print(" (min: ");
  Serial.print(MIN_THRESHOLD);
  Serial.print(", max: ");
  Serial.print(MAX_THRESHOLD);
  Serial.println(")");
  
  // ===== FETCH ACTIVE SESSION ID =====
  Serial.println("\n🔍 Fetch Active Session ID...");
  session_id = fetchActiveSessionId();
  Serial.print("🎯 Uso Session ID: ");
  Serial.println(session_id);
  
  // Leggi stati iniziali
  prevMag1 = digitalRead(MAG1);
  prevMag2 = digitalRead(MAG2);
  
  Serial.println("\n📊 Stati iniziali:");
  Serial.print("   - MAG1: ");
  Serial.println(prevMag1 == LOW ? "CHIUSO" : "APERTO");
  Serial.print("   - MAG2: ");
  Serial.println(prevMag2 == LOW ? "CHIUSO" : "APERTO");
  Serial.print("   - SERVO: ");
  Serial.println(servoIsClosed ? "CHIUSO" : "APERTO");
  
  Serial.println("\n✅ Sistema pronto!");
  Serial.println("🔄 LED sync automatico attivo (ogni 2s)");
  Serial.println("📊 Print status automatico (ogni 10s)\n");
}

// ================== LOOP ==================

void loop() {
  // 🆕 ===== PRINT STATUS PERIODICO (priorità massima per debug) =====
  printCurrentStatus();
  
  // ===== POLLING LED (ogni 2s) =====
  syncLEDWithBackend();
  
  // ===== MAG1: ANTA MOBILE =====
  bool currentMag1 = digitalRead(MAG1);
  
  if (currentMag1 != prevMag1) {
    Serial.println("\n🚨 MAG1 CAMBIATO!");
    Serial.print("   Da: ");
    Serial.print(prevMag1 == LOW ? "CHIUSO" : "APERTO");
    Serial.print(" → A: ");
    Serial.println(currentMag1 == LOW ? "CHIUSO" : "APERTO");
    
    notificaAnta();
    
    prevMag1 = currentMag1;
    delay(1000);  // 🆕 Debounce uniformato 500ms → 1000ms
  }
  
  // ===== MAG2: PENTOLA =====
  bool currentMag2 = digitalRead(MAG2);
  
  if (currentMag2 != prevMag2) {
    Serial.println("\n🚨 MAG2 CAMBIATO!");
    Serial.print("   Da: ");
    Serial.print(prevMag2 == LOW ? "CHIUSO" : "APERTO");
    Serial.print(" → A: ");
    Serial.println(currentMag2 == LOW ? "CHIUSO" : "APERTO");
    
    if (currentMag2 == LOW) {
      Serial.println("   → Pentola RILEVATA!");
      notificaPentola();
    } else {
      Serial.println("   → Pentola RIMOSSA");
    }
    
    prevMag2 = currentMag2;
    delay(1000);  // 🆕 Debounce uniformato 500ms → 1000ms
  }
  
  // ===== CHECK MICROFONO =====
  checkMicrophonePeak();
  
  // ===== POLLING STRIP LED =====
  checkStripLedState();
  
  // ===== POLLING SERVO FRIGO =====
  checkServoState();
  
  // 🆕 ===== UPDATE LED PORTA (gestisce blinking se necessario) =====
  updateDoorLED();
  
  delay(100);
}