# ESP32 LED SYNCHRONIZATION SOLUTION

## 🔍 PROBLEMI IDENTIFICATI

### 1. LED Desincronizzati
- **Causa**: ESP32 non fa polling dello stato database
- **Effetto**: Quando gioco si resetta, LED ESP32 rimangono verdi
- **Root**: ESP32 solo chiama `/complete` endpoint ma non legge stato

### 2. Animazioni Non Partono  
- **Causa**: Frontend non riceve WebSocket updates da `/anta/toggle` e `/serra/animation-trigger`
- **Effetto**: Anta mobile e serra non si animano quando ESP32 triggera
- **Root**: WebSocket broadcast potrebbe non funzionare

## 💡 SOLUZIONE COMPLETA

### Strategia A: ESP32 Polling Completo (CONSIGLIATA)

**Endpoint esistente** `/api/sessions/999/kitchen-puzzles/state`:
```json
{
  "fornelli": { "status": "completed", "led_color": "green" },
  "frigo": { "status": "active", "led_color": "yellow" },
  "serra": { "status": "locked", "led_color": "red" },
  "porta": { "status": "locked", "led_color": "red" }
}
```

**ESP32 Code Update**:
```cpp
// Ogni 2 secondi pollare stato completo
void syncLEDWithBackend() {
  HTTPClient http;
  String url = String(backend_url) + "/api/sessions/" + String(session_id) + "/kitchen-puzzles/state";
  
  http.begin(url);
  int code = http.GET();
  
  if (code == 200) {
    String response = http.getString();
    
    // Parse JSON e aggiorna LED
    if (response.indexOf("\"fornelli\":{\"status\":\"completed\"") > 0) {
      digitalWrite(LED2_VERDE, HIGH);
      digitalWrite(LED2_ROSSO, LOW);
    } else {
      digitalWrite(LED2_ROSSO, HIGH);
      digitalWrite(LED2_VERDE, LOW);
    }
    
    // Same per frigo, serra, porta...
  }
  
  http.end();
}

// Nel loop, ogni 2000ms
unsigned long lastSyncTime = 0;
const unsigned long SYNC_INTERVAL = 2000;

void loop() {
  // ... existing code ...
  
  if (millis() - lastSyncTime > SYNC_INTERVAL) {
    syncLEDWithBackend();
    lastSyncTime = millis();
  }
}
```

### Strategia B: Frontend Animation Listener

**Frontend deve ascoltare WebSocket** per animazioni:

**File**: `src/hooks/useKitchenPuzzle.js`

```javascript
// Add listener for ESP32-triggered animations
useEffect(() => {
  if (!socket) return;
  
  const handleAnimationUpdate = (data) => {
    if (data.type === 'animation_update') {
      if (data.data.animation_type === 'anta_toggle') {
        // Trigger anta animation (Tasto 1)
        window.dispatchEvent(new KeyboardEvent('keydown', { key: '1' }));
      }
      
      if (data.data.animation_type === 'serra_light') {
        // Trigger serra animation (Tasto Z)
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'z' }));
      }
    }
  };
  
  socket.on('puzzle_state_update', handleAnimationUpdate);
  
  return () => {
    socket.off('puzzle_state_update', handleAnimationUpdate);
  };
}, [socket]);
```

## 🚀 IMPLEMENTAZIONE RAPIDA

### Step 1: Update ESP32 Code (5 min)
Aggiungere funzione `syncLEDWithBackend()` e chiamare ogni 2s nel loop.

### Step 2: Test Sincronizzazione (2 min)
1. Reset puzzle da frontend (Tasto K)
2. Verificare che ESP32 LED tornino rossi automaticamente

### Step 3: Fix Animazioni Frontend (3 min)
Aggiungere listener WebSocket in `useKitchenPuzzle.js` per triggerare animazioni.

### Step 4: Test Completo (5 min)
1. MAG1 apre/chiude → Anta si anima
2. MIC_PIN battito → Serra neon accende
3. Reset gioco → Tutto torna rosso

## 📊 ALTERNATIVA SEMPLICE

Se polling è troppo, **OPZIONE C: Reset Manuale**:
- Premere RESET fisico su ESP32 dopo ogni reset gioco
- Non elegante ma funziona immediatamente

## ⚡ AZIONE IMMEDIATA

Vuoi che implemento:
- **A**: Polling completo ESP32 (raccomandato, 10 min)
- **B**: Solo fix animazioni frontend (veloce, 3 min)  
- **C**: Documentazione reset manuale (immediato)

Scegli e procedo! 🎯
