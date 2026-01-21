/* =====================================================
   ESP32 CUCINA - SISTEMA COMPLETO CON LED SYNC
   Versione: 2.0 - Con polling stato LED dal database
   ===================================================== */

#include <WiFi.h>
#include <HTTPClient.h>
#include <ESP32Servo.h>

// ================= WIFI =================
const char* ssid     = "Vodafone-E23524170";
const char* password = "JtnLtfg73NXgAt9r";

// ================= BACKEND =================
const char* backend_url = "http://192.168.1.10:8001";
const int session_id = 999;

// ================== STATI ==================
enum StatoCucina {
  FORNELLI,
  FRIGO,
  SERRA,
  COMPLETATO
};

StatoCucina stato = FORNELLI;

// ================== STATE GLOBALE ==================
bool kitchenComplete = false;
bool allRoomsComplete = false;
unsigned long lastPollTime = 0;
const unsigned long POLL_INTERVAL = 5000;

// 🆕 LED SYNC TIMING
unsigned long lastLEDSyncTime = 0;
const unsigned long LED_SYNC_INTERVAL = 2000; // Poll LED ogni 2 secondi

// ================== PIN LED ==================
#define LED1_VERDE 4    // Porta
#define LED1_ROSSO 16
#define LED2_VERDE 17   // Fornelli
#define LED2_ROSSO 5
#define LED3_VERDE 18   // Frigo
#define LED3_ROSSO 19
#define LED4_VERDE 21   // Serra
#define LED4_ROSSO 22

// ================== SERVO ==================
#define SERVO_PORTA 27
#define SERVO_FRIGO 26
Servo servoPorta;
Servo servoFrigo;

// ================== SENSORI ==================
#define MAG1 32   // Anta decorativa
#define MAG2 33   // Pentola
#define MIC_PIN 25
#define STRIP_LED 23

// ================= AUDIO =================
#define CALIBRA_MS 2000
#define FINESTRA_MS 60
#define MARGINE_BATTITO 800
int rumoreFondo = 0;

// ================== HTTP ==================

bool chiamataHTTP(const char* endpoint, const char* method = "POST") {
  if (WiFi.status() != WL_CONNECTED) return false;

  HTTPClient http;
  String url = String(backend_url) + endpoint;
  http.begin(url);
  http.setTimeout(5000);

  int httpCode;
  if (strcmp(method, "POST") == 0) {
    http.addHeader("Content-Type", "application/json");
    httpCode = http.POST("{}");
  } else {
    httpCode = http.GET();
  }

  http.end();
  return (httpCode > 0 && httpCode < 300);
}

// ================== NOTIFICHE ==================

bool notificaFornelli() {
  String e = "/api/sessions/" + String(session_id) +
             "/kitchen-puzzles/fornelli/complete";
  return chiamataHTTP(e.c_str());
}

bool notificaFrigo() {
  String e = "/api/sessions/" + String(session_id) +
             "/kitchen-puzzles/frigo/complete";
  return chiamataHTTP(e.c_str());
}

bool notificaSerra() {
  String e = "/api/sessions/" + String(session_id) +
             "/kitchen-puzzles/serra/complete";
  return chiamataHTTP(e.c_str());
}

// ================== POLLING ==================

void checkGameCompletion() {
  if (WiFi.status() != WL_CONNECTED) return;

  HTTPClient http;
  String url = String(backend_url) + "/api/sessions/" +
               String(session_id) + "/game-completion/status";

  http.begin(url);
  int code = http.GET();

  if (code > 0) {
    String p = http.getString();
    kitchenComplete = p.indexOf("\"kitchen_complete\":true") > 0;
    allRoomsComplete = p.indexOf("\"all_rooms_complete\":true") > 0;
  }
  http.end();
}

// 🆕 ================== LED SYNC ==================

void syncLEDWithBackend() {
  if (WiFi.status() != WL_CONNECTED) return;

  HTTPClient http;
  String url = String(backend_url) + "/api/sessions/" +
               String(session_id) + "/kitchen-puzzles/state";

  http.begin(url);
  http.setTimeout(3000);
  int code = http.GET();

  if (code == 200) {
    String response = http.getString();
    
    Serial.println("🔄 [LED SYNC] Response: " + response);
    
    // ✅ FIX: Usa led_states non status (backend fornisce già colore finale)
    
    // Parse Fornelli LED color
    int fornelliIdx = response.indexOf("\"fornelli\"", response.indexOf("\"led_states\""));
    if (fornelliIdx > 0) {
      if (response.indexOf("\"green\"", fornelliIdx) > 0 && response.indexOf("\"green\"", fornelliIdx) < fornelliIdx + 20) {
        digitalWrite(LED2_VERDE, HIGH);
        digitalWrite(LED2_ROSSO, LOW);
      } else if (response.indexOf("\"red\"", fornelliIdx) > 0 && response.indexOf("\"red\"", fornelliIdx) < fornelliIdx + 20) {
        digitalWrite(LED2_ROSSO, HIGH);
        digitalWrite(LED2_VERDE, LOW);
      } else {
        // off
        digitalWrite(LED2_ROSSO, LOW);
        digitalWrite(LED2_VERDE, LOW);
      }
    }
    
    // Parse Frigo LED color
    int frigoIdx = response.indexOf("\"frigo\"", response.indexOf("\"led_states\""));
    if (frigoIdx > 0) {
      if (response.indexOf("\"green\"", frigoIdx) > 0 && response.indexOf("\"green\"", frigoIdx) < frigoIdx + 20) {
        digitalWrite(LED3_VERDE, HIGH);
        digitalWrite(LED3_ROSSO, LOW);
      } else if (response.indexOf("\"red\"", frigoIdx) > 0 && response.indexOf("\"red\"", frigoIdx) < frigoIdx + 20) {
        digitalWrite(LED3_ROSSO, HIGH);
        digitalWrite(LED3_VERDE, LOW);
      } else {
        // off
        digitalWrite(LED3_ROSSO, LOW);
        digitalWrite(LED3_VERDE, LOW);
      }
    }
    
    // Parse Serra LED color
    int serraIdx = response.indexOf("\"serra\"", response.indexOf("\"led_states\""));
    if (serraIdx > 0) {
      if (response.indexOf("\"green\"", serraIdx) > 0 && response.indexOf("\"green\"", serraIdx) < serraIdx + 20) {
        digitalWrite(LED4_VERDE, HIGH);
        digitalWrite(LED4_ROSSO, LOW);
        digitalWrite(STRIP_LED, HIGH);
      } else if (response.indexOf("\"red\"", serraIdx) > 0 && response.indexOf("\"red\"", serraIdx) < serraIdx + 20) {
        digitalWrite(LED4_ROSSO, HIGH);
        digitalWrite(LED4_VERDE, LOW);
      } else {
        // off
        digitalWrite(LED4_ROSSO, LOW);
        digitalWrite(LED4_VERDE, LOW);
        digitalWrite(STRIP_LED, LOW);
      }
    }
    
  } else {
    Serial.println("❌ [LED SYNC] HTTP " + String(code));
  }
  
  http.end();
}

// ================== LED PORTA ==================

void aggiornaLEDPorta() {
  if (allRoomsComplete) {
    digitalWrite(LED1_VERDE, HIGH);
    digitalWrite(LED1_ROSSO, LOW);
    servoPorta.write(0);
  } else if (kitchenComplete) {
    digitalWrite(LED1_ROSSO, millis() % 1000 < 500);
    digitalWrite(LED1_VERDE, LOW);
    servoPorta.write(90);
  } else {
    digitalWrite(LED1_ROSSO, HIGH);
    digitalWrite(LED1_VERDE, LOW);
    servoPorta.write(90);
  }
}

// ================== AUDIO ==================

int misuraAmpiezza() {
  unsigned long s = millis();
  int minV = 4095, maxV = 0;
  while (millis() - s < FINESTRA_MS) {
    int v = analogRead(MIC_PIN);
    minV = min(minV, v);
    maxV = max(maxV, v);
  }
  return maxV - minV;
}

int calibraRumore() {
  unsigned long s = millis();
  long sum = 0; int n = 0;
  while (millis() - s < CALIBRA_MS) {
    sum += misuraAmpiezza();
    n++;
    delay(20);
  }
  return n ? sum / n : 0;
}

bool rilevaBattito() {
  return misuraAmpiezza() >= (rumoreFondo + MARGINE_BATTITO);
}

// ================== RESET ==================

void resetCucina() {
  stato = FORNELLI;
  kitchenComplete = false;
  allRoomsComplete = false;

  // ⚠️ NON impostiamo LED qui - li lascia fare a syncLEDWithBackend()
  // Così i LED si sincronizzano SUBITO con database (frigo/serra OFF all'inizio)
  
  servoPorta.write(90);
  servoFrigo.write(90);
  digitalWrite(STRIP_LED, LOW);
}

// ================== ANTA MOBILE ==================

// Track previous MAG1 state
bool prevMAG1State = HIGH;

void checkAntaMobile() {
  bool currentMAG1 = digitalRead(MAG1);
  
  // Detect transition (LOW = anta aperta, HIGH = anta chiusa)
  if (currentMAG1 != prevMAG1State) {
    prevMAG1State = currentMAG1;
    
    Serial.print("🗄️ Anta mobile ");
    Serial.println(currentMAG1 == LOW ? "APERTA" : "CHIUSA");
    
    // Trigger animation via backend
    String url = String(backend_url) + "/api/sessions/" + String(session_id) + 
                 "/kitchen-puzzles/anta/toggle";
    Serial.println("📤 " + url);
    
    HTTPClient http;
    http.begin(url);
    http.setTimeout(5000);
    int code = http.POST("{}");
    
    if (code == 200) {
      Serial.println("✅ HTTP 200 OK");
    } else {
      Serial.println("❌ HTTP " + String(code) + ": " + http.getString());
    }
    http.end();
    
    delay(500); // Debounce
  }
}

// ================== SETUP ==================

void setup() {
  Serial.begin(115200);

  pinMode(MAG1, INPUT_PULLUP);
  pinMode(MAG2, INPUT_PULLUP);
  pinMode(STRIP_LED, OUTPUT);

  pinMode(LED1_VERDE, OUTPUT);
  pinMode(LED1_ROSSO, OUTPUT);
  pinMode(LED2_VERDE, OUTPUT);
  pinMode(LED2_ROSSO, OUTPUT);
  pinMode(LED3_VERDE, OUTPUT);
  pinMode(LED3_ROSSO, OUTPUT);
  pinMode(LED4_VERDE, OUTPUT);
  pinMode(LED4_ROSSO, OUTPUT);

  servoPorta.attach(SERVO_PORTA);
  servoFrigo.attach(SERVO_FRIGO);

  Serial.println("🔌 Connessione WiFi...");
  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid, password);
  
  unsigned long startTime = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - startTime < 15000) {
    delay(300);
    Serial.print(".");
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n✅ WiFi connesso!");
    Serial.print("📍 IP: ");
    Serial.println(WiFi.localIP());
    Serial.print("📶 RSSI: ");
    Serial.print(WiFi.RSSI());
    Serial.println(" dBm");
  } else {
    Serial.println("\n❌ WiFi timeout! Riavvio...");
    ESP.restart();
  }

  rumoreFondo = calibraRumore();
  Serial.print("🎤 Rumore di fondo calibrato: ");
  Serial.println(rumoreFondo);
  
  resetCucina();
  
  // Initial LED sync
  syncLEDWithBackend();
  
  Serial.println("✅ Sistema avviato!");
}

// ================== LOOP ==================

void loop() {
  // 🆕 LED SYNC ogni 2 secondi
  if (millis() - lastLEDSyncTime > LED_SYNC_INTERVAL) {
    syncLEDWithBackend();
    lastLEDSyncTime = millis();
  }
  
  // Game completion polling ogni 5 secondi
  if (millis() - lastPollTime > POLL_INTERVAL) {
    checkGameCompletion();
    lastPollTime = millis();
  }

  aggiornaLEDPorta();
  
  // 🆕 Check anta mobile per animazione
  checkAntaMobile();

  switch (stato) {

    case FORNELLI:
      // ✅ ESP32 FA TUTTO: Animation + Complete automatico
      if (digitalRead(MAG2) == LOW) {
        Serial.println("🍲 Pentola rilevata su fornelli!");
        
        // 1. Trigger animazione nel gioco
        String url = String(backend_url) + "/api/sessions/" + String(session_id) + 
                     "/kitchen-puzzles/fornelli/animation-trigger";
        HTTPClient http;
        http.begin(url);
        http.POST("{}");
        http.end();
        
        Serial.println("🎬 Animazione pentola triggerata!");
        delay(1000); // Pausa per vedere animazione
        
        // 2. Completa puzzle AUTOMATICAMENTE
        if (notificaFornelli()) {
          Serial.println("✅ Fornelli completati! Aspetto LED sync...");
          
          // ⚠️ ASPETTA LED SYNC prima di avanzare stato
          // Polling aggiorna LED ogni 2s, diamo tempo
          delay(3000);
          
          Serial.println("🟢 Avanzamento a stato FRIGO");
          stato = FRIGO;
        }
        
        delay(1000); // Debounce MAG2
      }
      break;

    case FRIGO:
      // ✅ Apri servo + Complete automatico
      servoFrigo.write(0);
      Serial.println("🚪 Frigo aperto!");
      delay(2000);
      
      // Completa automaticamente
      if (notificaFrigo()) {
        Serial.println("✅ Frigo completato automaticamente!");
        stato = SERRA;
      }
      break;

    case SERRA:
      // ✅ Microfono: Animation + Complete automatico
      if (rilevaBattito()) {
        Serial.println("🌿 Battito rilevato!");
        
        // 1. Trigger animation neon
        String url = String(backend_url) + "/api/sessions/" + String(session_id) + 
                     "/kitchen-puzzles/serra/animation-trigger";
        HTTPClient http;
        http.begin(url);
        http.POST("{}");
        http.end();
        
        Serial.println("💡 Animazione neon triggerata!");
        delay(500); // Pausa per animazione
        
        // 2. Completa puzzle AUTOMATICAMENTE
        if (notificaSerra()) {
          Serial.println("✅ Serra completata automaticamente!");
          digitalWrite(STRIP_LED, HIGH);
          kitchenComplete = true;
          stato = COMPLETATO;
        }
      }
      break;

    case COMPLETATO:
      break;
  }

  delay(50);
}
