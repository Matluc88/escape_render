# 🔄 Sistema Auto-Reset Scene al Caricamento

**Data implementazione:** 30 Dicembre 2025  
**Versione:** 1.0

## 📋 Panoramica

Ogni scena con enigmi ora **resetta automaticamente** tutti i puzzle al caricamento, simulando la pressione del tasto `R`.

## ✅ Implementazione Completata

### 🎯 Backend
**File:** `backend/app/services/game_completion_service.py`

✅ **GIÀ CORRETTO!** La logica per-room era già implementata:
- Ogni LED porta è indipendente
- Room completata → LED lampeggia 🟢⚡
- Tutte 4 completate → LED verde fisso 🟢

```python
def get_door_led_states(db: Session, session_id: int) -> Dict[str, str]:
    """
    Logica PER-ROOM con vittoria GLOBALE:
    - Room non completata → "red"
    - Room completata, game non vinto → "blinking" (solo questa room)
    - Game vinto (tutte 4) → "green" (tutte le room)
    """
```

### 🍳 KitchenScene
**File:** `src/components/scenes/KitchenScene.jsx`

```javascript
// 🔄 AUTO-RESET al caricamento scena
useEffect(() => {
  if (resetPuzzles) {
    console.log('[KitchenScene] 🔄 Auto-reset al mount')
    resetPuzzles('full')
    // Reset anche animazioni locali
    setPentolaSuiFornelli(false)
    setFridgeDoorOpen(true)
    setNeonSerraAcceso(false)
  }
}, []) // Solo al mount
```

**Stato iniziale dopo reset:**
- ✅ Pentola: in mobile (non sui fornelli)
- ✅ Frigo: aperto
- ✅ Serra: spenta
- ✅ LED: tutti rossi 🔴

### 🛏️ BedroomScene
**File:** `src/components/scenes/BedroomScene.jsx`

```javascript
// 🔄 AUTO-RESET al caricamento scena
useEffect(() => {
  if (bedroomPuzzle.resetPuzzles) {
    console.log('[BedroomScene] 🔄 Auto-reset al mount')
    bedroomPuzzle.resetPuzzles('full')
    // Reset anche stati locali
    setLampadaAccesa(false)
    setBookcaseVisible(false)
    setPortaFinestraOpen(true)
    setHotAirActive(false)
  }
}, []) // Solo al mount
```

**Stato iniziale dopo reset:**
- ✅ Lampada: spenta
- ✅ Libreria: nascosta (Humano visibile)
- ✅ Porta-finestra: aperta (30°)
- ✅ Aria calda: disattivata
- ✅ LED: tutti rossi 🔴

### 🚪 EsternoScene
**Status:** ✅ Nessun puzzle system implementato

Non richiede auto-reset perché non ha enigmi.

### 🚿 BathroomScene
**Status:** ⏳ Da implementare quando verranno aggiunti gli enigmi

### 🛋️ LivingRoomScene
**Status:** ⏳ Da implementare quando verranno aggiunti gli enigmi

## 🎮 Flusso Utente

### Prima (Manuale)
1. Utente entra in una scena
2. Vede stato precedente (enigmi parzialmente risolti)
3. **Deve premere R manualmente** per resettare

### Ora (Automatico)
1. Utente entra in una scena
2. ✨ **Reset automatico al caricamento**
3. Stato sempre pulito e coerente

## 🔑 Vantaggi

### ✅ Esperienza Utente
- Stato sempre fresco e pulito
- Non serve ricordare di premere R
- Evita confusione da stati intermedi

### ✅ Coerenza Sistema
- Stato sincronizzato tra frontend e backend
- LED sempre allineati con stato puzzle
- Database sempre aggiornato

### ✅ Debug Semplificato
- Ogni reload = reset completo
- Facile testare da zero
- No stati inconsistenti

## 🧪 Testing

### Test Manuale
1. **Completa parzialmente enigma in una scena** (es: solo pentola in cucina)
2. **Cambia scena** (vai in camera)
3. **Torna alla scena precedente** (torna in cucina)
4. **Verifica:** Tutto resettato ✅

### Test Verifica LED
1. Completa tutti enigmi cucina → LED porta lampeggia 🟢⚡
2. Ricarica pagina → LED torna rosso 🔴
3. Completa tutte 4 stanze → LED tutte verdi 🟢

## 📊 Statistiche Reset

| Scena | Enigmi | Reset Items | LED Resetted |
|-------|--------|-------------|--------------|
| Cucina | 3 | Pentola, Frigo, Serra | 4 (3+porta) |
| Camera | 4 | Materasso, Poltrona, Ventola, Comodino | 5 (4+porta) |
| Esterno | 0 | - | 0 |
| Bagno | TBD | TBD | TBD |
| Soggiorno | TBD | TBD | TBD |

## 🚨 Note Importanti

### ⚠️ Race Condition Prevenuta
Reset avviene **solo al mount** (`useEffect` con `[]` dependencies), quindi:
- Non si trigghera durante navigazione interna
- Non interferisce con animazioni in corso
- Non causa loop infiniti

### ⚠️ Sincronizzazione Backend
Il reset chiama sempre il backend per mantenere coerenza:
```javascript
resetPuzzles('full') // → API call → Database update → WebSocket broadcast
```

## 🔮 Sviluppi Futuri

### Quando implementare in altre scene:
1. **Aggiungere hook puzzle** (es: `useBathroomPuzzle`)
2. **Copiare pattern auto-reset** da KitchenScene/BedroomScene
3. **Verificare stati locali** da resettare
4. **Testare** reload e navigazione

### Pattern Template:
```javascript
// In [SceneName]Scene.jsx
const { resetPuzzles } = use[SceneName]Puzzle(sessionId, socket)

useEffect(() => {
  if (resetPuzzles) {
    console.log('[SceneName] 🔄 Auto-reset al mount')
    resetPuzzles('full')
    // Reset anche stati locali specifici
    setLocalState1(initialValue1)
    setLocalState2(initialValue2)
  }
}, []) // Solo al mount
```

## ✅ Checklist Completamento

- [x] Backend logica per-room verificata
- [x] Auto-reset KitchenScene implementato
- [x] Auto-reset BedroomScene implementato
- [x] EsternoScene verificato (no enigmi)
- [x] Documentazione creata
- [x] Fix race condition LED (update immediato dopo reset)
- [x] Test end-to-end completo ✅
- [ ] Deploy in produzione

### 🐛 Bug Risolti
- **Race condition LED**: I LED mostravano lo stato precedente (verde) perché `fetchInitialState` caricava PRIMA del completamento del reset
- **Fix applicato**: `resetPuzzles()` ora aggiorna immediatamente `setPuzzleStates` e `setLedStates` con la risposta API
- **Risultato**: LED corretti al caricamento (rosso per fornelli, off per frigo/serra) ✅

---

**Sistema pronto per produzione! 🚀**
