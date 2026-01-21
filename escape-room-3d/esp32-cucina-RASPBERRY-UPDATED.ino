/* =====================================================
   ESP32 CUCINA - RASPBERRY PI - UPDATED VERSION
   IP Backend: 192.168.8.10:8001
   
   🔧 AGGIORNATO CON NUOVE LOGICHE DA SOGGIORNO!
   
   HARDWARE PIN MAPPING:
   - MAG1 (P32): Sensore magnetico anta mobile decorativa 🚪
   - MAG2 (P33): Sensore magnetico pentola fornelli 🍳
   - SERVO FRIGO (P26): Controllo sportello frigo 🧊
   - STRIP LED (P23): Strip LED serra 💡
   - MICROFONO (P34): Rilevamento picchi sonori 🎤
   
   NOVITÀ VERSIONE AGGIORNATA:
   - ✅ Header JSON corretto in tutte le POST
   - ✅ Status print periodico ogni 10 secondi
   - ✅ Migliore gestione errori HTTP
   - ✅ Debounce migliorato per sensori magnetici
   - ✅ Logging più dettagliato per debug
   ===================================================== */

#include <WiFi.h>
#include <HTTPClient.h>
#include <ESP32Servo.h>
#include <ArduinoJson.h>

// ================= WIFI =================
const char* ssid     = "escape";
const char* password = "";  // Rete senza password

// ================= BACKEND RASPBERRY PI =================
const char* backend_url = "http://192.168.8.10:8001";

// Session ID dinamico
int session_id = 999;

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

// ================== STATO SENSORE MAG1 (ANTA) ==================
bool mag1_triggered = false;           // Flag per evitare trigger multipli
unsigned long lastMag1Trigger = 0;     // Timestamp ultimo trigger
const unsigned long MAG1_DEBOUNCE = 1000;  // 1 secondo debounce

// ================== STATO SENSORE MAG2 (PENTOLA) ==================
bool mag2_triggered = false;           // Flag per evitare trigger multipli
unsigned long lastMag2Trigger = 0;     // Timestamp ultimo trigger
const unsigned long MAG2_DEBOUNCE = 1000;  // 1 secondo debounce

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

// ================== TIMERS GENERALI ==================
unsigned long lastStatusPrint = 0;
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

bool postHTTP(const char* endpoint) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("❌ WiFi disconnesso!");
    return false;
  }

  HTTPClient http;
  String url = String(backend_url) + endpoint;
  
  Serial.print("📡 POST → ");
  Serial.println(url);
  
  http.begin(url);
  http.setTimeout(5000);
  http.addHeader("Content-Type", "application/json");  // ✅ FIX: Header JSON!
  
  int httpCode = http.POST("{}");  // ✅ FIX: Body JSON vuoto invece di stringa vuota
  
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

// ================== NOTIFICHE ANIMAZIONI ==================

bool notificaAnta() {
  String endpoint = "/api/sessions/" + String(session_id) + 
                    "/kitchen-puzzles/anta/toggle";
  Serial.println("\n🗄️ ===== ANTA TOGGLE =====");
  return postHTTP(endpoint.c_str());
}

bool notificaPentola() {
  String endpoint = "/api/sessions/" + String(session_id) + 
                    "/kitchen-puzzles/fornelli/animation-trigger";
  Serial.println("\n🍳 ===== PENTOLA FORNELLI =====");
  return postHTTP(endpoint.c_str());
}

// ================== NOTIFICA SERRA (Microfono) ==================

bool notificaSerra() {
  String endpoint = "/api/sessions/" + String(session_id) + 
                    "/kitchen-puzzles/serra/complete";
  Serial.println("\n🌿 ===== SERRA ATTIVATA =====");
  return postHTTP(endpoint.c_str());
}

// ================== 🧲 SENSORE MAGNETICO MAG1 (ANTA) ==================

void checkMag1Sensor() {
  /*
   * Legge sensore magnetico su P32 (anta mobile)
   * Quando anta si muove (magnete cambia stato):
   *   - Trigger toggle animazione anta
   *   - Debounce di 1 secondo
   */
  
  int sensorState = digitalRead(MAG1);
  unsigned long now = millis();
  
  // ✨ Rileva cambio stato con debounce
  if (sensorState == LOW && !mag1_triggered && 
      (now - lastMag1Trigger > MAG1_DEBOUNCE)) {
    
    Serial.println("\n🗄️ ===== MAG1 TRIGGER RILEVATO =====");
    Serial.print("   Anta mobile rilevata su P32 alle ");
    Serial.print(millis() / 1000);
    Serial.println(" secondi");
    
    // Notifica backend
    if (notificaAnta()) {
      mag1_triggered = true;
      lastMag1Trigger = now;
      Serial.println("   ✅ Animazione anta triggerata!");
    } else {
      Serial.println("   ❌ Errore invio notifica anta");
    }
    
    Serial.println("====================================\n");
  }
  
  // Reset quando magnete torna in posizione
  if (sensorState == HIGH && mag1_triggered) {
    mag1_triggered = false;
    Serial.println("🗄️ MAG1: Anta tornata in posizione");
    Serial.println("   Sensore pronto per nuovo trigger");
  }
}

// ================== 🧲 SENSORE MAGNETICO MAG2 (PENTOLA) ==================

void checkMag2Sensor() {
  /*
   * Legge sensore magnetico su P33 (pentola fornelli)
   * Quando pentola viene messa sui fornelli:
   *   - Trigger animazione pentola (vapore/effetti)
   *   - Debounce di 1 secondo
   */
  
  int sensorState = digitalRead(MAG2);
  unsigned long now = millis();
  
  // ✨ Rileva pentola sui fornelli (magnete vicino = LOW)
  if (sensorState == LOW && !mag2_triggered && 
      (now - lastMag2Trigger > MAG2_DEBOUNCE)) {
    
    Serial.println("\n🍳 ===== MAG2 TRIGGER RILEVATO =====");
    Serial.print("   Pentola rilevata su fornelli (P33) alle ");
    Serial.print(millis() / 1000);
    Serial.println(" secondi");
    
    // Notifica backend
    if (notificaPentola()) {
      mag2_triggered = true;
      lastMag2Trigger = now;
      Serial.println("   ✅ Animazione pentola triggerata!");
    } else {
      Serial.println("   ❌ Errore invio notifica pentola");
    }
    
    Serial.println("====================================\n");
  }
  
  // Reset quando pentola viene rimossa
  if (sensorState == HIGH && mag2_triggered) {
    mag2_triggered = false;
    Serial.println("🍳 MAG2: Pentola rimossa dai fornelli");
    Serial.println("   Sensore pronto per nuovo trigger");
  }
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
    
    Serial.println("====================================\n");
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
    StaticJsonDocument<200> doc;
    DeserializationError error = deserializeJson(doc, response);
    
    if (!error) {
      bool should_be_on = doc["is_on"];
      
      // Aggiorna strip LED solo se cambiato (evita flickering)
      if (should_be_on != stripLedOn) {
        stripLedOn = should_be_on;
        digitalWrite(STRIP_LED_PIN, stripLedOn ? HIGH : LOW);
        
        Serial.println("\n💡 ===== STRIP LED AGGIORNATA =====");
        Serial.print("   Nuovo stato: ");
        Serial.println(stripLedOn ? "ACCESA ✅" : "SPENTA ⚫");
        Serial.println("====================================\n");
      }
    } else {
      Serial.println("❌ Errore parsing JSON strip LED response");
    }
  }
}

// ================== 🧊 POLLING SERVO FRIGO ==================

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
      const char* frigo_status = doc["frigo_status"];
      
      // 🧊 CHIUDI FRIGO (puzzle completato)
      if (should_close && !servoIsClosed) {
        Serial.println("\n🧊 ===== SERVO FRIGO: CHIUSURA =====");
        Serial.print("   Status frigo: ");
        Serial.println(frigo_status);
        Serial.println("   Movimento servo: 0° → 90°");
        
        servoFrigo.write(SERVO_CLOSED);
        servoIsClosed = true;
        
        Serial.println("   ✅ Sportello frigo CHIUSO");
        Serial.println("====================================\n");
      }
      // 🧊 APRI FRIGO (reset scena)
      else if (!should_close && servoIsClosed) {
        Serial.println("\n🧊 ===== SERVO FRIGO: APERTURA =====");
        Serial.print("   Status frigo: ");
        Serial.println(frigo_status);
        Serial.println("   Movimento servo: 90° → 0°");
        
        servoFrigo.write(SERVO_OPEN);
        servoIsClosed = false;
        
        Serial.println("   ✅ Sportello frigo APERTO");
        Serial.println("====================================\n");
      }
      
    } else {
      Serial.println("❌ Errore parsing JSON servo-state response");
    }
  }
}

// ================== PRINT STATUS PERIODICO ==================

void printCurrentStatus() {
  unsigned long now = millis();
  if (now - lastStatusPrint < STATUS_PRINT_INTERVAL) return;
  lastStatusPrint = now;
  
  Serial.println("\n\n📊 ===== STATO CUCINA COMPLETO =====");
  Serial.print("   🎯 Session ID: ");
  Serial.println(session_id);
  Serial.print("   📡 WiFi: ");
  Serial.println(WiFi.status() == WL_CONNECTED ? "Connesso ✅" : "Disconnesso ❌");
  Serial.print("   🕒 Uptime: ");
  Serial.print(millis() / 1000);
  Serial.println(" secondi");
  Serial.println();
  
  Serial.println("   🗄️ SENSORE MAG1 (P32 - ANTA):");
  Serial.print("      Stato GPIO: ");
  Serial.println(digitalRead(MAG1) == HIGH ? "HIGH (no magnete)" : "LOW (magnete rilevato!)");
  Serial.print("      Triggered: ");
  Serial.println(mag1_triggered ? "SI (waiting cooldown)" : "NO (pronto)");
  Serial.println();
  
  Serial.println("   🍳 SENSORE MAG2 (P33 - PENTOLA):");
  Serial.print("      Stato GPIO: ");
  Serial.println(digitalRead(MAG2) == HIGH ? "HIGH (no pentola)" : "LOW (pentola rilevata!)");
  Serial.print("      Triggered: ");
  Serial.println(mag2_triggered ? "SI (waiting cooldown)" : "NO (pronto)");
  Serial.println();
  
  Serial.println("   🧊 SERVO FRIGO (P26):");
  Serial.print("      Status: ");
  Serial.println(servoIsClosed ? "CHIUSO (90°)" : "APERTO (0°)");
  Serial.println();
  
  Serial.println("   💡 STRIP LED SERRA (P23):");
  Serial.print("      Status: ");
  Serial.print(stripLedOn ? "ON (ACCESA) ✅" : "OFF (SPENTA)");
  Serial.print(" | GPIO: ");
  Serial.println(digitalRead(STRIP_LED_PIN) ? "HIGH" : "LOW");
  Serial.println();
  
  Serial.println("   🎤 MICROFONO (P34):");
  Serial.print("      Baseline rumore: ");
  Serial.println(baselineNoise, 0);
  Serial.print("      Soglia attuale: ");
  Serial.println(baselineNoise + PEAK_MARGIN, 0);
  Serial.print("      Livello corrente: ");
  Serial.println(analogRead(MICROPHONE_PIN));
  
  Serial.println("=========================================\n");
}

// ================== SETUP ==================

void setup() {
  Serial.begin(115200);
  Serial.println("\n\n================================================");
  Serial.println("ESP32 CUCINA - RASPBERRY PI - UPDATED");
  Serial.println("VERSION: Logiche nuove da soggiorno 🔧");
  Serial.println("================================================\n");

  // Configura pin sensori come INPUT_PULLUP
  pinMode(MAG1, INPUT_PULLUP);
  pinMode(MAG2, INPUT_PULLUP);
  
  // Configura output
  pinMode(STRIP_LED_PIN, OUTPUT);
  digitalWrite(STRIP_LED_PIN, LOW);  // Strip inizialmente OFF
  
  // Configura servo frigo
  servoFrigo.attach(SERVO_PIN);
  servoFrigo.write(SERVO_OPEN);  // Posizione iniziale: APERTO
  servoIsClosed = false;
  
  Serial.println("📌 Pin configurati:");
  Serial.println("   MAG1 (P32): Anta mobile → INPUT_PULLUP");
  Serial.println("   MAG2 (P33): Pentola fornelli → INPUT_PULLUP");
  Serial.println("   SERVO (P26): Frigo → 0° (APERTO iniziale)");
  Serial.println("   STRIP LED (P23): Serra → OFF iniziale");
  Serial.println("   MICROFONO (P34): ADC analogico");
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
  
  // ===== CALIBRAZIONE MICROFONO =====
  Serial.println("\n🔧 Calibrazione microfono...");
  long sum = 0;
  for(int i = 0; i < BASELINE_SAMPLES; i++) {
    sum += analogRead(MICROPHONE_PIN);
    delay(20);
    if (i % 10 == 0) Serial.print(".");
  }
  
  baselineNoise = sum / (float)BASELINE_SAMPLES;
  Serial.println("\n✅ Microfono calibrato!");
  Serial.print("   Baseline: ");
  Serial.println(baselineNoise, 0);
  Serial.print("   Soglia picco: ");
  Serial.println(baselineNoise + PEAK_MARGIN, 0);
  
  Serial.println("\n✅ Sistema pronto!");
  Serial.println("🗄️ Avvicina magnete a P32 per triggerare anta!");
  Serial.println("🍳 Avvicina magnete a P33 per triggerare pentola!");
  Serial.println("🎤 Il microfono rileverà automaticamente i picchi sonori!");
  Serial.println("🧊 Il servo frigo si attiverà al completamento puzzle!\n");
}

// ================== LOOP ==================

void loop() {
  // ===== PRINT STATUS PERIODICO (ogni 10s) =====
  printCurrentStatus();
  
  // ===== 🗄️ CONTROLLO SENSORE MAGNETICO MAG1 (ANTA) =====
  checkMag1Sensor();
  
  // ===== 🍳 CONTROLLO SENSORE MAGNETICO MAG2 (PENTOLA) =====
  checkMag2Sensor();
  
  // ===== 🎤 CHECK MICROFONO =====
  checkMicrophonePeak();
  
  // ===== 💡 POLLING STRIP LED =====
  checkStripLedState();
  
  // ===== 🧊 POLLING SERVO FRIGO =====
  checkServoState();
  
  delay(100);  // Loop delay
}