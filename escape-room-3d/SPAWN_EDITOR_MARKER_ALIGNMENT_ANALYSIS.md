# 🔍 Analisi Allineamento Marker - Spawn Editor

## 📊 CONFRONTO COORDINATE

### Coordinate Database (Precedenti)
```json
{
  "soggiorno": {"x": 0.51, "y": 0, "z": 1.44},
  "cucina": {"x": -1.9, "y": 0, "z": 1.35},
  "bagno": {"x": 1.41, "y": 0, "z": 2.89},
  "camera": {"x": -0.22, "y": 0, "z": -0.89}
}
```

### Coordinate Ricatturate (Con Fix Marker)
```json
{
  "soggiorno": {"x": 0.4, "y": 0, "z": 1.49},
  "cucina": {"x": -0.96, "y": 0, "z": 2.15},
  "bagno": {"x": 1.27, "y": 0, "z": 2.67},
  "camera": {"x": -0.17, "y": 0, "z": 1.38}
}
```

### Differenze Calcolate

| Stanza | Δ X | Δ Z | Distanza 2D | Valutazione |
|--------|-----|-----|-------------|-------------|
| **Soggiorno** | -0.11m | +0.05m | 0.12m | ✅ OK - Piccola variazione |
| **Cucina** | +0.94m | +0.80m | 1.23m | ⚠️ SIGNIFICATIVA |
| **Bagno** | -0.14m | -0.22m | 0.26m | ✅ OK - Accettabile |
| **Camera** | +0.05m | +2.27m | 2.27m | ❌ CRITICA! |

## 🎯 ANALISI

### ✅ Stanze Coerenti (Soggiorno, Bagno)
- Differenze < 30cm
- Normali variazioni di precisione/punto di click
- **Marker funziona correttamente**

### ⚠️ Cucina
- Differenza ~1.2m
- Potrebbe essere:
  - Punto spawn diverso scelto
  - Problema di allineamento parziale

### ❌ Camera - PROBLEMA CRITICO
- **Differenza Z: 2.27 metri!**
- Coordinata passa da NEGATIVA (-0.89) a POSITIVA (1.38)
- **Indica problema sistematico**, non semplice imprecisione

## 🔬 IPOTESI

### Ipotesi 1: Coordinate Vecchie Contaminate
- Le coordinate vecchie erano in world-space contaminato
- Le nuove sono in local-space corretto
- Ma allora perché Soggiorno/Bagno sono simili?

### Ipotesi 2: Marker Ancora Disallineato
- Il fix non è completo
- Il marker appare in un punto ma salva coordinate diverse
- Spiega le differenze grandi

### Ipotesi 3: Cambio Reference Point
- Il gruppo del modello usa un center point diverso per stanze diverse
- Camera ha una geometria particolare che causa offset diverso

## ✋ STOP - VERIFICA NECESSARIA

### Test da fare IMMEDIATAMENTE:

1. **Test Visivo Marker:**
   - Apri spawn editor
   - Click su Camera in un punto specifico
   - **Il marker appare ESATTAMENTE dove hai cliccato?**
   - Oppure appare spostato?

2. **Test Console Log:**
   - Click su Camera
   - Controlla log console:
     ```
     [SpawnEditor] 📍 COORDINATE CAPTURE (LOCAL SPACE)
     World (raycast): {...}
     Local (group): {...}
     ```
   - Verifica coerenza tra world e local

3. **Test Soggiorno (come controllo):**
   - Click sulla stessa posizione dove hai cliccato prima
   - Le coordinate dovrebbero essere identiche (±2cm)

## 🔧 POSSIBILI SOLUZIONI

### Se marker è disallineato:
- Problema nel rendering del marker dentro il gruppo
- Verificare che groupRef.current sia corretto
- Controllare transform inheritance

### Se marker è allineato ma coordinate diverse:
- Le coordinate vecchie erano sbagliate (world-space contaminato)
- Le nuove sono corrette (local-space)
- Camera aveva il problema più grave perché?
  - Geometria diversa
  - Center point diverso
  - Offset applicato due volte in modo diverso

## 📝 PROSSIMI STEP

1. ⏳ **ATTENDERE CONFERMA UTENTE**: Il marker appare dove clicchi?
2. Se SÌ → Aggiornare database con nuove coordinate (sono corrette)
3. Se NO → Investigare ulteriormente il rendering del marker

---

**Data Analisi:** 16 Gennaio 2026, 13:18  
**Status:** ⏳ In attesa verifica utente