# 🔍 SISTEMA DI TRACKING PENTOLA - Guida Completa

## 📋 **RIEPILOGO MODIFICHE**

### ✅ **FILE CREATI:**

1. **`src/hooks/usePentolaTracker.js`** - Hook dedicato per tracking millimetrico
   - Monitora posizione frame-by-frame (60 FPS)
   - Precisione: 6 decimali (0.000001m)
   - Rileva: movimento, stop, teleport, cambio parent
   - Allarmi automatici per anomalie

### ✅ **FILE MODIFICATI:**

2. **`src/components/scenes/KitchenScene.jsx`**
   - Import `usePentolaTracker`
   - Ricerca automatica PENTOLA per UUID
   - Attivazione tracking quando:
     - Pentola selezionata
     - Animazione in corso

3. **`src/hooks/useAnimationPreview.js`**
   - Clamp del progress (0-1) per prevenire estrapolazione
   - Log extra "🚫 STOP LOOP" per debug

---

## 🎯 **COME TESTARE**

### **STEP 1: Avvia il Server**
```bash
cd escape-room-3d
npm run dev
```

### **STEP 2: Apri Cucina**
- Vai a `http://localhost:5173`
- Entra in "Cucina"

### **STEP 3: Attiva Animation Editor**
- Premi **E** sulla tastiera
- Dovresti vedere banner "🎨 ANIMATION EDITOR ATTIVO"

### **STEP 4: Seleziona la PENTOLA**
- **Click diretto sulla PENTOLA** (oggetto 3D nella scena)
- Console deve mostrare:
  ```
  [AnimationEditorScene] Oggetto selezionato: PENTOLA(FC640F14-10EB-486E-8AED-5773C59DA9E0)
  🍳 [AnimationEditorScene] PENTOLA trovata! ...
  ```

### **STEP 5: Configura Destinazione**
- Click **"Pick Destination"** nell'editor
- Click su un punto VICINO (< 5 metri)
- Verifica coordinate Punto B nell'editor

### **STEP 6: Avvia Animazione con Tracking**
- Click **"Test Animation"**
- Console mostrerà:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔍 [PENTOLA TRACKER] ATTIVATO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📦 Oggetto: PENTOLA(FC640F14-10EB-486E-8AED-5773C59DA9E0)
🆔 UUID: FC640F14-10EB-486E-8AED-5773C59DA9E0
👪 Parent: Scene
📍 Posizione iniziale: [-1.015000, -0.109000, 0.857000]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🚀 [T:0.000s] PENTOLA - MOVIMENTO INIZIATO
📍 Posizione: [-1.015000, -0.109000, 0.857000]
⚡ Velocità: 0.000000 m/s
👪 Parent: Scene

🎬 [T:0.500s | Frame:30] PENTOLA IN MOVIMENTO
   📍 Pos: [-1.306000, 0.150000, 1.396000]
   📏 Δ: 0.005000m | ⚡ Vel: 0.312 m/s
   👪 Parent: Scene

🎬 [T:1.000s | Frame:60] PENTOLA IN MOVIMENTO
   📍 Pos: [-1.596000, 0.410000, 1.936000]
   📏 Δ: 0.005000m | ⚡ Vel: 0.304 m/s
   👪 Parent: Scene

🛑 [T:2.500s] PENTOLA - MOVIMENTO FERMATO
📍 Posizione finale: [-2.165000, 0.918000, 2.994000]
👪 Parent: Scene
🔢 Frame totali movimento: 150
```

---

## 🚨 **ALLARMI AUTOMATICI**

### **1. Movimento Anomalo**
Se la pentola si ferma e riparte:
```
⚠️  [T:3.000s] MOVIMENTO ANOMALO RILEVATO!
⚠️  Pentola si è fermata e ripartita 2 volte
```

### **2. Teleport Rilevato**
Se la pentola salta > 0.5m in 1 frame:
```
🚨 [T:1.234s] TELEPORT RILEVATO!
📍 Da: [-1.015, -0.109, 0.857]
📍 A:  [-3.015, -0.109, 0.857]
📏 Salto: 2.000m in 16.7ms
```

### **3. Cambio Parent**
Se il parent cambia durante animazione:
```
⚠️  [T:0.750s] CAMBIO PARENT RILEVATO!
   Da: mobile_cucina
   A:  Scene
```

---

## 📊 **FORMATO LOG**

### **Durante Movimento:**
```
🎬 [T:1.234s | Frame:74] PENTOLA IN MOVIMENTO
   📍 Pos: [X.XXXXXX, Y.YYYYYY, Z.ZZZZZZ]
   📏 Δ: 0.005000m | ⚡ Vel: 0.350 m/s
   👪 Parent: Scene
```

### **Quando Fermo:**
```
💤 [T:5.000s | Frame:300] PENTOLA FERMA
   📍 Pos: [-2.165000, 0.918000, 2.994000]
```

### **Completamento Animazione:**
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎯 [ARRIVO] Confronto Punto B vs Posizione Finale:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎯 Punto B configurato: [-2.165, 0.918, 2.994]
📍 Posizione effettiva:  [-2.165, 0.918, 2.994]
📏 Delta X: 0.000000m (✅ OK)
📏 Delta Y: 0.000000m (✅ OK)
📏 Delta Z: 0.000000m (✅ OK)
📏 Distanza totale: 0.000000m (✅ PRECISO)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🛑 [PENTOLA TRACKER] DISATTIVATO
```

---

## 🔧 **PARAMETRI CONFIGURABILI**

In `usePentolaTracker.js`:

```javascript
// Threshold movimento (0.0001m = 0.1mm)
const MOVEMENT_THRESHOLD = 0.0001

// Frequenza log movimento (ogni N frame)
if (frameCount.current % 10 === 0)

// Frequenza log fermo (ogni N frame)
if (frameCount.current % 60 === 0)

// Threshold teleport (salto > 0.5m)
if (delta > 0.5 && deltaTime < 0.1)
```

---

## ✅ **CHECKLIST TEST**

- [ ] Server avviato
- [ ] Cucina aperta
- [ ] Editor attivo (E)
- [ ] PENTOLA selezionata (UUID verificato in console)
- [ ] Destinazione configurata
- [ ] Test animation avviato
- [ ] Log tracking visibili in console
- [ ] Animazione si ferma correttamente
- [ ] Posizione finale = Punto B configurato

---

## 🎯 **RISULTATO ATTESO**

1. ✅ **Tracking attivo** solo quando PENTOLA selezionata + animazione running
2. ✅ **Log millimetrici** frame-by-frame durante movimento
3. ✅ **Stop definitivo** quando raggiunge Punto B
4. ✅ **Allarmi** se movimento anomalo/teleport/parent change
5. ✅ **Precisione assoluta**: Delta < 0.000001m

---

## 📝 **NOTE**

- Il tracking è **indipendente** dal sistema di animazione
- Cattura **OGNI** movimento, anche micro-spostamenti
- **NON interferisce** con le performance (tracking solo quando necessario)
- Può essere **disabilitato** impostando `enabled={false}` in `usePentolaTracker`

---

## 🚀 **PROSSIMI PASSI**

1. **Testa** con la procedura sopra
2. **Verifica** i log in console
3. **Confronta** Punto B configurato vs Posizione finale
4. **Segnala** eventuali anomalie rilevate dal tracker

---

**Sistema implementato:** 17/12/2025 - 17:45
**Versione:** 1.0.0
**Status:** ✅ Pronto per test
