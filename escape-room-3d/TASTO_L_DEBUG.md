# 🐛 DEBUG Tasto L - Camera da Letto

**Data:** 17/01/2026  
**Problema:** Tasto L causa effetto traslazione + lampada non si accende + Humano non appare

---

## 🔍 Analisi Codice

### ✅ Cosa dovrebbe fare il tasto L:

1. **Toggle BookCase/Humano**
   - BookCase UUID: `9A07B9EA-38FF-4E73-89EE-84CD36E1E96B`
   - Humano UUID: `C96FE10C-EE14-4400-9D1D-7F6AC18B24`
   - Quando `bookcaseVisible = true`: BookCase VISIBILE, Humano INVISIBILE
   - Quando `bookcaseVisible = false`: BookCase INVISIBILE, Humano VISIBILE

2. **Toggle Lampada**
   - LED UUID: `592F5061-BEAC-4DB8-996C-4F71102704DD`
   - Gestito da `PuzzleLED` component
   - State: `lampadaAccesa` (true/false)

3. **Completa Enigma Poltrona**
   - Chiama `bedroomPuzzle.completePoltrona()`
   - Mostra messaggio completamento

---

## 🚨 Problemi Trovati

### 1. Codice DUPLICATO (CasaModel.jsx)
Il toggle BookCase/Humano è implementato in **2 posti**:
- **Effect separato** (linee 291-311) ✅ CORRETTO
- **Traverse unico** (linee 579-593) ⚠️ RIDONDANTE - potrebbe causare conflitti

### 2. UUID Incompleti?
L'UUID Humano è troncato in alcuni punti:
- Versione completa: `C96FE10C-EE14-4400-9D1D-7F6AC18B24`
- Versione blacklist: `C96FE10C-EE14-4400-9D1D-7F6AC18B24D4` (extra "D4"!)

Questo potrebbe far sì che alcuni mesh Humano non vengano trovati.

### 3. Traslazione Misteriosa
**NON C'È CODICE DI TRASLAZIONE** associato al tasto L!

Possibili cause:
- ❌ Conflitto con vecchio codice `COMODINO_K_L_KEYS.md` (dove L era per traslare)
- ❌ Cache del browser che mostra stato vecchio
- ❌ Modifica accidentale di `position` invece di `visible`
- ❌ Oggetti BookCase/Humano che hanno transform strani quando vengono mostrati

---

## 🔧 Fix Proposto

### Fix 1: Rimuovere codice duplicato
Rimuovere il toggle BookCase/Humano dal traverse unico (linee 579-593) e lasciare SOLO l'effect separato.

### Fix 2: Aggiungere log diagnostici
Aggiungere console.log per verificare:
- Se i mesh vengono trovati
- Quanti mesh matchano gli UUID
- Se la visibilità cambia effettivamente

### Fix 3: Verificare UUID esatti nel modello
Aggiungere log di TUTTI gli oggetti che contengono "bookcase" o "humano" nel nome per vedere gli UUID reali.

### Fix 4: Testare lampada isolata
Verificare se il LED lampada risponde correttamente al cambio di state `lampadaAccesa`.

---

## 📊 Test da Eseguire

1. **Test Toggle Visibilità**
   ```
   1. Apri console browser (F12)
   2. Premi L
   3. Verifica log: "[CasaModel] 📚 BookCase aggiornato: ..."
   4. Verifica log: "[CasaModel] 🚶 Humano aggiornato: ..."
   5. Conta quanti mesh vengono trovati (dovrebbe essere 1 per ciascuno)
   ```

2. **Test Lampada**
   ```
   1. Premi L
   2. Verifica log: "[BedroomScene] 💡 Tasto L - Toggle Lampada: ..."
   3. Verifica se PuzzleLED cambia colore
   ```

3. **Test Traslazione**
   ```
   1. Nota posizione player prima di premere L
   2. Premi L
   3. Verifica se player si muove (NON dovrebbe!)
   4. Verifica console per log di TELEPORT (NON dovrebbe esserci!)
   ```

---

## 🎯 Azione Immediata

Creare versione FIX con:
- Log diagnostici potenziati
- Codice duplicato rimosso
- UUID corretti
- Guard per evitare effetti collaterali

Prossimo step: Applicare fix e testare in Act Mode.