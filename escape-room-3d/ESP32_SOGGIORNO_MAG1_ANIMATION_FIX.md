# 🎭 ESP32 SOGGIORNO MAG1 - FIX ANIMAZIONE MANCANTE

## 📋 PROBLEMA IDENTIFICATO

### ✅ TASTO M (keyboard) fa 3 cose:
```javascript
// 1. Triggera animazione
setLivingRoomAnimState('opening')
setIsLivingRoomAnimPlaying(true)

// 2. Accende TV virtuale  
setTvAccesa(true)

// 3. Chiama backend
livingRoomPuzzle.completeTV()
```

### ⚠️ MAG1 (sensore fisico) fa SOLO:
```arduino
// ESP32 chiama endpoint
POST /api/sessions/{sessionId}/livingroom-puzzles/tv/complete
```

**Il backend emette WebSocket**, ma il **frontend NON ascolta** per triggerare animazioni!

---

## 🔍 ANALISI DETTAGLIATA

### Backend (✅ CORRETTO):
- `livingroom_puzzle_service.py` → `complete_tv()` emette:
  ```python
  await broadcast_to_session(
      session_id=session_id,
      event="puzzle_state_update",
      data=response
  )
  ```

### Frontend Hook (❌ INCOMPLETO):
- `useLivingRoomPuzzle.js` ascolta `puzzle_state_update`
- Aggiorna SOLO `puzzleState` (LED)
- **NON triggera animazioni!**

### Frontend Scene (❌ MANCA LOGICA):
- `LivingRoomScene.jsx` NON ha `useEffect` per:
  - Monitorare `livingRoomPuzzle.tvStatus`
  - Triggerare animazione quando cambia "active" → "completed"

---

## 🔧 SOLUZIONE

Aggiungere `useEffect` in `LivingRoomScene.jsx`:

```javascript
// 🎭 AUTO-TRIGGER ANIMAZIONE quando MAG1 completa TV (via WebSocket)
useEffect(() => {
  // Guard: Evita loop infiniti
  const tvCompletedRef = useRef(false)
  
  if (livingRoomPuzzle.tvStatus === 'completed' && 
      livingRoomAnimState === 'closed' && 
      !tvCompletedRef.current) {
    
    console.log('[LivingRoomScene] 🧲 MAG1 triggered! Auto-starting animation...')
    tvCompletedRef.current = true
    
    // Esegue le STESSE azioni del tasto M
    setLivingRoomAnimState('opening')
    setIsLivingRoomAnimPlaying(true)
    setTvAccesa(true)
    
    // Mostra messaggio completamento
    setMessaggioCompletamento(true)
    setTimeout(() => setMessaggioCompletamento(false), 4000)
  }
}, [livingRoomPuzzle.tvStatus, livingRoomAnimState])
```

---

## ✅ RISULTATO ATTESO

Dopo il fix:
1. **MAG1 rileva oggetto** → POST backend
2. **Backend** → WebSocket `puzzle_state_update`
3. **Frontend hook** → Aggiorna `tvStatus: "completed"`
4. **Frontend Scene** → **useEffect triggera animazione automaticamente** ✨
5. **Utente vede**:
   - Divano che ruota
   - TV che si accende
   - LED pianta diventa rosso

---

## 🎯 IMPLEMENTAZIONE

### Posizione nel codice:
- **File**: `src/components/scenes/LivingRoomScene.jsx`
- **Riga**: ~850 (dopo gli altri useEffect dei messaggi automatici)
- **Sezione**: Prima del keyboard listener

### Dependencies necessarie:
```javascript
const prevTvStatusRef = useRef(null)
```

### Logica completa con guard anti-loop:
```javascript
// 🎭 AUTO-TRIGGER ANIMAZIONE - MAG1 WebSocket listener
useEffect(() => {
  const currentTvStatus = livingRoomPuzzle.tvStatus
  
  // Rileva TRANSIZIONE active → completed
  if (prevTvStatusRef.current === 'active' && 
      currentTvStatus === 'completed' &&
      livingRoomAnimState === 'closed') {
    
    console.log('[LivingRoomScene] 🧲 MAG1 WebSocket: TV completata! Avvio animazione...')
    
    // Identico al tasto M
    setLivingRoomAnimState('opening')
    setIsLivingRoomAnimPlaying(true)
    setTvAccesa(true)
    
    // Messaggio successo
    setMessaggioCompletamento(true)
    setTimeout(() => setMessaggioCompletamento(false), 4000)
  }
  
  // Aggiorna ref per prossimo confronto
  prevTvStatusRef.current = currentTvStatus
  
}, [livingRoomPuzzle.tvStatus, livingRoomAnimState])
```

---

## 🧪 TEST

### Scenario 1: Tasto M (già funzionante)
1. Premi M → Animazione + TV + Backend ✅

### Scenario 2: MAG1 (dopo fix)
1. MAG1 rileva oggetto
2. ESP32 → POST backend
3. Backend → WebSocket
4. Frontend → **useEffect triggera animazione** ✅

### Scenario 3: Evita duplicati
- Se premi M quando MAG1 già completato → Nessun conflitto (guard controlla `livingRoomAnimState`)

---

## 📝 CHECKLIST DEPLOY

- [ ] Aggiungi `useEffect` con guard anti-loop
- [ ] Aggiungi `prevTvStatusRef = useRef(null)` nella sezione refs
- [ ] Testa con tasto M (verifica che continui a funzionare)
- [ ] Testa con MAG1 fisico su Raspberry
- [ ] Rebuild frontend + backend
- [ ] Deploy su Raspberry
- [ ] Verifica animazione automatica in produzione

---

## 🚀 COMANDI DEPLOY RASPBERRY

```bash
cd /Users/matteo/Desktop/ESCAPE/escape-room-3d

# 1. Rebuild completo
docker-compose build --no-cache

# 2. Deploy su Raspberry
./deploy-404fix.sh
```

---

## 📌 NOTE IMPORTANTI

1. **Pattern identico ad altre stanze**: Cucina, Camera, Bagno usano lo stesso sistema
2. **Nessun impatto sul tasto M**: Continua a funzionare normalmente
3. **Guard anti-loop essenziale**: Usa `prevTvStatusRef` per evitare trigger multipli
4. **Messaggi automatici**: Dopo fix, MAG1 triggera anche i messaggi di completamento

---

Data: 14/01/2026 22:33
Status: **DA IMPLEMENTARE**
