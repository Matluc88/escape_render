/* =========================================================================
   ESP32 SOGGIORNO - CLOUD-FIRST STABLE VERSION
   
   FASE 2 - Stabilizzazione Hardware + Cloud MQTT
   
   FEATURES:
   ✅ WiFiManager captive portal (AP: EscapeRoom-Soggiorno)
   ✅ HiveMQ Cloud MQTT over TLS (porta 8883)
   ✅ Triple watchdog (WiFi + MQTT + Hardware)
   ✅ Heartbeat strutturato ogni 30s
   ✅ Reset remoto via MQTT
   ✅ Last Will & Testament
   ✅ Zero IP hardcoded
   ✅ Zero SSID hardcoded
   
   Hardware:
   - LED PORTA: P4 (verde) + P16 (rosso) - Sistema GLOBALE
   - LED TV: P17 (verde) + P5 (rosso) + P23 (bianco) - Catodo comune
   - LED PIANTA: P21 (verde) + P22 (rosso) - Sistema LOCALE
   - LED CONDIZIONATORE: P18 (verde) + P19 (rosso) - Sistema LOCALE
   - SENSORE MAG1: P33 - Trigger automatico TV puzzle! 🧲
   - VENTOLA: P26 - Attivazione puzzle
   - SERVO PORTA: P32 - Apertura finale
   ========================================================================= */

#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <WiFiManager.h>
#include <esp_task_wdt.h>
#include <ESP32Servo.h>

// ========================================================================
// CONFIGURAZIONE - MODIFICA QUESTI VALORI
// ========================================================================

// HiveMQ Cloud - SOSTITUISCI CON LE TUE CREDENZIALI
const char* MQTT_SERVER = "your-cluster.hivemq.cloud";
const int   MQTT_PORT = 8883;
const char* MQTT_USER = "escape_device";
const char* MQTT_PASS = "your_password";

// Device ID
#define DEVICE_ID "soggiorno"

// Session ID temporaneo
#define SESSION_ID 999

// Timeout watchdog (millisecondi)
#define WIFI_RESTART_TIMEOUT 120000
#define MQTT_RESTART_TIMEOUT 180000
#define WDT_TIMEOUT 120

// Heartbeat interval
#define HEARTBEAT_INTERVAL 30000

// WiFiManager timeout
#define PORTAL_TIMEOUT 180

// Debug TLS
#define ALLOW_INSECURE_TLS 1

// ========================================================================
// PIN HARDWARE
// ========================================================================

// LED Porta (globale)
#define LED_PORTA_GREEN 4
#define LED_PORTA_RED   16

// LED TV (catodo comune - 3 LED)
#define LED_TV_GREEN 17
#define LED_TV_RED   5
#define LED_TV_WHITE 23

// LED Pianta
#define LED_PIANTA_GREEN 22  // INVERTITI fisicamente!
#define LED_PIANTA_RED   21

// LED Condizionatore
#define LED_CONDIZ_GREEN 18
#define LED_CONDIZ_RED   19

// Sensore magnetico MAG1
#define MAG1_SENSOR_PIN 33

// Ventola
#define FAN_PIN 26

// Servo porta
#define SERVO_PORTA_PIN 32

// ========================================================================
// OGGETTI GLOBALI
// ========================================================================

WiFiClientSecure espClient;
PubSubClient client(espClient);
WiFiManager wifiManager;
Servo servoPorta;

// ========================================================================
// STATO HARDWARE
// ========================================================================

String doorLedState = "red";
String tvStatus = "active";
String piantaStatus = "locked";
String condizStatus = "locked";

bool mag1_triggered = false;
unsigned long lastMag1Trigger = 0;
const unsigned long MAG1_DEBOUNCE = 1000;

bool fanRunning = false;
bool servoPortaOpened = false;

// LED Porta blinking
unsigned long lastBlinkTime = 0;
bool blinkState = false;
const unsigned long BLINK_INTERVAL = 500;

// ========================================================================
// TIMING & WATCHDOG
// ========================================================================

unsigned long tHeartbeat = 0;
unsigned long lastStatusPrint = 0;

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
  
  // Comandi specifici soggiorno via MQTT
  if (topicStr == "escape/soggiorno/" + String(SESSION_ID) + "/door-led/state") {
    doorLedState = message;
    blinkState = true;
    lastBlinkTime = millis();
  }
  
  if (topicStr == "escape/soggiorno/" + String(SESSION_ID) + "/tv/complete") {
    tvStatus = "completed";
    digitalWrite(LED_TV_GREEN, HIGH);
    digitalWrite(LED_TV_RED, LOW);
    digitalWrite(LED_TV_WHITE, HIGH);
  }
  
  if (topicStr == "escape/soggiorno/" + String(SESSION_ID) + "/pianta/state") {
    piantaStatus = message;
  }
  
  if (topicStr == "escape/soggiorno/" + String(SESSION_ID) + "/condiz/state") {
    condizStatus = message;
  }
  
  if (topicStr == "escape/soggiorno/" + String(SESSION_ID) + "/fan/control") {
    fanRunning = (message == "on" || message == "true");
    digitalWrite(FAN_PIN, fanRunning ? HIGH : LOW);
  }
  
  if (topicStr == "escape/soggiorno/" + String(SESSION_ID) + "/servo/control") {
    if (message == "open" && !servoPortaOpened) {
      servoPorta.write(90);
      servoPortaOpened = true;
    } else if (message == "close" && servoPortaOpened) {
      servoPorta.write(0);
      servoPortaOpened = false;
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
    Serial.println("   SSID: EscapeRoom-Soggiorno");
    Serial.println("   IP: 192.168.4.1");
  });
  
  wifiManager.setConfigPortalTimeout(PORTAL_TIMEOUT);
  
  if (!wifiManager.autoConnect("EscapeRoom-Soggiorno")) {
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
  
  Serial.print("   Server: ");
  Serial.println(MQTT_SERVER);
}

// ========================================================================
// MQTT RECONNECT
// ========================================================================

void reconnectMQTT() {
  if (client.connected()) return;
  
  if (millis() - mqttLastReconnectAttempt < 5000) return;
  mqttLastReconnectAttempt = millis();
  
  Serial.print("🔌 MQTT reconnect...");
  
  String clientId = "ESP32-Soggiorno-" + String(random(0xffff), HEX);
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
    
    // Subscribe
    String resetTopic = "device/" + String(DEVICE_ID) + "/cmd/reset";
    String baseTopic = "escape/soggiorno/" + String(SESSION_ID) + "/";
    
    client.subscribe(resetTopic.c_str());
    client.subscribe((baseTopic + "door-led/state").c_str());
    client.subscribe((baseTopic + "tv/complete").c_str());
    client.subscribe((baseTopic + "pianta/state").c_str());
    client.subscribe((baseTopic + "condiz/state").c_str());
    client.subscribe((baseTopic + "fan/control").c_str());
    client.subscribe((baseTopic + "servo/control").c_str());
    
    Serial.println("📥 Subscribed a topic soggiorno");
    
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
  
  StaticJsonDocument<256> doc;
  doc["device_id"] = DEVICE_ID;
  doc["uptime_s"] = millis() / 1000;
  doc["wifi_rssi"] = WiFi.RSSI();
  doc["free_heap"] = ESP.getFreeHeap();
  doc["mqtt_connected"] = client.connected();
  doc["mag1_state"] = digitalRead(MAG1_SENSOR_PIN);
  
  char buffer[256];
  serializeJson(doc, buffer);
  
  String topic = "device/" + String(DEVICE_ID) + "/heartbeat";
  
  if (client.publish(topic.c_str(), buffer, true)) {
    Serial.print("💓 Heartbeat: ");
    Serial.println(buffer);
  }
}

// ========================================================================
// WATCHDOG WIFI
// ========================================================================

void checkWiFiWatchdog() {
  if (WiFi.status() != WL_CONNECTED) {
    if (wifiWdState == WIFI_OK) {
      wifiDisconnectTime = millis();
      wifiWdState = WIFI_RECONNECTING;
      Serial.println("⚠️  WiFi perso, reconnect...");
      WiFi.reconnect();
    } else {
      if (millis() - wifiDisconnectTime > WIFI_RESTART_TIMEOUT) {
        Serial.println("\n🔴 WIFI WATCHDOG TIMEOUT → RESTART!");
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

// ========================================================================
// WATCHDOG MQTT
// ========================================================================

void checkMQTTWatchdog() {
  if (wifiWdState != WIFI_OK) return;
  
  if (!client.connected()) {
    if (mqttWdState == MQTT_OK) {
      mqttDisconnectTime = millis();
      mqttWdState = MQTT_RECONNECTING;
      Serial.println("⚠️  MQTT perso, reconnect...");
      reconnectMQTT();
    } else {
      if (millis() - mqttDisconnectTime > MQTT_RESTART_TIMEOUT) {
        Serial.println("\n🔴 MQTT WATCHDOG TIMEOUT → RESTART!");
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
// UPDATE LED FUNCTIONS
// ========================================================================

void updateDualColorLED(int greenPin, int redPin, String state) {
  if (state == "off" || state == "locked") {
    digitalWrite(greenPin, LOW);
    digitalWrite(redPin, LOW);
  } else if (state == "red" || state == "active") {
    digitalWrite(greenPin, LOW);
    digitalWrite(redPin, HIGH);
  } else if (state == "green" || state == "completed") {
    digitalWrite(greenPin, HIGH);
    digitalWrite(redPin, LOW);
  }
}

void updateDoorLED() {
  if (doorLedState == "red") {
    digitalWrite(LED_PORTA_GREEN, LOW);
    digitalWrite(LED_PORTA_RED, HIGH);
  } 
  else if (doorLedState == "blinking") {
    unsigned long now = millis();
    if (now - lastBlinkTime >= BLINK_INTERVAL) {
      blinkState = !blinkState;
      lastBlinkTime = now;
    }
    digitalWrite(LED_PORTA_GREEN, blinkState);
    digitalWrite(LED_PORTA_RED, LOW);
  } 
  else if (doorLedState == "green") {
    digitalWrite(LED_PORTA_GREEN, HIGH);
    digitalWrite(LED_PORTA_RED, LOW);
  }
}

// ========================================================================
// SENSORE MAG1
// ========================================================================

void checkMagneticSensor() {
  int sensorState = digitalRead(MAG1_SENSOR_PIN);
  unsigned long now = millis();
  
  if (sensorState == LOW && !mag1_triggered && 
      (now - lastMag1Trigger > MAG1_DEBOUNCE)) {
    
    Serial.println("\n🧲 ===== MAG1 TRIGGER =====");
    
    // Publish via MQTT invece di HTTP
    String topic = "escape/soggiorno/" + String(SESSION_ID) + "/mag1/trigger";
    client.publish(topic.c_str(), "true");
    
    Serial.println("✅ MAG1 trigger pubblicato via MQTT");
    
    mag1_triggered = true;
    lastMag1Trigger = now;
  }
  
  if (sensorState == HIGH && mag1_triggered) {
    mag1_triggered = false;
    Serial.println("🧲 MAG1: Magnete rimosso");
  }
}

// ========================================================================
// PUBLISH HARDWARE STATE
// ========================================================================

void publishHardwareState() {
  if (!client.connected()) return;
  
  static unsigned long lastPublish = 0;
  if (millis() - lastPublish < 1000) return;
  lastPublish = millis();
  
  String base = "escape/soggiorno/" + String(SESSION_ID) + "/";
  
  // Stati LED
  client.publish((base + "led/porta").c_str(), doorLedState.c_str());
  client.publish((base + "led/tv").c_str(), tvStatus.c_str());
  client.publish((base + "led/pianta").c_str(), piantaStatus.c_str());
  client.publish((base + "led/condiz").c_str(), condizStatus.c_str());
  
  // Stati hardware
  client.publish((base + "fan/state").c_str(), fanRunning ? "on" : "off");
  client.publish((base + "servo/state").c_str(), servoPortaOpened ? "open" : "closed");
  client.publish((base + "mag1/state").c_str(), digitalRead(MAG1_SENSOR_PIN) == HIGH ? "open" : "closed");
}

// ========================================================================
// SETUP
// ========================================================================

void setup() {
  Serial.begin(115200);
  delay(1000);
  
  Serial.println("\n\n");
  Serial.println("╔════════════════════════════════════════════════╗");
  Serial.println("║  ESP32 SOGGIORNO - STABLE CLOUD VERSION       ║");
  Serial.println("║  Fase 2: WiFiManager + HiveMQ + Watchdog      ║");
  Serial.println("╚════════════════════════════════════════════════╝");
  Serial.println();
  
  // Hardware Watchdog
  Serial.println("🐕 Hardware Watchdog...");
  esp_task_wdt_init(WDT_TIMEOUT, true);
  esp_task_wdt_add(NULL);
  Serial.println("   ✅ Hardware WDT attivo (120s)");
  
  // Pin configuration
  Serial.println("\n📌 Configurazione pin...");
  pinMode(MAG1_SENSOR_PIN, INPUT_PULLUP);
  pinMode(LED_PORTA_GREEN, OUTPUT);
  pinMode(LED_PORTA_RED, OUTPUT);
  pinMode(LED_TV_GREEN, OUTPUT);
  pinMode(LED_TV_RED, OUTPUT);
  pinMode(LED_TV_WHITE, OUTPUT);
  pinMode(LED_PIANTA_GREEN, OUTPUT);
  pinMode(LED_PIANTA_RED, OUTPUT);
  pinMode(LED_CONDIZ_GREEN, OUTPUT);
  pinMode(LED_CONDIZ_RED, OUTPUT);
  pinMode(FAN_PIN, OUTPUT);
  
  // Stato iniziale LED
  digitalWrite(LED_PORTA_GREEN, LOW);
  digitalWrite(LED_PORTA_RED, HIGH);
  digitalWrite(LED_TV_GREEN, LOW);
  digitalWrite(LED_TV_RED, HIGH);
  digitalWrite(LED_TV_WHITE, LOW);
  digitalWrite(LED_PIANTA_GREEN, LOW);
  digitalWrite(LED_PIANTA_RED, LOW);
  digitalWrite(LED_CONDIZ_GREEN, LOW);
  digitalWrite(LED_CONDIZ_RED, LOW);
  digitalWrite(FAN_PIN, LOW);
  
  // Servo
  servoPorta.attach(SERVO_PORTA_PIN);
  servoPorta.write(0);
  
  Serial.println("   ✅ Pin configurati");
  
  // WiFi setup
  setupWiFi();
  
  // MQTT setup
  setupMQTT();
  reconnectMQTT();
  
  Serial.println("\n✅ ===== SISTEMA PRONTO =====");
  Serial.print("   Device ID: ");
  Serial.println(DEVICE_ID);
  Serial.println("\n📡 Topic MQTT:");
  Serial.println("   Heartbeat: device/soggiorno/heartbeat");
  Serial.println("   Status: device/soggiorno/status");
  Serial.println("   Hardware: escape/soggiorno/999/*");
  Serial.println("\n🐕 Watchdog attivi");
  Serial.println("💓 Heartbeat ogni 30s\n");
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
  checkMagneticSensor();
  
  // Update LED locali
  updateDoorLED();
  updateDualColorLED(LED_PIANTA_GREEN, LED_PIANTA_RED, piantaStatus);
  updateDualColorLED(LED_CONDIZ_GREEN, LED_CONDIZ_RED, condizStatus);
  
  publishHardwareState();
  
  delay(10);
}