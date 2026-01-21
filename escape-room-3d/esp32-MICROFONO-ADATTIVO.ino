/* =====================================================
   ESP32 MICROFONO ADATTIVO - Auto-Calibrazione
   Si adatta automaticamente al rumore ambientale
   Perfetto per ambienti rumorosi come scuole
   ===================================================== */

#include <WiFi.h>
#include <HTTPClient.h>

// ================= WIFI =================
const char* ssid     = "Vodafone-E23524170";
const char* password = "JtnLtfg73NXgAt9r";

// ================= BACKEND =================
const char* backend_url = "http://192.168.1.10:8001";
const int session_id = 999;

// ================== PIN ==================
#define MICROPHONE_PIN 34  // ADC1 Input (NON confligge con WiFi!)
#define STRIP_LED_PIN 23   // Output LED

// ======== CALIBRAZIONE ADATTIVA ========
float baselineNoise = 0;     // Media rumore ambientale
const int BASELINE_SAMPLES = 50;  // Campioni per baseline iniziale
const float BASELINE_ALPHA = 0.98;  // Smoothing (0.98 = molto stabile)
const int PEAK_MARGIN = 800;    // Margine sopra baseline per rilevare picco
const int MIN_THRESHOLD = 500;   // Soglia minima assoluta
const int MAX_THRESHOLD = 3500;  // Soglia massima assoluta

bool stripLedOn = false;
unsigned long lastUpdate = 0;
unsigned long lastPeakTime = 0;
const unsigned long UPDATE_INTERVAL = 2000;  // Update strip LED ogni 2s
const unsigned long PEAK_COOLDOWN = 2000;    // Cooldown tra picchi

// ================== HTTP ==================

bool notificaSerra() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("❌ WiFi disconnesso!");
    return false;
  }

  HTTPClient http;
  String url = String(backend_url) + "/api/sessions/" + String(session_id) + 
               "/kitchen-puzzles/serra/complete";
  
  Serial.print("📡 POST → ");
  Serial.println(url);
  
  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  int httpCode = http.POST("{}");
  
  bool success = (httpCode > 0 && httpCode < 300);
  Serial.print("📥 Response: ");
  Serial.println(httpCode);
  
  http.end();
  return success;
}

void updateStripLed() {
  if (WiFi.status() != WL_CONNECTED) return;
  
  HTTPClient http;
  String url = String(backend_url) + "/api/sessions/" + String(session_id) + 
               "/kitchen-puzzles/strip-led/state";
  
  http.begin(url);
  int httpCode = http.GET();
  
  if (httpCode > 0 && httpCode < 300) {
    String payload = http.getString();
    
    // Parse JSON manualmente (cerca "is_on":true/false)
    int pos = payload.indexOf("\"is_on\":");
    if (pos > 0) {
      bool should_be_on = payload.substring(pos + 8, pos + 12).indexOf("true") >= 0;
      
      if (should_be_on != stripLedOn) {
        stripLedOn = should_be_on;
        digitalWrite(STRIP_LED_PIN, stripLedOn ? HIGH : LOW);
        Serial.print("💡 Strip LED: ");
        Serial.println(stripLedOn ? "ON ✅" : "OFF ⚫");
      }
    }
  }
  
  http.end();
}

// ================== SETUP ==================

void setup() {
  Serial.begin(115200);
  delay(2000);
  
  Serial.println("\n\n=============================================");
  Serial.println("ESP32 MICROFONO ADATTIVO - Auto-Calibrazione");
  Serial.println("=============================================\n");
  
  // Pin ADC non richiedono pinMode() - funzionano automaticamente
  pinMode(STRIP_LED_PIN, OUTPUT);
  digitalWrite(STRIP_LED_PIN, LOW);
  
  // ===== CALIBRAZIONE INIZIALE =====
  Serial.println("🔧 Calibrazione baseline in corso...");
  Serial.println("   (misuro rumore ambientale)");
  
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
  
  // Connessione WiFi
  Serial.print("📡 Connessione WiFi...");
  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid, password);
  
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 30) {
    delay(500);
    Serial.print(".");
    attempts++;
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n✅ WiFi connesso!");
    Serial.print("   IP: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("\n⚠️  WiFi non connesso (modalità test locale)");
  }
  
  Serial.println("\n👏 Sistema pronto! Batti le mani per attivare serra!");
  Serial.println("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
}

// ================== LOOP ==================

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
  
  // ===== STAMPA CONTINUA (ogni 200ms) =====
  static unsigned long lastPrint = 0;
  if (now - lastPrint > 200) {
    Serial.print("🎤 Sound: ");
    Serial.print(soundLevel);
    Serial.print("\t| Baseline: ");
    Serial.print(baselineNoise, 0);
    Serial.print("\t| Soglia: ");
    Serial.print(currentThreshold, 0);
    
    // Barra visiva
    Serial.print("\t|");
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
    Serial.println("👏 PICCO SONORO RILEVATO!");
    Serial.print("   Sound level: ");
    Serial.println(soundLevel);
    Serial.print("   Soglia attuale: ");
    Serial.println(currentThreshold, 0);
    Serial.print("   Delta: +");
    Serial.println(soundLevel - currentThreshold, 0);
    
    // Notifica backend
    if (WiFi.status() == WL_CONNECTED) {
      Serial.println("🌿 Attivo enigma serra...");
      notificaSerra();
    } else {
      Serial.println("⚠️  WiFi offline - solo test locale");
    }
    
    Serial.println("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
  }
  
  // ===== UPDATE STRIP LED (Polling) =====
  if (WiFi.status() == WL_CONNECTED && (now - lastUpdate > UPDATE_INTERVAL)) {
    updateStripLed();
    lastUpdate = now;
  }
  
  delay(50);
}
