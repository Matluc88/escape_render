/* =====================================================
   TEST GPIO 23 - Strip LED
   Sketch minimale per verificare se GPIO 23 funziona
   
   COSA FA:
   - Accende/spegne GPIO 23 ogni secondo
   - Pattern: ON 1s → OFF 1s → ripeti
   ===================================================== */

#define STRIP_LED_PIN 23  // Pin strip LED

void setup() {
  Serial.begin(115200);
  Serial.println("\n\n=============================");
  Serial.println("TEST GPIO 23 - STRIP LED");
  Serial.println("=============================\n");
  
  // Configura GPIO 23 come OUTPUT
  pinMode(STRIP_LED_PIN, OUTPUT);
  digitalWrite(STRIP_LED_PIN, LOW);  // Inizia spento
  
  Serial.println("✅ GPIO 23 configurato come OUTPUT");
  Serial.println("📡 Pattern: ON 1s → OFF 1s → ripeti");
  Serial.println("");
}

void loop() {
  // ACCENDI per 1 secondo
  Serial.println("💡 STRIP LED: ACCESA (HIGH)");
  digitalWrite(STRIP_LED_PIN, HIGH);
  delay(1000);
  
  // SPEGNI per 1 secondo
  Serial.println("⚫ STRIP LED: SPENTA (LOW)");
  digitalWrite(STRIP_LED_PIN, LOW);
  delay(1000);
}
