/* =========================================================================
   ESP32 CUCINA - CLOUD-FIRST STABLE VERSION
   
   FASE 2 - Stabilizzazione Hardware + Cloud MQTT
   
   FEATURES:
   ✅ WiFiManager captive portal (AP: EscapeRoom-Cucina)
   ✅ HiveMQ Cloud MQTT over TLS (porta 8883)
   ✅ Triple watchdog (WiFi + MQTT + Hardware)
   ✅ Heartbeat strutturato ogni 30s
   ✅ Reset remoto via MQTT
   ✅ Last Will & Testament
   ✅ Zero IP hardcoded
   ✅ Zero SSID hardcoded
   
   Hardware:
   - 4 LED bicolore sincronizzati via MQTT
   - MAG1 (GPIO 32): Anta mobile decorativa
   - MAG2 (GPIO 33): Pentola sui fornelli
   - Servo frigo (GPIO 26)
   - Microfono serra con calibrazione adattiva (GPIO 34)
   - Strip LED serra (GPIO 23)
   ========================================================================= */

#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <WiFiManager.h>
#include <esp_task_wdt.h>
#include <ESP32Servo.h>

// ========================================================================
// CONFIGURAZIONE
// ========================================================================

const char* MQTT_SERVER = "your-cluster.hivemq.cloud";
const int   MQTT_PORT = 8883;
const char* MQTT_USER = "escape_device";
const char* MQTT_PASS = "your_password";

#define DEVICE_ID "cucina"
#define SESSION_ID 999

#define WIFI_RESTART_TIMEOUT 120000
#define MQTT_RESTART_TIMEOUT 180000
#define WDT_TIMEOUT 120

#define HEARTBEAT_INTERVAL 30000
#define PORTAL_TIMEOUT 180

#define ALLOW_INSECURE_TLS 1

// ========================================================================
// PIN HARDWARE
// ========================================================================

// Sensori magnetici
#define MAG1 32   // Anta mobile
#define MAG2 33   // Pentola

// Servo frigo
#define SERVO_PIN 26

// Strip LED serra
#define STRIP_LED_PIN 23

// Microfono
#define MICROPHONE_PIN 34

// LED bicolore
#define LED1_VERDE 4    // Porta cucina
#define LED1_ROSSO 16
#define LED2_VERDE 17   // Fornelli (invertito fisicamente)
#define LED2_ROSSO 5
#define LED3_VERDE 18   // Frigo
#define LED3_ROSSO 19
#define LED4_VERDE 21   // Serra
#define LED4_ROSSO 22

// ========================================================================
// OGGETTI GLOBALI
// ========================================================================

WiFiClientSecure espClient;
PubSubClient client(espClient);
WiFiManager wifiManager;
Servo servoFrigo;

// ========================================================================
// STATO HARDWARE
// ========================================================================

String led1Color = "red";
String led2Color = "red";
String led3Color = "red";
String led4Color = "red";

bool prevMag1 = HIGH;
bool prevMag2 = HIGH;
bool servoIsClosed = false;
bool stripLedOn = false;

unsigned long lastBlinkTime = 0;
bool blinkState = false;
const unsigned long BLINK_INTERVAL = 500;

// ========================================================================
// MICROFONO (CALIBRAZIONE ADATTIVA)
// ========================================================================

float baselineNoise = 0;
const int BASELINE_SAMPLES = 50;
const float BASELINE_ALPHA = 0.98;
const int PEAK_MARGIN = 800;
const int MIN_THRESHOLD = 500;
const int MAX_THRESHOLD = 3500;

unsigned long lastPeakTime = 0;
const unsigned long PEAK_COOLDOWN = 2000;

// ========================================================================
// TIMING & WATCHDOG
// ========================================================================

unsigned long tHeartbeat = 0;
unsigned long lastMicCheck = 0;
const unsigned long MIC_CHECK_INTERVAL = 100;

enum WiFiWatchdogState { WIFI_OK, WIFI_RECONNECTING };
enum MQTTWatchdogState { MQTT_OK, MQTT_RECONNECTING };

WiFiWatchdogState wifiWdState = WIFI_OK;
MQTTWatchdogState mqttWdState = MQTT_OK;

unsigned long wifiDisconnectTime = 0;
unsigned long mqttDisconnectTime = 0;
unsigned long mqttLastReconnectAttempt = 0;

// ========================================================================
// MQTT CALLBACK
// ========================================================================

void mqttCallback(char* topic, byte* payload, unsigned int length) {
  String topicStr = String(topic);
  String message = "";
  for (unsigned int i = 0; i < length; i++) {
    message += (char)payload[i];
  }
  
  // Reset remoto
  if (topicStr == "device/" + String(DEVICE_ID) + "/cmd/reset") {
    Serial.println("\n🔴 ===== RESET REMOTO =====");
    delay(1000);
    ESP.restart();
  }
  
  // Comandi cucina via MQTT
  if (topicStr == "escape/cucina/" + String(SESSION_ID) + "/led/porta") {
    led1Color = message;
    blinkState = true;
    lastBlinkTime = millis();
  }
  
  if (topicStr == "escape/cucina/" + String(SESSION_ID) + "/led/fornelli") {
    led2Color = message;
  }
  
  if (topicStr == "escape/cucina/" + String(SESSION_ID) + "/led/frigo") {
    led3Color = message;
  }
  
  if (topicStr == "escape/cucina/" + String(SESSION_ID) + "/led/serra") {
    led4Color = message;
  }
  
  if (topicStr == "escape/cucina/" + String(SESSION_ID) + "/strip/control") {
    stripLedOn = (message == "on" || message == "true");
    digitalWrite(STRIP_LED_PIN, stripLedOn ? HIGH : LOW);
  }
  
  if (topicStr == "escape/cucina/" + String(SESSION_ID) + "/servo/control") {
    if (message == "close" && !servoIsClosed) {
      servoFrigo.write(0);
      servoIsClosed = true;
    } else if (message == "open" && servoIsClosed) {
      servoFrigo.write(90);
      servoIsClosed = false;
    }
  }
}

// ========================================================================
// SETUP WIFI
// ========================================================================

void setupWiFi() {
  Serial.println("\n📡 ===== WIFI SETUP =====");
  
  wifiManager.setAPCallback([](WiFiManager *myWiFiManager) {
    Serial.println("⚠️  Modalità Captive Portal:");
    Serial.println("   SSID: EscapeRoom-Cucina");
    Serial.println("   IP: 192.168.4.1");
  });
  
  wifiManager.setConfigPortalTimeout(PORTAL_TIMEOUT);
  
  if (!wifiManager.autoConnect("EscapeRoom-Cucina")) {
    Serial.println("❌ WiFi timeout, riavvio...");
    delay(3000);
    ESP.restart();
  }
  
  Serial.println("✅ WiFi connesso!");
  Serial.print("   IP: ");
  Serial.println(WiFi.localIP());
}

// ========================================================================
// SETUP MQTT
// ========================================================================

void setupMQTT() {
  Serial.println("\n🔌 ===== MQTT SETUP =====");
  
  #if ALLOW_INSECURE_TLS
    espClient.setInsecure();
    Serial.println("⚠️  TLS INSECURE MODE");
  #endif
  
  client.setServer(MQTT_SERVER, MQTT_PORT);
  client.setCallback(mqttCallback);
}

// ========================================================================
// MQTT RECONNECT
// ========================================================================

void reconnectMQTT() {
  if (client.connected()) return;
  
  if (millis() - mqttLastReconnectAttempt < 5000) return;
  mqttLastReconnectAttempt = millis();
  
  Serial.print("🔌 MQTT reconnect...");
  
  String clientId = "ESP32-Cucina-" + String(random(0xffff), HEX);
  String willTopic = "device/" + String(DEVICE_ID) + "/status";
  
  if (client.connect(
    clientId.c_str(),
    MQTT_USER,
    MQTT_PASS,
    willTopic.c_str(),
    1,
    false,
    "offline"
  )) {
    Serial.println(" ✅");
    
    client.publish(willTopic.c_str(), "online", true);
    
    String resetTopic = "device/" + String(DEVICE_ID) + "/cmd/reset";
    String baseTopic = "escape/cucina/" + String(SESSION_ID) + "/";
    
    client.subscribe(resetTopic.c_str());
    client.subscribe((baseTopic + "led/porta").c_str());
    client.subscribe((baseTopic + "led/fornelli").c_str());
    client.subscribe((baseTopic + "led/frigo").c_str());
    client.subscribe((baseTopic + "led/serra").c_str());
    client.subscribe((baseTopic + "strip/control").c_str());
    client.subscribe((baseTopic + "servo/control").c_str());
    
    Serial.println("📥 Subscribed a topic cucina");
    
  } else {
    Serial.print(" ❌ (rc=");
    Serial.print(client.state());
    Serial.println(")");
  }
}

// ========================================================================
// HEARTBEAT
// ========================================================================

void sendHeartbeat() {
  if (millis() - tHeartbeat < HEARTBEAT_INTERVAL) return;
  tHeartbeat = millis();
  
  StaticJsonDocument<300> doc;
  doc["device_id"] = DEVICE_ID;
  doc["uptime_s"] = millis() / 1000;
  doc["wifi_rssi"] = WiFi.RSSI();
  doc["free_heap"] = ESP.getFreeHeap();
  doc["mqtt_connected"] = client.connected();
  doc["mag1_state"] = digitalRead(MAG1);
  doc["mag2_state"] = digitalRead(MAG2);
  doc["mic_baseline"] = (int)baselineNoise;
  
  char buffer[300];
  serializeJson(doc, buffer);
  
  String topic = "device/" + String(DEVICE_ID) + "/heartbeat";
  client.publish(topic.c_str(), buffer, true);
}

// ========================================================================
// WATCHDOG
// ========================================================================

void checkWiFiWatchdog() {
  if (WiFi.status() != WL_CONNECTED) {
    if (wifiWdState == WIFI_OK) {
      wifiDisconnectTime = millis();
      wifiWdState = WIFI_RECONNECTING;
      Serial.println("⚠️  WiFi perso");
      WiFi.reconnect();
    } else {
      if (millis() - wifiDisconnectTime > WIFI_RESTART_TIMEOUT) {
        Serial.println("\n🔴 WIFI WATCHDOG → RESTART!");
        delay(1000);
        ESP.restart();
      }
    }
  } else {
    if (wifiWdState == WIFI_RECONNECTING) {
      Serial.println("✅ WiFi recuperato!");
    }
    wifiWdState = WIFI_OK;
  }
}

void checkMQTTWatchdog() {
  if (wifiWdState != WIFI_OK) return;
  
  if (!client.connected()) {
    if (mqttWdState == MQTT_OK) {
      mqttDisconnectTime = millis();
      mqttWdState = MQTT_RECONNECTING;
      reconnectMQTT();
    } else {
      if (millis() - mqttDisconnectTime > MQTT_RESTART_TIMEOUT) {
        Serial.println("\n🔴 MQTT WATCHDOG → RESTART!");
        delay(1000);
        ESP.restart();
      }
      reconnectMQTT();
    }
  } else {
    if (mqttWdState == MQTT_RECONNECTING) {
      Serial.println("✅ MQTT recuperato!");
    }
    mqttWdState = MQTT_OK;
  }
}

// ========================================================================
// LED CONTROL
// ========================================================================

void setLED(int pinVerde, int pinRosso, String color) {
  if (color == "green") {
    digitalWrite(pinVerde, HIGH);
    digitalWrite(pinRosso, LOW);
  } else if (color == "red") {
    digitalWrite(pinVerde, LOW);
    digitalWrite(pinRosso, HIGH);
  } else if (color == "yellow") {
    digitalWrite(pinVerde, HIGH);
    digitalWrite(pinRosso, HIGH);
  } else {
    digitalWrite(pinVerde, LOW);
    digitalWrite(pinRosso, LOW);
  }
}

void updateDoorLED() {
  if (led1Color == "red") {
    digitalWrite(LED1_VERDE, LOW);
    digitalWrite(LED1_ROSSO, HIGH);
  } 
  else if (led1Color == "blinking") {
    unsigned long now = millis();
    if (now - lastBlinkTime >= BLINK_INTERVAL) {
      blinkState = !blinkState;
      lastBlinkTime = now;
    }
    if (blinkState) {
      digitalWrite(LED1_VERDE, HIGH);
      digitalWrite(LED1_ROSSO, LOW);
    } else {
      digitalWrite(LED1_VERDE, LOW);
      digitalWrite(LED1_ROSSO, LOW);
    }
  } 
  else if (led1Color == "green") {
    digitalWrite(LED1_VERDE, HIGH);
    digitalWrite(LED1_ROSSO, LOW);
  }
}

// ========================================================================
// SENSORI MAGNETICI
// ========================================================================

void checkMAG1() {
  bool currentMag1 = digitalRead(MAG1);
  
  if (currentMag1 != prevMag1) {
    Serial.println("\n🗄️ MAG1 ANTA cambiato");
    
    String topic = "escape/cucina/" + String(SESSION_ID) + "/mag1/trigger";
    client.publish(topic.c_str(), currentMag1 == LOW ? "closed" : "open");
    
    prevMag1 = currentMag1;
    delay(1000);
  }
}

void checkMAG2() {
  bool currentMag2 = digitalRead(MAG2);
  
  if (currentMag2 != prevMag2) {
    Serial.println("\n🍳 MAG2 PENTOLA cambiato");
    
    if (currentMag2 == LOW) {
      String topic = "escape/cucina/" + String(SESSION_ID) + "/mag2/trigger";
      client.publish(topic.c_str(), "detected");
    }
    
    prevMag2 = currentMag2;
    delay(1000);
  }
}

// ========================================================================
// MICROFONO
// ========================================================================

void checkMicrophonePeak() {
  unsigned long now = millis();
  if (now - lastMicCheck < MIC_CHECK_INTERVAL) return;
  lastMicCheck = now;
  
  int soundLevel = analogRead(MICROPHONE_PIN);
  
  float currentThreshold = baselineNoise + PEAK_MARGIN;
  currentThreshold = constrain(currentThreshold, MIN_THRESHOLD, MAX_THRESHOLD);
  
  if (soundLevel < currentThreshold) {
    baselineNoise = (BASELINE_ALPHA * baselineNoise) + ((1 - BASELINE_ALPHA) * soundLevel);
  }
  
  if (soundLevel > currentThreshold && (now - lastPeakTime > PEAK_COOLDOWN)) {
    lastPeakTime = now;
    
    Serial.println("\n🎤 PICCO SONORO!");
    Serial.print("   Level: ");
    Serial.print(soundLevel);
    Serial.print(" / Threshold: ");
    Serial.println(currentThreshold, 0);
    
    String topic = "escape/cucina/" + String(SESSION_ID) + "/microphone/peak";
    client.publish(topic.c_str(), "detected");
  }
}

// ========================================================================
// PUBLISH STATE
// ========================================================================

void publishHardwareState() {
  if (!client.connected()) return;
  
  static unsigned long lastPublish = 0;
  if (millis() - lastPublish < 1000) return;
  lastPublish = millis();
  
  String base = "escape/cucina/" + String(SESSION_ID) + "/";
  
  client.publish((base + "led/porta").c_str(), led1Color.c_str());
  client.publish((base + "led/fornelli").c_str(), led2Color.c_str());
  client.publish((base + "led/frigo").c_str(), led3Color.c_str());
  client.publish((base + "led/serra").c_str(), led4Color.c_str());
  client.publish((base + "strip/state").c_str(), stripLedOn ? "on" : "off");
  client.publish((base + "servo/state").c_str(), servoIsClosed ? "closed" : "open");
}

// ========================================================================
// SETUP
// ========================================================================

void setup() {
  Serial.begin(115200);
  delay(1000);
  
  Serial.println("\n\n");
  Serial.println("╔════════════════════════════════════════════════╗");
  Serial.println("║  ESP32 CUCINA - STABLE CLOUD VERSION          ║");
  Serial.println("║  Fase 2: WiFiManager + HiveMQ + Watchdog      ║");
  Serial.println("╚════════════════════════════════════════════════╝");
  
  Serial.println("\n🐕 Hardware Watchdog...");
  esp_task_wdt_init(WDT_TIMEOUT, true);
  esp_task_wdt_add(NULL);
  
  Serial.println("\n📌 Configurazione pin...");
  pinMode(MAG1, INPUT_PULLUP);
  pinMode(MAG2, INPUT_PULLUP);
  pinMode(LED1_VERDE, OUTPUT);
  pinMode(LED1_ROSSO, OUTPUT);
  pinMode(LED2_VERDE, OUTPUT);
  pinMode(LED2_ROSSO, OUTPUT);
  pinMode(LED3_VERDE, OUTPUT);
  pinMode(LED3_ROSSO, OUTPUT);
  pinMode(LED4_VERDE, OUTPUT);
  pinMode(LED4_ROSSO, OUTPUT);
  pinMode(STRIP_LED_PIN, OUTPUT);
  
  // LED iniziali rossi
  setLED(LED1_VERDE, LED1_ROSSO, "red");
  setLED(LED2_VERDE, LED2_ROSSO, "red");
  setLED(LED3_VERDE, LED3_ROSSO, "red");
  setLED(LED4_VERDE, LED4_ROSSO, "red");
  digitalWrite(STRIP_LED_PIN, LOW);
  
  // Servo
  servoFrigo.attach(SERVO_PIN);
  servoFrigo.write(90);
  servoIsClosed = false;
  
  Serial.println("   ✅ Pin configurati");
  
  setupWiFi();
  setupMQTT();
  
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
  Serial.print("   Baseline: ");
  Serial.println(baselineNoise, 0);
  
  reconnectMQTT();
  
  prevMag1 = digitalRead(MAG1);
  prevMag2 = digitalRead(MAG2);
  
  Serial.println("\n✅ ===== SISTEMA PRONTO =====");
  Serial.print("   Device ID: ");
  Serial.println(DEVICE_ID);
  Serial.println("   🐕 Watchdog attivi");
  Serial.println("   💓 Heartbeat ogni 30s\n");
}

// ========================================================================
// LOOP
// ========================================================================

void loop() {
  esp_task_wdt_reset();
  
  checkWiFiWatchdog();
  checkMQTTWatchdog();
  
  if (client.connected()) {
    client.loop();
  }
  
  sendHeartbeat();
  
  checkMAG1();
  checkMAG2();
  checkMicrophonePeak();
  
  updateDoorLED();
  setLED(LED2_VERDE, LED2_ROSSO, led2Color);
  setLED(LED3_VERDE, LED3_ROSSO, led3Color);
  setLED(LED4_VERDE, LED4_ROSSO, led4Color);
  
  publishHardwareState();
  
  delay(10);
}