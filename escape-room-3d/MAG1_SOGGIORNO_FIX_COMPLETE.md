# 🧲 MAG1 SOGGIORNO - FIX COMPLETO

**Data:** 15/01/2026
**Problema:** MAG1 (P33) nel soggiorno non triggera l'animazione del divano quando si avvicina il magnete

## 🔍 ANALISI DEL PROBLEMA

Ho confrontato l'implementazione di MAG1 tra cucina e soggiorno:

### ✅ CUCINA (FUNZIONA) - MAG2 su PIN 33

```cpp
bool notificaFornelli() {
  String e = "/api/sessions/" + String(session_id) +
             "/kitchen-puzzles/fornelli/complete";
  return chiamataHTTP(e.c_str());
}

bool chiamataHTTP(const char* endpoint, const char* method = "POST") {
  HTTPClient http;
  http.begin(url);
  http.addHeader("Content-Type", "application/json");  // ✅ HEADER!
  httpCode = http.POST("{}");  // ✅ BODY JSON!
  return (httpCode > 0 && httpCode < 300);
}
```

### ❌ SOGGIORNO (NON FUNZIONAVA) - MAG1 su PIN 33

```cpp
void checkMagneticSensor() {
  if (sensorState == LOW && !mag1_triggered) {
    HTTPClient http;
    String url = String(backend_url) + "/api/sessions/" + 
                 String(session_id) + "/livingroom-puzzles/tv/complete";
    
    http.begin(url);
    int httpCode = http.POST("");  // ❌ STRINGA VUOTA!
    //                              ❌ NESSUN HEADER JSON!
  }
}
```

## 🔴 CAUSA ROOT

Il soggiorno faceva `http.POST("")` **senza:**
1. ❌ Header `Content-Type: application/json`
2. ❌ Body JSON `{}`

Il backend probabilmente rifiutava la richiesta perché mancava il content-type corretto o si aspettava un body JSON valido.

## ✅ SOLUZIONE APPLICATA

Ho modificato `esp32-soggiorno-RASPBERRY-MAG1-BLINKING-FIX.ino` nella funzione `checkMagneticSensor()`:

```cpp
void checkMagneticSensor() {
  // ...
  if (sensorState == LOW && !mag1_triggered) {
    HTTPClient http;
    String url = String(backend_url) + "/api/sessions/" + 
                 String(session_id) + "/livingroom-puzzles/tv/complete";
    
    http.begin(url);
    http.setTimeout(5000);
    http.addHeader("Content-Type", "application/json");  // ✅ FIX!
    int httpCode = http.POST("{}");  // ✅ FIX!
    
    if (httpCode == 200) {
      Serial.println("✅ TV puzzle completato via MAG1!");
      mag1_triggered = true;
      lastMag1Trigger = now;
    }
  }
}
```

## 📋 MODIFICHE APPLICATE

**File modificato:** `escape-room-3d/esp32-soggiorno-RASPBERRY-MAG1-BLINKING-FIX.ino`

**Linee modificate:**
- Aggiunto `http.setTimeout(5000);` per timeout esplicito
- Aggiunto `http.addHeader("Content-Type", "application/json");`
- Cambiato `http.POST("")` in `http.POST("{}")`

## 🧪 TEST NECESSARI

1. **Carica il codice su ESP32:**
   ```bash
   # Usa Arduino IDE o PlatformIO per uploadare il file
   # esp32-soggiorno-RASPBERRY-MAG1-BLINKING-FIX.ino
   ```

2. **Verifica log seriale:**
   - Apri Serial Monitor a 115200 baud
   - Avvicina magnete a P33
   - Dovresti vedere:
     ```
     🧲 ===== MAG1 TRIGGER RILEVATO =====
     📡 POST http://192.168.8.10:8001/api/sessions/999/livingroom-puzzles/tv/complete
     ✅ TV puzzle completato via MAG1!
     ```

3. **Verifica animazione:**
   - Il divano dovrebbe ruotare automaticamente
   - La TV dovrebbe accendersi (LED P23 bianco)
   - LED pianta dovrebbe diventare rosso dopo 2s

## 🎯 PERCHÉ LA CUCINA FUNZIONAVA

La cucina ha **2 sensori magnetici:**
- **MAG1 (P32):** Anta decorativa - Solo animazione 3D
- **MAG2 (P33):** Pentola fornelli - **Completa puzzle**

Entrambi usano la stessa funzione `chiamataHTTP()` che include header e body JSON corretti.

## 🔧 CONFRONTO FINALE

| Aspetto | Cucina (prima) | Soggiorno (prima) | Soggiorno (dopo) |
|---------|----------------|-------------------|------------------|
| Header JSON | ✅ `Content-Type` | ❌ Mancante | ✅ `Content-Type` |
| Body JSON | ✅ `"{}"` | ❌ `""` vuoto | ✅ `"{}"` |
| Timeout | ✅ 5000ms | ❌ Default | ✅ 5000ms |
| Funziona | ✅ SI | ❌ NO | ✅ **DOVREBBE** |

## 📝 NOTE

- Il fix è stato applicato **solo** al file con MAG1 implementato
- Il file base `esp32-soggiorno-RASPBERRY-FIXED.ino` **non ha MAG1** (solo polling LED)
- Assicurati di caricare la versione corretta su ESP32

## 🚀 PROSSIMI PASSI

1. ✅ Fix applicato al codice
2. ⏳ Carica su ESP32 soggiorno
3. ⏳ Test con magnete fisico
4. ⏳ Verifica animazione divano + TV
5. ⏳ Conferma con frontend WebSocket

---

**Status:** ✅ FIX PRONTO PER TEST