/* =========================================
   ESP32 ESTERNO - RASPBERRY PI VERSION
   IP Backend/MQTT: 192.168.8.10
   Fotocellula → Servo + MQTT + LED Bicolore
   ========================================= */

#include <ESP32Servo.h>
#include <WiFi.h>
#include <PubSubClient.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

// ===== WIFI & MQTT & BACKEND =====
const char* ssid = "escape";
const char* password = "";  // Rete senza password
const char* mqtt_server = "192.168.8.10";  // ✅ Raspberry Pi
const char* backend_url = "http://192.168.8.10:8001";  // ✅ Raspberry Pi

// Session ID dinamico
int session_id = 999;

WiFiClient espClient;
PubSubClient client(espClient);

// ===== PIN LED BICOLORE =====
#define LED_CANCELLO_VERDE   4
#define LED_CANCELLO_ROSSO   16
#define LED_PORTA_VERDE      33
#define LED_PORTA_ROSSO      25

// ===== PIN SENSORI & SERVO =====
#define IR_PIN       19
#define SERVO_DX     5
#define SERVO_SX     17
#define SERVO_PORTA  18
#define SERVO_TETTO  32

// ===== PIN RGB =====
#define RGB_R  21
#define RGB_G  22
#define RGB_B  23

// ===== SERVO =====
Servo cancelloDX, cancelloSX, porta, tetto;

// ===== POSIZIONI =====
int posCancelli = 0;
int posPorta = 0;
int posTetto = 0;

const int CANCELLO_OPEN = 90;
const int PORTA_OPEN = 90;
const int TETTO_OPEN = 180;

// ===== TIMING =====
unsigned long tServo = 0;
unsigned long tRGB = 0;
unsigned long tMQTT = 0;

// ===== RGB FESTA =====
int festaStep = 0;

// ===== STATO =====
bool irLibero = false;
bool gameWon = false;

// ===== FETCH SESSION ID =====
int fetchActiveSessionId() {
  if (WiFi.status() != WL_CONNECTED) return 999;
  
  HTTPClient http;
  String url = String(backend_url) + "/api/sessions/active";
  
  http.begin(url);
  http.setTimeout(5000);
  int httpCode = http.GET();
  
  if (httpCode == 200) {
    String payload = http.getString();
    StaticJsonDocument<512> doc;
    if (!deserializeJson(doc, payload)) {
      int sessionId = doc["id"].as<int>();
      http.end();
      return sessionId;
    }
  }
  
  http.end();
  return 999;
}

// ===== MQTT CALLBACK =====
void callback(char* topic, byte* payload, unsigned int length) {
  String message = "";
  for (unsigned int i = 0; i < length; i++) {
    message += (char)payload[i];
  }
  
  if (strcmp(topic, "escape/game-completion/won") == 0) {
    gameWon = (message == "true" || message == "1");
    Serial.print("🏆 Vittoria: ");
    Serial.println(gameWon ? "SÌ 🎊" : "NO");
  }
}

void setup_wifi() {
  Serial.print("📡 WiFi: ");
  Serial.println(ssid);
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\n✅ Connesso!");
  Serial.println(WiFi.localIP());
}

void reconnect() {
  while (!client.connected()) {
    Serial.print("🔌 MQTT...");
    String clientId = "ESP32-Esterno-";
    clientId += String(random(0xffff), HEX);
    
    if (client.connect(clientId.c_str())) {
      Serial.println(" ✅");
      client.subscribe("escape/game-completion/won");
    } else {
      Serial.println(" ❌ Riprovo...");
      delay(5000);
    }
  }
}

void publishMQTT() {
  String base = "escape/esterno/" + String(session_id) + "/";
  client.publish((base + "led/stato").c_str(), irLibero ? "VERDE" : "ROSSO");
  client.publish((base + "ir-sensor/stato").c_str(), irLibero ? "LIBERO" : "OCCUPATO");
}

void setup() {
  Serial.begin(115200);
  Serial.println("\n=================================");
  Serial.println("ESP32 ESTERNO - RASPBERRY PI");
  Serial.println("=================================");

  pinMode(IR_PIN, INPUT_PULLUP);
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

  Serial.print("Backend: ");
  Serial.println(backend_url);

  setup_wifi();
  
  Serial.println("🔍 Fetch Session ID...");
  session_id = fetchActiveSessionId();
  Serial.print("🎯 Session ID: ");
  Serial.println(session_id);
  
  client.setServer(mqtt_server, 1883);
  client.setCallback(callback);

  Serial.println("✅ Sistema pronto!\n");
}

void loop() {
  unsigned long now = millis();

  if (!client.connected()) reconnect();
  client.loop();

  irLibero = (digitalRead(IR_PIN) == HIGH);

  // LED Cancello
  if (irLibero) {
    digitalWrite(LED_CANCELLO_VERDE, HIGH);
    digitalWrite(LED_CANCELLO_ROSSO, LOW);
  } else {
    digitalWrite(LED_CANCELLO_VERDE, LOW);
    digitalWrite(LED_CANCELLO_ROSSO, HIGH);
  }
  
  // LED Porta
  if (posPorta > 0) {
    digitalWrite(LED_PORTA_VERDE, HIGH);
    digitalWrite(LED_PORTA_ROSSO, LOW);
  } else {
    digitalWrite(LED_PORTA_VERDE, LOW);
    digitalWrite(LED_PORTA_ROSSO, HIGH);
  }

  // Servo Smooth
  if (now - tServo >= 15) {
    tServo = now;

    if (irLibero) {
      if (posCancelli < CANCELLO_OPEN) posCancelli++;
      if (posPorta < PORTA_OPEN) posPorta++;
      if (posTetto < TETTO_OPEN) posTetto++;
    } else {
      if (posCancelli > 0) posCancelli--;
      if (posPorta > 0) posPorta--;
      if (posTetto > 0) posTetto--;
    }

    cancelloDX.write(posCancelli);
    cancelloSX.write(posCancelli);
    porta.write(posPorta);
    tetto.write(posTetto);
  }

  // RGB Festa
  if (gameWon) {
    if (now - tRGB >= 120) {
      tRGB = now;
      festaStep++;

      switch (festaStep % 6) {
        case 0: analogWrite(RGB_R, 255); analogWrite(RGB_G, 0); analogWrite(RGB_B, 0); break;
        case 1: analogWrite(RGB_R, 0); analogWrite(RGB_G, 255); analogWrite(RGB_B, 0); break;
        case 2: analogWrite(RGB_R, 0); analogWrite(RGB_G, 0); analogWrite(RGB_B, 255); break;
        case 3: analogWrite(RGB_R, 255); analogWrite(RGB_G, 255); analogWrite(RGB_B, 0); break;
        case 4: analogWrite(RGB_R, 255); analogWrite(RGB_G, 0); analogWrite(RGB_B, 255); break;
        case 5: analogWrite(RGB_R, 0); analogWrite(RGB_G, 255); analogWrite(RGB_B, 255); break;
      }
    }
  } else {
    analogWrite(RGB_R, 0);
    analogWrite(RGB_G, 0);
    analogWrite(RGB_B, 0);
  }

  // MQTT Publish
  if (now - tMQTT >= 500) {
    tMQTT = now;
    publishMQTT();
  }
}
