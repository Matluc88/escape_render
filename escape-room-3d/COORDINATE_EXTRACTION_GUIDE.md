# 🔍 GUIDA ESTRAZIONE COORDINATE PENTOLA E FORNELLI

## ✅ **PROBLEMA RISOLTO: FORNELLI ORA SELEZIONABILI!**

### 🔧 **FIX APPLICATO:**

Ho rimosso `Corps_32_449` dal filtro in `usePositionPicker.js` perché **fa parte dei FORNELLI**!

**PRIMA (BLOCCATO):**
```javascript
const INVALID_NAMES = ['ground_plane', 'GroundPlane', 'Corps_32_449', 'OuterWall']
// Corps_32_449 RIFIUTATO → Fornelli non selezionabili ❌
```

**DOPO (FUNZIONANTE):**
```javascript
const INVALID_NAMES = ['ground_plane', 'GroundPlane', 'OuterWall']
// Corps_32_449 RIMOSSO → Fornelli SELEZIONABILI! ✅
```

---

## 📊 **ESTRAZIONE COORDINATE REALI**

### **STEP 1: Prepara l'Ambiente**

1. **Avvia server dev:** (già attivo)
   ```bash
   cd escape-room-3d
   npm run dev
   ```

2. **Apri browser:** `http://localhost:5174`

3. **Entra in Cucina**

4. **Apri Console DevTools** (F12 → Console)

---

### **STEP 2: Esegui Script di Estrazione**

1. **Apri file:** `escape-room-3d/extract-coordinates.js`

2. **Copia TUTTO il contenuto** del file

3. **Incolla nella Console del browser** e premi Enter

4. **Lo script estrarrà automaticamente:**
   - 🍳 Posizione PENTOLA (world + local + bounding box)
   - 🔥 Posizione FORNELLI (tutti i componenti)
   - 📐 Piani cucina/tavoli
   - 📊 Distanze e analisi

---

### **STEP 3: Output e Analisi**

Lo script mostrerà nella console:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 ESTRAZIONE COORDINATE - INIZIO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ PENTOLA TROVATA: PENTOLA(FC640F14-10EB-486E-8AED-5773C59DA9E0)
   World Position: Vector3 {x: -1.015, y: -0.109, z: 0.857}

✅ FORNELLI TROVATI: 3 oggetti
   - FORNELLI: Y top = 0.950
   - Feu_32_447: Y top = 0.952
   - Corps_32_449: Y top = 0.948

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 ANALISI:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Fornello più vicino: Corps_32_449
Distanza: 0.845m
Top surface fornello Y: 0.948
Pentola Y: -0.109
Delta Y: -1.057m  ← PENTOLA SOTTO I FORNELLI!
```

---

### **STEP 4: Salvare i Dati**

**OPZIONE A - Da Console:**
```javascript
// Copia i dati in clipboard
copy(JSON.stringify(window.__COORDINATE_DATA, null, 2))

// Poi incolla in un file: PENTOLA_REAL_COORDINATES.json
```

**OPZIONE B - Download Automatico:**
```javascript
// Esegui nella console
const blob = new Blob([JSON.stringify(window.__COORDINATE_DATA, null, 2)], {type: 'application/json'});
const url = URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = 'coordinate_pentola_fornelli.json';
a.click();
```

---

## 📁 **STRUTTURA OUTPUT JSON**

```json
{
  "timestamp": "2025-12-18T12:30:00.000Z",
  
  "pentola": {
    "name": "PENTOLA(FC640F14-10EB-486E-8AED-5773C59DA9E0)",
    "uuid": "FC640F14-10EB-486E-8AED-5773C59DA9E0",
    "position_world": {
      "x": -1.015,
      "y": -0.109,
      "z": 0.857
    },
    "position_local": {
      "x": ...,
      "y": ...,
      "z": ...
    },
    "parent": "mobile_cucina",
    "bounding_box": {
      "min": {...},
      "max": {...},
      "size": {...}
    }
  },
  
  "fornelli": [
    {
      "name": "FORNELLI",
      "position_world": {...},
      "bounding_box": {
        "center": {...},
        "top_surface": 0.950
      }
    },
    {
      "name": "Corps_32_449",
      "position_world": {...},
      "bounding_box": {
        "center": {...},
        "top_surface": 0.948
      }
    }
  ],
  
  "analisi": {
    "fornello_piu_vicino": {
      "name": "Corps_32_449",
      "distanza_metri": 0.845,
      "top_surface_y": 0.948,
      "delta_y_pentola_fornello": -1.057
    }
  }
}
```

---

## 🎯 **COSA CERCARE NELL'ANALISI**

### **1. Posizione Y della Pentola**
- **Attuale:** Pentola dentro mobile (`y: -0.109`)
- **Fornelli top:** `y: 0.948`
- **Delta:** `-1.057m` → Pentola è **1 metro sotto** i fornelli!

### **2. Coordinate Target Corrette**

Per mettere pentola SUI fornelli:
```javascript
{
  "target_corretta": {
    "x": -1.015,  // Centro fornello X
    "y": 0.948,   // TOP SURFACE fornello (NON -0.109!)
    "z": 0.857    // Centro fornello Z
  }
}
```

### **3. Verifica Animazione**

Nell'animation editor, **Punto B** deve avere:
- `endY` = **0.948** (top fornello)
- NON `endY` = -0.109 (dentro mobile)

---

## ⚙️ **TEST SELEZIONE FORNELLI**

### **Ora funziona! Procedura:**

1. **Premi E** → Animation Editor attivo

2. **Click sulla PENTOLA** (oggetto 3D)
   - Console: `Oggetto selezionato: PENTOLA(...)`

3. **Click "Pick Destination"**

4. **Click SUI FORNELLI** 🔥
   - Console DEVE dire: `✅ Posizione selezionata: Corps_32_449`
   - **NON PIÙ**: `⚠️ Destinazione rifiutata`

5. **Vedrai sfera rossa BRILLANTE** sul Punto B!

6. **Verifica coordinate Y** nell'editor:
   - `End Y` dovrebbe essere ~ **0.95** (top fornelli)
   - Se è ancora ~ -0.10 → hai cliccato nel posto sbagliato

---

## 🐛 **TROUBLESHOOTING**

### **❌ "PENTOLA NON TROVATA"**
- Assicurati di essere nella scena **Cucina**
- Verifica che `window.__DEBUG.scene` esista
- Ricarica la pagina

### **❌ "Destinazione rifiutata: Corps_32_449"**
- **RISOLTO!** Il fix è già applicato
- Se ancora bloccato: ricarica la pagina (Ctrl+Shift+R)

### **❌ "Nessuna intersezione trovata"**
- Clicca più vicino ai fornelli
- Prova diverse angolazioni
- Zoom in sui fornelli

---

## 📝 **COMANDI RAPIDI CONSOLE**

```javascript
// Mostra dati estratti
window.__COORDINATE_DATA

// Pentola info
window.__COORDINATE_DATA.pentola

// Fornelli info
window.__COORDINATE_DATA.fornelli

// Analisi
window.__COORDINATE_DATA.analisi

// Copia tutto in clipboard
copy(JSON.stringify(window.__COORDINATE_DATA, null, 2))
```

---

## ✅ **CHECKLIST COMPLETA**

- [ ] Server dev running (localhost:5174)
- [ ] Cucina aperta nel browser
- [ ] Console DevTools aperta (F12)
- [ ] Script extract-coordinates.js eseguito
- [ ] Dati estratti visibili in console
- [ ] JSON copiato/salvato
- [ ] Test selezione fornelli: ✅ FUNZIONA
- [ ] Sfera rossa visibile su fornelli
- [ ] Coordinate Y corretta (~ 0.95)

---

**Creato:** 18/12/2025 12:30
**Fix applicato:** `Corps_32_449` rimosso dal filtro
**Status:** ✅ Fornelli selezionabili! Script pronto!
