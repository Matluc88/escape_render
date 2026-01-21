# 🎨 Guida Pattern Overlay Styled per Messaggi Blocco LED

> **Documento di riferimento per implementare overlay professionali al posto di `alert()` in tutte le stanze**
> 
> **Data creazione**: 4 Gennaio 2026  
> **Stanze completate**: ✅ Cucina, ✅ Soggiorno  
> **Stanze da completare**: ⏳ Camera, ⏳ Bagno, ⏳ Esterno

---

## 📋 Indice

1. [Problema Originale](#problema-originale)
2. [Soluzione Implementata](#soluzione-implementata)
3. [Pattern Step-by-Step](#pattern-step-by-step)
4. [Codice Template](#codice-template)
5. [Esempi Concreti](#esempi-concreti)
6. [Checklist Implementazione](#checklist-implementazione)
7. [Errori Comuni da Evitare](#errori-comuni-da-evitare)
8. [Testing](#testing)

---

## 🚫 Problema Originale

### ❌ Cosa NON fare:
```javascript
// VECCHIO PATTERN - DA EVITARE!
if (ledStates?.indizio === 'off') {
  alert('⚠️ Completa prima il puzzle principale!')
  return
}
```

### ⚠️ Problemi con `alert()`:
- ❌ **Aspetto non professionale**: finestre di sistema native
- ❌ **Blocca tutta l'applicazione**: finché non clicchi OK
- ❌ **Non personalizzabile**: colori, font, animazioni impossibili
- ❌ **UX inconsistente**: tra browser e dispositivi diversi
- ❌ **Nessun feedback visivo**: solo testo statico

---

## ✅ Soluzione Implementata

### ✨ Pattern Overlay Styled:
- ✅ **Design professionale**: overlay rosso scuro con bordo rosso brillante
- ✅ **Non blocca l'app**: auto-dismissal dopo 3 secondi
- ✅ **Animazione shake**: feedback visivo immediato
- ✅ **Icona gigante 🔒**: chiaramente indica stato bloccato
- ✅ **Messaggi chiari**: testo su cosa fare per sbloccare
- ✅ **UX uniforme**: stesso stile in tutta l'applicazione

---

## 🔧 Pattern Step-by-Step

### Step 1: Aggiungi Stati React

**Dove**: All'inizio del componente Scene (es. `KitchenScene.jsx`)

```javascript
// 🚫 Stati per messaggi blocco (styled come cucina/soggiorno)
const [messaggioBloccoIndizio1, setMessaggioBloccoIndizio1] = useState(false)
const [messaggioBloccoIndizio2, setMessaggioBloccoIndizio2] = useState(false)
const [messaggioBloccoIndizio3, setMessaggioBloccoIndizio3] = useState(false)
// Aggiungi tanti stati quanti sono i puzzle con prerequisiti
```

**Naming Convention**:
- `messaggioBlocco[NomePuzzle]` - es. `messaggioBloccoPianta`
- Sempre **camelCase**
- Nome che riflette **quale puzzle è bloccato**

---

### Step 2: Sostituisci `alert()` con setState

**PRIMA (❌ VECCHIO)**:
```javascript
if (ledStates?.indizio === 'off') {
  alert('⚠️ Completa prima il puzzle principale!')
  return
}
```

**DOPO (✅ NUOVO)**:
```javascript
if (ledStates?.indizio === 'off') {
  console.warn('[NomeStanza] 🔒 Indizio bloccato - completa prima puzzle principale!')
  setMessaggioBloccoIndizio(true)
  setTimeout(() => setMessaggioBloccoIndizio(false), 3000) // Auto-dismissal 3s
  return
}
```

**⚠️ IMPORTANTE**:
- Mantieni il `return` dopo il `setTimeout()`
- Sempre `console.warn()` per debug
- Timeout fisso a **3000ms** (3 secondi)

---

### Step 3: Aggiungi Overlay JSX

**Dove**: Nel `return()` del componente, **PRIMA** del `<Canvas>`

```jsx
{/* 🚫 BLOCCO [NOME_PUZZLE] - Styled overlay */}
{messaggioBloccoIndizio && (
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
      Completa prima <strong>NOME_PREREQUISITO</strong>
    </p>
  </div>
)}
```

**🎨 Parametri Styling (NON MODIFICARE)**:
- `backgroundColor`: `rgba(30, 0, 0, 0.95)` - rosso scuro semi-trasparente
- `border`: `3px solid #ff0000` - bordo rosso brillante
- `boxShadow`: `0 0 40px rgba(255, 0, 0, 0.7)` - glow rosso
- `zIndex`: `2001` - sempre sopra tutto
- `animation`: `shake 0.5s ease-in-out` - animazione shake

**📝 Personalizza SOLO**:
- Emoji icona (🔒 di default, ma puoi usare 🚪, 🔑, ecc.)
- Testo prerequisito: `Completa prima <strong>TV</strong>`

---

### Step 4: Aggiungi Animazione CSS

**Dove**: Nel `return()`, in fondo **DOPO** tutti gli overlay

```jsx
{/* CSS Animations per messaggi */}
<style>{`
  @keyframes fadeIn {
    from { opacity: 0; transform: translate(-50%, -60%); }
    to { opacity: 1; transform: translate(-50%, -50%); }
  }
  @keyframes shake {
    0%, 100% { transform: translate(-50%, -50%) rotate(0deg); }
    25% { transform: translate(-50%, -50%) rotate(-5deg); }
    75% { transform: translate(-50%, -50%) rotate(5deg); }
  }
`}</style>
```

**⚠️ NOTA**: Se il tag `<style>` esiste già, **NON** duplicarlo! Verifica prima.

---

## 📦 Codice Template Completo

### Template Handler con Prerequisiti

```javascript
// Handler per click su oggetto con prerequisiti
const handleOggettoClick = (objectName) => {
  if (!objectName) return
  
  if (typeof objectName !== 'string') {
    console.warn('[NomeStanza] objectName non è una stringa:', typeof objectName)
    return
  }
  
  const name = objectName.toLowerCase()
  
  // Riconosci oggetto per UUID o nome
  if (name.includes('uuid-oggetto') || name.includes('nome_oggetto')) {
    console.log('[NomeStanza] 🎯 Click su OGGETTO:', objectName)
    
    // 🔒 PREREQUISITI: Controlla LED
    if (puzzleStates.ledStates?.oggetto === 'off') {
      console.warn('[NomeStanza] 🔒 Oggetto bloccato - completa prerequisiti!')
      setMessaggioBloccoOggetto(true)
      setTimeout(() => setMessaggioBloccoOggetto(false), 3000)
      return
    }
    
    // ✅ OGGETTO SBLOCCATO - Mostra messaggio normale
    setMessaggioOggetto(true)
    setTimeout(() => setMessaggioOggetto(false), 3000)
  }
}
```

---

## 🎯 Esempi Concreti

### Esempio 1: Cucina (Indizi Pentola)

**Prerequisiti**: Pentola → Frigo → Fornelli

```javascript
// Stati
const [messaggioBloccoFrigo, setMessaggioBloccoFrigo] = useState(false)
const [messaggioBloccoFornelli, setMessaggioBloccoFornelli] = useState(false)

// Handler Frigo
if (kitchenPuzzle.ledStates?.frigo === 'off') {
  console.warn('[KitchenScene] 🔒 Frigo bloccato - completa prima la pentola!')
  setMessaggioBloccoFrigo(true)
  setTimeout(() => setMessaggioBloccoFrigo(false), 3000)
  return
}

// Overlay JSX
{messaggioBloccoFrigo && (
  <div style={{/* stili standard */}}>
    <div style={{ marginBottom: '15px', fontSize: '56px' }}>🔒</div>
    <p style={{/* titolo */}}>Enigma bloccato!</p>
    <p style={{/* testo */}}>
      Completa prima la <strong>PENTOLA</strong>
    </p>
  </div>
)}
```

---

### Esempio 2: Soggiorno (TV → Pianta → Condizionatore)

**Prerequisiti**: TV → Pianta/Vetrata → Condizionatore

```javascript
// Stati
const [messaggioBloccoPianta, setMessaggioBloccoPianta] = useState(false)
const [messaggioBloccoCondizionatore, setMessaggioBloccoCondizionatore] = useState(false)

// Handler Pianta (tasto G)
if (key === 'g') {
  if (livingRoomPuzzle.ledStates?.pianta === 'off') {
    console.warn('[LivingRoomScene] 🔒 Pianta bloccata - completa prima la TV!')
    setMessaggioBloccoPianta(true)
    setTimeout(() => setMessaggioBloccoPianta(false), 3000)
    return
  }
  // ... avvia animazione pianta
}

// Handler Vetrata (click)
const handleVetrataClick = (objectName) => {
  // ... riconoscimento oggetto
  
  if (livingRoomPuzzle.ledStates?.pianta === 'off') {
    console.warn('[LivingRoomScene] 🔒 Vetrata bloccata - completa prima la TV!')
    setMessaggioBloccoPianta(true) // ← STESSO stato di pianta!
    setTimeout(() => setMessaggioBloccoPianta(false), 3000)
    return
  }
  // ... mostra messaggio vetrata
}
```

**💡 TIP**: Più oggetti possono condividere lo stesso overlay se hanno lo stesso prerequisito!

---

## ✅ Checklist Implementazione

### Per ogni stanza:

- [ ] **1. Analisi Prerequisiti**
  - [ ] Elenca tutti i puzzle e i loro prerequisiti
  - [ ] Identifica quali oggetti sono cliccabili
  - [ ] Identifica quali tasti tastiera attivano azioni
  - [ ] Verifica il flusso LED (quali LED controllano cosa)

- [ ] **2. Stati React**
  - [ ] Aggiungi `useState` per ogni overlay blocco necessario
  - [ ] Naming chiaro: `messaggioBlocco[NomePuzzle]`
  - [ ] Tutti inizializzati a `false`

- [ ] **3. Controlli Prerequisiti**
  - [ ] Trova tutti gli `alert()` esistenti
  - [ ] Sostituisci con pattern `setState + setTimeout`
  - [ ] Aggiungi controlli LED dove mancano
  - [ ] Verifica che ogni click/tasto controlli prerequisiti

- [ ] **4. Overlay JSX**
  - [ ] Aggiungi overlay per ogni stato blocco
  - [ ] Posizionati PRIMA del `<Canvas>`
  - [ ] Copia styling standard (NON modificare)
  - [ ] Personalizza solo testo e icona

- [ ] **5. CSS Animation**
  - [ ] Verifica se `<style>` esiste già
  - [ ] Aggiungi `shake` animation se mancante
  - [ ] NON duplicare se già presente

- [ ] **6. Testing**
  - [ ] Testa flusso dall'inizio (tutti LED off)
  - [ ] Testa ogni prerequisito bloccato
  - [ ] Verifica auto-dismissal 3 secondi
  - [ ] Verifica animazione shake
  - [ ] Controlla console.warn() nei log

---

## ⚠️ Errori Comuni da Evitare

### ❌ Errore 1: Stato condiviso sbagliato

**PROBLEMA**:
```javascript
// ❌ SBAGLIATO: Usa sempre lo stesso stato per puzzle diversi
if (ledStates?.frigo === 'off') {
  setMessaggioBlocco(true) // ← Generico, confonde
}
if (ledStates?.fornelli === 'off') {
  setMessaggioBlocco(true) // ← STESSO stato!
}
```

**SOLUZIONE**:
```javascript
// ✅ CORRETTO: Stato dedicato per ogni puzzle
if (ledStates?.frigo === 'off') {
  setMessaggioBloccoFrigo(true) // ← Specifico
}
if (ledStates?.fornelli === 'off') {
  setMessaggioBloccoFornelli(true) // ← Diverso stato
}
```

---

### ❌ Errore 2: Dimenticare `return` dopo controllo

**PROBLEMA**:
```javascript
// ❌ SBAGLIATO: Continua esecuzione anche se bloccato
if (ledStates?.indizio === 'off') {
  setMessaggioBlocco(true)
  setTimeout(() => setMessaggioBlocco(false), 3000)
  // MANCA return! Continua a eseguire codice sotto
}
// Questo viene eseguito anche se bloccato!
avviaAnimazione()
```

**SOLUZIONE**:
```javascript
// ✅ CORRETTO: Return blocca esecuzione
if (ledStates?.indizio === 'off') {
  setMessaggioBlocco(true)
  setTimeout(() => setMessaggioBlocco(false), 3000)
  return // ← FONDAMENTALE!
}
// Questo NON viene eseguito se bloccato
avviaAnimazione()
```

---

### ❌ Errore 3: zIndex troppo basso

**PROBLEMA**:
```javascript
// ❌ SBAGLIATO: Overlay nascosto da altri elementi
<div style={{
  zIndex: 100 // ← Troppo basso, dialog potrebbero sovrapporsi
}}>
```

**SOLUZIONE**:
```javascript
// ✅ CORRETTO: zIndex alto garantisce visibilità
<div style={{
  zIndex: 2001 // ← Sempre visibile sopra tutto
}}>
```

---

### ❌ Errore 4: Timeout troppo lungo/corto

**PROBLEMA**:
```javascript
// ❌ SBAGLIATO: Timeout arbitrario
setTimeout(() => setMessaggioBlocco(false), 5000) // Troppo lungo
setTimeout(() => setMessaggioBlocco(false), 1000) // Troppo corto
```

**SOLUZIONE**:
```javascript
// ✅ CORRETTO: Standard 3 secondi (ottimale UX)
setTimeout(() => setMessaggioBlocco(false), 3000) // ← 3s fisso
```

---

### ❌ Errore 5: Modificare styling standard

**PROBLEMA**:
```javascript
// ❌ SBAGLIATO: Colori personalizzati rompono uniformità
<div style={{
  backgroundColor: 'rgba(0, 0, 100, 0.9)', // ← Blu invece di rosso!
  border: '2px solid #00ff00' // ← Verde invece di rosso!
}}>
```

**SOLUZIONE**:
```javascript
// ✅ CORRETTO: Usa colori standard per uniformità
<div style={{
  backgroundColor: 'rgba(30, 0, 0, 0.95)', // ← Rosso scuro standard
  border: '3px solid #ff0000' // ← Rosso brillante standard
}}>
```

---

## 🧪 Testing

### Test Checklist per ogni overlay:

1. **Stato Iniziale**:
   - [ ] All'avvio, overlay NON visibile
   - [ ] Tutti i LED off (se nuova sessione)

2. **Trigger Blocco**:
   - [ ] Click su oggetto bloccato → Overlay appare
   - [ ] Tasto tastiera con puzzle bloccato → Overlay appare
   - [ ] Animazione shake visibile

3. **Auto-Dismissal**:
   - [ ] Overlay scompare dopo 3 secondi
   - [ ] Nessun residuo grafico
   - [ ] Può essere ri-triggato subito dopo

4. **Prerequisiti**:
   - [ ] Completa prerequisito → LED cambia colore
   - [ ] Stesso trigger → Ora funziona (nessun overlay)
   - [ ] Azione/animazione si avvia correttamente

5. **Console**:
   - [ ] `console.warn()` visibile quando bloccato
   - [ ] Messaggio chiaro su quale prerequisito manca

---

## 📊 Stato Implementazione Stanze

| Stanza | Alert() Eliminati | Overlay Styled | Prerequisiti OK | Test Completati |
|--------|-------------------|----------------|-----------------|-----------------|
| **Cucina** | ✅ | ✅ | ✅ | ✅ |
| **Soggiorno** | ✅ | ✅ | ✅ | ✅ |
| **Camera** | ⏳ | ⏳ | ⏳ | ⏳ |
| **Bagno** | ⏳ | ⏳ | ⏳ | ⏳ |
| **Esterno** | ⏳ | ⏳ | ⏳ | ⏳ |

---

## 🎓 Best Practices

### 1. Consistenza è fondamentale
- **Stesso styling** per tutti gli overlay
- **Stesso timeout** (3 secondi)
- **Stessa animazione** (shake)

### 2. Messaggi chiari e concisi
```javascript
// ✅ BUONO: Chiaro e specifico
"Completa prima la <strong>PENTOLA</strong>"

// ❌ CATTIVO: Generico e confuso
"Devi fare qualcosa prima"
```

### 3. Console.warn per debug
```javascript
// ✅ Sempre logga quando blocchi
console.warn('[NomeStanza] 🔒 Oggetto bloccato - prerequisito X')

// Aiuta troubleshooting senza alert()
```

### 4. Nomi stati descrittivi
```javascript
// ✅ BUONO: Chiaro cosa blocca
setMessaggioBloccoFrigo(true)
setMessaggioBloccoCondizionatore(true)

// ❌ CATTIVO: Generico e ambiguo
setBlocked(true)
setError(true)
```

---

## 📚 Riferimenti

### File da Consultare:
- **Cucina completa**: `escape-room-3d/src/components/scenes/KitchenScene.jsx`
- **Soggiorno completo**: `escape-room-3d/src/components/scenes/LivingRoomScene.jsx`
- **Guida LED Cucina**: `escape-room-3d/KITCHEN_LED_SYSTEM_COMPLETE.md`
- **Guida LED Soggiorno**: `escape-room-3d/LIVINGROOM_LED_SYSTEM_COMPLETE.md`

### Pattern Correlati:
- **Sistema LED globale**: `GAME_COMPLETION_LED_LOGIC.md`
- **WebSocket puzzle**: `SESSIONID_PROPAGATION_GUIDE.md`

---

## 🆘 Troubleshooting

### Overlay non appare:
1. Verifica `zIndex: 2001`
2. Controlla `position: 'absolute'`
3. Verifica che stato sia `true` in React DevTools

### Overlay non scompare:
1. Controlla `setTimeout` con 3000ms
2. Verifica che `setStato(false)` sia chiamato
3. Controlla memory leak se component unmounts

### Animazione non funziona:
1. Verifica `<style>` tag presente
2. Controlla `@keyframes shake` definito
3. Verifica `animation: 'shake 0.5s ease-in-out'`

### Prerequisiti non funzionano:
1. Verifica `ledStates` dal hook puzzle
2. Controlla `ledStates?.nome_led === 'off'`
3. Verifica API backend restituisce LED corretti

---

## ✍️ Note Finali

Questo pattern è stato testato e validato su:
- ✅ Cucina (3 indizi con prerequisiti)
- ✅ Soggiorno (TV → Pianta/Vetrata → Condizionatore)

**Commit di riferimento**: `ea6f294` su branch `clean-main`

Per domande o problemi, consultare i file implementati o questa guida.

---

**Ultima modifica**: 4 Gennaio 2026  
**Autore**: Implementato da Cline AI seguendo pattern UX professionale
