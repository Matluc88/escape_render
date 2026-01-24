#include <ESP32Servo.h>

/* ===== LED VERDI ===== */
int ledVerdi[] = {4, 5, 18, 22, 14};

/* ===== LED ROSSI ===== */
int ledRossi[] = {16, 17, 19, 21, 12};

/* ===== ALTRI PIN ===== */
#define LED_BIANCO   32
#define VENTOLA_PIN  23
#define HALL_PIN     27

#define SERVO_PORTA_LETTO   25
#define SERVO_LETTO         26
#define SERVO_SECONDA_PORTA 33

Servo servo1, servo2, servo3;

/* ===== TIMING HOUSE ===== */
unsigned long lastBeat = 0;
const int BEAT_DELAY = 350;
bool beatState = false;

void setup() {
  Serial.begin(115200);

  pinMode(LED_BIANCO, OUTPUT);
  pinMode(VENTOLA_PIN, OUTPUT);
  pinMode(HALL_PIN, INPUT);

  for (int i = 0; i < 5; i++) {
    pinMode(ledVerdi[i], OUTPUT);
    pinMode(ledRossi[i], OUTPUT);
  }

  servo1.attach(SERVO_PORTA_LETTO);
  servo2.attach(SERVO_LETTO);
  servo3.attach(SERVO_SECONDA_PORTA);

  // Stato iniziale: ROSSI ON
  for (int i = 0; i < 5; i++) {
    digitalWrite(ledVerdi[i], LOW);
    digitalWrite(ledRossi[i], HIGH);
  }

  digitalWrite(LED_BIANCO, LOW);
  digitalWrite(VENTOLA_PIN, LOW);

  Serial.println("✅ SKETCH DEFINITIVO AVVIATO");
}

void loop() {
  gestisciHall();
  houseBeat();
}

/* ================= FUNZIONI ================= */

void gestisciHall() {
  bool magnetePresente = (digitalRead(HALL_PIN) == LOW);

  digitalWrite(LED_BIANCO, magnetePresente);
  digitalWrite(VENTOLA_PIN, magnetePresente);
}

void houseBeat() {
  if (millis() - lastBeat >= BEAT_DELAY) {
    lastBeat = millis();
    beatState = !beatState;

    for (int i = 0; i < 5; i++) {
      digitalWrite(ledVerdi[i], beatState);
      digitalWrite(ledRossi[i], !beatState);
    }

    int angle = beatState ? 60 : 0;
    servo1.write(angle);
    servo2.write(angle);
    servo3.write(angle);
  }
}
