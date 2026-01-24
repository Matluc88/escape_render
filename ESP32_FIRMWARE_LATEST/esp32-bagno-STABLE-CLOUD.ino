/* =========================================================================
   ESP32 BAGNO - CLOUD-FIRST STABLE VERSION
   
   FASE 2 - Stabilizzazione Hardware + Cloud MQTT
   
   FEATURES:
   ✅ WiFiManager captive portal (AP: EscapeRoom-Bagno)
   ✅ HiveMQ Cloud MQTT over TLS (porta 8883)
   ✅ Triple watchdog (WiFi + MQTT + Hardware)
   ✅ Heartbeat strutturato ogni 30s
   ✅ Reset remoto via MQTT
   ✅ Last Will & Testament
   ✅ Zero IP hardcoded
   ✅ Zero SSID hardcoded
   ✅ Servo detach per eliminare jitter
   
   Hardware:
   - LED PORTA: P4 (verde) + P16 (rosso) - Sistema GLOBALE
   - LED SPECCHIO: P17 (verde) + P5 (rosso) + P33 (bianco)
   - LED PORTA FINESTRA: P18 (verde) + P19 (rosso)
   - LED VENTOLA: P21 (verde) + P22 (rosso)
   - SENSORE MAG1: P23 - Trigger DOCCIA 🧲
   - SERVO PORTA BAGNO: P26 - Apertura a game_won 🚪
   - SERVO FINESTRA: P25 - 30° → 0° 🌬️
   - VENTOLA: P32 - Attiva a ventola_done 🌀
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

#define DEVICE_ID "bagno"
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

// LED Porta (globale)
#define LED_PORTA_GREEN 4
#define LED_PORTA_RED   16

// LED Specchio (con bianco)
#define LED_SPEC_GREEN 17
#define LED_SPEC_RED   5
#define LED_SPEC_WHITE 33

// LED Porta finestra
#define LED_FINE_GREEN 18
#define LED_FINE_RED   19

// LED Ventola
#define LED_VENT_GREEN 21
#define LED_VENT_RED   22

// Sensore MAG1
#define MAG1_SENSOR_PIN 23

// Servo
#define SERVO_DOOR_PIN   26
#define SERVO_WINDOW_PIN 25

// Ventola
#define FAN_PIN 32

// ========================================================================
// OGGETTI GLOBALI
// ========================================================================

WiFiClientSecure espClient;
PubSubClient client(espClient);
WiFiManager wifiManager;
Servo servoDoor;
Servo servoWindow;

// ========================================================================
// STATO HARDWARE
// ========================================================================

String doorLedState = "red";
String specchioStatus = "active";
String portafinestraStatus = "off";
String ventolaStatus = "off";

bool mag1_triggered = false;
unsigned long lastMag1Trigger = 0;
const unsigned long MAG1_DEBOUNCE = 500;

bool fanRunning = false;
bool servoDoorOpened = false;
bool servoWindowClosed = false;

unsigned long lastBlinkTime = 0;
bool blinkState = false;
const unsigned long BLINK_INTERVAL = 500;

// ========================================================================
// TIMING & WATCHDOG
// ========================================================================

unsigned long tHeartbeat = 0;

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
  
  // Comandi bagno via MQTT
  if (topicStr == "escape/bagno/" + String(SESSION_ID) + "/door-led/state") {
    doorLedState = message;
    blinkState = true;
    lastBlinkTime = millis();
  }
  
  if (topicStr == "escape/bagno/" + String(SESSION_ID) + "/specchio/state") {
    specchioStatus = message;
    if (specchioStatus == "done") {
      digitalWrite(LED_SPEC_GREEN, HIGH);
      digitalWrite(LED_SPEC_RED, LOW);
      digitalWrite(LED_SPEC_WHITE, HIGH);
    }
  }
  
  if (topicStr == "escape/bagno/" + String(SESSION_ID) + "/finestra/state") {
    portafinestraStatus = message;
  }
  
  if (topicStr == "escape/bagno/" + String(SESSION_ID) + "/ventola/state") {
    ventolaStatus = message;
  }
  
  if (topicStr == "escape/bagno/" + String(SESSION_ID) + "/fan/control") {
    fanRunning = (message == "on" || message == "true");
    digitalWrite(FAN_PIN, fanRunning ? HIGH : LOW);
  }
  
  if (topicStr == "escape/bagno/" + String(SESSION_ID) + "/servo-door/control") {
    if (message == "open" && !servoDoorOpened) {
      servoDoor.attach(SERVO_DOOR_PIN);
      servoDoor.write(90);
      delay(500);
      servoDoor.detach();
      servoDoorOpened = true;
    } else if (message == "close" && servoDoorOpened) {
      servoDoor.attach(SERVO_DOOR_PIN);
      servoDoor.write(0);
      delay(500);
      servoDoor.detach();
      servoDoorOpened = false;
    }
  }
  
  if (topicStr == "escape/bagno/" + String(SESSION_ID) + "/servo-window/control") {
    if (message == "close" && !servoWindowClosed) {
      servoWindow.attach(SERVO_WINDOW_PIN);
      servoWindow.write(0);
      delay(500);
      servoWindow.detach();
      servoWindowClosed = true;
    } else if (message == "open" && servoWindowClosed) {
      servoWindow.attach(SERVO_WINDOW_PIN);
      servoWindow.write(30);
      delay(500);
      servoWindow.detach();
      servoWindowClosed = false;
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
    Serial.println("   SSID: EscapeRoom-Bagno");
    Serial.println("   IP: 192.168.4.1");
  });
  
  wifiManager.setConfigPortalTimeout(PORTAL_TIMEOUT);
  
  if (!wifiManager.autoConnect("EscapeRoom-Bagno")) {
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
  
  String clientId = "ESP32-Bagno-" + String(random(0xffff), HEX);
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
    String baseTopic = "escape/bagno/" + String(SESSION_ID) + "/";
    
    client.subscribe(resetTopic.c_str());
    client.subscribe((baseTopic + "door-led/state").c_str());
    client.subscribe((baseTopic + "specchio/state").c_str());
    client.subscribe((baseTopic + "finestra/state").c_str());
    client.subscribe((baseTopic + "ventola/state").c_str());
    client.subscribe((baseTopic + "fan/control").c_str());
    client.subscribe((baseTopic + "servo-door/control").c_str());
    client.subscribe((baseTopic + "servo-window/control").c_str());
    
    Serial.println("📥 Subscribed a topic bagno");
    
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
// UPDATE LED
// ========================================================================

void updateDualLED(int greenPin, int redPin, String color) {
  if (color == "green") {
    digitalWrite(greenPin, HIGH);
    digitalWrite(redPin, LOW);
  } else if (color == "red") {
    digitalWrite(greenPin, LOW);
    digitalWrite(redPin, HIGH);
  } else {
    digitalWrite(greenPin, LOW);
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
// MAG1 SENSOR
// ========================================================================

void checkMag1() {
  int state = digitalRead(MAG1_SENSOR_PIN);
  unsigned long now = millis();

  if (state == LOW && !mag1_triggered &&
      now - lastMag1Trigger > MAG1_DEBOUNCE) {

    Serial.println("\n🧲 MAG1 → DOCCIA");

    String topic = "escape/bagno/" + String(SESSION_ID) + "/mag1/trigger";
    client.publish(topic.c_str(), "true");

    mag1_triggered = true;
    lastMag1Trigger = now;
  }

  if (state == HIGH) mag1_triggered = false;
}

// ========================================================================
// PUBLISH STATE
// ========================================================================

void publishHardwareState() {
  if (!client.connected()) return;
  
  static unsigned long lastPublish = 0;
  if (millis() - lastPublish < 1000) return;
  lastPublish = millis();
  
  String base = "escape/bagno/" + String(SESSION_ID) + "/";
  
  client.publish((base + "led/porta").c_str(), doorLedState.c_str());
  client.publish((base + "led/specchio").c_str(), specchioStatus.c_str());
  client.publish((base + "led/finestra").c_str(), portafinestraStatus.c_str());
  client.publish((base + "led/ventola").c_str(), ventolaStatus.c_str());
  client.publish((base + "fan/state").c_str(), fanRunning ? "on" : "off");
}

// ========================================================================
// SETUP
// ========================================================================

void setup() {
  Serial.begin(115200);
  delay(1000);
  
  Serial.println("\n\n");
  Serial.println("╔════════════════════════════════════════════════╗");
  Serial.println("║  ESP32 BAGNO - STABLE CLOUD VERSION           ║");
  Serial.println("║  Fase 2: WiFiManager + HiveMQ + Watchdog      ║");
  Serial.println("╚════════════════════════════════════════════════╝");
  
  Serial.println("\n🐕 Hardware Watchdog...");
  esp_task_wdt_init(WDT_TIMEOUT, true);
  esp_task_wdt_add(NULL);
  
  Serial.println("\n📌 Configurazione pin...");
  pinMode(MAG1_SENSOR_PIN, INPUT_PULLUP);
  pinMode(LED_PORTA_GREEN, OUTPUT);
  pinMode(LED_PORTA_RED, OUTPUT);
  pinMode(LED_SPEC_GREEN, OUTPUT);
  pinMode(LED_SPEC_RED, OUTPUT);
  pinMode(LED_SPEC_WHITE, OUTPUT);
  pinMode(LED_FINE_GREEN, OUTPUT);
  pinMode(LED_FINE_RED, OUTPUT);
  pinMode(LED_VENT_GREEN, OUTPUT);
  pinMode(LED_VENT_RED, OUTPUT);
  pinMode(FAN_PIN, OUTPUT);
  
  digitalWrite(LED_PORTA_GREEN, LOW);
  digitalWrite(LED_PORTA_RED, HIGH);
  digitalWrite(LED_SPEC_GREEN, LOW);
  digitalWrite(LED_SPEC_RED, HIGH);
  digitalWrite(LED_SPEC_WHITE, LOW);
  digitalWrite(LED_FINE_GREEN, LOW);
  digitalWrite(LED_FINE_RED, LOW);
  digitalWrite(LED_VENT_GREEN, LOW);
  digitalWrite(LED_VENT_RED, LOW);
  digitalWrite(FAN_PIN, LOW);
  
  // Servo init e detach
  servoDoor.attach(SERVO_DOOR_PIN);
  servoDoor.write(0);
  delay(500);
  servoDoor.detach();
  
  servoWindow.attach(SERVO_WINDOW_PIN);
  servoWindow.write(30);
  delay(500);
  servoWindow.detach();
  
  Serial.println("   ✅ Pin configurati (servo detached)");
  
  setupWiFi();
  setupMQTT();
  reconnectMQTT();
  
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
  checkMag1();
  
  updateDoorLED();
  updateDualLED(LED_FINE_GREEN, LED_FINE_RED, portafinestraStatus);
  updateDualLED(LED_VENT_GREEN, LED_VENT_RED, ventolaStatus);
  
  publishHardwareState();
  
  delay(10);
}