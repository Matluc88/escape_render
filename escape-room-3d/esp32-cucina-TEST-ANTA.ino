/* =====================================================
   ESP32 CUCINA - TEST ANTA MOBILE (MAG1)
   Test minimale per verificare animazione anta
   ===================================================== */

#include <WiFi.h>
#include <HTTPClient.h>

// ================= WIFI =================
const char* ssid     = "Vodafone-E23524170";
const char* password = "JtnLtfg73NXgAt9r";

// ================= BACKEND =================
const char* backend_url = "http://192.168.1.10:8001";
const int session_id = 999;

// ================== SENSORI ==================
#define MAG1 32   // Anta decorativa

// ================== ANTA MOBILE ==================
bool prevMAG1State = HIGH;

void checkAntaMobile() {
  bool currentMAG1 = digitalRead(MAG1);
  
  // Detect transition (LOW = anta aperta, HIGH = anta chiusa)
  if (currentMAG1 != prevMAG1State) {
    prevMAG1State = currentMAG1;
    
    Serial.print("🗄️ Anta mobile ");
    Serial.println(currentMAG1 == LOW ? "APERTA" : "CHIUSA");
    
    // Trigger animation via backend
    String url = String(backend_url) + "/api/sessions/" + String(session_id) + 
                 "/kitchen-puzzles/anta/toggle";
    Serial.println("📤 POST " + url);
    
    HTTPClient http;
    http.begin(url);
    http.setTimeout(5000);
    http.addHeader("Content-Type", "application/json");
    int code = http.POST("{}");
    
    Serial.print("📥 Response: HTTP ");
    Serial.println(code);
    
    if (code == 200) {
      Serial.println("✅ Animazione triggerata con successo!");
    } else {
      String response = http.getString();
      Serial.println("❌ Errore: " + response);
    }
    http.end();
    
    delay(500); // Debounce
  }
}

// ================== SETUP ==================

void setup() {
  Serial.begin(115200);
  delay(1000);
  
  Serial.println("\n\n=================================");
  Serial.println("ESP32 CUCINA - TEST ANTA MOBILE");
  Serial.println("=================================\n");

  pinMode(MAG1, INPUT_PULLUP);

  Serial.println("🔌 Connessione WiFi...");
  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid, password);
  
  unsigned long startTime = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - startTime < 15000) {
    delay(300);
    Serial.print(".");
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n✅ WiFi connesso!");
    Serial.print("📍 IP: ");
    Serial.println(WiFi.localIP());
    Serial.print("📶 RSSI: ");
    Serial.print(WiFi.RSSI());
    Serial.println(" dBm");
  } else {
    Serial.println("\n❌ WiFi timeout! Riavvio...");
    ESP.restart();
  }
  
  Serial.println("\n✅ Sistema avviato!");
  Serial.println("🔍 Stato iniziale MAG1: " + String(digitalRead(MAG1) == LOW ? "APERTA" : "CHIUSA"));
  Serial.println("\n👉 Apri/Chiudi l'anta per testare...\n");
}

// ================== LOOP ==================

void loop() {
  checkAntaMobile();
  delay(50);
}
