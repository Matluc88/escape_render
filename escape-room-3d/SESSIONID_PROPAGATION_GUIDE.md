# 🎯 Guida Propagazione SessionId - Pattern Corretto per Tutte le Stanze

**Data:** 02/01/2026  
**Status:** ✅ REGOLA OBBLIGATORIA

---

## 🚨 Problema Comune: SessionId Hardcoded

### ❌ ERRORE FREQUENTE
Molte scene hanno il sessionId hardcoded a `1`, ignorando il parametro URL:

```javascript
export default function BedroomScene({ onObjectClick, mobileInput, isMobile = false }) {
  const sessionId = 1 // ❌ ERRORE: Ignora URL /play/999/camera
  const { socket } = useWebSocket(sessionId, 'camera', 'DevPlayer')
  // ...
}
```

### ⚠️ Conseguenze
- ✗ URL `/play/999/camera` usa sessione 1 invece di 999
- ✗ Ogni stanza usa sempre sessione 1
- ✗ Impossibile testare con sessione dedicata (es. 999)
- ✗ Sistema multi-sessione non funziona correttamente

---

## ✅ Soluzione Corretta: Props Pattern

### 1️⃣ RoomScene.jsx (Parent) - Estrae sessionId da URL

**File:** `src/pages/RoomScene.jsx`

```javascript
import { useParams } from 'react-router-dom'

function RoomScene() {
  // ✅ Estrai sessionId dai parametri URL
  const params = useParams()
  const sessionId = parseInt(params.sessionId, 10) || 1
  
  console.log('[RoomScene] 🎯 Session ID from URL:', sessionId)
  
  return (
    <div>
      {activeScene === 'camera' && (
        <BedroomScene
          sessionId={sessionId} // ✅ PASSA sessionId come prop
          onObjectClick={handleObjectClick}
          mobileInput={mobileInput}
          isMobile={isMobile}
        />
      )}
      {activeScene === 'kitchen' && (
        <KitchenScene
          sessionId={sessionId} // ✅ PASSA sessionId come prop
          onObjectClick={handleObjectClick}
          mobileInput={mobileInput}
          isMobile={isMobile}
        />
      )}
      {/* ... altre scene ... */}
    </div>
  )
}
```

### 2️⃣ Scene Components - Accettano sessionId come Prop

**File:** `src/components/scenes/BedroomScene.jsx` (e altre scene)

```javascript
// ✅ CORRETTO: Accetta sessionId come prop con default fallback
export default function BedroomScene({ 
  onObjectClick, 
  onLookAtChange, 
  mobileInput, 
  isMobile = false, 
  sessionId = 1 // ✅ Default fallback per retrocompatibilità
}) {
  // ✅ RIMUOVI questa riga se esiste:
  // const sessionId = 1 // ❌ NON fare questo!
  
  // ✅ Usa direttamente il sessionId dalla prop
  const { socket } = useWebSocket(sessionId, 'camera', 'DevPlayer')
  const bedroomPuzzle = useBedroomPuzzle(sessionId, socket)
  const gameCompletion = useGameCompletion(sessionId, socket)
  
  console.log('[BedroomScene] 🎯 Using Session ID:', sessionId)
  
  // ... resto del codice
}
```

---

## 📋 Checklist per Ogni Stanza

Quando crei o modifichi una scena, segui questa checklist:

### ✅ Frontend - Scene Component

**File da verificare:**
- `src/components/scenes/BedroomScene.jsx`
- `src/components/scenes/KitchenScene.jsx`
- `src/components/scenes/BathroomScene.jsx`
- `src/components/scenes/LivingRoomScene.jsx`
- `src/components/scenes/EsternoScene.jsx`

**Cosa controllare:**

1. ✅ **Props signature** include `sessionId`
   ```javascript
   export default function NomeScene({ 
     onObjectClick, 
     mobileInput, 
     isMobile = false, 
     sessionId = 1 // ✅ DEVE essere presente
   }) {
   ```

2. ✅ **NO sessionId hardcoded** dentro il componente
   ```javascript
   // ❌ RIMUOVI queste righe se esistono:
   // const sessionId = 1
   // const sessionId = 999
   ```

3. ✅ **Usa sessionId dalla prop** in tutti gli hook
   ```javascript
   // ✅ CORRETTO
   const { socket } = useWebSocket(sessionId, 'room_name', 'DevPlayer')
   const puzzleHook = useRoomPuzzle(sessionId, socket)
   const gameCompletion = useGameCompletion(sessionId, socket)
   ```

4. ✅ **Log per debug**
   ```javascript
   console.log('[NomeScene] 🎯 Using Session ID:', sessionId)
   ```

### ✅ Frontend - RoomScene.jsx

**File:** `src/pages/RoomScene.jsx`

1. ✅ **Import useParams**
   ```javascript
   import { useParams } from 'react-router-dom'
   ```

2. ✅ **Estrai sessionId da URL**
   ```javascript
   const params = useParams()
   const sessionId = parseInt(params.sessionId, 10) || 1
   ```

3. ✅ **Passa sessionId a TUTTE le scene**
   ```javascript
   <BedroomScene sessionId={sessionId} ... />
   <KitchenScene sessionId={sessionId} ... />
   <BathroomScene sessionId={sessionId} ... />
   // etc...
   ```

---

## 🔍 Come Verificare

### Test 1: Sessione Normale
```bash
# Apri URL con sessione normale
http://localhost:5174/play/123/camera?name=Test

# Console dovrebbe mostrare:
# [RoomScene] 🎯 Session ID from URL: 123
# [BedroomScene] 🎯 Using Session ID: 123
```

### Test 2: Sessione 999 (Test)
```bash
# Apri URL con sessione di test
http://localhost:5174/play/999/kitchen?name=Tester

# Console dovrebbe mostrare:
# [RoomScene] 🎯 Session ID from URL: 999
# [KitchenScene] 🎯 Using Session ID: 999
```

### Test 3: Verifica Backend
Controlla i log del backend:
```bash
cd escape-room-3d/backend
docker-compose logs -f --tail=50 backend | grep "Session"

# Dovresti vedere:
# [SessionService] get_session(999)
# [WebSocket] Client connected to session 999
```

---

## 🐛 Debug: Come Trovare il Bug

Se una stanza non usa il sessionId corretto:

### 1. Verifica Console Browser
Cerca questi log (F12 → Console):
```
[RoomScene] 🎯 Session ID from URL: 999
[NomeScene] 🎯 Using Session ID: 1  ← ❌ ERRORE! Dovrebbe essere 999
```

### 2. Controlla il Codice
```javascript
// ❌ ERRORE: sessionId hardcoded
export default function NomeScene({ onObjectClick, mobileInput }) {
  const sessionId = 1 // ← TROVATO IL BUG!
  // ...
}

// ✅ CORRETTO: sessionId da props
export default function NomeScene({ onObjectClick, mobileInput, sessionId = 1 }) {
  // Usa sessionId dalla prop
  const { socket } = useWebSocket(sessionId, ...)
}
```

### 3. Verifica RoomScene Passa Prop
```javascript
// ❌ ERRORE: sessionId non passato
<BedroomScene
  onObjectClick={handleObjectClick}
  mobileInput={mobileInput}
  // sessionId mancante!
/>

// ✅ CORRETTO
<BedroomScene
  sessionId={sessionId}  // ← Aggiungi questa riga
  onObjectClick={handleObjectClick}
  mobileInput={mobileInput}
/>
```

---

## 📦 Pattern Completo - Esempio End-to-End

### URL Request
```
http://localhost:5174/play/999/camera?name=Tester
                              ^^^
                              sessionId
```

### React Router
```javascript
// App.jsx
<Route path="/play/:sessionId/:room" element={<RoomScene />} />
```

### RoomScene (Parent)
```javascript
// src/pages/RoomScene.jsx
function RoomScene() {
  const params = useParams()
  const sessionId = parseInt(params.sessionId, 10) || 1
  
  return (
    <BedroomScene
      sessionId={sessionId}
      onObjectClick={handleObjectClick}
      mobileInput={mobileInput}
    />
  )
}
```

### Scene (Child)
```javascript
// src/components/scenes/BedroomScene.jsx
export default function BedroomScene({ 
  onObjectClick, 
  mobileInput, 
  sessionId = 1 
}) {
  const { socket } = useWebSocket(sessionId, 'camera', 'DevPlayer')
  const bedroomPuzzle = useBedroomPuzzle(sessionId, socket)
  const gameCompletion = useGameCompletion(sessionId, socket)
  
  return (
    <Canvas>
      {/* ... */}
    </Canvas>
  )
}
```

### Backend
```python
# backend/app/api/sessions.py
@router.get("/{session_id}")
async def get_session(session_id: int):
    # Riceve sessionId corretto da frontend
    session = await SessionService.get_session(session_id)
    return session
```

---

## 🎓 Best Practices

### DO ✅
1. **Sempre accetta `sessionId` come prop** in ogni componente scene
2. **Usa default fallback** `sessionId = 1` per retrocompatibilità
3. **Log sessionId** all'inizio del componente per debug
4. **Passa sessionId** a tutti gli hook (WebSocket, puzzle, game completion)
5. **Estrai da URL** una sola volta in RoomScene e propaga verso il basso

### DON'T ❌
1. **Mai hardcodare** `const sessionId = 1` dentro le scene
2. **Mai duplicare** logica di estrazione URL in più componenti
3. **Mai assumere** che sessionId sia sempre 1
4. **Mai dimenticare** di passare prop `sessionId` a nuove scene
5. **Mai testare** solo con sessionId = 1 (testa anche 999!)

---

## 🔧 Quick Fix per Scene Esistenti

Se trovi una scena con bug:

### Step 1: Aggiungi prop
```javascript
// PRIMA
export default function NomeScene({ onObjectClick, mobileInput }) {

// DOPO
export default function NomeScene({ onObjectClick, mobileInput, sessionId = 1 }) {
```

### Step 2: Rimuovi hardcoded
```javascript
// PRIMA
const sessionId = 1 // ❌ RIMUOVI
const { socket } = useWebSocket(sessionId, ...)

// DOPO
// sessionId già disponibile dalla prop ✅
const { socket } = useWebSocket(sessionId, ...)
```

### Step 3: Verifica RoomScene
```javascript
// Aggiungi sessionId alla chiamata
<NomeScene
  sessionId={sessionId}  // ← Aggiungi
  onObjectClick={handleObjectClick}
  mobileInput={mobileInput}
/>
```

---

## 📚 File di Riferimento

### ✅ Esempi Corretti (Dopo il Fix)
- `src/pages/RoomScene.jsx` - Estrazione URL
- `src/components/scenes/BedroomScene.jsx` - Props pattern

### ❌ Pattern da Evitare
```javascript
// NON fare questo in nessuna scena!
export default function NomeScene(props) {
  const sessionId = 1 // ❌ SBAGLIATO
  // ...
}
```

---

## 🚀 Sessione 999 - Test Session

La sessione 999 è dedicata al testing:
- **PIN:** Nessuno (bypass automatico)
- **Stato:** Immortale (riattivata automaticamente se disattivata)
- **Uso:** Testing rapido senza lobby/PIN

**URL Test:**
```bash
http://localhost:5174/play/999/camera?name=Tester
http://localhost:5174/play/999/kitchen?name=Tester
http://localhost:5174/play/999/bagno?name=Tester
```

---

## 📞 Support

In caso di dubbi o bug:
1. Controlla questa guida
2. Verifica console browser (F12)
3. Controlla log backend
4. Usa sessionId 999 per test rapidi

**Ultima revisione:** 02/01/2026
**Version:** 1.0
