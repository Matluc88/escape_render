# Fix Messaggio Secondo Enigma Soggiorno

## Problema Rilevato

Il messaggio del secondo enigma (Pianta) non partiva dopo il completamento del primo enigma (TV).

**Sintomo:** Dopo aver completato la TV, il LED della pianta diventava rosso (corretto) ma il messaggio automatico "Facilita la fotosintesi!" non compariva.

## Causa Root

Guard errata alla **riga 773** di `LivingRoomScene.jsx`:

```javascript
// ❌ GUARD ERRATA
if (enigma1Completato && !enigma2AvviatoRef.current && 
    livingRoomPuzzle.ledStates && livingRoomPuzzle.ledStates.condizionatore === 'off') {
```

### Perché era sbagliato?

1. La guard controllava `condizionatore === 'off'`, ma il **condizionatore è l'enigma 3**, non l'enigma 2!
2. Questa condizione **bloccava l'avvio** del secondo enigma se il condizionatore non era esattamente 'off'
3. Il pattern corretto usato in **BathroomScene** e **KitchenScene** non ha questa guard aggiuntiva

### Logica corretta degli enigmi:
- ✅ Enigma 1 (TV) → LED pianta diventa **ROSSO** → sblocca enigma 2
- ✅ Enigma 2 (Pianta) → LED condizionatore diventa **ROSSO** → sblocca enigma 3
- ✅ Enigma 3 (Condizionatore/Porta) → LED porta diventa **VERDE** → stanza completata

## Soluzione Applicata

**File modificato:** `escape-room-3d/src/components/scenes/LivingRoomScene.jsx`

Rimosso la guard sul condizionatore, seguendo il pattern di BathroomScene e KitchenScene:

```javascript
// ✅ CORRETTO (pattern Bagno/Cucina)
useEffect(() => {
  // ✅ FIX: Rimuovo guard condizionatore (pattern corretto da Bagno/Cucina)
  if (enigma1Completato && !enigma2AvviatoRef.current) {
    console.log('[LivingRoomScene] ⏱️ Enigma 1 completato → Avvio timer per secondo enigma')
    enigma2AvviatoRef.current = true  // ← GUARD: SUBITO per bloccare ri-esecuzioni!
    
    const timer = setTimeout(() => {
      console.log('[LivingRoomScene] ⏱️ Timer scaduto → Avvio SECONDO ENIGMA (Pianta)')
      setMessaggioInizialeEnigma2(true)
      // ... resto del codice
    }, 5000)
    
    return () => clearTimeout(timer)
  }
}, [enigma1Completato, livingRoomPuzzle.ledStates])
```

## Pattern di Riferimento

Il codice ora segue lo stesso pattern usato in:
- ✅ `BathroomScene.jsx` - 3 enigmi sequenziali (specchio, doccia, ventola)
- ✅ `KitchenScene.jsx` - 3 enigmi sequenziali (fornelli, frigo, serra)

## Sequenza Messaggi Automatici Corretta

1. **Enigma 1 (TV):**
   - Avvio: 1s dopo caricamento scena
   - Ripetizione: Ogni 15s fino a completamento
   - Completamento: LED pianta → ROSSO

2. **Enigma 2 (Pianta):** ← **FIX APPLICATO QUI**
   - Avvio: 5s dopo completamento enigma 1
   - Ripetizione: Ogni 15s fino a completamento
   - Completamento: LED condizionatore → ROSSO

3. **Enigma 3 (Condizionatore/Porta):**
   - Avvio: 5s dopo completamento enigma 2
   - Ripetizione: Ogni 15s fino a completamento
   - Completamento: LED porta → VERDE + messaggio finale stanza

## Test

✅ Dopo la fix, il flusso è:
1. Carica scena soggiorno
2. Dopo 1s: Messaggio "Mettiti comodo" + obiettivo TV
3. Completa TV (tasto M o sensore MAG1)
4. **Dopo 5s: Messaggio "Facilita la fotosintesi!" + obiettivo pianta** ← ORA FUNZIONA!
5. Completa pianta (tasto G o sensore MAG2)
6. Dopo 5s: Messaggio condizionatore + obiettivo porta
7. Chiudi porta → Completa stanza

## Data Fix

**Data:** 16 Gennaio 2026, 22:13  
**File modificato:** `src/components/scenes/LivingRoomScene.jsx` (riga 773)  
**Pattern applicato:** Uguale a BathroomScene/KitchenScene

---

## Note Tecniche

- La guard `enigma2AvviatoRef.current` è sufficiente per evitare ri-esecuzioni
- Il ref viene impostato **immediatamente** prima di avviare il timer per bloccare race conditions
- Il dependency array `[enigma1Completato, livingRoomPuzzle.ledStates]` è corretto (mantiene sincronizzazione con backend)