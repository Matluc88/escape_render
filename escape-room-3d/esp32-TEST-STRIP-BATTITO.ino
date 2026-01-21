/* =====================================================
   ESP32 TEST STRIP LED - Battito Mani
   Accende strip LED quando rileva battito/urlo
   (SENZA WiFi, SENZA Backend, solo test locale)
   ===================================================== */

#define MICROPHONE_PIN 25  // ADC Input analogico
#define STRIP_LED_PIN 23   // Output digitale per strip LED

const int SOUND_THRESHOLD = 2500;  // Soglia calibrata (battito mani ~2800)
bool stripLedOn = false;  // Stato strip LED

void setup() {
  Serial.begin(115200);
  delay(1000);
  
  Serial.println("\n\n========================================");
  Serial.println("ESP32 TEST STRIP LED - Battito Mani");
  Serial.println("========================================\n");
  
  // Configura pin
  pinMode(MICROPHONE_PIN, INPUT);    // Microfono
  pinMode(STRIP_LED_PIN, OUTPUT);    // Strip LED
  digitalWrite(STRIP_LED_PIN, LOW);  // Strip inizialmente OFF
  
  Serial.println("📌 Pin configurati:");
  Serial.println("   - MICROPHONE: GPIO 25 (ADC input)");
  Serial.println("   - STRIP LED:  GPIO 23 (output)");
  Serial.println("   - Soglia:     2500 ADC");
  Serial.println("\n👏 BATTI LE MANI per accendere/spegnere strip LED!");
  Serial.println("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
}

void loop() {
  // Leggi livello sonoro
  int soundLevel = analogRead(MICROPHONE_PIN);
  
  // Stampa valore continuo (ogni 100ms)
  static unsigned long lastPrint = 0;
  if (millis() - lastPrint > 100) {
    Serial.print("🎤 Sound: ");
    Serial.print(soundLevel);
    Serial.print("\t");
    
    // Barra grafica
    int bars = soundLevel / 100;
    Serial.print("|");
    for(int i = 0; i < bars && i < 40; i++) {
      Serial.print("█");
    }
    
    if (soundLevel > SOUND_THRESHOLD) {
      Serial.print(" << PICCO!");
    }
    
    Serial.println();
    lastPrint = millis();
  }
  
  // Rileva PICCO (battito mani/urlo)
  if (soundLevel > SOUND_THRESHOLD) {
    // Toggle strip LED
    stripLedOn = !stripLedOn;
    digitalWrite(STRIP_LED_PIN, stripLedOn ? HIGH : LOW);
    
    Serial.println("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    Serial.println("👏 BATTITO RILEVATO!");
    Serial.print("💡 Strip LED: ");
    Serial.println(stripLedOn ? "ACCESA ✅" : "SPENTA ⚫");
    Serial.println("━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
    
    // Debounce (evita toggle multipli)
    delay(1000);
  }
  
  delay(50);  // Loop delay
}
