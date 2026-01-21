# 🛏️ COMODINO - Animazione Multi-Object Sequenziale

## 📋 Requisiti

**Oggetti coinvolti (3 elementi del comodino):**
1. `Samuelson_8479_Nightstand(9EC68E8D-5D4A-4CC2-AA0B-B64FEFC940C3)`
2. `Samuelson_8479_Nightstand(506AD06A-2C99-4062-BD08-1261C616FEDB)`
3. `Samuelson_8479_Nightstand(506AD06A-2C99-4062-BD08-1261C616FEDB)` *(duplicato?)*

**Sequenza animazione richiesta:**
1. **FASE 1 - Rotazione** 
   - Tutti e 3 gli oggetti ruotano insieme
   - Parametri: *(da fornire)*
   
2. **DELAY - 1 secondo**
   - Pausa tra le due fasi

3. **FASE 2 - Traslazione**
   - Tutti e 3 gli oggetti si spostano insieme
   - Parametri: *(da fornire)*

---

## 🎯 Soluzione Scelta: Estensione Animation Editor

### Vantaggi:
- ✅ Flessibilità - configurabile tramite UI
- ✅ Riutilizzabile - funziona per qualsiasi gruppo di oggetti
- ✅ Visuale - preview in tempo reale
- ✅ Debug - helper visuali per tutte le fasi

---

## 🛠️ Implementazione

### 1. Hook: `useSequentialAnimation.js`
```javascript
// Gestisce animazioni sequenziali con delay
// Input:
// - objects: array di Object3D
// - sequence: array di { type, params, delay }
// - isPlaying: boolean trigger
```

**Features:**
- Sincronizzazione perfetta tra oggetti
- Gestione timeline con delay
- Reset a posizione iniziale
- Callback onComplete per ogni fase

### 2. Estensione AnimationEditor UI

**Nuovi campi:**
- 🔢 **Multi-Object Mode** toggle
- 📝 **Object UUIDs** textarea (uno per riga)
- 🎬 **Sequence Editor**:
  - Fase 1: tipo (rotation/position) + parametri
  - Delay: millisecondi
  - Fase 2: tipo (rotation/position) + parametri

### 3. Helper Visuali

**Durante preview:**
- Highlight tutti gli oggetti selezionati (cyan)
- Pivot/Path per ogni fase
- Timeline indicator (fase corrente)
- Ghost preview del movimento

---

## 📊 Dati Necessari (da fornire)

### Fase 1 - Rotazione
```
- pivotX: ?
- pivotY: ?
- pivotZ: ?
- axis: x | y | z
- angle: ? (gradi)
- speed: ? (gradi/secondo)
- direction: 1 | -1
```

### Fase 2 - Traslazione
```
- startX: ? (posizione attuale)
- startY: ?
- startZ: ?
- endX: ? (destinazione)
- endY: ?
- endZ: ?
- speed: ? (unità/secondo)
```

---

## 🚀 Workflow UI

### FASE 1: Selezione Multi-Object

1. **Abilitare Animation Editor** (tasto `E` in BedroomScene)
2. **Click "🔄 Seleziona Più Oggetti"**
   - Attiva modalità multi-selezione
   - Cursore cambia per indicare la modalità
   - Gli oggetti cliccati vengono aggiunti alla lista

3. **Seleziona oggetti nel 3D**
   - Click su ogni elemento del comodino
   - Ogni oggetto viene evidenziato (cyan)
   - Lista si aggiorna in tempo reale
   - Possibilità di rimuovere singoli oggetti (pulsante X)

4. **Click "✅ Conferma Oggetti"**
   - **Blocca la selezione** (non modificabile)
   - Disattiva modalità multi-selezione
   - Oggetti restano evidenziati ma non cliccabili
   - Passa alla configurazione animazione

### FASE 2: Configurazione Animazione

5. **Configurare Fase 1** (rotazione) con i dati forniti
6. **Impostare Delay** = 1000ms
7. **Configurare Fase 2** (traslazione) con i dati forniti
8. **Test Preview** - tutti e 3 gli oggetti si animano insieme
9. **Export config** - salva la configurazione JSON

### UI Mockup
```
┌─────────────────────────────────────────────┐
│  ANIMATION EDITOR - Multi-Object            │
├─────────────────────────────────────────────┤
│                                             │
│  [🔄 Seleziona Più Oggetti]  (Attivo: No)  │
│                                             │
│  Oggetti Selezionati (3):                   │
│  ├─ Samuelson_8479_Nightstand (9EC6...) [X]│
│  ├─ Samuelson_8479_Nightstand (506A...) [X]│
│  └─ Samuelson_8479_Nightstand (506A...) [X]│
│                                             │
│  [✅ Conferma Oggetti] ← Blocca selezione   │
│                                             │
│  ────────────────────────────────────────── │
│  CONFIGURAZIONE ANIMAZIONE:                 │
│  (Visibile dopo conferma oggetti)           │
│                                             │
│  Sequenza:                                  │
│  1. [Rotazione] → Delay: 1000ms → [Trasl.] │
│                                             │
│  [▶ Test Preview] [📋 Export JSON]         │
└─────────────────────────────────────────────┘
```

---

## 📝 Stato Attuale

- [x] Animation Editor base implementato in BedroomScene
- [ ] Hook `useSequentialAnimation.js`
- [ ] Estensione UI per multi-object
- [ ] Gestione timeline con delay
- [ ] Test con comodino
- [ ] ⏳ **In attesa dati animazione**

---

## 🎨 Note Tecniche

**Sincronizzazione:**
- Tutti gli oggetti condividono lo stesso clock
- Movimento perfettamente sincronizzato
- Delay gestito tramite requestAnimationFrame

**Pattern ROOT:**
- Usa `getMovableNode()` per risolvere gerarchie
- Supporta oggetti con parent trasformati

**Performance:**
- Calcolo matrici world solo 1 volta per frame
- Interpolazione lineare (slerp per rotazioni)
- Throttling su mobile

---

**Creato:** 22/12/2025  
**Status:** ⏳ Attesa dati parametri animazione
