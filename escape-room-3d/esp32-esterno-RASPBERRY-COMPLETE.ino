#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <ESP32Servo.h>

/* =========================================
   ESP32 ESTERNO - VERSIONE RASPBERRY COMPLETA
   Fotocellula + Animazione Cancello + Backend HTTP
   ========================================= */

// ===== WIFI =====
const char* ssid     = "escape";
const char* password = "";

// ===== BACKEND =====
const char* backend_url = "http://192.168.8.10:8001";

// ===== PIN =====
#define LED_VERDE   4
#define LED_ROSSO   16
#define IR_PIN      19   // LOW = OCCUPATO, HIGH = LIBERO

#define SERVO_DX    5
#define SERVO_SX    17
#define SERVO_PORTA 18
#define SERVO_TETTO 32   // DS3225MG

#define RGB_R       21
#define RGB_G       22
#define RGB_B       23

// ===== SERVO =====
Servo cancelloDX, cancelloSX, porta, tetto;

// ===== POSIZIONI ATTUALI =====
int posCancelli = 0;
int posPorta = 0;
int posTetto = 0;

// ===== TARGET =====
const int OPEN_90  = 90;
const int OPEN_180 = 180;

// ===== TIMING =====
unsigned long tServo = 0;
unsigned long tRGB   = 0;
unsigned long tBackendSync = 0;  // Timer per sincronizzazione backend

// ===== RGB FESTA =====
int festaStep = 0;
bool rgbStripOn = false;  // Controllato da backend (game completion)

// ===== STATO =====
bool irLibero = false;
bool irLiberoOld = false;  // Per rilevare cambiamenti

// ===== SESSION ID =====
int sessionId = 999;  // Default fallback

// ===== FUNZIONI =====
void connectWiFi();
int fetchActiveSessionId();
void updatePhotocellState(bool isClear);
void syncBackendState();

void setup() {
  Serial.begin(115200);
  delay(1000);
  
  Serial.println("\n\n========================================");
  Serial.println("🎉 ESP32 ESTERNO - VERSIONE RASPBERRY");
  Serial.println("========================================\n");

  // Pin setup
  pinMode(IR_PIN, INPUT_PULLUP);
  pinMode(LED_VERDE, OUTPUT);
  pinMode(LED_ROSSO, OUTPUT);
  pinMode(RGB_R, OUTPUT);
  pinMode(RGB_G, OUTPUT);
  pinMode(RGB_B, OUTPUT);

  // Servo setup
  cancelloDX.attach(SERVO_DX, 500, 2400);
  cancelloSX.attach(SERVO_SX, 500, 2400);
  porta.attach(SERVO_PORTA, 500, 2400);
  tetto.attach(SERVO_TETTO, 500, 2500);

  // Initial positions
  cancelloDX.write(0);
  cancelloSX.write(0);
  porta.write(0);
  tetto.write(0);

  // WiFi
  connectWiFi();
  
  // Fetch session ID
  Serial.println("\n🔍 Fetch Active Session ID...");
  sessionId = fetchActiveSessionId();
  
  if (sessionId > 0) {
    Serial.print("✅ Active session ID: ");
    Serial.println(sessionId);
  } else {
    Serial.println("⚠️ Nessuna sessione attiva, uso fallback: 999");
    sessionId = 999;
  }
  
  Serial.print("🎯 Uso Session ID: ");
  Serial.println(sessionId);
  
  // Sync initial state from backend
  Serial.println("📥 Sincronizzazione stato iniziale...");
  syncBackendState();
  
  Serial.println("\n✅ Sistema pronto!\n");
}

void loop() {
  unsigned long now = millis();

  // ===== FOTOCELLULA =====
  // LOW = OCCUPATO → LIBERO = HIGH
  irLibero = (digitalRead(IR_PIN) == HIGH);

  // ===== RILEVA CAMBIAMENTO FOTOCELLULA =====
  if (irLibero != irLiberoOld) {
    Serial.print("🚦 Fotocellula cambiata: ");
    Serial.println(irLibero ? "LIBERA ✅" : "OCCUPATA ⛔");
    
    // Invia aggiornamento al backend
    updatePhotocellState(irLibero);
    
    irLiberoOld = irLibero;
  }

  // ===== LED STATO =====
  digitalWrite(LED_ROSSO, !irLibero);
  digitalWrite(LED_VERDE, irLibero);

  // ===== SERVO SMOOTH =====
  if (now - tServo >= 15) {
    tServo = now;

    if (irLibero) {
      if (posCancelli < OPEN_90)  posCancelli++;
      if (posPorta    < OPEN_90)  posPorta++;
      if (posTetto    < OPEN_180) posTetto++;
    } else {
      if (posCancelli > 0) posCancelli--;
      if (posPorta    > 0) posPorta--;
      if (posTetto    > 0) posTetto--;
    }

    cancelloDX.write(posCancelli);
    cancelloSX.write(posCancelli);
    porta.write(posPorta);
    tetto.write(posTetto);
  }

  // ===== RGB FESTA LAMPEGGIANTE =====
  // Controllato da backend (game_won = true)
  if (rgbStripOn) {
    if (now - tRGB >= 120) {   // velocità festa
      tRGB = now;
      festaStep++;

      switch (festaStep % 6) {
        case 0: // ROSSO
          analogWrite(RGB_R, 255);
          analogWrite(RGB_G, 0);
          analogWrite(RGB_B, 0);
          break;
        case 1: // VERDE
          analogWrite(RGB_R, 0);
          analogWrite(RGB_G, 255);
          analogWrite(RGB_B, 0);
          break;
        case 2: // BLU
          analogWrite(RGB_R, 0);
          analogWrite(RGB_G, 0);
          analogWrite(RGB_B, 255);
          break;
        case 3: // GIALLO
          analogWrite(RGB_R, 255);
          analogWrite(RGB_G, 255);
          analogWrite(RGB_B, 0);
          break;
        case 4: // MAGENTA
          analogWrite(RGB_R, 255);
          analogWrite(RGB_G, 0);
          analogWrite(RGB_B, 255);
          break;
        case 5: // CIANO
          analogWrite(RGB_R, 0);
          analogWrite(RGB_G, 255);
          analogWrite(RGB_B, 255);
          break;
      }
    }
  } else {
    // RGB SPENTO
    analogWrite(RGB_R, 0);
    analogWrite(RGB_G, 0);
    analogWrite(RGB_B, 0);
  }

  // ===== BACKEND SYNC =====
  // Sincronizza stato RGB ogni 2 secondi (controlla se game_won)
  if (now - tBackendSync >= 2000) {
    tBackendSync = now;
    syncBackendState();
  }
}

// ===== CONNECT WIFI =====
void connectWiFi() {
  Serial.print("📡 Connessione WiFi a: ");
  Serial.println(ssid);
  
  WiFi.begin(ssid, password);
  
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
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
  }
}

// ===== FETCH SESSION ID =====
int fetchActiveSessionId() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("❌ WiFi non connesso");
    return -1;
  }

  HTTPClient http;
  String url = String(backend_url) + "/api/sessions/active";
  
  Serial.print("🌐 GET ");
  Serial.println(url);
  
  http.begin(url);
  http.setTimeout(5000);
  int httpCode = http.GET();
  
  if (httpCode == 200) {
    String payload = http.getString();
    Serial.println("📥 Response OK");
    
    StaticJsonDocument<512> doc;
    DeserializationError error = deserializeJson(doc, payload);
    
    if (!error) {
      int id = doc["id"];
      Serial.print("✅ Session ID ricevuto: ");
      Serial.println(id);
      http.end();
      return id;
    } else {
      Serial.print("❌ JSON parse error: ");
      Serial.println(error.c_str());
    }
  } else {
    Serial.print("❌ HTTP error: ");
    Serial.println(httpCode);
  }
  
  http.end();
  return -1;
}

// ===== UPDATE PHOTOCELL STATE =====
void updatePhotocellState(bool isClear) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("❌ WiFi non connesso - skip update");
    return;
  }

  HTTPClient http;
  String url = String(backend_url) + "/api/sessions/" + String(sessionId) + 
               "/gate-puzzles/photocell/update?is_clear=" + (isClear ? "true" : "false");
  
  Serial.print("📤 POST ");
  Serial.println(url);
  
  http.begin(url);
  http.setTimeout(5000);
  int httpCode = http.POST("");
  
  if (httpCode == 200) {
    Serial.println("✅ Backend aggiornato!");
    
    // Parse response per aggiornare stato RGB
    String payload = http.getString();
    StaticJsonDocument<512> doc;
    DeserializationError error = deserializeJson(doc, payload);
    
    if (!error) {
      bool newRgbState = doc["rgb_strip_on"];
      if (rgbStripOn != newRgbState) {
        rgbStripOn = newRgbState;
        Serial.print("🎨 RGB Strip: ");
        Serial.println(rgbStripOn ? "ON 🎉" : "OFF");
      }
    }
  } else {
    Serial.print("⚠️ HTTP error: ");
    Serial.println(httpCode);
  }
  
  http.end();
}

// ===== SYNC BACKEND STATE =====
// Polling ogni 2s per controllare se game_won è cambiato
void syncBackendState() {
  if (WiFi.status() != WL_CONNECTED) {
    return;
  }

  HTTPClient http;
  String url = String(backend_url) + "/api/sessions/" + String(sessionId) + 
               "/gate-puzzles/esp32-state";
  
  http.begin(url);
  http.setTimeout(3000);
  int httpCode = http.GET();
  
  if (httpCode == 200) {
    String payload = http.getString();
    StaticJsonDocument<512> doc;
    DeserializationError error = deserializeJson(doc, payload);
    
    if (!error) {
      bool newRgbState = doc["rgb_strip_on"];
      bool allRoomsComplete = doc["all_rooms_complete"];
      
      // Aggiorna RGB solo se cambiato
      if (rgbStripOn != newRgbState) {
        rgbStripOn = newRgbState;
        Serial.print("🎮 Backend sync → RGB: ");
        Serial.print(rgbStripOn ? "ON 🎉" : "OFF");
        Serial.print(" | All rooms: ");
        Serial.println(allRoomsComplete ? "✅" : "❌");
      }
    }
  } else if (httpCode != 404) {
    // 404 è normale se il puzzle non è ancora stato creato
    // Altri errori meritano un log
    Serial.print("⚠️ Sync error: ");
    Serial.println(httpCode);
  }
  
  http.end();
}