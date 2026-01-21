/* =====================================================
   ESP32 CUCINA - ANTA MOBILE + PENTOLA (COMPLETO)
   ===================================================== */

#include <WiFi.h>
#include <HTTPClient.h>

// ================= WIFI =================
const char* ssid     = "Vodafone-E23524170";
const char* password = "JtnLtfg73NXgAt9r";

// ================= BACKEND =================
const char* backend_url = "http://192.168.1.10:8001";
const int session_id = 999;

// ================== PIN SENSORI ==================
#define MAG1 32   // Anta mobile decorativa
#define MAG2 33   // Pentola sui fornelli

// ================== STATI MAGNETI ==================
bool prevMag1 = HIGH;  // Stato precedente MAG1
bool prevMag2 = HIGH;  // Stato precedente MAG2

// ================== HTTP ==================

bool chiamataHTTP(const char* endpoint, const char* method = "POST") {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("❌ WiFi disconnesso!");
    return false;
  }

  HTTPClient http;
  String url = String(backend_url) + endpoint;
  
  Serial.print("📡 HTTP ");
  Serial.print(method);
  Serial.print(" → ");
  Serial.println(url);
  
  http.begin(url);
  http.setTimeout(5000);

  int httpCode;
  if (strcmp(method, "POST") == 0) {
    http.addHeader("Content-Type", "application/json");
    httpCode = http.POST("{}");
  } else {
    httpCode = http.GET();
  }

  Serial.print("📥 Response: ");
  Serial.println(httpCode);

  bool success = (httpCode > 0 && httpCode < 300);
  
  if (success) {
    Serial.println("✅ Request OK!");
  } else {
    Serial.println("❌ Request FAILED!");
  }

  http.end();
  return success;
}

// ================== NOTIFICHE ANIMAZIONI ==================

bool notificaAnta() {
  String endpoint = "/api/sessions/" + String(session_id) + 
                    "/kitchen-puzzles/anta/toggle";
  Serial.println("\n🗄️ ===== ANTA TOGGLE =====");
  return chiamataHTTP(endpoint.c_str());
}

bool notificaPentola() {
  String endpoint = "/api/sessions/" + String(session_id) + 
                    "/kitchen-puzzles/fornelli/animation-trigger";
  Serial.println("\n🍳 ===== PENTOLA FORNELLI =====");
  return chiamataHTTP(endpoint.c_str());
}

// ================== SETUP ==================

void setup() {
  Serial.begin(115200);
  Serial.println("\n\n=================================");
  Serial.println("ESP32 CUCINA - ANTA + PENTOLA");
  Serial.println("=================================\n");

  // Configura pin sensori come INPUT_PULLUP
  pinMode(MAG1, INPUT_PULLUP);
  pinMode(MAG2, INPUT_PULLUP);
  
  Serial.println("📌 Pin configurati:");
  Serial.println("   - MAG1 (pin 32): Anta mobile");
  Serial.println("   - MAG2 (pin 33): Pentola");

  // Connessione WiFi
  Serial.print("\n📡 Connessione WiFi a: ");
  Serial.println(ssid);
  
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
    Serial.print("   Backend: ");
    Serial.println(backend_url);
  } else {
    Serial.println("\n❌ WiFi NON connesso!");
    Serial.println("   Riavvio tra 5 secondi...");
    delay(5000);
    ESP.restart();
  }
  
  // Leggi stati iniziali
  prevMag1 = digitalRead(MAG1);
  prevMag2 = digitalRead(MAG2);
  
  Serial.println("\n📊 Stati iniziali:");
  Serial.print("   - MAG1: ");
  Serial.println(prevMag1 == LOW ? "CHIUSO (vicino)" : "APERTO (lontano)");
  Serial.print("   - MAG2: ");
  Serial.println(prevMag2 == LOW ? "CHIUSO (vicino)" : "APERTO (lontano)");
  
  Serial.println("\n✅ Sistema pronto!\n");
}

// ================== LOOP ==================

void loop() {
  // ===== MAG1: ANTA MOBILE =====
  bool currentMag1 = digitalRead(MAG1);
  
  // Rileva CAMBIAMENTO di stato (transizione)
  if (currentMag1 != prevMag1) {
    Serial.println("\n🚨 MAG1 CAMBIATO!");
    Serial.print("   Da: ");
    Serial.print(prevMag1 == LOW ? "CHIUSO" : "APERTO");
    Serial.print(" → A: ");
    Serial.println(currentMag1 == LOW ? "CHIUSO" : "APERTO");
    
    // Invia notifica animazione anta (toggle)
    notificaAnta();
    
    prevMag1 = currentMag1;
    delay(500);  // Debounce
  }
  
  // ===== MAG2: PENTOLA =====
  bool currentMag2 = digitalRead(MAG2);
  
  // Rileva CAMBIAMENTO di stato (transizione)
  if (currentMag2 != prevMag2) {
    Serial.println("\n🚨 MAG2 CAMBIATO!");
    Serial.print("   Da: ");
    Serial.print(prevMag2 == LOW ? "CHIUSO" : "APERTO");
    Serial.print(" → A: ");
    Serial.println(currentMag2 == LOW ? "CHIUSO" : "APERTO");
    
    // Invia notifica animazione pentola (solo quando si CHIUDE = pentola arriva)
    if (currentMag2 == LOW) {
      Serial.println("   → Pentola RILEVATA!");
      notificaPentola();
    } else {
      Serial.println("   → Pentola RIMOSSA");
    }
    
    prevMag2 = currentMag2;
    delay(500);  // Debounce
  }
  
  delay(100);  // Loop delay
}
