/* =====================================================
   ESP32 CUCINA - SISTEMA COMPLETO (FINAL v3 FIXED)
   
   FIX IMPLEMENTATI:
   - Frigo parte APERTO (0°) invece di CHIUSO (90°)
   - Frigo si CHIUDE (90°) quando utente conferma (polling)
   - Fix loop infinito case FRIGO con flag
   - Rimozione delay(2000) bloccante con millis()
   - Gestione MAG1 per animazione anta mobile
   - Gestione MIC_PIN con notifica animazione serra
   - LED porta lampeggia quando cucina completa
   - Reset backend sincronizzato
   ===================================================== */

#include <WiFi.h>
#include <HTTPClient.h>
#include <ESP32Servo.h>

// ================= WIFI =================
const char* ssid     = "Vodafone-E23524170";
const char* password = "JtnLtfg73NXgAt9r";

// ================= BACKEND =================
const char* backend_url = "http://192.168.1.10:8001";  // ⚠️ VERIFICA PORTA! (8000 o 8001 o 3000)
const int session_id = 999;

// ================== STATI ==================
enum StatoCucina {
  FORNELLI,
  FRIGO,
  SERRA,
  COMPLETATO
};

StatoCucina stato = FORNELLI;

// ================== STATE GLOBALE ==================
bool kitchenComplete = false;
bool allRoomsComplete = false;
unsigned long lastPollTime = 0;
const unsigned long POLL_INTERVAL = 5000;  // Polling game completion ogni 5 secondi

// ========== STATI FRIGO (FIX LOOP INFINITO) ==========
bool frigoCheckStarted = false;
unsigned long frigoLastCheck = 0;
const unsigned long FRIGO_CHECK_INTERVAL = 1000;  // Check polling ogni 1 secondo

// ========== STATI ANTA MOBILE (MAG1) ==========
bool antaOpened = false;
bool antaPreviousState = false;

// ================== PIN LED ==================
#define LED1_VERDE 4    // Porta
#define LED1_ROSSO 16
#define LED2_VERDE 17   // Fornelli
#define LED2_ROSSO 5
#define LED3_VERDE 18   // Frigo
#define LED3_ROSSO 19
#define LED4_VERDE 21   // Serra
#define LED4_ROSSO 22

// ================== SERVO ==================
#define SERVO_PORTA 27
#define SERVO_FRIGO 26
Servo servoPorta;
Servo servoFrigo;

// ================== SENSORI ==================
#define MAG1 32   // Anta mobile (animazione 3D - trigger tasto 1)
#define MAG2 33   // Pentola fornelli (puzzle gameplay - trigger tasto 5)
#define MIC_PIN 25
#define STRIP_LED 23

// ================= AUDIO =================
#define CALIBRA_MS 2000
#define FINESTRA_MS 60
#define MARGINE_BATTITO 800
int rumoreFondo = 0;

// ================== HTTP HELPERS ==================

bool chiamataHTTP(const char* endpoint, const char* method = "POST") {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("❌ WiFi disconnesso!");
    return false;
  }

  HTTPClient http;
  String url = String(backend_url) + endpoint;
  Serial.print("📤 ");
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

  if (httpCode >= 200 && httpCode < 300) {
    Serial.printf("✅ HTTP %d OK\n", httpCode);
    http.end();
    return true;
  } else {
    Serial.printf("❌ HTTP %d: %s\n", httpCode, http.getString().c_str());
    http.end();
    return false;
  }
}

bool dovrebberoChiudereFrigo() {
  String e = "/api/sessions/" + String(session_id) +
             "/kitchen-puzzles/frigo/servo-state";
  HTTPClient http;
  String url = String(backend_url) + e;
  
  http.begin(url);
  http.setTimeout(3000);
  int code = http.GET();
  
  if (code == 200) {
    String p = http.getString();
    bool should_close = p.indexOf("\"should_close_servo\":true") > 0;
    http.end();
    return should_close;
  }
  http.end();
  return false;
}

// ================== NOTIFICHE ==================

bool notificaFornelli() {
  String e = "/api/sessions/" + String(session_id) +
             "/kitchen-puzzles/fornelli/complete";
  return chiamataHTTP(e.c_str());
}

bool notificaSerra() {
  String e = "/api/sessions/" + String(session_id) +
             "/kitchen-puzzles/serra/complete";
  return chiamataHTTP(e.c_str());
}

bool notificaAntaToggle() {
  String e = "/api/sessions/" + String(session_id) +
             "/kitchen-puzzles/anta/toggle";
  return chiamataHTTP(e.c_str());
}

bool notificaSerraAnimation() {
  String e = "/api/sessions/" + String(session_id) +
             "/kitchen-puzzles/serra/animation-trigger";
  return chiamataHTTP(e.c_str());
}

// ================== POLLING ==================

void checkGameCompletion() {
  if (WiFi.status() != WL_CONNECTED) return;

  HTTPClient http;
  String url = String(backend_url) + "/api/sessions/" +
               String(session_id) + "/game-completion/status";

  http.begin(url);
  http.setTimeout(3000);
  int code = http.GET();

  if (code > 0) {
    String p = http.getString();
    kitchenComplete = p.indexOf("\"kitchen_complete\":true") > 0;
    allRoomsComplete = p.indexOf("\"all_rooms_complete\":true") > 0;
  }
  http.end();
}

// ================== LED PORTA ==================

void aggiornaLEDPorta() {
  if (allRoomsComplete) {
    // ✅ Tutte le 4 stanze completate → LED VERDE fisso + porta aperta
    digitalWrite(LED1_VERDE, HIGH);
    digitalWrite(LED1_ROSSO, LOW);
    servoPorta.write(0);  // Porta aperta
  } else if (kitchenComplete) {
    // ✅ Solo cucina completata → LED ROSSO LAMPEGGIA (attesa altre stanze)
    digitalWrite(LED1_ROSSO, millis() % 1000 < 500);  // Lampeggio 0.5s ON/OFF
    digitalWrite(LED1_VERDE, LOW);
    servoPorta.write(90);  // Porta chiusa
  } else {
    // ❌ Cucina non completata → LED ROSSO fisso
    digitalWrite(LED1_ROSSO, HIGH);
    digitalWrite(LED1_VERDE, LOW);
    servoPorta.write(90);  // Porta chiusa
  }
}

// ================== AUDIO ==================

int misuraAmpiezza() {
  unsigned long s = millis();
  int minV = 4095, maxV = 0;
  while (millis() - s < FINESTRA_MS) {
    int v = analogRead(MIC_PIN);
    minV = min(minV, v);
    maxV = max(maxV, v);
  }
  return maxV - minV;
}

int calibraRumore() {
  unsigned long s = millis();
  long sum = 0; int n = 0;
  while (millis() - s < CALIBRA_MS) {
    sum += misuraAmpiezza();
    n++;
    delay(20);
  }
  return n ? sum / n : 0;
}

bool rilevaBattito() {
  return misuraAmpiezza() >= (rumoreFondo + MARGINE_BATTITO);
}

// ================== RESET ==================

void resetCucina() {
  // ✅ FIX: Reset backend PRIMA di resettare ESP32
  Serial.println("🔄 Resetting backend...");
  String e = "/api/sessions/" + String(session_id) + "/kitchen-puzzles/reset";
  HTTPClient http;
  String url = String(backend_url) + e;
  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  http.POST("{\"level\":\"full\"}");
  http.end();
  
  // Reset stati locali
  stato = FORNELLI;
  kitchenComplete = false;
  allRoomsComplete = false;
  frigoCheckStarted = false;
  antaOpened = false;
  antaPreviousState = false;

  // ✅ LED tutti rossi (puzzle non completati)
  digitalWrite(LED1_ROSSO, HIGH);
  digitalWrite(LED1_VERDE, LOW);
  digitalWrite(LED2_ROSSO, HIGH);
  digitalWrite(LED2_VERDE, LOW);
  digitalWrite(LED3_ROSSO, HIGH);
  digitalWrite(LED3_VERDE, LOW);
  digitalWrite(LED4_ROSSO, HIGH);
  digitalWrite(LED4_VERDE, LOW);

  // ✅ FIX: Frigo parte APERTO (0°) invece di CHIUSO (90°)
  servoPorta.write(90);   // Porta chiusa
  servoFrigo.write(0);    // Frigo APERTO all'inizio!
  digitalWrite(STRIP_LED, LOW);
  
  Serial.println("✅ Reset completato - Frigo APERTO");
}

// ================== SETUP ==================

void setup() {
  Serial.begin(115200);
  Serial.println("\n🚀 ESP32 Cucina - Starting...");

  pinMode(MAG1, INPUT_PULLUP);
  pinMode(MAG2, INPUT_PULLUP);
  pinMode(STRIP_LED, OUTPUT);

  pinMode(LED1_VERDE, OUTPUT);
  pinMode(LED1_ROSSO, OUTPUT);
  pinMode(LED2_VERDE, OUTPUT);
  pinMode(LED2_ROSSO, OUTPUT);
  pinMode(LED3_VERDE, OUTPUT);
  pinMode(LED3_ROSSO, OUTPUT);
  pinMode(LED4_VERDE, OUTPUT);
  pinMode(LED4_ROSSO, OUTPUT);

  servoPorta.attach(SERVO_PORTA);
  servoFrigo.attach(SERVO_FRIGO);

  // ================= CONNESSIONE WIFI CON TIMEOUT =================
  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid, password);
  
  Serial.println("\n📡 Tentativo connessione WiFi...");
  Serial.printf("   SSID: %s\n", ssid);
  Serial.println("   Password: ***************");
  Serial.print("   Connessione in corso");
  
  int tentativi = 0;
  const int MAX_TENTATIVI = 30;  // 30 x 300ms = 9 secondi max
  
  while (WiFi.status() != WL_CONNECTED && tentativi < MAX_TENTATIVI) {
    delay(300);
    Serial.print(".");
    tentativi++;
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n✅ WiFi CONNESSO!");
    Serial.print("   IP: ");
    Serial.println(WiFi.localIP());
    Serial.print("   Signal: ");
    Serial.print(WiFi.RSSI());
    Serial.println(" dBm");
  } else {
    Serial.println("\n❌ CONNESSIONE WIFI FALLITA!");
    Serial.println("\n⚠️  POSSIBILI CAUSE:");
    Serial.println("   1. SSID sbagliato (case-sensitive!)");
    Serial.println("   2. Password sbagliata");
    Serial.println("   3. Router troppo lontano o spento");
    Serial.println("   4. ESP32 supporta SOLO 2.4GHz (non 5GHz)");
    Serial.println("   5. MAC filtering attivo sul router");
    Serial.println("\n💡 SOLUZIONI:");
    Serial.println("   - Controlla credenziali WiFi nel codice");
    Serial.println("   - Avvicina ESP32 al router");
    Serial.println("   - Usa hotspot smartphone (2.4GHz) per test");
    Serial.println("\n⏸️  Sistema in pausa. Premi RESET per riprovare.");
    while (true) { delay(1000); }  // Blocca qui
  }

  // Calibrazione microfono
  Serial.println("🎤 Calibrazione microfono...");
  rumoreFondo = calibraRumore();
  Serial.printf("🎤 Rumore fondo: %d\n", rumoreFondo);
  
  // Reset iniziale
  resetCucina();
  
  Serial.println("🎮 Sistema pronto!");
}

// ================== LOOP ==================

void loop() {
  // ========== POLLING GAME COMPLETION ==========
  if (millis() - lastPollTime > POLL_INTERVAL) {
    checkGameCompletion();
    lastPollTime = millis();
  }

  // ========== AGGIORNA LED PORTA ==========
  aggiornaLEDPorta();
  
  // ========== ANTA MOBILE (MAG1) - SEMPRE ATTIVO ==========
  // Trigger animazione anta 3D (equivalente a TASTO 1 nel gioco)
  bool antaClosed = (digitalRead(MAG1) == LOW);  // LOW = chiusa, HIGH = aperta
  
  if (antaClosed != antaPreviousState) {
    // Stato cambiato!
    if (antaClosed == false) {
      // Anta fisica APERTA
      Serial.println("🗄️ Anta mobile APERTA");
      notificaAntaToggle();  // Trigger animazione frontend
      antaOpened = true;
    } else {
      // Anta fisica CHIUSA
      Serial.println("🗄️ Anta mobile CHIUSA");
      notificaAntaToggle();  // Trigger animazione frontend
      antaOpened = false;
    }
    antaPreviousState = antaClosed;
  }

  // ========== FSM PUZZLE GAMEPLAY ==========
  switch (stato) {

    case FORNELLI:
      // ✅ Pentola sollevata → completa puzzle fornelli
      // (Equivalente a TASTO 5 nel gioco)
      if (digitalRead(MAG2) == LOW && notificaFornelli()) {
        digitalWrite(LED2_VERDE, HIGH);
        digitalWrite(LED2_ROSSO, LOW);
        Serial.println("🔥 Fornelli completati!");
        stato = FRIGO;
      }
      break;

    case FRIGO:
      // ✅ FIX: Polling per chiusura frigo (OPZIONE B)
      // Frigo è già APERTO (0°) all'inizio
      // Aspetta che utente clicchi "SI" nel frontend
      
      if (!frigoCheckStarted) {
        Serial.println("🧊 Stato FRIGO - Frigo è APERTO, aspetto chiusura utente...");
        frigoCheckStarted = true;
        frigoLastCheck = millis();
      }
      
      // ✅ Polling ogni 1 secondo: verifica se backend dice "chiudi"
      if (millis() - frigoLastCheck > FRIGO_CHECK_INTERVAL) {
        if (dovrebberoChiudereFrigo()) {
          // ✅ Utente ha confermato chiusura → CHIUDI SERVO!
          servoFrigo.write(90);  // Da 0° (aperto) → 90° (chiuso)
          
          // ✅ LED verde (puzzle completato)
          digitalWrite(LED3_VERDE, HIGH);
          digitalWrite(LED3_ROSSO, LOW);
          
          Serial.println("🔒 Frigo CHIUSO (user confirmed) + LED verde!");
          stato = SERRA;
        }
        frigoLastCheck = millis();
      }
      break;

    case SERRA:
      // ✅ Microfono rileva battito → completa puzzle serra
      // (Equivalente a TASTO Z nel gioco)
      if (rilevaBattito()) {
        // ✅ NUOVO: Notifica animazione neon serra
        notificaSerraAnimation();
        
        // ✅ Completa puzzle serra
        if (notificaSerra()) {
          digitalWrite(LED4_VERDE, HIGH);
          digitalWrite(LED4_ROSSO, LOW);
          digitalWrite(STRIP_LED, HIGH);  // Accendi strip LED fisica
          kitchenComplete = true;
          stato = COMPLETATO;
          Serial.println("🌿 Serra completata + animazione neon triggered!");
          Serial.println("🎉 CUCINA COMPLETATA!");
        }
      }
      break;

    case COMPLETATO:
      // Nulla da fare, LED porta lampeggerà automaticamente
      // grazie ad aggiornaLEDPorta()
      break;
  }

  delay(50);  // Delay minimo per stabilità
}
