#include <ESP32Servo.h>
#include <WiFi.h>
#include <PubSubClient.h>

/* =========================================
   ESP32 ESTERNO - VERSIONE COMPLETA
   Fotocellula → Animazione Servo Smooth + MQTT Sync
   ========================================= */

// ===== WIFI & MQTT =====
const char* ssid = "Vodafone-E23524170";
const char* password = "JtnLtfg73NXgAt9r";
const char* mqtt_server = "192.168.1.10"; // IP del server (stesso del backend)

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

// ===== FUNZIONI MQTT =====
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
    } else {
      Serial.print(" ❌ Fallito, rc=");
      Serial.print(client.state());
      Serial.println(" ⏳ Riprovo in 5 secondi...");
      delay(5000);
    }
  }
}

void publishMQTT() {
  // Pubblica stato LED (VERDE/ROSSO)
  client.publish("escape/esterno/led/stato", irLibero ? "VERDE" : "ROSSO");
  
  // Pubblica stato fotocellula
  client.publish("escape/esterno/ir-sensor/stato", irLibero ? "LIBERO" : "OCCUPATO");
  
  // Pubblica posizioni servo (per sync scena 3D)
  char buffer[8];
  
  sprintf(buffer, "%d", posCancelli);
  client.publish("escape/esterno/cancello1/posizione", buffer);
  client.publish("escape/esterno/cancello2/posizione", buffer); // Entrambi uguali
  
  sprintf(buffer, "%d", posPorta);
  client.publish("escape/esterno/porta/posizione", buffer);
  
  sprintf(buffer, "%d", posTetto);
  client.publish("escape/esterno/tetto/posizione", buffer);
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
  client.setServer(mqtt_server, 1883);

  Serial.println("✅ Sistema pronto!");
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

  // ===== RGB FESTA (solo se libero) =====
  if (irLibero) {
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
    // OCCUPATO → RGB spento
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
