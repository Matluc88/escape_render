/* =====================================================
   TEST ESP32 - Connessione WiFi + Backend
   Verifica solo connettività, senza sensori/LED
   ===================================================== */

#include <WiFi.h>
#include <HTTPClient.h>

// ================= WIFI - MODIFICA QUI =================
const char* ssid     = "Vodafone-E23524170";
const char* password = "JtnLtfg73NXgAt9r";

// ================= BACKEND =================
const char* backend_url = "http://192.168.1.10:8001";
const int session_id = 999;

void setup() {
  Serial.begin(115200);
  delay(2000);
  
  Serial.println("\n\n========================================");
  Serial.println("🧪 TEST ESP32 - Connessione WiFi + Backend");
  Serial.println("========================================");
  
  // ========== TEST 1: WiFi ==========
  Serial.println("\n📡 TEST 1: Connessione WiFi");
  Serial.print("   SSID: ");
  Serial.println(ssid);
  
  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid, password);
  
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 30) {
    delay(500);
    Serial.print(".");
    attempts++;
  }
  
  Serial.println();
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("   ✅ WiFi CONNESSO!");
    Serial.print("   📍 IP ESP32: ");
    Serial.println(WiFi.localIP());
    Serial.print("   📶 Segnale: ");
    Serial.print(WiFi.RSSI());
    Serial.println(" dBm");
  } else {
    Serial.println("   ❌ WiFi NON CONNESSO!");
    Serial.println("   💡 Verifica:");
    Serial.println("      - SSID corretto");
    Serial.println("      - Password corretta");
    Serial.println("      - Router 2.4GHz (non 5GHz)");
    Serial.println("      - Distanza dal router");
    Serial.println("\n⏸️  STOP - Fix WiFi e riprova");
    while(true) { delay(1000); }
  }
  
  // ========== TEST 2: Backend Ping ==========
  Serial.println("\n🌐 TEST 2: Connessione Backend");
  Serial.print("   URL: ");
  Serial.println(backend_url);
  
  if (testBackend()) {
    Serial.println("   ✅ Backend RAGGIUNGIBILE!");
  } else {
    Serial.println("   ❌ Backend NON RAGGIUNGIBILE!");
    Serial.println("   💡 Verifica:");
    Serial.println("      - Backend in esecuzione (docker ps)");
    Serial.println("      - IP corretto (ifconfig)");
    Serial.println("      - Firewall Mac disabilitato");
  }
  
  // ========== TEST 3: Endpoint Kitchen ==========
  Serial.println("\n🔧 TEST 3: Endpoint Kitchen State");
  
  if (testKitchenState()) {
    Serial.println("   ✅ Endpoint FUNZIONA!");
  } else {
    Serial.println("   ❌ Endpoint NON RISPONDE!");
  }
  
  Serial.println("\n========================================");
  Serial.println("🏁 TEST COMPLETATO");
  Serial.println("========================================");
  Serial.println("\nControlla i risultati sopra:");
  Serial.println("- Se tutti ✅ → Backend pronto per ESP32 completo");
  Serial.println("- Se qualche ❌ → Segui suggerimenti 💡\n");
}

void loop() {
  // Test ogni 10 secondi
  delay(10000);
  
  Serial.println("\n🔄 Test periodico...");
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.print("   WiFi: ✅ (");
    Serial.print(WiFi.RSSI());
    Serial.println(" dBm)");
    
    if (testBackend()) {
      Serial.println("   Backend: ✅");
    } else {
      Serial.println("   Backend: ❌");
    }
  } else {
    Serial.println("   WiFi: ❌ DISCONNESSO");
  }
}

// ========== FUNZIONI TEST ==========

bool testBackend() {
  if (WiFi.status() != WL_CONNECTED) {
    return false;
  }
  
  HTTPClient http;
  String url = String(backend_url) + "/api/sessions/" + 
               String(session_id) + "/kitchen-puzzles/state";
  
  http.begin(url);
  http.setTimeout(5000);
  int httpCode = http.GET();
  
  if (httpCode == 200) {
    http.end();
    return true;
  } else {
    Serial.print("   📄 HTTP Code: ");
    Serial.println(httpCode);
    http.end();
    return false;
  }
}

bool testKitchenState() {
  if (WiFi.status() != WL_CONNECTED) {
    return false;
  }
  
  HTTPClient http;
  String url = String(backend_url) + "/api/sessions/" + 
               String(session_id) + "/kitchen-puzzles/state";
  
  http.begin(url);
  http.setTimeout(5000);
  int httpCode = http.GET();
  
  if (httpCode == 200) {
    String payload = http.getString();
    Serial.println("   📦 Risposta Backend:");
    Serial.println(payload);
    http.end();
    return true;
  } else {
    http.end();
    return false;
  }
}
