# 🎯 Sistema Messaggi Obiettivo - Vademecum Integrazione

**Versione:** 2.0  
**Data:** 05/01/2026  
**Autore:** Sistema AI Assistant  
**Scene implementate:** ✅ BedroomScene, ✅ KitchenScene

---

## 📋 Indice

1. [Panoramica Sistema](#panoramica-sistema)
2. [Struttura Pattern](#struttura-pattern)
3. [Step-by-Step Integrazione](#step-by-step-integrazione)
4. [Codice Template](#codice-template)
5. [Esempi Concreti](#esempi-concreti)
6. [Best Practices](#best-practices)
7. [CSS Animations](#css-animations)
8. [Testing](#testing)

---

## 🎯 Panoramica Sistema

Il **Sistema Messaggi Obiettivo** è un pattern UI/UX che fornisce feedback agli studenti durante l'interazione con enigmi in-game.

### Caratteristiche Principali

- ✅ **Sequenza temporizzata**: Messaggio iniziale (3s) → Obiettivo (5s)
- ✅ **Stati puzzle integrati**: Usa `puzzleStates` da hook (locked/active/solved)
- ✅ **Blocco automatico**: Messaggi di errore se enigma locked
- ✅ **Animazioni fluide**: FadeIn, pulse, bounce, shake
- ✅ **Responsive**: Si adatta a mobile e desktop
- ✅ **Auto-dismiss**: Timer automatici per chiudere i messaggi

### Flusso Tipico

```
Click Oggetto Enigma
    ↓
Controlla puzzleStates[enigma]
    ↓
┌─────────────┬─────────────┬─────────────┐
│   LOCKED    │   ACTIVE    │   SOLVED    │
├─────────────┼─────────────┼─────────────┤
│ Messaggio   │ Iniziale    │ Nessun      │
│ Blocco      │ (3 secondi) │ messaggio   │
│ (3s)        │      ↓      │             │
│             │ Obiettivo   │             │
│             │ (5 secondi) │             │
└─────────────┴─────────────┴─────────────┘
```

---

## 🏗️ Struttura Pattern

### File coinvolti per ogni stanza

```
src/
├── components/
│   └── scenes/
│       └── TuaScene.jsx           ← Scene principale (modifiche qui)
├── hooks/
│   └── useTuoRoomPuzzle.js        ← Hook puzzle (già implementato)
└── utils/
    └── api.js                     ← API backend (già ok)
```

### Stati React necessari

```javascript
// 1. Stati per MESSAGGI INIZIALI (uno per enigma)
const [messaggioEnigma1, setMessaggioEnigma1] = useState(false)
const [messaggioEnigma2, setMessaggioEnigma2] = useState(false)
const [messaggioEnigma3, setMessaggioEnigma3] = useState(false)

// 2. Stati per OBIETTIVI (uno per enigma)
const [messaggioObiettivoEnigma1, setMessaggioObiettivoEnigma1] = useState(false)
const [messaggioObiettivoEnigma2, setMessaggioObiettivoEnigma2] = useState(false)
const [messaggioObiettivoEnigma3, setMessaggioObiettivoEnigma3] = useState(false)

// 3. Stati per BLOCCHI (uno per enigma con prerequisiti)
const [messaggioBloccoEnigma2, setMessaggioBloccoEnigma2] = useState(false)
const [messaggioBloccoEnigma3, setMessaggioBloccoEnigma3] = useState(false)

// 4. Stati per SUCCESSI (uno per enigma)
const [messaggioSuccessoEnigma1, setMessaggioSuccessoEnigma1] = useState(false)
const [messaggioSuccessoEnigma2, setMessaggioSuccessoEnigma2] = useState(false)
const [messaggioSuccessoEnigma3, setMessaggioSuccessoEnigma3] = useState(false)
```

---

## 🚀 Step-by-Step Integrazione

### Step 1: Importa Hook Puzzle

Se non esiste già, il tuo hook puzzle deve essere simile a questo:

```javascript
import { useYourRoomPuzzle } from '../../hooks/useYourRoomPuzzle'

// Dentro il componente Scene
const { 
  puzzleStates,   // { enigma1: 'active', enigma2: 'locked', enigma3: 'active' }
  ledStates,      // { enigma1: 'red', enigma2: 'red', enigma3: 'red' }
  completeEnigma1,
  completeEnigma2,
  completeEnigma3,
  resetPuzzles
} = useYourRoomPuzzle(sessionId, socket)
```

### Step 2: Aggiungi Stati per i Messaggi

Copia gli stati dal template sopra e rinominali secondo i tuoi enigmi.

### Step 3: Crea la Funzione Click Handler

```javascript
const handleYourRoomPuzzleClick = (objectName) => {
  if (typeof objectName !== 'string') return
  
  const name = objectName.toLowerCase()
  console.log('[YourScene] 🎯 Click puzzle handler:', name, 'Stati:', puzzleStates)
  
  // 🔴 ENIGMA 1 - Pattern matching per nome oggetto
  if (name.includes('oggetto_enigma1') || name.includes('uuid_enigma1')) {
    console.log('[YourScene] 🔴 Click su ENIGMA1, stato:', puzzleStates.enigma1)
    
    if (puzzleStates.enigma1 === 'active') {
      // ✅ Attivo - mostra sequenza iniziale → obiettivo
      setMessaggioEnigma1(true)
      setTimeout(() => {
        setMessaggioEnigma1(false)
        setMessaggioObiettivoEnigma1(true)
        // Obiettivo sparisce dopo 5 secondi
        setTimeout(() => setMessaggioObiettivoEnigma1(false), 5000)
      }, 3000)
    }
    // Se 'solved', non mostrare nulla (già completato)
  }
  
  // 🔵 ENIGMA 2 - Con prerequisiti (locked se enigma1 non completato)
  if (name.includes('oggetto_enigma2') || name.includes('uuid_enigma2')) {
    console.log('[YourScene] 🔵 Click su ENIGMA2, stato:', puzzleStates.enigma2)
    
    if (puzzleStates.enigma2 === 'locked') {
      // 🚫 BLOCCATO - mostra messaggio errore
      console.log('[YourScene] 🚫 Enigma2 bloccato! Mostra messaggio')
      setMessaggioBloccoEnigma2(true)
      setTimeout(() => setMessaggioBloccoEnigma2(false), 3000)
    } else if (puzzleStates.enigma2 === 'active') {
      // ✅ Attivo - mostra sequenza
      setMessaggioEnigma2(true)
      setTimeout(() => {
        setMessaggioEnigma2(false)
        setMessaggioObiettivoEnigma2(true)
        setTimeout(() => setMessaggioObiettivoEnigma2(false), 5000)
      }, 3000)
    }
  }
  
  // 🟢 ENIGMA 3 - Simile a enigma2
  // ... ripeti pattern ...
}
```

### Step 4: Integra Handler nel Click Sistema Esistente

```javascript
const handleObjectClick = (objectName) => {
  const targetObject = objectName || currentLookTarget
  
  if (!targetObject) return
  
  // Aggiungi il tuo handler alla catena
  handleYourRoomPuzzleClick(targetObject)  // ← AGGIUNTO!
  
  // Altri handler esistenti...
  if (onObjectClick) {
    onObjectClick(targetObject)
  }
}
```

### Step 5: Aggiungi Overlay UI nella Sezione Return

Scorri fino al `return` del componente e aggiungi prima del `</div>` finale:

```jsx
{/* 🎯 SISTEMA MESSAGGI OBIETTIVO - La tua stanza */}

{/* 🔴 MESSAGGIO INIZIALE ENIGMA 1 */}
{messaggioEnigma1 && (
  <div style={{
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    padding: '30px 40px',
    borderRadius: '12px',
    color: 'white',
    fontFamily: 'Arial, sans-serif',
    fontSize: '22px',
    textAlign: 'center',
    maxWidth: '450px',
    zIndex: 2001,
    border: '3px solid #ff6600',
    boxShadow: '0 0 30px rgba(255, 102, 0, 0.6)',
    animation: 'fadeIn 0.3s ease-in'
  }}>
    <div style={{ marginBottom: '15px', fontSize: '48px' }}>🔴</div>
    <p style={{ margin: 0, lineHeight: '1.5', fontWeight: 'bold' }}>
      Testo messaggio iniziale enigma 1
    </p>
  </div>
)}

{/* 🎯 OBIETTIVO ENIGMA 1 */}
{messaggioObiettivoEnigma1 && (
  <div style={{
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    backgroundColor: 'rgba(50, 30, 0, 0.95)',
    padding: '35px 45px',
    borderRadius: '12px',
    color: 'white',
    fontFamily: 'Arial, sans-serif',
    fontSize: '20px',
    textAlign: 'center',
    maxWidth: '500px',
    zIndex: 2001,
    border: '3px solid #ffaa00',
    boxShadow: '0 0 40px rgba(255, 170, 0, 0.7)',
    animation: 'fadeIn 0.3s ease-in-out'
  }}>
    <div style={{ marginBottom: '15px', fontSize: '56px' }}>🎯</div>
    <p style={{ margin: '0 0 15px 0', lineHeight: '1.5', fontWeight: 'bold', fontSize: '22px', color: '#ffaa00' }}>
      Obiettivo
    </p>
    <p style={{ margin: 0, lineHeight: '1.5', fontSize: '18px' }}>
      Descrizione chiara dell'obiettivo da completare
    </p>
  </div>
)}

{/* 🚫 BLOCCO ENIGMA 2 */}
{messaggioBloccoEnigma2 && (
  <div style={{
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    backgroundColor: 'rgba(30, 0, 0, 0.95)',
    padding: '35px 45px',
    borderRadius: '12px',
    color: 'white',
    fontFamily: 'Arial, sans-serif',
    fontSize: '20px',
    textAlign: 'center',
    maxWidth: '500px',
    zIndex: 2001,
    border: '3px solid #ff0000',
    boxShadow: '0 0 40px rgba(255, 0, 0, 0.7)',
    animation: 'shake 0.5s ease-in-out'
  }}>
    <div style={{ marginBottom: '15px', fontSize: '56px' }}>🔒</div>
    <p style={{ margin: '0 0 15px 0', lineHeight: '1.5', fontWeight: 'bold', fontSize: '24px', color: '#ff4444' }}>
      Enigma bloccato!
    </p>
    <p style={{ margin: 0, lineHeight: '1.5', fontSize: '18px', color: '#ffaa00' }}>
      Completa prima l'enigma <strong>PRECEDENTE</strong>
    </p>
  </div>
)}

{/* ✅ SUCCESSO ENIGMA 1 */}
{messaggioSuccessoEnigma1 && (
  <div style={{
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    backgroundColor: 'rgba(0, 50, 0, 0.95)',
    padding: '40px 50px',
    borderRadius: '16px',
    color: 'white',
    fontFamily: 'Arial, sans-serif',
    fontSize: '26px',
    textAlign: 'center',
    maxWidth: '500px',
    zIndex: 2001,
    border: '4px solid #00ff88',
    boxShadow: '0 0 40px rgba(0, 255, 136, 0.8)',
    animation: 'pulse 1.5s ease-in-out infinite'
  }}>
    <div style={{ marginBottom: '20px', fontSize: '64px', animation: 'bounce 1s ease-in-out infinite' }}>✅</div>
    <p style={{ margin: 0, lineHeight: '1.5', fontWeight: 'bold', color: '#00ff88' }}>
      Ottimo lavoro!
    </p>
  </div>
)}

{/* Ripeti per enigma2, enigma3, etc... */}
```

### Step 6: Aggiungi CSS Animations (se non presenti)

Aggiungi alla fine del return, prima del `</div>` finale:

```jsx
{/* CSS Animations */}
<style>{`
  @keyframes fadeIn {
    from { opacity: 0; transform: translate(-50%, -60%); }
    to { opacity: 1; transform: translate(-50%, -50%); }
  }
  @keyframes pulse {
    0%, 100% { transform: translate(-50%, -50%) scale(1); }
    50% { transform: translate(-50%, -50%) scale(1.05); }
  }
  @keyframes bounce {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-10px); }
  }
  @keyframes shake {
    0%, 100% { transform: translate(-50%, -50%) rotate(0deg); }
    25% { transform: translate(-50%, -50%) rotate(-5deg); }
    75% { transform: translate(-50%, -50%) rotate(5deg); }
  }
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
`}</style>
```

---

## 💻 Codice Template

### Template Completo State + Handler

```javascript
// ==================== STATI MESSAGGI ====================
// Enigma 1
const [messaggioEnigma1, setMessaggioEnigma1] = useState(false)
const [messaggioObiettivoEnigma1, setMessaggioObiettivoEnigma1] = useState(false)
const [messaggioSuccessoEnigma1, setMessaggioSuccessoEnigma1] = useState(false)

// Enigma 2 (con prerequisito)
const [messaggioEnigma2, setMessaggioEnigma2] = useState(false)
const [messaggioObiettivoEnigma2, setMessaggioObiettivoEnigma2] = useState(false)
const [messaggioBloccoEnigma2, setMessaggioBloccoEnigma2] = useState(false)
const [messaggioSuccessoEnigma2, setMessaggioSuccessoEnigma2] = useState(false)

// ==================== HANDLER CLICK ====================
const handleYourRoomPuzzleClick = (objectName) => {
  if (typeof objectName !== 'string') return
  
  const name = objectName.toLowerCase()
  console.log('[YourScene] 🎯 Click puzzle handler:', name, 'Stati:', puzzleStates)
  
  // ENIGMA 1 (sempre accessibile)
  if (name.includes('tuo_pattern_enigma1')) {
    if (puzzleStates.enigma1 === 'active') {
      setMessaggioEnigma1(true)
      setTimeout(() => {
        setMessaggioEnigma1(false)
        setMessaggioObiettivoEnigma1(true)
        setTimeout(() => setMessaggioObiettivoEnigma1(false), 5000)
      }, 3000)
    }
  }
  
  // ENIGMA 2 (con blocco)
  if (name.includes('tuo_pattern_enigma2')) {
    if (puzzleStates.enigma2 === 'locked') {
      setMessaggioBloccoEnigma2(true)
      setTimeout(() => setMessaggioBloccoEnigma2(false), 3000)
    } else if (puzzleStates.enigma2 === 'active') {
      setMessaggioEnigma2(true)
      setTimeout(() => {
        setMessaggioEnigma2(false)
        setMessaggioObiettivoEnigma2(true)
        setTimeout(() => setMessaggioObiettivoEnigma2(false), 5000)
      }, 3000)
    }
  }
}
```

---

## 📚 Esempi Concreti

### Esempio 1: BedroomScene (3 enigmi sequenziali)

**Pattern implementato:**
- 🛏️ **Materasso** → sempre `active`
- 🪟 **Finestra** → `locked` finché materasso non completato
- 🚪 **Porta Ingresso** → `locked` finché finestra non completata

**Codice rilevante:**
```javascript
// Click su Materasso
if (name.includes('materasso')) {
  if (puzzleStates.materasso === 'active') {
    setMessaggioMaterasso(true)
    setTimeout(() => {
      setMessaggioMaterasso(false)
      setMessaggioObiettivoMaterasso(true)
      setTimeout(() => setMessaggioObiettivoMaterasso(false), 5000)
    }, 3000)
  }
}

// Click su Finestra (con blocco)
if (name.includes('porta_finestra_camera') || name.includes('4d5b22a0')) {
  if (puzzleStates.finestra === 'locked') {
    setMessaggioBloccoFinestra(true)
    setTimeout(() => setMessaggioBloccoFinestra(false), 3000)
  } else if (puzzleStates.finestra === 'active') {
    setMessaggioFinestra(true)
    setTimeout(() => {
      setMessaggioFinestra(false)
      setMessaggioObiettivoFinestra(true)
      setTimeout(() => setMessaggioObiettivoFinestra(false), 5000)
    }, 3000)
  }
}
```

### Esempio 2: KitchenScene (3 enigmi + conferma interattiva)

**Pattern implementato:**
- 🍳 **Fornelli** → sempre `active`
- 🧊 **Frigo** → `locked` finché fornelli non completato + **Conferma SI/NO**
- 🌿 **Serra** → `locked` finché frigo non completato

**Codice speciale per conferma SI/NO:**
```javascript
// Handler Frigo con conferma
if (isFrigoObject && fridgeDoorOpen) {
  if (puzzleStates.frigo === 'active') {
    setMessaggioFrigo(true)
    setTimeout(() => {
      setMessaggioFrigo(false)
      setMessaggioObiettivoFrigo(true)
      setTimeout(() => {
        setMessaggioObiettivoFrigo(false)
        setMessaggioConfermeFrigo(true)  // ← MOSTRA CONFERMA SI/NO
      }, 5000)
    }, 3000)
  }
}

// UI Conferma SI/NO
{messaggioConfermeFrigo && (
  <div style={{...}}>
    <button onClick={() => {
      setFridgeDoorOpen(false)  // ← Azione tasto 4
      setMessaggioConfermeFrigo(false)
    }}>✅ SI</button>
    
    <button onClick={() => {
      setMessaggioConfermeFrigo(false)  // ← Solo chiudi
    }}>❌ NO</button>
  </div>
)}
```

---

## ✅ Best Practices

### 1. Nomenclatura Stati

```javascript
// ✅ BUONO - Chiaro e consistente
const [messaggioMaterasso, setMessaggioMaterasso] = useState(false)
const [messaggioObiettivoMaterasso, setMessaggioObiettivoMaterasso] = useState(false)

// ❌ CATTIVO - Ambiguo
const [msg1, setMsg1] = useState(false)
const [message, setMessage] = useState(false)
```

### 2. Log Debugging

Aggiungi sempre log per debugging:

```javascript
console.log('[YourScene] 🎯 Click puzzle handler:', name, 'Stati:', puzzleStates)
console.log('[YourScene] 🔴 Click su ENIGMA1, stato:', puzzleStates.enigma1)
```

### 3. Timeout Consistency

**Standard timing:**
- Messaggio iniziale: **3 secondi**
- Obiettivo: **5 secondi**
- Blocco/Errore: **3 secondi**
- Successo: **3 secondi** (5s per finale)

### 4. Pattern Matching Robusto

```javascript
// ✅ BUONO - Multipli pattern + UUID
if (name.includes('materasso') || 
    name.includes('7b2ac0a7') ||
    name.includes('bed') ||
    name.includes('letto')) {
  // handle click
}

// ❌ CATTIVO - Solo un pattern
if (name === 'Materasso') {  // Troppo rigido!
  // handle click
}
```

### 5. Z-Index Corretto

Assicurati che i messaggi siano sopra tutto:

```javascript
zIndex: 2001,  // ← SEMPRE maggiore di altri overlay (es. debug panels a 1000)
```

---

## 🎨 CSS Animations

### Palette Colori Standard

```javascript
// 🔴 Enigma Energia/Calore (rosso/arancione)
border: '3px solid #ff6600'
boxShadow: '0 0 30px rgba(255, 102, 0, 0.6)'

// 🔵 Enigma Acqua/Freddo (blu/azzurro)
border: '3px solid #00ccff'
boxShadow: '0 0 40px rgba(0, 204, 255, 0.8)'

// 🟢 Enigma Natura/Vita (verde)
border: '3px solid #00ff88'
boxShadow: '0 0 40px rgba(0, 255, 136, 0.8)'

// 🟡 Obiettivo (giallo/arancione)
border: '3px solid #ffaa00'
boxShadow: '0 0 40px rgba(255, 170, 0, 0.7)'

// 🔴 Errore/Blocco (rosso)
border: '3px solid #ff0000'
boxShadow: '0 0 40px rgba(255, 0, 0, 0.7)'
```

### Emoji Standard

```javascript
🍳 Fornelli/Cucina
🧊 Frigo/Freddo
🌿 Natura/Piante
🛏️ Letto/Camera
🪟 Finestra
🚪 Porta
⚡ Energia
💧 Acqua
🔥 Fuoco
🎯 Obiettivo
🔒 Bloccato
✅ Successo
❌ Errore
⚠️ Attenzione
```

---

## 🧪 Testing

### Checklist Pre-Deploy

- [ ] **Stati dichiarati** - Tutti gli stati necessari presenti
- [ ] **Handler integrato** - `handleYourRoomPuzzleClick` chiamato in `handleObjectClick`
- [ ] **Pattern matching** - Oggetti enigma identificati correttamente
- [ ] **Timing corretto** - 3s → 5s per sequenza iniziale/obiettivo
- [ ] **Blocchi funzionanti** - Messaggi di errore se `locked`
- [ ] **CSS presente** - Animazioni `fadeIn`, `pulse`, `bounce`, `shake`
- [ ] **Z-index corretto** - Messaggi a `zIndex: 2001`
- [ ] **Log debugging** - Console.log per tracciare stati
- [ ] **Responsive** - Testa su mobile (max-width, font-size)
- [ ] **No conflitti** - Non sovrascrive altri overlay

### Test Manuale

1. **Test sequenza normale:**
   - Click oggetto → messaggio iniziale 3s
   - Attendi → obiettivo 5s
   - Attendi → messaggi spariscono

2. **Test blocco prerequisiti:**
   - Click enigma2 senza completare enigma1
   - Verifica messaggio blocco 3s
   - Completa enigma1
   - Riprova click enigma2 → sequenza normale

3. **Test successo:**
   - Completa enigma
   - Verifica messaggio successo 3s (o 5s se finale)

4. **Test mobile:**
   - Apri DevTools
   - Simula iPhone/Android
   - Verifica dimensioni testo, padding, max-width

---

## 📦 Package Checklist

Prima di considerare l'integrazione completa, verifica:

### File Modificati
- [ ] `src/components/scenes/YourScene.jsx` - Scene principale
- [ ] Hook puzzle già presente in `src/hooks/useYourRoomPuzzle.js`

### Codice Aggiunto
- [ ] Stati per messaggi (iniziale, obiettivo, blocco, successo)
- [ ] Handler `handleYourRoomPuzzleClick`
- [ ] Integrazione handler in `handleObjectClick`
- [ ] Overlay UI nel JSX return
- [ ] CSS Animations al fondo

### Testing Completato
- [ ] Test sequenza normale
- [ ] Test blocco prerequisiti
- [ ] Test successo
- [ ] Test responsive mobile

---

## 🎓 Esempi Scene da Implementare

### Soggiorno (LivingRoomScene)
**Enigmi suggeriti:**
1. 🌱 Pianta soggiorno (muovi/annaffia)
2. 🛋️ Divano (trova oggetto nascosto)
3. 🖼️ Quadro/TV (puzzle visivo)

### Bagno (BathroomScene)
**Enigmi suggeriti:**
1. 🚰 Rubinetto/Acqua (risparmio idrico)
2. 💡 Specchio/Luce (energia)
3. 🚿 Doccia (timing/temperatura)

### Esterno (EsternoScene)
**Enigmi già implementati:**
✅ Cancello (tasto 1/2)
✅ LED sistema globale

**Da aggiungere:**
- Messaggi obiettivo sul cancello
- Feedback visivo LED status

---

## 🔗 Link Utili

- **Pattern Reference:** `STYLED_OVERLAY_PATTERN_GUIDE.md`
- **Hook Guide:** `BEDROOM_PUZZLE_INTEGRATION_GUIDE.md`
- **Kitchen Implementation:** `KITCHEN_LED_SYSTEM_COMPLETE.md`
- **Bedroom Implementation:** `BEDROOM_COMPLETE_FIX.md`

---

## 📝 Note Finali

**Tempo stimato per integrazione:** 30-45 minuti per stanza

**Difficoltà:** ⭐⭐⚪⚪⚪ (Facile - Template pronto)

**Supporto:** Se incontri problemi, cerca nei file di riferimento:
- `BedroomScene.jsx` - Esempio completo 3 enigmi
- `KitchenScene.jsx` - Esempio con conferma SI/NO

---

**Ultimo aggiornamento:** 05/01/2026  
**Versione:** 2.0  
**Autore:** Sistema AI Assistant
