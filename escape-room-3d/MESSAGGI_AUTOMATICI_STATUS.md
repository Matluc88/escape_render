# 🔄 SISTEMA MESSAGGI AUTOMATICI - STATUS IMPLEMENTAZIONE

## ✅ COMPLETATO

### 🚿 BAGNO (100% - Pattern di riferimento)
- ✅ Avvio automatico primo enigma (1s dopo caricamento)
- ✅ Sistema ripetizione messaggi (ogni 15s)
- ✅ Sequenza automatica 3 enigmi con timer 5s tra uno e l'altro
- ✅ Monitoraggio completamento per sbloccare successivo
- ✅ Cleanup interval quando enigma completato

**Enigmi:**
1. Specchio (proximity countdown)
2. Porta finestra (apri/chiudi anta doccia)  
3. Umidità (chiudi porta-finestra)

### 🍳 CUCINA (100% - Completata!)
- ✅ Avvio automatico primo enigma (1s dopo caricamento)
- ✅ Sistema ripetizione messaggi (ogni 15s) per 3 enigmi
- ✅ Sequenza automatica 3 enigmi con timer 5s tra uno e l'altro
- ✅ Monitoraggio completamento per sbloccare successivo
- ✅ Cleanup interval quando enigma completato

**Enigmi:**
1. Fornelli (posizionare pentola)
2. Frigo (chiudere sportello)
3. Serra (accendere neon verde)

## ⏳ IN ATTESA

### 🛏️ CAMERA DA LETTO (0%)
- [ ] Avvio automatico primo enigma
- [ ] Sistema ripetizione messaggi (ogni 15s)
- [ ] Sequenza automatica 3 enigmi
- [ ] Monitoraggio completamento
- [ ] Cleanup interval

**Enigmi esistenti:**
1. Comodino
2. Materasso  
3. Porta finestra camera

### 🛋️ SOGGIORNO (0%)
- [ ] Avvio automatico primo enigma
- [ ] Sistema ripetizione messaggi (ogni 15s)
- [ ] Sequenza automatica 3 enigmi
- [ ] Monitoraggio completamento
- [ ] Cleanup interval

**Enigmi esistenti:**
1. Humano (persona)
2. Couch (divano)
3. Pianta

---

## 📋 PATTERN STANDARD (da replicare)

```javascript
// 1. Stati e refs
const [enigma1Completato, setEnigma1Completato] = useState(false)
const [enigma2Avviato, setEnigma2Avviato] = useState(false)
const [enigma2Completato, setEnigma2Completato] = useState(false)
const [enigma3Avviato, setEnigma3Avviato] = useState(false)
const [enigma3Completato, setEnigma3Completato] = useState(false)

const enigma1RepeatIntervalRef = useRef(null)
const enigma2RepeatIntervalRef = useRef(null)
const enigma3RepeatIntervalRef = useRef(null)

// 2. Avvio automatico primo enigma
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

// 3. Sistema ripetizione (per ogni enigma)
const [enigma1RepeatStarted, setEnigma1RepeatStarted] = useState(false)

useEffect(() => {
  if (messaggioObiettivoEnigma1 && !enigma1RepeatStarted && !enigma1Completato) {
    setEnigma1RepeatStarted(true)
    enigma1RepeatIntervalRef.current = setInterval(() => {
      setMessaggioObiettivoEnigma1(true)
      setTimeout(() => setMessaggioObiettivoEnigma1(false), 5000)
    }, 15000)
  }
}, [messaggioObiettivoEnigma1, enigma1RepeatStarted, enigma1Completato])

useEffect(() => {
  if (enigma1Completato && enigma1RepeatIntervalRef.current) {
    clearInterval(enigma1RepeatIntervalRef.current)
    enigma1RepeatIntervalRef.current = null
    setEnigma1RepeatStarted(false)
  }
}, [enigma1Completato])

// 4. Monitoraggio completamento + avvio successivo
useEffect(() => {
  if (puzzleStates.enigma1 === 'solved' && !enigma1Completato) {
    setEnigma1Completato(true)
  }
}, [puzzleStates.enigma1, enigma1Completato])

useEffect(() => {
  if (enigma1Completato && !enigma2Avviato) {
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
}, [enigma1Completato])
```

---

## 🎯 PROSSIMI PASSI

1. **Camera da letto**: Replicare pattern completo
2. **Soggiorno**: Replicare pattern completo
3. **Test completo**: Verificare funzionamento in tutte le 4 stanze
4. **Documentazione finale**: Creare guida utente

---

**Data aggiornamento**: 2026-01-08  
**Autore**: Sistema automatico messaggi enigmi
