#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <ESP32Servo.h>
#include <PubSubClient.h>

/* =========================================
   ESP32 ESTERNO - VERSIONE COMPLETA CON MQTT
   Fotocellula + Animazione Cancello + MQTT
   ========================================= */

// ===== WIFI =====
const char* ssid     = "Vodafone-E23524170";  // ⬅️ CAMBIA PER EVENTO MANGO
const char* password = "JtnLtfg73NXgAt9r";    // ⬅️ CAMBIA PER EVENTO MANGO

// ===== BACKEND =====
const char* backend_url = "http://192.168.1.10:8001";  // ⬅️ CAMBIA PER EVENTO MANGO

// ===== MQTT =====
const char* mqtt_server = "192.168.1.10";  // ⬅️ CAMBIA PER EVENTO MANGO (stesso IP del backend)
const int mqtt_port = 1883;
const char* mqtt_client_id = "esp32-esterno";

// MQTT Topics
const char* TOPIC_IR_SENSOR = "escape/esterno/ir-sensor/stato";
const char* TOPIC_LED = "escape/esterno/led/stato";
const char* TOPIC_CANCELLO1 = "escape/esterno/cancello1/posizione";
const char* TOPIC_CANCELLO2 = "escape/esterno/cancello2/posizione";
const char* TOPIC_TETTO = "escape/esterno/tetto/posizione";
const char* TOPIC_PORTA = "escape/esterno/porta/posizione";

// ===== PIN =====
#define LED_VERDE   4
#define LED_ROSSO   16
#define IR_PIN      19   // LOW = OCCUPATO

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
unsigned long tMqtt  = 0;  // Timer per pubblicazione MQTT

// ===== RGB FESTA =====
int festaStep = 0;

// ===== STATO =====
bool irLibero = false;
bool irLiberoOld = false;  // Per rilevare cambiamenti

// ===== SESSION ID =====
int sessionId = 999;  // Default fallback

// ===== MQTT =====
WiFiClient espClient;
PubSubClient mqttClient(espClient);

// ===== FUNZIONI =====
void connectWiFi();
void connectMQTT();
int fetchActiveSessionId();
void publishMQTT();

void setup() {
  Serial.begin(115200);
  delay(1000);
  
  Serial.println("\n\n========================================");
  Serial.println("🎉 ESP32 ESTERNO - VERSIONE MQTT");
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
  
  // MQTT
  mqttClient.setServer(mqtt_server, mqtt_port);
  connectMQTT();
  
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
  Serial.println("\n✅ Sistema pronto!\n");
}

void loop() {
  unsigned long now = millis();

  // ===== MQTT KEEP-ALIVE =====
  if (!mqttClient.connected()) {
    connectMQTT();
  }
  mqttClient.loop();

  // ===== FOTOCELLULA =====
  // LOW = OCCUPATO → LIBERO = HIGH
  irLibero = (digitalRead(IR_PIN) == HIGH);

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
  if (irLibero) {
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
    // OCCUPATO → RGB SPENTO
    analogWrite(RGB_R, 0);
    analogWrite(RGB_G, 0);
    analogWrite(RGB_B, 0);
  }

  // ===== MQTT PUBLISHING =====
  // Pubblica ogni 500ms (2 Hz) - Sufficiente per UI smooth
  if (now - tMqtt >= 500) {
    tMqtt = now;
    publishMQTT();
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

// ===== CONNECT MQTT =====
void connectMQTT() {
  if (WiFi.status() != WL_CONNECTED) {
    return;
  }
  
  while (!mqttClient.connected()) {
    Serial.print("📡 Connessione MQTT a ");
    Serial.print(mqtt_server);
    Serial.print(":");
    Serial.print(mqtt_port);
    Serial.print("...");
    
    if (mqttClient.connect(mqtt_client_id)) {
      Serial.println(" ✅ CONNESSO");
      
      // Pubblica stato iniziale
      publishMQTT();
    } else {
      Serial.print(" ❌ FALLITO (rc=");
      Serial.print(mqttClient.state());
      Serial.println(") - Ritento tra 5s");
      delay(5000);
    }
  }
}

// ===== PUBLISH MQTT =====
void publishMQTT() {
  if (!mqttClient.connected()) return;
  
  // Pubblica stato fotocellula
  mqttClient.publish(TOPIC_IR_SENSOR, irLibero ? "LIBERO" : "OCCUPATO", true);
  
  // Pubblica stato LED
  mqttClient.publish(TOPIC_LED, irLibero ? "VERDE" : "ROSSO", true);
  
  // Pubblica posizioni servo
  char posBuffer[8];
  
  sprintf(posBuffer, "%d", posCancelli);
  mqttClient.publish(TOPIC_CANCELLO1, posBuffer, true);
  mqttClient.publish(TOPIC_CANCELLO2, posBuffer, true);  // Stesso valore per entrambe le ante
  
  sprintf(posBuffer, "%d", posTetto);
  mqttClient.publish(TOPIC_TETTO, posBuffer, true);
  
  sprintf(posBuffer, "%d", posPorta);
  mqttClient.publish(TOPIC_PORTA, posBuffer, true);
  
  // Log (solo su cambiamento stato fotocellula per non spammare)
  if (irLibero != irLiberoOld) {
    Serial.print("📤 MQTT: Fotocellula → ");
    Serial.println(irLibero ? "LIBERO" : "OCCUPATO");
    irLiberoOld = irLibero;
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
  }
