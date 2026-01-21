# 🔄 Sistema Ripetizione Messaggi Bagno

**Data:** 08/01/2026  
**Versione:** 1.0  
**File modificato:** `src/components/scenes/BathroomScene.jsx`

---

## 📋 Problema Risolto

**PRIMA:** I messaggi obiettivo nel bagno apparivano **una volta sola** e poi scomparivano per sempre. Se i ragazzi non facevano in tempo a leggere, perdevano informazioni cruciali per risolvere gli enigmi.

**DOPO:** I messaggi obiettivo si **ripetono automaticamente** ogni 15 secondi finché l'enigma non è completato, dando ai ragazzi tutto il tempo necessario per leggere e capire l'obiettivo.

---

## 🎯 Funzionamento

### Sequenza temporale per ogni enigma:

```
MESSAGGIO INIZIALE (3s - appare solo la prima volta)
↓
MESSAGGIO OBIETTIVO (5s visibile)
↓
PAUSA (10s invisibile)
↓
MESSAGGIO OBIETTIVO (5s visibile) ← RIPETE!
↓
PAUSA (10s invisibile)
↓
[continua a ripetere finché enigma non è risolto]
↓
ENIGMA COMPLETATO → STOP RIPETIZIONI ✓
```

### Timing specifico:
- **Messaggio iniziale**: 3 secondi (solo prima volta)
- **Messaggio obiettivo**: 5 secondi visibile
- **Pausa tra ripetizioni**: 10 secondi
- **Ciclo completo**: 15 secondi (5s + 10s)

---

## 🔧 Implementazione Tecnica

### 1. Ref per memorizzare gli interval

```javascript
// 🔄 SISTEMA RIPETIZIONE MESSAGGI - Ref per memorizzare gli interval
const specchioRepeatIntervalRef = useRef(null)
const portaFinestraRepeatIntervalRef = useRef(null)
const umiditaRepeatIntervalRef = useRef(null)
```

### 2. useEffect per ogni enigma (Esempio: Enigma 1 - Specchio)

```javascript
// 🔄 SISTEMA RIPETIZIONE MESSAGGI - Enigma 1 (Specchio)
useEffect(() => {
  // Pulisci interval precedente
  if (specchioRepeatIntervalRef.current) {
    clearInterval(specchioRepeatIntervalRef.current)
    specchioRepeatIntervalRef.current = null
  }
  
  // Avvia ripetizione solo se obiettivo attivo E enigma NON completato
  if (messaggioObiettivoSpecchio && !enigma1Completato) {
    console.log('[BathroomScene] 🔄 Avvio ripetizione messaggio specchio (ogni 15s)')
    
    specchioRepeatIntervalRef.current = setInterval(() => {
      console.log('[BathroomScene] 🔄 Ripeto messaggio obiettivo specchio')
      setMessaggioObiettivoSpecchio(true)
      setTimeout(() => setMessaggioObiettivoSpecchio(false), 5000)
    }, 15000) // Ripete ogni 15 secondi
  }
  
  // Cleanup quando enigma completato o componente smontato
  return () => {
    if (specchioRepeatIntervalRef.current) {
      console.log('[BathroomScene] 🛑 Stop ripetizione messaggio specchio')
      clearInterval(specchioRepeatIntervalRef.current)
      specchioRepeatIntervalRef.current = null
    }
  }
}, [messaggioObiettivoSpecchio, enigma1Completato])
```

### 3. Pattern applicato a tutti e 3 gli enigmi

Lo stesso pattern è stato replicato per:
- **Enigma 1 (Specchio)**: Concentrazione mentale per accendere luci
- **Enigma 2 (Porta finestra)**: Chiudere doccia per avere spazio
- **Enigma 3 (Umidità)**: Chiudere porta-finestra per evitare aria fredda

---

## ✅ Vantaggi

### Per gli studenti:
- 🎯 **Non perdono più i messaggi** - possono rileggerli tutte le volte che serve
- 🧠 **Riduce la frustrazione** - non devono ricordare tutto al primo colpo
- 📚 **Migliora l'apprendimento** - possono rivedere gli obiettivi mentre esplorano
- ⏱️ **Tempo flessibile** - ogni studente può lavorare al proprio ritmo

### Per l'esperienza di gioco:
- 🔄 **Coerenza** - stesso comportamento in tutti gli enigmi del bagno
- 🎮 **Non invadente** - 10 secondi di pausa permettono esplorazione libera
- 🎓 **Educativo** - facilita la comprensione dei concetti di sostenibilità
- 🚀 **Accessibile** - adatto a diversi livelli di abilità

---

## 🔍 Debug e Testing

### Log console per verificare il funzionamento:

```
[BathroomScene] 🔄 Avvio ripetizione messaggio specchio (ogni 15s)
[BathroomScene] 🔄 Ripeto messaggio obiettivo specchio
[BathroomScene] 🔄 Ripeto messaggio obiettivo specchio
[BathroomScene] 🛑 Stop ripetizione messaggio specchio
```

### Come testare:
1. Avvia la scena bagno
2. Aspetta che appaia il messaggio obiettivo (dopo il messaggio iniziale)
3. Osserva che il messaggio **riappare dopo 15 secondi**
4. Completa l'enigma
5. Verifica che le ripetizioni si **fermano automaticamente**

---

## 📊 Stati gestiti

### Stati booleani:
- `messaggioObiettivoSpecchio` - Visibilità messaggio obiettivo enigma 1
- `obiettivoPortaFinestra` - Visibilità messaggio obiettivo enigma 2
- `obiettivoUmidita` - Visibilità messaggio obiettivo enigma 3

### Flag completamento:
- `enigma1Completato` - Specchio completato (luci accese)
- `enigma2Completato` - Doccia completata (anta chiusa)
- `enigma3Completato` - Umidità completata (porta-finestra chiusa)

### Ref interval:
- `specchioRepeatIntervalRef` - ID interval enigma 1
- `portaFinestraRepeatIntervalRef` - ID interval enigma 2
- `umiditaRepeatIntervalRef` - ID interval enigma 3

---

## ⚙️ Configurazione

### Parametri modificabili:

```javascript
// Tempo visibilità messaggio (attualmente 5 secondi)
setTimeout(() => setMessaggioObiettivoSpecchio(false), 5000)

// Intervallo ripetizione (attualmente 15 secondi)
setInterval(() => {
  // ...
}, 15000)
```

### Timing consigliato:
- **5s visibile** - Sufficiente per leggere messaggi medi
- **10s pausa** - Permette esplorazione senza disturbare
- **15s ciclo** - Bilanciamento ideale tra reminder e libertà

---

## 🚨 Cleanup e Memory Management

### Prevenzione memory leak:

1. **Cleanup in return di useEffect** - Pulisce interval quando:
   - Enigma completato
   - Componente smontato
   - Dependencies cambiano

2. **Verifica null prima di clear** - Evita errori se interval non esiste

3. **Reset ref dopo clear** - Previene doppie pulizie

```javascript
return () => {
  if (specchioRepeatIntervalRef.current) {
    clearInterval(specchioRepeatIntervalRef.current)
    specchioRepeatIntervalRef.current = null
  }
}
```

---

## 🔄 Estensione ad altre stanze

Per applicare lo stesso pattern ad altre stanze:

### 1. Copia il template:
```javascript
const tuoEnigmaRepeatIntervalRef = useRef(null)
```

### 2. Crea useEffect:
```javascript
useEffect(() => {
  if (tuoEnigmaRepeatIntervalRef.current) {
    clearInterval(tuoEnigmaRepeatIntervalRef.current)
    tuoEnigmaRepeatIntervalRef.current = null
  }
  
  if (messaggioObiettivoTuoEnigma && !tuoEnigmaCompletato) {
    tuoEnigmaRepeatIntervalRef.current = setInterval(() => {
      setMessaggioObiettivoTuoEnigma(true)
      setTimeout(() => setMessaggioObiettivoTuoEnigma(false), 5000)
    }, 15000)
  }
  
  return () => {
    if (tuoEnigmaRepeatIntervalRef.current) {
      clearInterval(tuoEnigmaRepeatIntervalRef.current)
      tuoEnigmaRepeatIntervalRef.current = null
    }
  }
}, [messaggioObiettivoTuoEnigma, tuoEnigmaCompletato])
```

### 3. Testa e verifica log console

---

## 📖 Riferimenti

### File correlati:
- `SISTEMA_MESSAGGI_OBIETTIVO_GUIDE.md` - Guida generale sistema messaggi
- `BATHROOM_LED_SYSTEM_COMPLETE.md` - Sistema LED bagno
- `src/components/scenes/BathroomScene.jsx` - Implementazione completa

### Pattern simili in altre stanze:
- BedroomScene.jsx
- KitchenScene.jsx
- LivingRoomScene.jsx

---

## 🎓 Note Pedagogiche

### Benefici educativi:
1. **Apprendimento iterativo** - Gli studenti possono rivedere gli obiettivi
2. **Riduzione stress** - Non c'è pressione di memorizzare tutto subito
3. **Focus sull'obiettivo** - Il reminder mantiene chiaro il target
4. **Accessibilità** - Supporta diversi stili di apprendimento

### Best practice UX:
- ✅ Messaggi chiari e concisi
- ✅ Timing non invadente (10s pausa)
- ✅ Stop automatico al completamento
- ✅ Feedback visivo consistente

---

**Ultimo aggiornamento:** 08/01/2026  
**Autore:** Sistema AI Assistant  
**Status:** ✅ Implementato e funzionante
