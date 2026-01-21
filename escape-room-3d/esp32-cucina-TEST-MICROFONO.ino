/* =====================================================
   ESP32 TEST MICROFONO - DEBUG
   Stampa continuamente valori ADC per calibrazione
   ===================================================== */

#define MICROPHONE_PIN 25  // ADC Input

void setup() {
  Serial.begin(115200);
  delay(2000);
  
  Serial.println("\n\n=================================");
  Serial.println("ESP32 TEST MICROFONO - DEBUG");
  Serial.println("=================================\n");
  
  // Configura pin microfono come INPUT
  pinMode(MICROPHONE_PIN, INPUT);
  
  Serial.println("📌 Pin configurato: GPIO 25 (ADC)");
  Serial.println("🎤 PROVA A PARLARE / GRIDARE vicino al microfono\n");
  Serial.println("Valori ADC (0-4095):");
  Serial.println("--------------------");
}

void loop() {
  // Leggi valore analogico grezzo
  int soundLevel = analogRead(MICROPHONE_PIN);
  
  // Stampa con barra visiva
  Serial.print("Sound: ");
  Serial.print(soundLevel);
  Serial.print(" \t|");
  
  // Barra grafica (ogni 50 unità = 1 simbolo)
  int bars = soundLevel / 50;
  for(int i = 0; i < bars && i < 80; i++) {
    Serial.print("█");
  }
  
  // Indicatore soglia attuale (512)
  if (soundLevel > 512) {
    Serial.print(" << SOPRA SOGLIA!");
  }
  
  Serial.println();
  
  delay(50);  // Aggiorna ogni 50ms
}
