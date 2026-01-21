/* =========================================
   ESP32 ESTERNO - DEBUG VERSION
   IP Backend/MQTT: 192.168.8.10
   Fotocellula → Servo + MQTT + LED Bicolore
   
   🐛 DEBUG: Stampe dettagliate MQTT & gameWon
   ========================================= */

#include <ESP32Servo.h>
#include <WiFi.h>
#include <PubSubClient.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

// ===== WIFI & MQTT & BACKEND =====
const char* ssid = "escape";
const char* password = "";  // rete aperta
const char* mqtt_server = "192.168.8.10";
const char* backend_url = "http://192.168.8.10:8001";

// ===== SESSION =====
int session_id = 999;

// ===== CLIENT =====
WiFiClient espClient;
PubSubClient client(espClient);

// ===== LED BICOLORE =====
#define LED_CANCELLO_VERDE   4
#define LED_CANCELLO_ROSSO   16
#define LED_PORTA_VERDE      33
#define LED_PORTA_ROSSO      25

// ===== SENSORI & SERVO =====
#define IR_PIN       19

#define SERVO_DX     5
#define SERVO_SX     17
#define SERVO_PORTA  18
#define SERVO_TETTO  14   // ✅ PIN CORRETTO (aggiornato da P32)

// ===== RGB =====
#define RGB_R  21
#define RGB_G  22
#define RGB_B  23

// ===== SERVO OGGETTI =====
Servo cancelloDX;
Servo cancelloSX;
Servo porta;
Servo tetto;

// ===== POSIZIONI =====
int posCancelli = 0;
int posPorta = 0;
int posTetto = 0;

const int CANCELLO_OPEN = 90;
const int PORTA_OPEN    = 90;
const int TETTO_OPEN    = 180;

// ===== TIMING =====
unsigned long tServo = 0;
unsigned long tRGB   = 0;
unsigned long tMQTT  = 0;
unsigned long tDebug = 0;  // 🐛 DEBUG

// ===== RGB FESTA =====
int festaStep = 0;

// ===== STATO =====
bool irLibero = false;
bool gameWon  = false;

// 🐛 DEBUG COUNTERS
int mqttCallbackCount = 0;
int gameWonSetCount = 0;

// =================================================
// FETCH SESSION ID ATTIVA
// =================================================
int fetchActiveSessionId() {
  if (WiFi.status() != WL_CONNECTED) return 999;

  HTTPClient http;
  String url = String(backend_url) + "/api/sessions/active";

  http.begin(url);
  http.setTimeout(5000);
  int httpCode = http.GET();

  if (httpCode == 200) {
    StaticJsonDocument<512> doc;
    if (!deserializeJson(doc, http.getString())) {
      int id = doc["id"].as<int>();
      http.end();
      Serial.print("✅ Session ID fetched: ");
      Serial.println(id);
      return id;
    }
  }

  http.end();
  Serial.println("❌ Fetch session failed, using 999");
  return 999;
}

// =================================================
// MQTT CALLBACK - DEBUG VERSION
// =================================================
void callback(char* topic, byte* payload, unsigned int length) {
  mqttCallbackCount++;
  
  String msg;
  for (unsigned int i = 0; i < length; i++) msg += (char)payload[i];

  // 🐛 DEBUG: Stampa TUTTI i messaggi MQTT ricevuti
  Serial.println("\n════════════════════════════════");
  Serial.print("🐛 MQTT [#");
  Serial.print(mqttCallbackCount);
  Serial.println("]");
  Serial.print("   Topic: ");
  Serial.println(topic);
  Serial.print("   Payload: [");
  Serial.print(msg);
  Serial.println("]");
  Serial.print("   Length: ");
  Serial.println(length);

  if (strcmp(topic, "escape/game-completion/won") == 0) {
    bool prevGameWon = gameWon;
    gameWon = (msg == "true" || msg == "1");
    
    if (gameWon && !prevGameWon) {
      gameWonSetCount++;
      Serial.println("🏆🎊 GAME WON ATTIVATO! 🎊🏆");
    } else if (!gameWon && prevGameWon) {
      Serial.println("🔄 Game won RESETTATO");
    }
    
    Serial.print("   gameWon: ");
    Serial.println(gameWon ? "TRUE ✅" : "FALSE ❌");
  } else {
    Serial.println("   ⚠️ Topic NON riconosciuto");
  }
  Serial.println("════════════════════════════════\n");
}

// =================================================
// WIFI
// =================================================
void setup_wifi() {
  Serial.print("📡 WiFi: ");
  Serial.println(ssid);

  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(400);
    Serial.print(".");
  }

  Serial.println("\n✅ WiFi connesso");
  Serial.print("IP: ");
  Serial.println(WiFi.localIP());
}

// =================================================
// MQTT RECONNECT
// =================================================
void reconnect() {
  while (!client.connected()) {
    Serial.print("🔌 MQTT...");
    String clientId = "ESP32-ESTERNO-DEBUG-" + String(random(0xffff), HEX);

    if (client.connect(clientId.c_str())) {
      Serial.println(" OK");
      client.subscribe("escape/game-completion/won");
      Serial.println("📢 Subscribed to: escape/game-completion/won");
    } else {
      Serial.print(" FAIL (rc=");
      Serial.print(client.state());
      Serial.println(")");
      delay(3000);
    }
  }
}

// =================================================
// MQTT PUBLISH
// =================================================
void publishMQTT() {
  String base = "escape/esterno/" + String(session_id) + "/";
  client.publish((base + "ir").c_str(), irLibero ? "LIBERO" : "OCCUPATO");
  client.publish((base + "led").c_str(), irLibero ? "VERDE" : "ROSSO");
}

// =================================================
// SETUP
// =================================================
void setup() {
  Serial.begin(115200);
  delay(1000);
  
  Serial.println("\n\n");
  Serial.println("╔════════════════════════════════════╗");
  Serial.println("║  ESP32 ESTERNO - DEBUG VERSION    ║");
  Serial.println("╚════════════════════════════════════╝");

  pinMode(IR_PIN, INPUT);

  pinMode(LED_CANCELLO_VERDE, OUTPUT);
  pinMode(LED_CANCELLO_ROSSO, OUTPUT);
  pinMode(LED_PORTA_VERDE, OUTPUT);
  pinMode(LED_PORTA_ROSSO, OUTPUT);

  pinMode(RGB_R, OUTPUT);
  pinMode(RGB_G, OUTPUT);
  pinMode(RGB_B, OUTPUT);

  cancelloDX.attach(SERVO_DX, 500, 2400);
  cancelloSX.attach(SERVO_SX, 500, 2400);
  porta.attach(SERVO_PORTA, 500, 2400);
  tetto.attach(SERVO_TETTO, 500, 2500);

  cancelloDX.write(0);
  cancelloSX.write(0);
  porta.write(0);
  tetto.write(0);

  setup_wifi();

  Serial.println("🔍 Fetch session...");
  session_id = fetchActiveSessionId();
  Serial.print("🎯 Session ID: ");
  Serial.println(session_id);

  client.setServer(mqtt_server, 1883);
  client.setCallback(callback);

  Serial.println("✅ ESP32 ESTERNO DEBUG PRONTO\n");
  Serial.println("🐛 Waiting for MQTT messages...\n");
}

// =================================================
// LOOP
// =================================================
void loop() {
  unsigned long now = millis();

  if (!client.connected()) reconnect();
  client.loop();

  irLibero = (digitalRead(IR_PIN) == HIGH);

  // ===== LED CANCELLO =====
  digitalWrite(LED_CANCELLO_VERDE, irLibero);
  digitalWrite(LED_CANCELLO_ROSSO, !irLibero);

  // ===== LED PORTA =====
  digitalWrite(LED_PORTA_VERDE, posPorta > 0);
  digitalWrite(LED_PORTA_ROSSO, posPorta == 0);

  // ===== SERVO SMOOTH =====
  if (now - tServo >= 15) {
    tServo = now;

    if (irLibero) {
      if (posCancelli < CANCELLO_OPEN) posCancelli++;
      if (posPorta    < PORTA_OPEN)    posPorta++;
      if (posTetto    < TETTO_OPEN)    posTetto++;
    } else {
      if (posCancelli > 0) posCancelli--;
      if (posPorta    > 0) posPorta--;
      if (posTetto    > 0) posTetto--;
    }

    cancelloDX.write(posCancelli);
    cancelloSX.write(CANCELLO_OPEN - posCancelli); // specchiato
    porta.write(posPorta);
    tetto.write(posTetto);
  }

  // ===== RGB FESTA - DEBUG VERSION =====
  if (gameWon) {
    if (now - tRGB >= 300) {  // 300ms invece di 120ms per vedere meglio
      tRGB = now;
      festaStep++;

      int r, g, b;
      switch (festaStep % 6) {
        case 0: r=255; g=0;   b=0;   break; // ROSSO
        case 1: r=0;   g=255; b=0;   break; // VERDE
        case 2: r=0;   g=0;   b=255; break; // BLU
        case 3: r=255; g=255; b=0;   break; // GIALLO
        case 4: r=255; g=0;   b=255; break; // MAGENTA
        case 5: r=0;   g=255; b=255; break; // CIANO
      }
      
      analogWrite(RGB_R, r);
      analogWrite(RGB_G, g);
      analogWrite(RGB_B, b);
      
      // 🐛 DEBUG: Stampa valori RGB scritti
      if (festaStep % 6 == 0) {  // Stampa solo ogni ciclo completo
        Serial.print("🎨 RGB Step ");
        Serial.print(festaStep);
        Serial.print(": R=");
        Serial.print(r);
        Serial.print(" G=");
        Serial.print(g);
        Serial.print(" B=");
        Serial.println(b);
      }
    }
  } else {
    // gameWon = false → RGB spento
    analogWrite(RGB_R, 0);
    analogWrite(RGB_G, 0);
    analogWrite(RGB_B, 0);
  }

  // ===== MQTT =====
  if (now - tMQTT >= 500) {
    tMQTT = now;
    publishMQTT();
  }

  // 🐛 DEBUG: Stampa periodica stato gameWon
  if (now - tDebug >= 3000) {
    tDebug = now;
    Serial.print("📊 Status: gameWon=");
    Serial.print(gameWon ? "TRUE ✅" : "FALSE ❌");
    Serial.print(" | MQTT calls=");
    Serial.print(mqttCallbackCount);
    Serial.print(" | gameWon activations=");
    Serial.print(gameWonSetCount);
    Serial.print(" | IR=");
    Serial.println(irLibero ? "LIBERO" : "OCCUPATO");
  }
}