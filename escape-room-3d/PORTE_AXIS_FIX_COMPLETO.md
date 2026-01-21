# 🚪 FIX ASSE ROTAZIONE PORTE - COMPLETO

**Data:** 10 Gennaio 2026  
**Problema:** Le porte si comportano in modo errato durante l'animazione (vengono "sparate via" invece di ruotare sui cardini)  
**Causa:** Uso errato dell'asse Z invece dell'asse Y per le rotazioni verticali  
**Soluzione:** Correzione di TUTTE le configurazioni JSON delle porte con `"axis": "y"`

---

## 🔍 PROBLEMA IDENTIFICATO

### Sintomi
- Le porte **non ruotano sui cardini verticali** come dovrebbero
- Invece di aprirsi/chiudersi normalmente, vengono **"sparate via"** dalla loro posizione
- L'animazione appare completamente **fuori controllo**

### Causa Root
Le porte con cardini **VERTICALI** (che vanno dal pavimento al soffitto) devono ruotare attorno all'**ASSE Y** (verticale in Three.js).

**❌ ERRORE COMUNE:**
```json
{
  "axis": "z",  // ← SBAGLIATO per cardini verticali!
  "angle": 90
}
```

**✅ SOLUZIONE CORRETTA:**
```json
{
  "axis": "y",  // ← CORRETTO per cardini verticali!
  "angle": 90
}
```

---

## 🎯 SOLUZIONE DEL CANCELLETTO ESTERNO (Riferimento)

Il **cancelletto esterno** (porta_ingresso_sequence.json) era **GIÀ CORRETTO** e ha funzionato come riferimento per correggere le altre porte:

**File:** `public/porta_ingresso_sequence.json`

```json
{
  "objectName": "PORTA_INGRESSO(90E4CC99-B9EE-4FE9-AF71-60F653652D1E)",
  "mode": "rotation",
  "autoPivot": "right",
  "axis": "y",  // ✅ CORRETTO - Rotazione verticale
  "angle": 90,
  "speed": 45,
  "direction": 1
}
```

Questo è stato usato come **template** per correggere tutte le altre porte.

---

## 📋 PORTE CORRETTE

### 1. 🍳 PORTA CUCINA
**File:** `public/porta_cucina_sequence.json`  
**Status:** ✅ **CREATO** (era mancante, solo config inline errata)

```json
{
  "objectName": "PORTA_CUCINA(4677853D-8C06-4363-BBE7-FACF26F193E9)",
  "mode": "rotation",
  "pivotX": -0.696,
  "pivotY": 0.5425608825683598,
  "pivotZ": 0.251,
  "axis": "y",  // ✅ CORRETTO (era "z")
  "angle": 90,
  "speed": 45,
  "direction": 1,
  "handleUUIDs": [],
  "_notes": "Porta cucina con pivot sinistro. ASSE Y CORRETTO per rotazione verticale sui cardini."
}
```

**Modifiche:**
- `"axis": "z"` → `"axis": "y"` ✅
- Creato file JSON dedicato

---

### 2. 🚿 PORTA-FINESTRA BAGNO
**File:** `public/porta_finestra_bagno_sequence.json`  
**Status:** ✅ **CREATO DA ZERO** (file completamente mancante!)

```json
{
  "sequence": [
    {
      "objectName": "VETRO_PORTA_FINESTRA_BAGNO(85EEAEFB-4D36-4CBE-9482-25218ED49A17)",
      "mode": "rotation",
      "autoPivot": "right",
      "axis": "y",  // ✅ CORRETTO (file nuovo)
      "angle": 30,
      "speed": 45,
      "direction": 1,
      "handleUUIDs": [
        "B570A3EE-B02E-4660-B048-396C6099E228",
        "91ED1413-7981-462E-84D4-5F050F2C827C"
      ],
      "_notes": "Porta-finestra bagno con autoPivot destro. ASSE Y CORRETTO per rotazione verticale sui cardini."
    }
  ]
}
```

**Modifiche:**
- File creato da zero ✅
- Configurato con `"axis": "y"` corretto
- Gestisce anche le maniglie con `handleUUIDs`

**Nota:** Il BathroomScene caricava questo JSON ma il file **NON ESISTEVA**, causando errori di animazione!

---

### 3. 🛏️ PORTA-FINESTRA CAMERA
**File:** `public/porta_finestra_camera_sequence.json`  
**Status:** ✅ **CREATO** (era config inline con axis Z errato)

```json
{
  "objectName": "VETRO_PORTA_FINESTRA_LETTO(B1E6A326-9FEF-48E1-9368-60BC0465B81D)",
  "mode": "rotation",
  "pivotX": 0.1194372218017572,
  "pivotY": 0.5961466979980482,
  "pivotZ": -0.663,
  "axis": "y",  // ✅ CORRETTO (era "z" inline)
  "angle": 30,
  "speed": 45,
  "direction": 1,
  "handleUUIDs": [
    "B570A3EE-B02E-4660-B048-396C6099E228",
    "91ED1413-7981-462E-84D4-5F050F2C827C"
  ],
  "_notes": "Porta-finestra camera con pivot manuale. ASSE Y CORRETTO per rotazione verticale sui cardini (era Z errato)."
}
```

**Modifiche:**
- `"axis": "z"` → `"axis": "y"` ✅ (da config inline in BedroomScene.jsx)
- Creato file JSON dedicato
- Gestisce anche le maniglie

---

## 🎯 RIFERIMENTO ASSE DI ROTAZIONE

### Sistema di Coordinate Three.js

```
      Y (SU)
      |
      |
      |_______ X (DESTRA)
     /
    /
   Z (AVANTI verso camera)
```

### Regola per le Porte

| Tipo di Cardine | Asse Corretto | Note |
|----------------|---------------|------|
| **Verticale** (pavimento → soffitto) | **`"y"`** | ✅ Porte normali, cancelli |
| **Orizzontale** (sinistra → destra) | **`"z"` o `"x"`** | ⚠️ Botole, portelloni |

---

## 📊 RIEPILOGO MODIFICHE

| Porta | File | Prima | Dopo | Status |
|-------|------|-------|------|--------|
| **Porta Cucina** | `porta_cucina_sequence.json` | axis: "z" ❌ | axis: "y" ✅ | CREATO |
| **Porta-Finestra Bagno** | `porta_finestra_bagno_sequence.json` | ❌ MANCANTE | axis: "y" ✅ | CREATO |
| **Porta-Finestra Camera** | `porta_finestra_camera_sequence.json` | axis: "z" ❌ | axis: "y" ✅ | CREATO |
| **Porta Ingresso (cancello)** | `porta_ingresso_sequence.json` | axis: "y" ✅ | axis: "y" ✅ | GIÀ CORRETTO |

---

## ✅ VERIFICA FUNZIONAMENTO

Dopo l'applicazione del fix, tutte le porte dovrebbero:

1. ✅ **Ruotare correttamente** sui cardini verticali
2. ✅ **Non volare via** o comportarsi in modo strano
3. ✅ **Aprirsi/chiudersi** in modo fluido e naturale
4. ✅ **Rispettare il pivot** (autoPivot o manuale)

### Test Manuale Suggerito

```bash
# 1. Avvia ambiente dev
npm run dev

# 2. Entra nelle scene con le porte corrette:
#    - Cucina (porta cucina)
#    - Bagno (porta-finestra)
#    - Camera (porta-finestra)
#    - Esterno (cancello - già funzionante)

# 3. Testa l'apertura/chiusura delle porte
#    - Verifica rotazione sui cardini corretta
#    - Nessun comportamento anomalo
```

---

## 🔧 CODICE MODIFICATO

### BedroomScene.jsx
**Prima:**
```javascript
const portaFinestraConfig = useMemo(() => ({
  objectName: "VETRO_PORTA_FINESTRA_LETTO(...)",
  mode: "rotation",
  axis: "z",  // ❌ SBAGLIATO
  // ...
}), [])
```

**Dopo:**
```javascript
// Config ora caricata da JSON esterno con axis: "y" ✅
```

---

## 📚 DOCUMENTAZIONE CORRELATA

- **PORTA_INGRESSO_FIX_V2_AUTOPIVOT.md** - Guida originale per il cancelletto (riferimento)
- **ANIMATION_EDITOR_GUIDE.md** - Sistema di editing animazioni
- **useAnimatedDoor.js** - Hook per gestire animazioni porte

---

## 🎓 LEZIONE APPRESA

**REGOLA D'ORO:** 
> Per porte con cardini **VERTICALI** (dal pavimento al soffitto), usa **SEMPRE** `"axis": "y"` per la rotazione.

**PATTERN DI FIX:**
1. Identifica porte con comportamento anomalo
2. Controlla il valore `"axis"` nel JSON o config inline
3. Se è `"z"` per cardini verticali → Cambia in `"y"`
4. Se il file JSON non esiste → Crealo con axis corretto
5. Testa l'animazione

---

**Fix completato il:** 10/01/2026 ore 18:30  
**Autore:** Cline AI Assistant  
**Verificato:** ✅ Tutti i JSON creati e corretti
