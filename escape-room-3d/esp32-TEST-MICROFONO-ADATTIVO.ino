/* =====================================================
   ESP32 TEST MICROFONO ADATTIVO - Debug + Calibrazione
   Versione TEST (SENZA WiFi) con auto-calibrazione
   GPIO 34 (ADC1 - compatibile WiFi se serve)
   ===================================================== */

#define MICROPHONE_PIN 34  // ADC1 Input (compatibile WiFi)

// ======== CALIBRAZIONE ADATTIVA ========
float baselineNoise = 0;     // Media rumore ambientale
const int BASELINE_SAMPLES = 50;  // Campioni per baseline iniziale
const float BASELINE_ALPHA = 0.98;  // Smoothing (0.98 = molto stabile)
const int PEAK_MARGIN = 800;    // Margine sopra baseline per rilevare picco
const int MIN_THRESHOLD = 500;   // Soglia minima assoluta
const int MAX_THRESHOLD = 3500;  // Soglia massima assoluta

unsigned long lastPeakTime = 0;
const unsigned long PEAK_COOLDOWN = 2000;  // Cooldown tra picchi (2s)

void setup() {
  Serial.begin(115200);
  delay(2000);
  
  Serial.println("\n\n=================================================");
  Serial.println("ESP32 TEST MICROFONO ADATTIVO - Auto-Calibrazione");
  Serial.println("=================================================\n");
  
  // Pin ADC non richiedono pinMode() - funzionano automaticamente
  
  Serial.println("📌 Configurazione:");
  Serial.println("   - Pin: GPIO 34 (ADC1)");
  Serial.println("   - Algoritmo: Media Mobile Esponenziale");
  Serial.println("   - Margine picco: +800 sopra baseline");
  Serial.println();
  
  // ===== CALIBRAZIONE INIZIALE =====
  Serial.println("🔧 Calibrazione baseline in corso...");
  Serial.println("   ⚠️  STA' ZITTO per 1 secondo!");
  Serial.println();
  
  long sum = 0;
  for(int i = 0; i < BASELINE_SAMPLES; i++) {
    sum += analogRead(MICROPHONE_PIN);
    delay(20);
    if (i % 10 == 0) Serial.print(".");
  }
  
  baselineNoise = sum / (float)BASELINE_SAMPLES;
  
  Serial.println("\n");
  Serial.println("✅ Calibrazione completata!");
  Serial.print("   📊 Baseline iniziale: ");
  Serial.println(baselineNoise, 0);
  Serial.print("   🎯 Soglia dinamica: baseline + ");
  Serial.println(PEAK_MARGIN);
  Serial.println();
  Serial.println("👏 PROVA A BATTERE LE MANI / GRIDARE!");
  Serial.println("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
}

void loop() {
  unsigned long now = millis();
  
  // Leggi livello sonoro
  int soundLevel = analogRead(MICROPHONE_PIN);
  
  // ===== UPDATE BASELINE (Media Mobile Esponenziale) =====
  // Aggiorna baseline SOLO se non è un picco
  float currentThreshold = baselineNoise + PEAK_MARGIN;
  currentThreshold = constrain(currentThreshold, MIN_THRESHOLD, MAX_THRESHOLD);
  
  if (soundLevel < currentThreshold) {
    // Rumore normale → aggiorna baseline lentamente
    baselineNoise = (BASELINE_ALPHA * baselineNoise) + ((1 - BASELINE_ALPHA) * soundLevel);
  }
  
  // ===== STAMPA CONTINUA (ogni 100ms) =====
  static unsigned long lastPrint = 0;
  if (now - lastPrint > 100) {
    Serial.print("🎤 Sound: ");
    Serial.print(soundLevel);
    Serial.print(" \t| Baseline: ");
    Serial.print(baselineNoise, 0);
    Serial.print(" \t| Soglia: ");
    Serial.print(currentThreshold, 0);
    Serial.print(" \t| Delta: ");
    Serial.print(soundLevel - baselineNoise, 0);
    
    // Barra visiva
    Serial.print(" \t|");
    int bars = (soundLevel - baselineNoise) / 50;
    for(int i = 0; i < bars && i < 30; i++) {
      Serial.print("█");
    }
    
    if (soundLevel > currentThreshold) {
      Serial.print(" << PICCO!");
    }
    
    Serial.println();
    lastPrint = now;
  }
  
  // ===== RILEVA PICCO (Battito/Urlo) =====
  if (soundLevel > currentThreshold && (now - lastPeakTime > PEAK_COOLDOWN)) {
    lastPeakTime = now;
    
    Serial.println("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    Serial.println("👏 🎉 PICCO SONORO RILEVATO! 🎉 👏");
    Serial.print("   📈 Sound level: ");
    Serial.println(soundLevel);
    Serial.print("   📊 Baseline: ");
    Serial.println(baselineNoise, 0);
    Serial.print("   🎯 Soglia: ");
    Serial.println(currentThreshold, 0);
    Serial.print("   ⚡ Delta: +");
    Serial.println(soundLevel - currentThreshold, 0);
    Serial.println("   ✅ Enigma serra ATTIVATO!");
    Serial.println("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
  }
  
  delay(50);  // Loop delay
}
