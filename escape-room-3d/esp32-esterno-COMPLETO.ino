#include <WiFi.h>
#include <HTTPClient.h>
#include <ESP32Servo.h>
#include <ArduinoJson.h>

/* =========================================
   ESP32 ESTERNO - VERSIONE COMPLETA
   Con sincronizzazione Backend DINAMICA
   Fotocellula invertita (LOW = OCCUPATO)
   ========================================= */

// ===== CONFIGURAZIONE WIFI & BACKEND =====
const char* WIFI_SSID = "Vodafone-E23524170";
const char* WIFI_PASSWORD = "JtnLtfg73NXgAt9r";
const char* BACKEND_URL = "http://192.168.1.10:8001";

// Session ID dinamico (fetchato dal backend al boot)
int SESSION_ID = 999;  // Default fallback

// ===== PIN =====
// LED CANCELLO
#define LED_CANCELLO_VERDE   4
#define LED_CANCELLO_ROSSO   16

// LED PORTA INGRESSO
#define LED_PORTA_VERDE   25
#define LED_PORTA_ROSSO   33

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

// ===== POSIZIONI =====
int posCancelli = 0;
int posPorta = 0;
int posTetto = 0;

// ===== TARGET =====
const int OPEN_90  = 90;
const int OPEN_180 = 180;

// ===== TIMING =====
unsigned long tServo = 0;
unsigned long tRGB = 0;
unsigned long tPolling = 0;
unsigned long tReconnect = 0;

// ===== RGB FESTA =====
int festaStep = 0;
bool rgbFestaEnabled = false;  // Controllato da backend

// ===== STATO =====
bool irLibero = false;
bool irLiberoOld = false;
bool wifiConnected = false;

// ===== FUNZIONI =====

void connectWiFi() {
  if (WiFi.status() == WL_CONNECTED) {
    wifiConnected = true;
    return;
  }
  
  Serial.println("🔌 Connessione WiFi...");
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    Serial.print(".");
    attempts++;
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    wifiConnected = true;
    Serial.println("\n✅ WiFi connesso!");
    Serial.print("📡 IP: ");
    Serial.println(WiFi.localIP());
  } else {
    wifiConnected = false;
    Serial.println("\n❌ WiFi fallito!");
  }
}

int fetchActiveSessionId() {
  if (!wifiConnected) {
    Serial.println("⚠️ WiFi non connesso, uso session_id fallback: 999");
    return 999;
  }
  
  HTTPClient http;
  String url = String(BACKEND_URL) + "/api/sessions/active";
  
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

void sendPhotocellUpdate(bool isClear) {
  if (!wifiConnected) return;
  
  HTTPClient http;
  String url = String(BACKEND_URL) + "/api/sessions/" + String(SESSION_ID) + 
               "/gate-puzzles/photocell/update?is_clear=" + (isClear ? "true" : "false");
  
  Serial.print("📤 POST photocell: ");
  Serial.println(isClear ? "LIBERA" : "OCCUPATA");
  
  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  
  int httpCode = http.POST("");
  
  if (httpCode > 0) {
    if (httpCode == 200) {
      String payload = http.getString();
      Serial.println("✅ Stato inviato al backend");
    } else {
      Serial.printf("⚠️ HTTP %d\n", httpCode);
    }
  } else {
    Serial.printf("❌ Errore: %s\n", http.errorToString(httpCode).c_str());
  }
  
  http.end();
}

void pollBackendState() {
  if (!wifiConnected) return;
  
  HTTPClient http;
  String url = String(BACKEND_URL) + "/api/sessions/" + String(SESSION_ID) + 
               "/gate-puzzles/esp32-state";
  
  http.begin(url);
  int httpCode = http.GET();
  
  if (httpCode == 200) {
    String payload = http.getString();
    
    StaticJsonDocument<256> doc;
    DeserializationError error = deserializeJson(doc, payload);
    
    if (!error) {
      rgbFestaEnabled = doc["rgb_strip_on"].as<bool>();
      bool allRoomsComplete = doc["all_rooms_complete"].as<bool>();
      
      Serial.print("🎮 Backend sync → RGB Festa: ");
      Serial.print(rgbFestaEnabled ? "ON" : "OFF");
      Serial.print(" | All rooms: ");
      Serial.println(allRoomsComplete ? "✅" : "❌");
    }
  }
  
  http.end();
}

void setup() {
  Serial.begin(115200);
  Serial.println("\n🚀 ESP32 ESTERNO - AVVIO");
  Serial.println("========================================");

  // ===== PIN SETUP =====
  pinMode(IR_PIN, INPUT_PULLUP);
  
  // LED CANCELLO
  pinMode(LED_CANCELLO_VERDE, OUTPUT);
  pinMode(LED_CANCELLO_ROSSO, OUTPUT);
  
  // LED PORTA INGRESSO
  pinMode(LED_PORTA_VERDE, OUTPUT);
  pinMode(LED_PORTA_ROSSO, OUTPUT);
  
  // RGB STRIP
  pinMode(RGB_R, OUTPUT);
  pinMode(RGB_G, OUTPUT);
  pinMode(RGB_B, OUTPUT);

  // ===== SERVO SETUP =====
  cancelloDX.attach(SERVO_DX, 500, 2400);
  cancelloSX.attach(SERVO_SX, 500, 2400);
  porta.attach(SERVO_PORTA, 500, 2400);
  tetto.attach(SERVO_TETTO, 500, 2500);

  // Posizione iniziale chiusa
  cancelloDX.write(0);
  cancelloSX.write(0);
  porta.write(0);
  tetto.write(0);

  Serial.println("✅ Servomotori inizializzati");

  // ===== WIFI SETUP =====
  connectWiFi();

  // ===== FETCH ACTIVE SESSION ID =====
  if (wifiConnected) {
    Serial.println("\n🔍 Fetch Active Session ID...");
    SESSION_ID = fetchActiveSessionId();
    Serial.print("🎯 Uso Session ID: ");
    Serial.println(SESSION_ID);
  } else {
    Serial.println("⚠️ WiFi non disponibile, uso session_id fallback: 999");
    SESSION_ID = 999;
  }

  // ===== INIT STATE =====
  irLibero = (digitalRead(IR_PIN) == HIGH);
  irLiberoOld = irLibero;
  
  // Invio stato iniziale al backend
  if (wifiConnected) {
    sendPhotocellUpdate(irLibero);
    pollBackendState();
  }

  Serial.println("========================================");
  Serial.println("🎉 Sistema pronto!");
  Serial.print("📸 Fotocellula: ");
  Serial.println(irLibero ? "LIBERA" : "OCCUPATA");
}

void loop() {
  unsigned long now = millis();

  // ===== RICONNESSIONE WIFI =====
  if (now - tReconnect >= 30000) {  // Ogni 30 secondi
    tReconnect = now;
    if (WiFi.status() != WL_CONNECTED) {
      wifiConnected = false;
      Serial.println("🔄 Riconnessione WiFi...");
      connectWiFi();
      
      // Re-fetch session ID dopo riconnessione
      if (wifiConnected) {
        SESSION_ID = fetchActiveSessionId();
      }
    }
  }

  // ===== FOTOCELLULA =====
  irLibero = (digitalRead(IR_PIN) == HIGH);

  // Rileva cambio stato e notifica backend
  if (irLibero != irLiberoOld) {
    irLiberoOld = irLibero;
    Serial.print("🚦 Cambio stato → ");
    Serial.println(irLibero ? "LIBERA ✅" : "OCCUPATA ❌");
    
    if (wifiConnected) {
      sendPhotocellUpdate(irLibero);
    }
  }

  // ===== LED STATO (entrambe le coppie sincronizzate) =====
  // LED CANCELLO
  digitalWrite(LED_CANCELLO_ROSSO, !irLibero);
  digitalWrite(LED_CANCELLO_VERDE, irLibero);
  
  // LED PORTA INGRESSO
  digitalWrite(LED_PORTA_ROSSO, !irLibero);
  digitalWrite(LED_PORTA_VERDE, irLibero);

  // ===== ANIMAZIONI SERVOMOTORI SMOOTH =====
  if (now - tServo >= 15) {  // 15ms per smooth movement
    tServo = now;

    if (irLibero) {
      // APRI
      if (posCancelli < OPEN_90)  posCancelli++;
      if (posPorta    < OPEN_90)  posPorta++;
      if (posTetto    < OPEN_180) posTetto++;
    } else {
      // CHIUDI
      if (posCancelli > 0) posCancelli--;
      if (posPorta    > 0) posPorta--;
      if (posTetto    > 0) posTetto--;
    }

    cancelloDX.write(posCancelli);
    cancelloSX.write(posCancelli);
    porta.write(posPorta);
    tetto.write(posTetto);
  }

  // ===== POLLING BACKEND =====
  if (now - tPolling >= 2000) {  // Ogni 2 secondi
    tPolling = now;
    if (wifiConnected) {
      pollBackendState();
    }
  }

  // ===== RGB FESTA LAMPEGGIANTE =====
  // Attivo SOLO se:
  // 1. Fotocellula LIBERA (irLibero = true)
  // 2. Tutte 4 stanze completate (rgbFestaEnabled = true dal backend)
  
  if (irLibero && rgbFestaEnabled) {
    // FESTA ATTIVA!
    if (now - tRGB >= 120) {  // Velocità festa
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
    // RGB SPENTO (fotocellula occupata O stanze non completate)
    analogWrite(RGB_R, 0);
    analogWrite(RGB_G, 0);
    analogWrite(RGB_B, 0);
  }
}
