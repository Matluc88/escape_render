# 🔄 PIANO UNIFORMAZIONE SISTEMA MESSAGGI AUTOMATICI

## 📊 STATO ATTUALE

### ✅ COMPLETATE (Pattern di riferimento)

#### 🚿 BAGNO (100%)
**Sistema:** Avvio auto → Ripetizione 15s → Sequenza automatica 3 enigmi
```
Enigma 1 (Specchio) → Timer 5s → Enigma 2 (Porta finestra) → Timer 5s → Enigma 3 (Umidità)
```

#### 🍳 CUCINA (100%)
**Sistema:** Avvio auto → Ripetizione 15s → Sequenza automatica 3 enigmi
```
Enigma 1 (Fornelli) → Timer 5s → Enigma 2 (Frigo) → Timer 5s → Enigma 3 (Serra)
```

---

### ⏳ DA IMPLEMENTARE

#### 🛏️ CAMERA DA LETTO (0%)
**Stato attuale:** Messaggi on-click manuali (NO sistema automatico)

**Enigmi esistenti:**
1. **Letto/Comodino** (tasti K + M)
   - Messaggio: "E qui dove si dorme?"
   - Obiettivo: "Posiziona il comodino nell'area selezionata"
   - Completamento: "Ecco a te la magia!"
   
2. **Poltrona** (tasto L)
   - Prerequisito: Enigma 1 completato
   - Messaggio: "Hai bisogno di luce per leggere?"
   - Obiettivo: "Accomodati sulla poltrona per accendere la lampada"
   - Completamento: "Ora hai la luce che ti serve per leggere!"
   
3. **Ventola/Finestra** (tasto J - porta)
   - Prerequisito: Enigma 2 completato
   - Messaggio: "Hai caldo o freddo?"
   - Obiettivo: "Vai vicino la finestra e chiudila per attivare il riscaldamento"
   - Completamento: "Riscalderai l'ambiente in un attimo!"

**Cosa manca:**
- ❌ Avvio automatico enigma 1 dopo 1s dal caricamento
- ❌ Sistema ripetizione messaggi obiettivo ogni 15s
- ❌ Timer automatico 5s tra enigmi
- ❌ Monitoraggio completamento per sblocco successivo automatico

---

#### 🛋️ SOGGIORNO (0%)
**Stato attuale:** Messaggi on-click manuali (NO sistema automatico)

**Enigmi esistenti:**
1. **TV/Divano** (tasti H per humano, C per couch)
   - Messaggio: "Chi legge al divano?"
   - Obiettivo: (da verificare)
   - Completamento: (da verificare)
   
2. **Pianta** (tasto P)
   - Prerequisito: Enigma 1 completato
   - Messaggio: "Chi sta annaffiando la pianta?"
   - Obiettivo: (da verificare)
   - Completamento: (da verificare)
   
3. **Condizionatore** (tasto A)
   - Prerequisito: Enigma 2 completato
   - Messaggio: "Vuoi accendere il condizionatore?"
   - Obiettivo: (da verificare)
   - Completamento: (da verificare)

**Cosa manca:**
- ❌ Avvio automatico enigma 1 dopo 1s dal caricamento
- ❌ Sistema ripetizione messaggi obiettivo ogni 15s
- ❌ Timer automatico 5s tra enigmi
- ❌ Monitoraggio completamento per sblocco successivo automatico

---

## 🎯 PATTERN STANDARD (da replicare)

### 1️⃣ Stati e Refs necessari

```javascript
// Per ogni enigma servono:
const [enigma1Completato, setEnigma1Completato] = useState(false)
const [enigma2Avviato, setEnigma2Avviato] = useState(false)
const [enigma2Completato, setEnigma2Completato] = useState(false)
const [enigma3Avviato, setEnigma3Avviato] = useState(false)
const [enigma3Completato, setEnigma3Completato] = useState(false)

// Refs per interval (per cleanup)
const enigma1RepeatIntervalRef = useRef(null)
const enigma2RepeatIntervalRef = useRef(null)
const enigma3RepeatIntervalRef = useRef(null)

// Flag per tracking ripetizione
const [enigma1RepeatStarted, setEnigma1RepeatStarted] = useState(false)
const [enigma2RepeatStarted, setEnigma2RepeatStarted] = useState(false)
const [enigma3RepeatStarted, setEnigma3RepeatStarted] = useState(false)
```

---

### 2️⃣ Avvio automatico primo enigma (1s dopo caricamento)

```javascript
useEffect(() => {
  // Guard: attendi caricamento completo
  if (!isLoading && safeSpawnPosition && puzzleStates.enigma1) {
    console.log('[ROOM] ⏱️ Avvio automatico enigma 1 dopo 1 secondo')
    
    const timer = setTimeout(() => {
      // Mostra messaggio iniziale (3s)
      setMessaggioEnigma1(true)
      
      setTimeout(() => {
        setMessaggioEnigma1(false)
        // Mostra obiettivo (5s prima volta, poi ripetizione)
        setMessaggioObiettivoEnigma1(true)
        setTimeout(() => setMessaggioObiettivoEnigma1(false), 5000)
      }, 3000)
    }, 1000)
    
    return () => clearTimeout(timer)
  }
}, [isLoading, safeSpawnPosition, puzzleStates.enigma1])
```

---

### 3️⃣ Sistema ripetizione messaggi (ogni 15s)

```javascript
// Avvia ripetizione quando obiettivo mostrato la prima volta
useEffect(() => {
  if (messaggioObiettivoEnigma1 && !enigma1RepeatStarted && !enigma1Completato) {
    console.log('[ROOM] 🔄 Avvio ripetizione messaggio enigma 1 (ogni 15s)')
    setEnigma1RepeatStarted(true)
    
    enigma1RepeatIntervalRef.current = setInterval(() => {
      console.log('[ROOM] 🔁 Ripeto messaggio obiettivo enigma 1')
      setMessaggioObiettivoEnigma1(true)
      setTimeout(() => setMessaggioObiettivoEnigma1(false), 5000)
    }, 15000) // Ogni 15 secondi
  }
}, [messaggioObiettivoEnigma1, enigma1RepeatStarted, enigma1Completato])

// Stop ripetizione quando enigma completato
useEffect(() => {
  if (enigma1Completato && enigma1RepeatIntervalRef.current) {
    console.log('[ROOM] 🛑 Stop ripetizione messaggio enigma 1 (completato)')
    clearInterval(enigma1RepeatIntervalRef.current)
    enigma1RepeatIntervalRef.current = null
    setEnigma1RepeatStarted(false)
  }
}, [enigma1Completato])
```

---

### 4️⃣ Monitoraggio completamento + Avvio successivo

```javascript
// Monitora stato puzzle backend
useEffect(() => {
  if (puzzleStates.enigma1 === 'solved' && !enigma1Completato) {
    console.log('[ROOM] ✅ Enigma 1 rilevato come completato')
    setEnigma1Completato(true)
  }
}, [puzzleStates.enigma1, enigma1Completato])

// Quando enigma 1 completato → avvia enigma 2 dopo 5s
useEffect(() => {
  if (enigma1Completato && !enigma2Avviato && puzzleStates.enigma2) {
    console.log('[ROOM] ⏱️ Enigma 1 completato → Avvio timer per enigma 2 (5s)')
    setEnigma2Avviato(true)
    
    const timer = setTimeout(() => {
      // Mostra messaggio iniziale enigma 2 (3s)
      setMessaggioEnigma2(true)
      
      setTimeout(() => {
        setMessaggioEnigma2(false)
        // Mostra obiettivo enigma 2
        setMessaggioObiettivoEnigma2(true)
        setTimeout(() => setMessaggioObiettivoEnigma2(false), 5000)
      }, 3000)
    }, 5000) // 5 secondi di pausa
    
    return () => clearTimeout(timer)
  }
}, [enigma1Completato, enigma2Avviato, puzzleStates.enigma2])
```

---

## 📋 CHECKLIST IMPLEMENTAZIONE

### 🛏️ CAMERA DA LETTO

#### A. Preparazione (10 min)
- [ ] Backup file `BedroomScene.jsx`
- [ ] Verificare enigmi e messaggi attuali
- [ ] Identificare `puzzleStates` corretti da `useBedroomPuzzle`

#### B. Aggiungere Stati (5 min)
- [ ] Aggiungere stati completamento: `enigma1Completato`, `enigma2Completato`, `enigma3Completato`
- [ ] Aggiungere stati avvio: `enigma2Avviato`, `enigma3Avviato`
- [ ] Aggiungere refs per interval: `enigma1RepeatIntervalRef`, etc.
- [ ] Aggiungere flag ripetizione: `enigma1RepeatStarted`, etc.

#### C. Implementare Enigma 1 (Letto) (15 min)
- [ ] useEffect avvio automatico dopo 1s
- [ ] useEffect sistema ripetizione 15s
- [ ] useEffect stop ripetizione quando completato
- [ ] useEffect monitoraggio `puzzleStates.comodino` + `puzzleStates.materasso`

#### D. Implementare Enigma 2 (Poltrona) (15 min)
- [ ] useEffect avvio automatico dopo 5s da enigma 1
- [ ] useEffect sistema ripetizione 15s
- [ ] useEffect stop ripetizione quando completato
- [ ] useEffect monitoraggio `puzzleStates.poltrona`

#### E. Implementare Enigma 3 (Ventola) (15 min)
- [ ] useEffect avvio automatico dopo 5s da enigma 2
- [ ] useEffect sistema ripetizione 15s
- [ ] useEffect stop ripetizione quando completato
- [ ] useEffect monitoraggio `puzzleStates.ventola`

#### F. Test (15 min)
- [ ] Test avvio automatico enigma 1
- [ ] Test ripetizione messaggi
- [ ] Test sequenza automatica 1→2→3
- [ ] Test cleanup interval al completamento

---

### 🛋️ SOGGIORNO

#### A. Preparazione (10 min)
- [ ] Backup file `LivingRoomScene.jsx`
- [ ] Verificare enigmi e messaggi attuali
- [ ] Identificare `puzzleStates` corretti da `useLivingRoomPuzzle`

#### B. Aggiungere Stati (5 min)
- [ ] Aggiungere stati completamento: `enigma1Completato`, `enigma2Completato`, `enigma3Completato`
- [ ] Aggiungere stati avvio: `enigma2Avviato`, `enigma3Avviato`
- [ ] Aggiungere refs per interval: `enigma1RepeatIntervalRef`, etc.
- [ ] Aggiungere flag ripetizione: `enigma1RepeatStarted`, etc.

#### C. Implementare Enigma 1 (TV/Divano) (15 min)
- [ ] useEffect avvio automatico dopo 1s
- [ ] useEffect sistema ripetizione 15s
- [ ] useEffect stop ripetizione quando completato
- [ ] useEffect monitoraggio `puzzleStates.humano` + `puzzleStates.couch`

#### D. Implementare Enigma 2 (Pianta) (15 min)
- [ ] useEffect avvio automatico dopo 5s da enigma 1
- [ ] useEffect sistema ripetizione 15s
- [ ] useEffect stop ripetizione quando completato
- [ ] useEffect monitoraggio `puzzleStates.pianta`

#### E. Implementare Enigma 3 (Condizionatore) (15 min)
- [ ] useEffect avvio automatico dopo 5s da enigma 2
- [ ] useEffect sistema ripetizione 15s
- [ ] useEffect stop ripetizione quando completato
- [ ] useEffect monitoraggio `puzzleStates.condizionatore`

#### F. Test (15 min)
- [ ] Test avvio automatico enigma 1
- [ ] Test ripetizione messaggi
- [ ] Test sequenza automatica 1→2→3
- [ ] Test cleanup interval al completamento

---

## 🎨 TEMPLATE CODICE COMPLETO

### Per ogni enigma, replicare questo pattern:

```javascript
// ==================== ENIGMA 1 ====================

// 1️⃣ Stati
const [enigma1Completato, setEnigma1Completato] = useState(false)
const [enigma1RepeatStarted, setEnigma1RepeatStarted] = useState(false)
const enigma1RepeatIntervalRef = useRef(null)

// 2️⃣ Avvio automatico (1s dopo caricamento)
useEffect(() => {
  if (!isLoading && safeSpawnPosition && puzzleStates.enigma1) {
    const timer = setTimeout(() => {
      setMessaggioEnigma1(true)
      setTimeout(() => {
        setMessaggioEnigma1(false)
        setMessaggioObiettivoEnigma1(true)
        setTimeout(() => setMessaggioObiettivoEnigma1(false), 5000)
      }, 3000)
    }, 1000)
    return () => clearTimeout(timer)
  }
}, [isLoading, safeSpawnPosition, puzzleStates.enigma1])

// 3️⃣ Sistema ripetizione (15s)
useEffect(() => {
  if (messaggioObiettivoEnigma1 && !enigma1RepeatStarted && !enigma1Completato) {
    setEnigma1RepeatStarted(true)
    enigma1RepeatIntervalRef.current = setInterval(() => {
      setMessaggioObiettivoEnigma1(true)
      setTimeout(() => setMessaggioObiettivoEnigma1(false), 5000)
    }, 15000)
  }
}, [messaggioObiettivoEnigma1, enigma1RepeatStarted, enigma1Completato])

// 4️⃣ Stop ripetizione quando completato
useEffect(() => {
  if (enigma1Completato && enigma1RepeatIntervalRef.current) {
    clearInterval(enigma1RepeatIntervalRef.current)
    enigma1RepeatIntervalRef.current = null
    setEnigma1RepeatStarted(false)
  }
}, [enigma1Completato])

// 5️⃣ Monitoraggio completamento
useEffect(() => {
  if (puzzleStates.enigma1 === 'solved' && !enigma1Completato) {
    setEnigma1Completato(true)
  }
}, [puzzleStates.enigma1, enigma1Completato])

// ==================== ENIGMA 2 ====================

// 1️⃣ Stati
const [enigma2Avviato, setEnigma2Avviato] = useState(false)
const [enigma2Completato, setEnigma2Completato] = useState(false)
const [enigma2RepeatStarted, setEnigma2RepeatStarted] = useState(false)
const enigma2RepeatIntervalRef = useRef(null)

// 2️⃣ Avvio automatico dopo enigma 1 (5s)
useEffect(() => {
  if (enigma1Completato && !enigma2Avviato && puzzleStates.enigma2) {
    setEnigma2Avviato(true)
    const timer = setTimeout(() => {
      setMessaggioEnigma2(true)
      setTimeout(() => {
        setMessaggioEnigma2(false)
        setMessaggioObiettivoEnigma2(true)
        setTimeout(() => setMessaggioObiettivoEnigma2(false), 5000)
      }, 3000)
    }, 5000)
    return () => clearTimeout(timer)
  }
}, [enigma1Completato, enigma2Avviato, puzzleStates.enigma2])

// 3️⃣ Sistema ripetizione (15s)
useEffect(() => {
  if (messaggioObiettivoEnigma2 && !enigma2RepeatStarted && !enigma2Completato) {
    setEnigma2RepeatStarted(true)
    enigma2RepeatIntervalRef.current = setInterval(() => {
      setMessaggioObiettivoEnigma2(true)
      setTimeout(() => setMessaggioObiettivoEnigma2(false), 5000)
    }, 15000)
  }
}, [messaggioObiettivoEnigma2, enigma2RepeatStarted, enigma2Completato])

// 4️⃣ Stop ripetizione quando completato
useEffect(() => {
  if (enigma2Completato && enigma2RepeatIntervalRef.current) {
    clearInterval(enigma2RepeatIntervalRef.current)
    enigma2RepeatIntervalRef.current = null
    setEnigma2RepeatStarted(false)
  }
}, [enigma2Completato])

// 5️⃣ Monitoraggio completamento
useEffect(() => {
  if (puzzleStates.enigma2 === 'solved' && !enigma2Completato) {
    setEnigma2Completato(true)
  }
}, [puzzleStates.enigma2, enigma2Completato])

// ==================== ENIGMA 3 (uguale a enigma 2) ====================
```

---

## ⚠️ NOTE IMPORTANTI

### 🔍 puzzleStates da verificare

**Camera da letto:**
- `puzzleStates.comodino` e `puzzleStates.materasso` per Enigma 1
- `puzzleStates.poltrona` per Enigma 2
- `puzzleStates.ventola` per Enigma 3

**Soggiorno:**
- `puzzleStates.humano` e `puzzleStates.couch` per Enigma 1
- `puzzleStates.pianta` per Enigma 2
- `puzzleStates.condizionatore` per Enigma 3

### 🚨 Cleanup importante

```javascript
// Al unmount del componente, pulire TUTTI gli interval
useEffect(() => {
  return () => {
    if (enigma1RepeatIntervalRef.current) {
      clearInterval(enigma1RepeatIntervalRef.current)
    }
    if (enigma2RepeatIntervalRef.current) {
      clearInterval(enigma2RepeatIntervalRef.current)
    }
    if (enigma3RepeatIntervalRef.current) {
      clearInterval(enigma3RepeatIntervalRef.current)
    }
  }
}, [])
```

### 🎯 Timing esatti da rispettare

- **Avvio primo enigma:** 1 secondo dopo caricamento completo
- **Messaggio iniziale:** 3 secondi
- **Messaggio obiettivo (prima volta):** 5 secondi
- **Ripetizione messaggi:** Ogni 15 secondi
- **Timer tra enigmi:** 5 secondi

---

## 🎉 RISULTATO ATTESO

Dopo l'implementazione, TUTTE le 4 stanze avranno:

✅ **Avvio automatico** - Primo enigma parte 1s dopo spawn  
✅ **Ripetizione persistente** - Obiettivo ripetuto ogni 15s fino a completamento  
✅ **Sequenza fluida** - Automatica tra i 3 enigmi (timer 5s)  
✅ **Esperienza uniforme** - Stesso comportamento in bagno, cucina, camera, soggiorno

---

**Data creazione:** 2026-01-08  
**Versione:** 1.0  
**Status:** 🚀 Pronto per implementazione
