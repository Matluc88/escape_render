/* =====================================================
   ESP32 CUCINA - SISTEMA COMPLETO
   - Anta mobile (MAG1)
   - Pentola fornelli (MAG2)  
   - Servo frigo (GPIO 26)
   ===================================================== */

#include <WiFi.h>
#include <HTTPClient.h>
#include <ESP32Servo.h>
#include <ArduinoJson.h>

// ================= WIFI =================
const char* ssid     = "Vodafone-E23524170";
const char* password = "JtnLtfg73NXgAt9r";

// ================= BACKEND =================
const char* backend_url = "http://192.168.1.6:8002";  // ✅ PORTA 8002 - Bridge IPv4 (fix Docker IPv6-only)

// Session ID dinamico (fetchato dal backend al boot)
int session_id = 999;  // Default fallback

// ================== PIN SENSORI & ATTUATORI ==================
#define MAG1 32   // Anta mobile decorativa
#define MAG2 33   // Pentola sui fornelli
#define SERVO_PIN 26  // Servo frigo
#define STRIP_LED_PIN 23  // Strip LED output (serra)
#define MICROPHONE_PIN 34  // Microfono input (ADC1 - compatibile WiFi!)

// ================== SERVO ==================
Servo servoFrigo;
const int SERVO_OPEN = 0;    // Posizione aperto (0°)
const int SERVO_CLOSED = 90; // Posizione chiuso (90°)

// ================== STATI MAGNETI ==================
bool prevMag1 = HIGH;  // Stato precedente MAG1
bool prevMag2 = HIGH;  // Stato precedente MAG2

// ================== STATO SERVO ==================
bool servoIsClosed = false;  // Traccia stato corrente servo
unsigned long lastServoCheck = 0;
const unsigned long SERVO_CHECK_INTERVAL = 2000;  // Polling ogni 2 secondi

// ================== MICROFONO & STRIP LED (CALIBRAZIONE ADATTIVA) ==================
float baselineNoise = 0;     // Media rumore ambientale
const int BASELINE_SAMPLES = 50;  // Campioni per baseline iniziale
const float BASELINE_ALPHA = 0.98;  // Smoothing (0.98 = molto stabile)
const int PEAK_MARGIN = 800;    // Margine sopra baseline per rilevare picco
const int MIN_THRESHOLD = 500;   // Soglia minima assoluta
const int MAX_THRESHOLD = 3500;  // Soglia massima assoluta

bool stripLedOn = false;  // Stato corrente strip LED
unsigned long lastMicCheck = 0;
unsigned long lastStripCheck = 0;
unsigned long lastPeakTime = 0;
const unsigned long MIC_CHECK_INTERVAL = 100;     // Check microfono ogni 100ms
const unsigned long STRIP_CHECK_INTERVAL = 2000;  // Polling strip LED ogni 2s
const unsigned long PEAK_COOLDOWN = 2000;    // Cooldown tra picchi

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
  return 999;  // Fallback se errore
}

// ================== HTTP ==================

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
  }
  
  http.end();
  return payload;
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

// ================== NOTIFICA SERRA (Microfono) ==================

bool notificaSerra() {
  String endpoint = "/api/sessions/" + String(session_id) + 
                    "/kitchen-puzzles/serra/complete";
  Serial.println("\n🌿 ===== SERRA ATTIVATA =====");
  return chiamataHTTP(endpoint.c_str());
}

// ================== CHECK MICROFONO (Picco Sonoro ADATTIVO) ==================

void checkMicrophonePeak() {
  unsigned long now = millis();
  if (now - lastMicCheck < MIC_CHECK_INTERVAL) return;
  lastMicCheck = now;
  
  // Leggi livello sonoro analogico (ADC 0-4095)
  int soundLevel = analogRead(MICROPHONE_PIN);
  
  // ===== UPDATE BASELINE (Media Mobile Esponenziale) =====
  float currentThreshold = baselineNoise + PEAK_MARGIN;
  currentThreshold = constrain(currentThreshold, MIN_THRESHOLD, MAX_THRESHOLD);
  
  if (soundLevel < currentThreshold) {
    // Rumore normale → aggiorna baseline lentamente
    baselineNoise = (BASELINE_ALPHA * baselineNoise) + ((1 - BASELINE_ALPHA) * soundLevel);
  }
  
  // ===== RILEVA PICCO (sopra soglia adattiva) =====
  if (soundLevel > currentThreshold && (now - lastPeakTime > PEAK_COOLDOWN)) {
    lastPeakTime = now;
    
    Serial.println("\n🎤 ===== PICCO SONORO RILEVATO! =====");
    Serial.print("   Sound level: ");
    Serial.println(soundLevel);
    Serial.print("   Baseline: ");
    Serial.println(baselineNoise, 0);
    Serial.print("   Soglia: ");
    Serial.println(currentThreshold, 0);
    Serial.print("   Delta: +");
    Serial.println(soundLevel - currentThreshold, 0);
    
    // Notifica serra (attiva enigma + strip LED)
    notificaSerra();
  }
}

// ================== POLLING STRIP LED STATE ==================

void checkStripLedState() {
  unsigned long now = millis();
  if (now - lastStripCheck < STRIP_CHECK_INTERVAL) return;
  lastStripCheck = now;
  
  String endpoint = "/api/sessions/" + String(session_id) + 
                    "/kitchen-puzzles/strip-led/state";
  
  String response = getHTTP(endpoint.c_str());
  
  if (response.length() > 0) {
    // Parse JSON response {"is_on": true/false}
    StaticJsonDocument<200> doc;
    DeserializationError error = deserializeJson(doc, response);
    
    if (!error) {
      bool should_be_on = doc["is_on"];
      
      // Aggiorna strip LED solo se serve (evita flickering)
      if (should_be_on != stripLedOn) {
        stripLedOn = should_be_on;
        digitalWrite(STRIP_LED_PIN, stripLedOn ? HIGH : LOW);
        
        Serial.print("💡 Strip LED: ");
        Serial.println(stripLedOn ? "ACCESA ✅" : "SPENTA ⚫");
      }
    } else {
      Serial.println("❌ Errore parsing JSON strip LED response");
    }
  }
}

// ================== POLLING SERVO FRIGO ==================

void checkServoState() {
  String endpoint = "/api/sessions/" + String(session_id) + 
                    "/kitchen-puzzles/frigo/servo-state";
  
  String response = getHTTP(endpoint.c_str());
  
  if (response.length() > 0) {
    // Parse JSON response
    StaticJsonDocument<200> doc;
    DeserializationError error = deserializeJson(doc, response);
    
    if (!error) {
      bool should_close = doc["should_close_servo"];
      const char* frigo_status = doc["frigo_status"];
      
      Serial.print("🧊 Frigo status: ");
      Serial.print(frigo_status);
      Serial.print(" | should_close: ");
      Serial.println(should_close ? "true" : "false");
      
      // Controlla se serve cambiare posizione servo
      if (should_close && !servoIsClosed) {
        // CHIUDI FRIGO
        Serial.println("🔒 Chiudo sportello frigo...");
        servoFrigo.write(SERVO_CLOSED);
        servoIsClosed = true;
        Serial.println("✅ Sportello frigo CHIUSO (90°)");
        
      } else if (!should_close && servoIsClosed) {
        // APRI FRIGO
        Serial.println("🔓 Apro sportello frigo...");
        servoFrigo.write(SERVO_OPEN);
        servoIsClosed = false;
        Serial.println("✅ Sportello frigo APERTO (0°)");
      }
      
    } else {
      Serial.println("❌ Errore parsing JSON response");
    }
  }
}

// ================== SETUP ==================

void setup() {
  Serial.begin(115200);
  Serial.println("\n\n=================================");
  Serial.println("ESP32 CUCINA - SISTEMA COMPLETO");
  Serial.println("=================================\n");

  // Configura pin sensori come INPUT_PULLUP
  pinMode(MAG1, INPUT_PULLUP);
  pinMode(MAG2, INPUT_PULLUP);
  // ⚠️ NOTA: GPIO 34 (ADC) NON richiede pinMode() - funziona automaticamente!
  
  // Configura output
  pinMode(STRIP_LED_PIN, OUTPUT);
  digitalWrite(STRIP_LED_PIN, LOW);  // Strip inizialmente OFF
  
  // Configura servo frigo
  servoFrigo.attach(SERVO_PIN);
  servoFrigo.write(SERVO_OPEN);  // Posizione iniziale: APERTO
  servoIsClosed = false;
  
  Serial.println("📌 Pin configurati:");
  Serial.println("   - MAG1 (pin 32): Anta mobile");
  Serial.println("   - MAG2 (pin 33): Pentola");
  Serial.println("   - SERVO (pin 26): Frigo");
  Serial.println("   - MICROPHONE (pin 25): Input analogico ADC");
  Serial.println("   - STRIP LED (pin 23): Output digitale");
  Serial.println("   - Servo inizializzato: APERTO (0°)");
  Serial.println("   - Strip LED inizializzata: OFF");

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
  } else {
    Serial.println("\n❌ WiFi NON connesso!");
    Serial.println("   Riavvio tra 5 secondi...");
    delay(5000);
    ESP.restart();
  }
  
  // ===== FETCH ACTIVE SESSION ID =====
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n🔍 Fetch Active Session ID...");
    session_id = fetchActiveSessionId();
    Serial.print("🎯 Uso Session ID: ");
    Serial.println(session_id);
  } else {
    Serial.println("⚠️ WiFi non disponibile, uso session_id fallback: 999");
    session_id = 999;
  }
  
  // ===== CALIBRAZIONE MICROFONO (Baseline Rumore Ambientale) =====
  Serial.println("\n🔧 Calibrazione microfono in corso...");
  Serial.println("   (misuro rumore ambientale)");
  
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
  Serial.print("   🎯 Soglia: baseline + ");
  Serial.println(PEAK_MARGIN);
  
  // Leggi stati iniziali
  prevMag1 = digitalRead(MAG1);
  prevMag2 = digitalRead(MAG2);
  
  Serial.println("\n📊 Stati iniziali:");
  Serial.print("   - MAG1: ");
  Serial.println(prevMag1 == LOW ? "CHIUSO (vicino)" : "APERTO (lontano)");
  Serial.print("   - MAG2: ");
  Serial.println(prevMag2 == LOW ? "CHIUSO (vicino)" : "APERTO (lontano)");
  Serial.print("   - SERVO: ");
  Serial.println(servoIsClosed ? "CHIUSO (90°)" : "APERTO (0°)");
  
  Serial.println("\n✅ Sistema pronto!\n");
}

// ================== LOOP ==================

void loop() {
  // ===== MAG1: ANTA MOBILE =====
  bool currentMag1 = digitalRead(MAG1);
  
  // Rileva CAMBIAMENTO di stato (transizione)
  if (currentMag1 != prevMag1) {
    Serial.println("\n🚨 MAG1 CAMBIATO!");
    Serial.print("   Da: ");
    Serial.print(prevMag1 == LOW ? "CHIUSO" : "APERTO");
    Serial.print(" → A: ");
    Serial.println(currentMag1 == LOW ? "CHIUSO" : "APERTO");
    
    // Invia notifica animazione anta (toggle)
    notificaAnta();
    
    prevMag1 = currentMag1;
    delay(500);  // Debounce
  }
  
  // ===== MAG2: PENTOLA =====
  bool currentMag2 = digitalRead(MAG2);
  
  // Rileva CAMBIAMENTO di stato (transizione)
  if (currentMag2 != prevMag2) {
    Serial.println("\n🚨 MAG2 CAMBIATO!");
    Serial.print("   Da: ");
    Serial.print(prevMag2 == LOW ? "CHIUSO" : "APERTO");
    Serial.print(" → A: ");
    Serial.println(currentMag2 == LOW ? "CHIUSO" : "APERTO");
    
    // Invia notifica animazione pentola (solo quando si CHIUDE = pentola arriva)
    if (currentMag2 == LOW) {
      Serial.println("   → Pentola RILEVATA!");
      notificaPentola();
    } else {
      Serial.println("   → Pentola RIMOSSA");
    }
    
    prevMag2 = currentMag2;
    delay(500);  // Debounce
  }
  
  // ===== CHECK MICROFONO (Picco Sonoro) =====
  checkMicrophonePeak();
  
  // ===== POLLING STRIP LED STATE =====
  checkStripLedState();
  
  // ===== POLLING SERVO FRIGO =====
  checkServoState();
  
  delay(100);  // Loop delay
}
