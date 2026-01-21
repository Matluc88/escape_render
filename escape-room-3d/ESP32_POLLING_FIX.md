# Fix: ESP32 Polling Fallito

## 🔍 Problema Identificato

L'ESP32 della cucina mostrava ripetutamente nel serial monitor:
```
⚠️ Polling fallito
```

### Causa Root

L'ESP32 tentava di chiamare un endpoint che **non esisteva** nel backend:

- **ESP32 chiamava:** `/api/sessions/999/game-completion/status`
- **Backend aveva solo:** `/api/sessions/{session_id}/game-completion/state`

Il codice ESP32 (`checkGameCompletion()`) cercava un endpoint semplificato per ottenere lo stato delle stanze, ma non trovandolo riceveva HTTP 404.

## ✅ Soluzione Implementata

### Nuovo Endpoint Creato

**File:** `backend/app/api/game_completion.py`

Aggiunto nuovo endpoint GET specifico per ESP32:

```python
@router.get("/sessions/{session_id}/game-completion/status")
def get_game_completion_status_esp32(
    session_id: int,
    db: Session = Depends(get_db)
):
    """
    Simplified endpoint for ESP32 polling.
    
    Returns minimal JSON:
    {
        "kitchen_complete": true/false,
        "bedroom_complete": true/false,
        "livingroom_complete": true/false,
        "bathroom_complete": true/false,
        "all_rooms_complete": true/false
    }
    """
    try:
        state = GameCompletionService.get_or_create_state(db, session_id)
        
        return {
            "kitchen_complete": state.rooms_status.get("cucina", {}).get("completed", False),
            "bedroom_complete": state.rooms_status.get("camera", {}).get("completed", False),
            "livingroom_complete": state.rooms_status.get("soggiorno", {}).get("completed", False),
            "bathroom_complete": state.rooms_status.get("bagno", {}).get("completed", False),
            "all_rooms_complete": state.game_won
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
```

### Caratteristiche del Nuovo Endpoint

✅ **URL corretto:** `/api/sessions/999/game-completion/status`
✅ **JSON minimalista:** Solo i booleani necessari all'ESP32
✅ **Veloce:** Nessun overhead di serializzazione complessa
✅ **Compatibile:** Funziona con il parsing JSON semplificato dell'ESP32

## 🔄 Come Attivare il Fix

### 1. Riavvia il Backend

Il backend deve essere riavviato per caricare il nuovo endpoint:

```bash
# Se usi Docker
cd escape-room-3d
docker-compose restart backend

# Se usi sviluppo locale
cd escape-room-3d/backend
# Ctrl+C per fermare uvicorn
python -m uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload
```

### 2. Verifica l'Endpoint

Testa che l'endpoint risponda correttamente:

```bash
curl http://192.168.1.10:8001/api/sessions/999/game-completion/status
```

**Output atteso:**
```json
{
    "kitchen_complete": false,
    "bedroom_complete": false,
    "livingroom_complete": false,
    "bathroom_complete": false,
    "all_rooms_complete": false
}
```

### 3. Ricarica l'ESP32

Una volta che l'endpoint è attivo:
1. Riavvia l'ESP32 (pulsante reset o ri-carica il codice)
2. Apri il Serial Monitor (115200 baud)
3. Verifica che vedi:

**✅ Output corretto:**
```
📊 Kitchen: ❌ | All: ❌
```

**❌ NON dovresti più vedere:**
```
⚠️ Polling fallito
```

## 🧪 Test Completo

### 1. Test Endpoint Vuoto (Nessuna stanza completata)

```bash
curl http://192.168.1.10:8001/api/sessions/999/game-completion/status
```

Risposta:
```json
{
    "kitchen_complete": false,
    "bedroom_complete": false,
    "livingroom_complete": false,
    "bathroom_complete": false,
    "all_rooms_complete": false
}
```

### 2. Test Endpoint con Cucina Completata

Completa l'enigma serra:
```bash
curl -X POST http://192.168.1.10:8001/api/sessions/999/kitchen-puzzles/serra/complete
```

Poi verifica lo stato:
```bash
curl http://192.168.1.10:8001/api/sessions/999/game-completion/status
```

Risposta:
```json
{
    "kitchen_complete": true,
    "bedroom_complete": false,
    "livingroom_complete": false,
    "bathroom_complete": false,
    "all_rooms_complete": false
}
```

**Serial Monitor ESP32 dovrebbe mostrare:**
```
📊 Kitchen: ✅ | All: ❌
```

### 3. Test LED Porta

Con cucina completata, il LED porta della cucina dovrebbe:
- **Lampeggiare ROSSO** (1 Hz) → indica cucina completa, aspetta altre stanze

Quando tutte le 4 stanze sono complete:
- **Verde FISSO** → porta si apre!

## 📋 Codice ESP32 (Riferimento)

Il codice ESP32 esegue polling ogni 5 secondi:

```cpp
void checkGameCompletion() {
  if (WiFi.status() != WL_CONNECTED) return;
  
  HTTPClient http;
  String url = String(backend_url) + "/api/sessions/" + 
               String(session_id) + "/game-completion/status";
  
  http.begin(url);
  http.setTimeout(3000);
  int httpCode = http.GET();
  
  if (httpCode == 200) {
    String payload = http.getString();
    
    // Parse JSON semplice (cerca stringhe)
    kitchenComplete = payload.indexOf("\"kitchen_complete\":true") > 0 ||
                      payload.indexOf("\"kitchen_complete\": true") > 0;
    allRoomsComplete = payload.indexOf("\"all_rooms_complete\":true") > 0 ||
                       payload.indexOf("\"all_rooms_complete\": true") > 0;
    
    Serial.print("📊 Kitchen: ");
    Serial.print(kitchenComplete ? "✅" : "❌");
    Serial.print(" | All: ");
    Serial.println(allRoomsComplete ? "✅" : "❌");
  } else {
    Serial.println("⚠️ Polling fallito");
  }
  
  http.end();
}
```

## 🎯 Comportamento Atteso

### Stato Iniziale (Nessun enigma risolto)
- Serial: `📊 Kitchen: ❌ | All: ❌`
- LED Porta: **ROSSO FISSO**

### Fornelli Completato
- Serial: `📊 Kitchen: ❌ | All: ❌` (cucina non ancora completa)
- LED Porta: **ROSSO FISSO**

### Frigo Completato
- Serial: `📊 Kitchen: ❌ | All: ❌` (cucina non ancora completa)
- LED Porta: **ROSSO FISSO**

### Serra Completata (Cucina completa!)
- Serial: `📊 Kitchen: ✅ | All: ❌`
- LED Porta: **ROSSO LAMPEGGIANTE** (1 Hz)

### Tutte 4 Stanze Complete
- Serial: `📊 Kitchen: ✅ | All: ✅`
- LED Porta: **VERDE FISSO**
- Servo Porta: **APERTO** (0°)

## 🔧 Troubleshooting

### Problema: Ancora "Polling fallito"

**Causa 1: Backend non riavviato**
```bash
# Verifica che il backend sia attivo con il nuovo endpoint
curl http://192.168.1.10:8001/api/sessions/999/game-completion/status
```

Se ricevi 404 → riavvia il backend.

**Causa 2: IP errato nell'ESP32**
```cpp
const char* backend_url = "http://192.168.1.10:8001";  // Verifica questo IP!
```

Assicurati che corrisponda all'IP del computer/server dove gira il backend.

**Causa 3: Firewall blocca porta 8001**
```bash
# macOS
sudo lsof -i :8001

# Windows
netstat -ano | findstr :8001
```

### Problema: Serial mostra Kitchen: ✅ ma LED non lampeggia

Verifica che `aggiornaLEDPorta()` sia chiamata nel loop principale:

```cpp
void loop() {
  // 🔄 POLLING ogni 5 secondi
  if (millis() - lastPollTime > POLL_INTERVAL) {
    checkGameCompletion();
    lastPollTime = millis();
  }
  
  // 🚪 LED PORTA (chiamato ogni ciclo per lampeggio fluido)
  aggiornaLEDPorta();  // ← IMPORTANTE: deve essere qui!
  
  // ... resto del codice
}
```

### Problema: JSON non parsato correttamente

L'ESP32 usa un parser JSON semplificato con `indexOf()`. Assicurati che il JSON contenga esattamente:
- `"kitchen_complete":true` oppure `"kitchen_complete": true` (con spazio)
- `"all_rooms_complete":true` oppure `"all_rooms_complete": true`

## ✅ Stato Fix

- **Data Fix**: 08/01/2026
- **Stato**: ✅ Completato
- **File Modificati**: `backend/app/api/game_completion.py`
- **Endpoint Creato**: `GET /api/sessions/{session_id}/game-completion/status`
- **Testing**: ⏳ In attesa di riavvio backend + test ESP32

## 📚 Riferimenti

- **Guida ESP32**: `ESP32_INTEGRATION_GUIDE.md`
- **Logica LED Porta**: `GAME_COMPLETION_LED_LOGIC.md`
- **Sistema Game Completion**: `GAME_COMPLETION_SYSTEM_GUIDE.md`
