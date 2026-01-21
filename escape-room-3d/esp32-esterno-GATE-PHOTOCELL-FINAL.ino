#include <ESP32Servo.h>
#include <WiFi.h>
#include <PubSubClient.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

/* =========================================
   ESP32 ESTERNO - VERSIONE FINALE COMPLETA
   Fotocellula → Animazione Servo Smooth + MQTT Sync
   2 LED Bicolore (CANCELLO + PORTA)
   Session ID dinamico (fetchato dal backend)
   ========================================= */

// ===== WIFI & MQTT =====
const char* ssid = "Vodafone-E23524170";
const char* password = "JtnLtfg73NXgAt9r";
const char* mqtt_server = "192.168.1.10"; // IP del server (stesso del backend)
const char* backend_url = "http://192.168.1.10:8001";

// Session ID dinamico (fetchato dal backend al boot)
int session_id = 999;  // Default fallback

WiFiClient espClient;
PubSubClient client(espClient);

// ===== PIN =====
// LED BICOLORE 1 - CANCELLO (segue fotocellula)
#define LED_CANCELLO_VERDE   4
#define LED_CANCELLO_ROSSO   16

// LED BICOLORE 2 - PORTA (segue stato porta)
#define LED_PORTA_VERDE      33
#define LED_PORTA_ROSSO      25

#define IR_PIN               19   // LOW = OCCUPATO, HIGH = LIBERO

#define SERVO_DX    5    // Cancello anta destra
#define SERVO_SX    17   // Cancello anta sinistra
#define SERVO_PORTA 18   // Porta ingresso
#define SERVO_TETTO 32   // Tetto (DS3225MG)

#define RGB_R       21
#define RGB_G       22
#define RGB_B       23

// ===== SERVO =====
Servo cancelloDX, cancelloSX, porta, tetto;

// ===== POSIZIONI ATTUALI =====
int posCancelli = 0;   // 0-90°
int posPorta = 0;      // 0-90°
int posTetto = 0;      // 0-180°

// ===== TARGET (quando fotocellula libera) =====
const int CANCELLO_OPEN = 90;  // 90° apertura cancelli
const int PORTA_OPEN = 90;     // 90° apertura porta
const int TETTO_OPEN = 180;    // 180° apertura tetto

// ===== TIMING =====
unsigned long tServo = 0;      // Timer movimento servo (ogni 15ms)
unsigned long tRGB = 0;        // Timer RGB festa (ogni 120ms)
unsigned long tMQTT = 0;       // Timer pubblicazione MQTT (ogni 500ms)

// ===== RGB FESTA =====
int festaStep = 0;

// ===== STATO =====
bool irLibero = false;
bool gameWon = false;  // 🏆 Traccia vittoria del gioco (tutte 4 stanze completate)

// ===== FETCH ACTIVE SESSION ID =====
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
  return 999;  // Fallback se errore
}

// ===== FUNZIONI MQTT =====
void callback(char* topic, byte* payload, unsigned int length) {
  // Converte payload in stringa
  String message = "";
  for (unsigned int i = 0; i < length; i++) {
    message += (char)payload[i];
  }
  
  Serial.print("📩 [MQTT] Ricevuto su topic '");
  Serial.print(topic);
  Serial.print("': ");
  Serial.println(message);
  
  // Topic: escape/game-completion/won
  if (strcmp(topic, "escape/game-completion/won") == 0) {
    gameWon = (message == "true" || message == "1");
    Serial.print("🏆 [GAME] Stato vittoria aggiornato: ");
    Serial.println(gameWon ? "VITTORIA! 🎊" : "In corso...");
  }
}

void setup_wifi() {
  delay(10);
  Serial.println();
  Serial.print("📡 Connessione WiFi: ");
  Serial.println(ssid);

  WiFi.begin(ssid, password);

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println("");
  Serial.println("✅ WiFi connesso!");
  Serial.print("📍 IP: ");
  Serial.println(WiFi.localIP());
}

void reconnect() {
  while (!client.connected()) {
    Serial.print("🔌 Connessione MQTT...");
    
    String clientId = "ESP32-Esterno-";
    clientId += String(random(0xffff), HEX);
    
    if (client.connect(clientId.c_str())) {
      Serial.println(" ✅ MQTT connesso!");
      
      // 🏆 Sottoscrivi al topic game completion per RGB festa
      client.subscribe("escape/game-completion/won");
      Serial.println("📬 Sottoscritto a: escape/game-completion/won");
    } else {
      Serial.print(" ❌ Fallito, rc=");
      Serial.print(client.state());
      Serial.println(" ⏳ Riprovo in 5 secondi...");
      delay(5000);
    }
  }
}

void publishMQTT() {
  // Costruisci topic base con session_id
  String topicBase = "escape/esterno/" + String(session_id) + "/";
  
  // Pubblica stato LED (VERDE/ROSSO)
  String topicLed = topicBase + "led/stato";
  client.publish(topicLed.c_str(), irLibero ? "VERDE" : "ROSSO");
  
  // Pubblica stato fotocellula
  String topicIR = topicBase + "ir-sensor/stato";
  client.publish(topicIR.c_str(), irLibero ? "LIBERO" : "OCCUPATO");
  
  // Pubblica posizioni servo (per sync scena 3D)
  char buffer[8];
  
  sprintf(buffer, "%d", posCancelli);
  String topicC1 = topicBase + "cancello1/posizione";
  String topicC2 = topicBase + "cancello2/posizione";
  client.publish(topicC1.c_str(), buffer);
  client.publish(topicC2.c_str(), buffer); // Entrambi uguali
  
  sprintf(buffer, "%d", posPorta);
  String topicPorta = topicBase + "porta/posizione";
  client.publish(topicPorta.c_str(), buffer);
  
  sprintf(buffer, "%d", posTetto);
  String topicTetto = topicBase + "tetto/posizione";
  client.publish(topicTetto.c_str(), buffer);
}

void setup() {
  Serial.begin(115200);

  // ===== PIN =====
  pinMode(IR_PIN, INPUT_PULLUP);
  
  // LED BICOLORE 1 - CANCELLO
  pinMode(LED_CANCELLO_VERDE, OUTPUT);
  pinMode(LED_CANCELLO_ROSSO, OUTPUT);
  
  // LED BICOLORE 2 - PORTA
  pinMode(LED_PORTA_VERDE, OUTPUT);
  pinMode(LED_PORTA_ROSSO, OUTPUT);

  pinMode(RGB_R, OUTPUT);
  pinMode(RGB_G, OUTPUT);
  pinMode(RGB_B, OUTPUT);

  // ===== SERVO =====
  cancelloDX.attach(SERVO_DX, 500, 2400);
  cancelloSX.attach(SERVO_SX, 500, 2400);
  porta.attach(SERVO_PORTA, 500, 2400);
  tetto.attach(SERVO_TETTO, 500, 2500);

  // Posizioni iniziali (chiuso)
  cancelloDX.write(0);
  cancelloSX.write(0);
  porta.write(0);
  tetto.write(0);

  Serial.println("🎉 Sistema avviato - ESP32 ESTERNO COMPLETO");

  // ===== WIFI & MQTT =====
  setup_wifi();
  
  // ===== FETCH ACTIVE SESSION ID =====
  Serial.println("\n🔍 Fetch Active Session ID...");
  session_id = fetchActiveSessionId();
  Serial.print("🎯 Uso Session ID: ");
  Serial.println(session_id);
  
  client.setServer(mqtt_server, 1883);
  client.setCallback(callback);  // 📬 Imposta callback per ricevere messaggi MQTT

  Serial.println("\n✅ Sistema pronto!");
}

void loop() {
  unsigned long now = millis();

  // ===== MQTT KEEP-ALIVE =====
  if (!client.connected()) {
    reconnect();
  }
  client.loop();

  // ===== LETTURA FOTOCELLULA =====
  // LOW = OCCUPATO → HIGH = LIBERO (fotocellula invertita)
  irLibero = (digitalRead(IR_PIN) == HIGH);

  // ===== LED BICOLORE 1 - CANCELLO (segue fotocellula) =====
  if (irLibero) {
    // LIBERO → Verde acceso, Rosso spento
    digitalWrite(LED_CANCELLO_VERDE, HIGH);
    digitalWrite(LED_CANCELLO_ROSSO, LOW);
  } else {
    // OCCUPATO → Rosso acceso, Verde spento
    digitalWrite(LED_CANCELLO_VERDE, LOW);
    digitalWrite(LED_CANCELLO_ROSSO, HIGH);
  }
  
  // ===== LED BICOLORE 2 - PORTA (segue stato porta) =====
  if (posPorta > 0) {
    // APERTA → Verde acceso, Rosso spento
    digitalWrite(LED_PORTA_VERDE, HIGH);
    digitalWrite(LED_PORTA_ROSSO, LOW);
  } else {
    // CHIUSA → Rosso acceso, Verde spento
    digitalWrite(LED_PORTA_VERDE, LOW);
    digitalWrite(LED_PORTA_ROSSO, HIGH);
  }

  // ===== MOVIMENTO SERVO SMOOTH =====
  if (now - tServo >= 15) {  // Ogni 15ms = movimento fluido
    tServo = now;

    // Se fotocellula LIBERA → APRI tutto
    if (irLibero) {
      if (posCancelli < CANCELLO_OPEN)  posCancelli++;
      if (posPorta < PORTA_OPEN)         posPorta++;
      if (posTetto < TETTO_OPEN)         posTetto++;
    } 
    // Se fotocellula OCCUPATA → CHIUDI tutto
    else {
      if (posCancelli > 0) posCancelli--;
      if (posPorta > 0)    posPorta--;
      if (posTetto > 0)    posTetto--;
    }

    // Scrivi posizioni ai servo
    cancelloDX.write(posCancelli);
    cancelloSX.write(posCancelli);
    porta.write(posPorta);
    tetto.write(posTetto);
  }

  // ===== RGB FESTA (solo se gioco vinto! 🏆) =====
  if (gameWon) {
    // VITTORIA! → RGB lampeggiante con 6 colori
    if (now - tRGB >= 120) {  // Velocità animazione festa
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
    // GIOCO NON VINTO → RGB spento
    analogWrite(RGB_R, 0);
    analogWrite(RGB_G, 0);
    analogWrite(RGB_B, 0);
  }

  // ===== PUBBLICAZIONE MQTT =====
  if (now - tMQTT >= 500) {  // Ogni 500ms pubblica stato
    tMQTT = now;
    publishMQTT();
  }
}
