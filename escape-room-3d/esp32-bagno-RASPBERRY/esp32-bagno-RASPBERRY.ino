/* =====================================================
   ESP32 BAGNO - RASPBERRY PI - LED ONLY VERSION
   IP Backend: 192.168.8.10:8001
   
   HARDWARE PIN MAPPING (SOLO LED):
   - LED PORTA BAGNO: P4 (verde) + P16 (rosso) - Sistema GLOBALE
   - LED SPECCHIO: P17 (verde) + P5 (rosso) + P33 (bianco) - Puzzle locale
   - LED PORTA-FINESTRA: P18 (verde) + P19 (rosso) - Puzzle locale
   - LED VENTOLA: P21 (verde) + P22 (rosso) - Puzzle locale
   
   FUNZIONALITÀ:
   - Polling LED porta bagno (red/blinking/green)
   - Polling stato 3 puzzle locali
   - LED bianco specchio si accende quando completato
   ===================================================== */

#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

// ================= WIFI =================
const char* ssid     = "escape";
const char* password = "";  // Rete senza password

// ================= BACKEND RASPBERRY PI =================
const char* backend_url = "http://192.168.8.10:8001";

// Session ID dinamico
int session_id = 999;

// ================== PIN OUTPUT (LED) ==================
// LED PORTA BAGNO (Sistema GLOBALE - game_completion)
#define LED_PORTA_GREEN 4   // P4 - Verde
#define LED_PORTA_RED   16  // P16 - Rosso

// LED SPECCHIO (puzzle locale - con LED bianco)
#define LED_SPECCHIO_GREEN 17  // P17 - Verde
#define LED_SPECCHIO_RED   5   // P5 - Rosso
#define LED_SPECCHIO_WHITE 33  // P33 - Bianco (si accende quando completato)

// LED PORTA-FINESTRA (puzzle locale)
#define LED_PORTAFINESTRA_GREEN 18  // P18 - Verde
#define LED_PORTAFINESTRA_RED   19  // P19 - Rosso

// LED VENTOLA (puzzle locale)
#define LED_VENTOLA_GREEN 21  // P21 - Verde
#define LED_VENTOLA_RED   22  // P22 - Rosso

// ================== STATO LED PORTA (Blinking) ==================
String doorLedState = "red";  // Stati: "red", "blinking", "green"
unsigned long lastBlinkTime = 0;
bool blinkState = false;
const unsigned long BLINK_INTERVAL = 500;  // 500ms ON/OFF

// ================== STATO LOCALE PUZZLES ==================
String specchioStatus = "active";      // Stati: active, done
String portafinestraStatus = "locked"; // Stati: locked, active, done
String ventolaStatus = "locked";       // Stati: locked, active, done

// ================== POLLING TIMERS ==================
unsigned long lastDoorLedCheck = 0;
unsigned long lastLocalPuzzleCheck = 0;
unsigned long lastStatusPrint = 0;
const unsigned long POLLING_INTERVAL = 2000;  // 2 secondi
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

// ================== UPDATE LED FUNCTIONS ==================

void updateDualColorLED(int greenPin, int redPin, String state) {
  /*
   * state può essere:
   * - "off" o "locked" → entrambi LED OFF
   * - "red" o "active" → LED rosso ON, verde OFF
   * - "green" o "completed" o "done" → LED verde ON, rosso OFF
   */
  
  if (state == "off" || state == "locked") {
    digitalWrite(greenPin, LOW);
    digitalWrite(redPin, LOW);
  } else if (state == "red" || state == "active") {
    digitalWrite(greenPin, LOW);
    digitalWrite(redPin, HIGH);
  } else if (state == "green" || state == "completed" || state == "done") {
    digitalWrite(greenPin, HIGH);
    digitalWrite(redPin, LOW);
  }
}

void updateDoorLED() {
  /*
   * LED PORTA con supporto BLINKING
   * Stati possibili:
   * - "red" → Rosso fisso (0 stanze completate)
   * - "blinking" → Verde blinking 500ms (1-3 stanze completate)
   * - "green" → Verde fisso (4 stanze completate - VITTORIA!)
   */
  
  if (doorLedState == "red") {
    // Rosso fisso
    digitalWrite(LED_PORTA_GREEN, LOW);
    digitalWrite(LED_PORTA_RED, HIGH);
    
  } else if (doorLedState == "blinking") {
    // Verde blinking locale (500ms)
    unsigned long now = millis();
    if (now - lastBlinkTime >= BLINK_INTERVAL) {
      blinkState = !blinkState;
      lastBlinkTime = now;
    }
    
    if (blinkState) {
      digitalWrite(LED_PORTA_GREEN, HIGH);
      digitalWrite(LED_PORTA_RED, LOW);
    } else {
      digitalWrite(LED_PORTA_GREEN, LOW);
      digitalWrite(LED_PORTA_RED, LOW);
    }
    
  } else if (doorLedState == "green") {
    // Verde fisso - VITTORIA!
    digitalWrite(LED_PORTA_GREEN, HIGH);
    digitalWrite(LED_PORTA_RED, LOW);
  }
}

// ================== POLLING BACKEND - SISTEMA GLOBALE (LED PORTA) ==================

void checkDoorLedState() {
  unsigned long now = millis();
  if (now - lastDoorLedCheck < POLLING_INTERVAL) return;
  lastDoorLedCheck = now;
  
  // ✨ Endpoint GLOBALE - auto-resolve sessione attiva
  String endpoint = "/api/game-completion/door-leds";
  
  String response = getHTTP(endpoint.c_str());
  
  if (response.length() > 0) {
    StaticJsonDocument<512> doc;
    DeserializationError error = deserializeJson(doc, response);
    
    if (!error) {
      // Leggi stato LED porta del bagno
      const char* newState = doc["bagno"];
      
      if (newState != nullptr) {
        String newStateStr = String(newState);
        
        // Aggiorna solo se cambiato
        if (newStateStr != doorLedState) {
          String oldState = doorLedState;
          doorLedState = newStateStr;
          
          Serial.println("\n🚪 ===== LED PORTA BAGNO AGGIORNATO =====");
          Serial.print("   Stato precedente: ");
          Serial.println(oldState);
          Serial.print("   Nuovo stato: ");
          Serial.println(doorLedState);
          
          // Inizializza blinking se necessario
          if (doorLedState == "blinking") {
            blinkState = true;
            lastBlinkTime = millis();
            Serial.println("   💚 Modalità BLINKING attivata!");
          }
          
          updateDoorLED();
          Serial.println("   ✅ LED aggiornato immediatamente");
          Serial.println("==========================================\n");
        }
      }
    } else {
      Serial.println("❌ Errore parsing JSON door-leds response");
    }
  }
}

// ================== POLLING BACKEND - SISTEMA LOCALE (PUZZLES BAGNO) ==================

void checkLocalPuzzleState() {
  unsigned long now = millis();
  if (now - lastLocalPuzzleCheck < POLLING_INTERVAL) return;
  lastLocalPuzzleCheck = now;
  
  String endpoint = "/api/sessions/" + String(session_id) + "/bathroom-puzzles/state";
  String response = getHTTP(endpoint.c_str());
  
  if (response.length() > 0) {
    StaticJsonDocument<1024> doc;
    DeserializationError error = deserializeJson(doc, response);
    
    if (!error) {
      // SPECCHIO Status - Gestisce 3 LED (dual-color + bianco)
      const char* specchioSt = doc["states"]["specchio"]["status"];
      if (specchioSt != nullptr) {
        String newSpecchioStatus = String(specchioSt);
        if (newSpecchioStatus != specchioStatus) {
          specchioStatus = newSpecchioStatus;
          
          // Aggiorna LED SPECCHIO dual-color (P17/P5) e bianco (P33)
          if (specchioStatus == "done") {
            // Specchio completato: VERDE + BIANCO
            digitalWrite(LED_SPECCHIO_GREEN, HIGH);
            digitalWrite(LED_SPECCHIO_RED, LOW);
            digitalWrite(LED_SPECCHIO_WHITE, HIGH);
            
            Serial.println("\n🪞 SPECCHIO COMPLETATO! ✨");
            Serial.println("   LED P17 (verde): ON");
            Serial.println("   LED P5 (rosso): OFF");
            Serial.println("   LED P33 (bianco): ON");
          } else {
            // Specchio active: ROSSO (stato iniziale)
            digitalWrite(LED_SPECCHIO_GREEN, LOW);
            digitalWrite(LED_SPECCHIO_RED, HIGH);
            digitalWrite(LED_SPECCHIO_WHITE, LOW);
            
            Serial.println("\n🪞 SPECCHIO ATTIVO 🔴");
            Serial.println("   LED P17 (verde): OFF");
            Serial.println("   LED P5 (rosso): ON");
            Serial.println("   LED P33 (bianco): OFF");
          }
        }
      }
      
      // PORTA-FINESTRA LED
      const char* portafineSt = doc["led_states"]["porta_finestra"];
      if (portafineSt != nullptr) {
        String newPortafinestraStatus = String(portafineSt);
        if (newPortafinestraStatus != portafinestraStatus) {
          portafinestraStatus = newPortafinestraStatus;
          updateDualColorLED(LED_PORTAFINESTRA_GREEN, LED_PORTAFINESTRA_RED, portafinestraStatus);
          
          Serial.print("🚪 Porta-Finestra LED: ");
          Serial.println(portafinestraStatus);
        }
      }
      
      // VENTOLA LED
      const char* ventolaSt = doc["led_states"]["ventola"];
      if (ventolaSt != nullptr) {
        String newVentolaStatus = String(ventolaSt);
        if (newVentolaStatus != ventolaStatus) {
          ventolaStatus = newVentolaStatus;
          updateDualColorLED(LED_VENTOLA_GREEN, LED_VENTOLA_RED, ventolaStatus);
          
          Serial.print("🌀 Ventola LED: ");
          Serial.println(ventolaStatus);
        }
      }
      
    } else {
      Serial.print("❌ JSON parse error: ");
      Serial.println(error.c_str());
    }
  }
}

// ================== PRINT STATUS PERIODICO ==================

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
  Serial.println(" secondi");
  Serial.println();
  
  Serial.println("   🚪 LED PORTA BAGNO:");
  Serial.print("      Stato: ");
  Serial.print(doorLedState);
  if (doorLedState == "blinking") {
    Serial.print(" (LAMPEGGIANTE - blinkState=");
    Serial.print(blinkState ? "ON" : "OFF");
    Serial.println(")");
  } else {
    Serial.println();
  }
  Serial.print("      GPIO P4 (verde): ");
  Serial.println(digitalRead(LED_PORTA_GREEN) ? "HIGH" : "LOW");
  Serial.print("      GPIO P16 (rosso): ");
  Serial.println(digitalRead(LED_PORTA_RED) ? "HIGH" : "LOW");
  Serial.println();
  
  Serial.println("   🪞 LED SPECCHIO:");
  Serial.print("      Status: ");
  Serial.println(specchioStatus);
  Serial.print("      GPIO P17 (verde): ");
  Serial.println(digitalRead(LED_SPECCHIO_GREEN) ? "HIGH" : "LOW");
  Serial.print("      GPIO P5 (rosso): ");
  Serial.println(digitalRead(LED_SPECCHIO_RED) ? "HIGH" : "LOW");
  Serial.print("      GPIO P33 (bianco): ");
  Serial.println(digitalRead(LED_SPECCHIO_WHITE) ? "HIGH ✨" : "LOW");
  Serial.println();
  
  Serial.println("   🚪 LED PORTA-FINESTRA:");
  Serial.print("      Status: ");
  Serial.println(portafinestraStatus);
  Serial.println();
  
  Serial.println("   🌀 LED VENTOLA:");
  Serial.print("      Status: ");
  Serial.println(ventolaStatus);
  
  Serial.println("=====================================\n");
}

// ================== SETUP ==================

void setup() {
  Serial.begin(115200);
  Serial.println("\n\n================================================");
  Serial.println("ESP32 BAGNO - RASPBERRY PI - LED ONLY");
  Serial.println("VERSION: Base LED System 🔧");
  Serial.println("================================================\n");

  // Configura pin OUTPUT (LED)
  pinMode(LED_PORTA_GREEN, OUTPUT);
  pinMode(LED_PORTA_RED, OUTPUT);
  pinMode(LED_SPECCHIO_GREEN, OUTPUT);
  pinMode(LED_SPECCHIO_RED, OUTPUT);
  pinMode(LED_SPECCHIO_WHITE, OUTPUT);
  pinMode(LED_PORTAFINESTRA_GREEN, OUTPUT);
  pinMode(LED_PORTAFINESTRA_RED, OUTPUT);
  pinMode(LED_VENTOLA_GREEN, OUTPUT);
  pinMode(LED_VENTOLA_RED, OUTPUT);
  
  // Stato iniziale LED
  digitalWrite(LED_PORTA_GREEN, LOW);
  digitalWrite(LED_PORTA_RED, HIGH);     // ✅ Porta inizia ROSSA
  
  // LED SPECCHIO inizia ROSSO
  digitalWrite(LED_SPECCHIO_GREEN, LOW);
  digitalWrite(LED_SPECCHIO_RED, HIGH);  // ✅ Specchio inizia ROSSO
  digitalWrite(LED_SPECCHIO_WHITE, LOW);
  
  // LED PORTA-FINESTRA e VENTOLA iniziano OFF (locked)
  digitalWrite(LED_PORTAFINESTRA_GREEN, LOW);
  digitalWrite(LED_PORTAFINESTRA_RED, LOW);
  digitalWrite(LED_VENTOLA_GREEN, LOW);
  digitalWrite(LED_VENTOLA_RED, LOW);
  
  Serial.println("📌 Pin configurati:");
  Serial.println("   LED PORTA: P4 (verde), P16 (rosso) → ROSSO iniziale ✅");
  Serial.println("   LED SPECCHIO: P17 (verde), P5 (rosso), P33 (bianco) → ROSSO iniziale ✅");
  Serial.println("   LED PORTA-FINESTRA: P18 (verde), P19 (rosso) → OFF");
  Serial.println("   LED VENTOLA: P21 (verde), P22 (rosso) → OFF");
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
  
  // ===== FETCH STATI INIZIALI =====
  Serial.println("\n🔄 Fetch stati iniziali...");
  delay(500);
  checkDoorLedState();
  delay(500);
  checkLocalPuzzleState();
  
  Serial.println("\n✅ Sistema LED pronto!");
  Serial.println("💡 Monitoraggio continuo LED bagno...\n");
}

// ================== LOOP ==================

void loop() {
  // ===== PRINT STATUS PERIODICO (ogni 10s) =====
  printCurrentStatus();
  
  // ===== POLLING LED PORTA (Sistema GLOBALE) =====
  checkDoorLedState();
  
  // ===== POLLING PUZZLES LOCALI =====
  checkLocalPuzzleState();
  
  // ===== UPDATE LED PORTA (gestisce blinking se necessario) =====
  updateDoorLED();
  
  delay(100);  // Loop delay
}