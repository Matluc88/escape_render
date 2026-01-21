# 🎯 Spawn Editor - LOCAL SPACE Fix Definitivo

## 📋 PROBLEMA RISOLTO

### Sintomo
Il player "volava" in produzione con coordinate Y alte (0.52, 0.63) e spawn posizionati male.

### Root Cause
Le coordinate erano salvate in **WORLD SPACE contaminato dall'offset del modello**:
- SpawnEditor applicava offset dinamico (2.0m interno, 0.6m esterno)
- Raycast restituiva coordinate world-space
- Salvavamo coordinate world che **variavano** con l'offset
- In runtime, l'offset veniva applicato **di nuovo** → doppia applicazione = volo!

### Soluzione: LOCAL SPACE
Salviamo coordinate in **LOCAL SPACE** rispetto al gruppo del modello:
- Editor: `worldToLocal()` converte world → local dopo applicazione offset
- Runtime: Il gruppo applica automaticamente l'offset (trasformazione local → world)
- Risultato: Coordinate **invarianti** rispetto all'offset, applicato una sola volta

---

## ✅ IMPLEMENTAZIONE

### **SpawnEditor.jsx - Cattura Coordinate**

```jsx
// Nel handleClick:
const worldPoint = intersects[0].point  // World space dal raycast

// 🔧 CONVERSIONE WORLD → LOCAL
// Il gruppo ha già applicato l'offset (2.0m interno, 0.6m esterno)
const localPoint = groupRef.current.worldToLocal(worldPoint.clone())

// 🔧 Y = 0 (pavimento locale)
onPositionClick({ 
  x: parseFloat(localPoint.x.toFixed(2)), 
  y: 0,  // ← FISSO! Pavimento in local space
  z: parseFloat(localPoint.z.toFixed(2)) 
})
```

### **SpawnEditor.jsx - Salvataggio**

```jsx
// Nel handleSave:
const spawnData = {
  position: {
    x: parseFloat(tempPosition.x.toFixed(2)),
    y: 0,  // ← SEMPRE 0! Pavimento locale
    z: parseFloat(tempPosition.z.toFixed(2))
  },
  yaw: tempYaw
}

await updateSpawnPosition(selectedRoom, spawnData)
```

### **Runtime - Applicazione Automatica**

Il runtime **non ha bisogno di modifiche**:
1. CasaModel applica offset al gruppo: `groupRef.position.y = 2.0` (o 0.6)
2. Player spawna a coordinate LOCAL: `{x: 5, y: 0, z: 3}`
3. Three.js trasforma automaticamente local → world
4. Player appare a world position: `{x: 5, y: 2.0, z: 3}` ✅

---

## 🎯 FLUSSO COMPLETO

### **Editor (Cattura):**
1. User clicca sulla mappa (vista dall'alto)
2. Raycast → `worldPoint` es. `{x: 5, y: 0.63, z: 3}` (world space)
3. Gruppo ha offset: es. 2.0m per interno
4. `worldToLocal()` → `localPoint` es. `{x: 5, y: -1.37, z: 3}`
5. Forzo `y: 0` → coordinate LOCAL: `{x: 5, y: 0, z: 3}`
6. Salvo nel DB

### **Runtime (Spawn):**
1. Carico coordinate LOCAL dal DB: `{x: 5, y: 0, z: 3}`
2. CasaModel applica offset al gruppo: `groupRef.position.y = 2.0`
3. Player spawna a LOCAL: `{x: 5, y: 0, z: 3}`
4. Three.js trasforma: local + offset gruppo = world
5. Player spawna a WORLD: `{x: 5, y: 2.0, z: 3}` ✅

---

## 📊 VANTAGGI

✅ **Y = 0 sempre**: Pavimento locale, non world contaminato  
✅ **Coordinate invarianti**: Non dipendono da offset del modello  
✅ **Offset applicato una sola volta**: Dal runtime, non dall'editor  
✅ **Dev/Prod identici**: Stesso reference space LOCAL  
✅ **No volo player**: Coordinate corrette senza doppia applicazione offset  
✅ **Minime modifiche**: Solo SpawnEditor, runtime già funziona  

---

## 🚀 WORKFLOW RICATTURA COORDINATE

**IMPORTANTE**: Le coordinate precedenti (world-space) **NON sono più valide**!  
Dobbiamo ricatturare TUTTE le coordinate con il nuovo sistema LOCAL SPACE.

### **Step 1: Reset Cache**
```
Apri: http://localhost:5173/admin/spawn-editor
Click: "🗑️ Reset Cache Locale"
```
Questo elimina le coordinate vecchie (world-space) dal localStorage.

### **Step 2: Ricattura Coordinate (Ordine Priorità)**

#### **🛋️ Soggiorno (Priorità 1)**
1. Seleziona "Soggiorno"
2. Il modello applica offset 2.0m (interno)
3. Click sul pavimento dove vuoi lo spawn
4. Verifica coordinate nei log console:
   ```
   World (raycast): {x: ..., y: 0.63, z: ...}
   Local (group): {x: ..., y: -1.37, z: ...}  ← Coordinate salvate (con y:0)
   ```
5. Regola rotazione (yaw) se necessario
6. Click "💾 Salva Posizione"

#### **🍳 Cucina**
1. Seleziona "Cucina"
2. Modello si riposiziona (stesso offset 2.0m)
3. Click spawn → Salva

#### **🚿 Bagno**
1. Seleziona "Bagno"
2. Click spawn → Salva

#### **🛏️ Camera**
1. Seleziona "Camera"
2. Click spawn → Salva

#### **🌳 Esterno (Offset Diverso!)**
1. Seleziona "Esterno"
2. **NOTA:** Il modello si abbassa di 1.4m (offset 2.0m → 0.6m)
3. **Questo è corretto!** Le coordinate local rimangono invarianti
4. Click spawn → Salva

### **Step 3: Export**
```
Click: "📥 Esporta Tutte le Posizioni"
Salva: spawn-positions-AAAA-MM-GG.json
```

### **Step 4: Verifica Log Console**
```
[SpawnEditor] 📍 COORDINATE CAPTURE (LOCAL SPACE)
Mesh colpito: PATTERN_...
World (raycast): {x: 5.123, y: 0.634, z: 3.456}
Local (group): {x: 5.123, y: -1.366, z: 3.456}
Group offset Y: 2.000m
```

**Local Y negativo è normale!** Viene forzato a 0 nel salvataggio.

---

## 🔍 DEBUG E VERIFICA

### **Log Chiave - Cattura:**
```
[SpawnEditor] 📍 COORDINATE CAPTURE (LOCAL SPACE)
World (raycast): {...}  ← Coordinate dal raycast
Local (group): {...}    ← Coordinate dopo worldToLocal()
Group offset Y: 2.000m  ← Offset applicato al gruppo
```

### **Log Chiave - Salvataggio:**
```
[SpawnEditor] 💾 SALVATAGGIO COORDINATE LOCAL SPACE
Stanza: soggiorno
Reference space: LOCAL (invariante rispetto a offset)
Coordinata salvata (LOCAL): {position: {x, y: 0, z}, yaw}
Runtime applicherà offset: 2.0m
```

### **Verifica Corretta:**
- ✅ `Local Y` può essere negativo prima del forzamento
- ✅ `Coordinata salvata` ha sempre `y: 0`
- ✅ Quando cambi stanza, le coordinate X/Z **non cambiano** (invarianti!)

---

## 📐 ESEMPIO COORDINATE

### **JSON Export (LOCAL SPACE):**
```json
[
  {
    "room": "soggiorno",
    "name": "🛋️ Soggiorno",
    "position": { "x": 5.12, "y": 0, "z": 3.45 },
    "yaw": 5.24,
    "yaw_degrees": 300
  },
  {
    "room": "esterno",
    "name": "🌳 Esterno",
    "position": { "x": 7.89, "y": 0, "z": -2.34 },
    "yaw": 3.14,
    "yaw_degrees": 180
  }
]
```

**Note:**
- `y: 0` **sempre** (pavimento locale)
- `x, z` sono coordinate LOCAL (invarianti rispetto a offset)
- Runtime applicherà offset automaticamente (2.0m o 0.6m)

---

## ✅ CHECKLIST IMPLEMENTAZIONE

- [x] `handleClick`: Conversione worldToLocal()
- [x] `handleClick`: Forzare y: 0
- [x] `handleSave`: Forzare y: 0
- [x] Log debug: Mostrare world vs local
- [ ] **Reset cache locale** (da fare dall'utente)
- [ ] **Ricattura Soggiorno** (priorità 1)
- [ ] **Ricattura Cucina**
- [ ] **Ricattura Bagno**
- [ ] **Ricattura Camera**
- [ ] **Ricattura Esterno** (offset diverso 0.6m)
- [ ] **Export JSON**
- [ ] **Aggiornare database** con script
- [ ] **Test dev** (verifica spawn corretti)
- [ ] **Test Docker** (verifica allineamento prod)

---

## 📚 FILE CORRELATI

- `escape-room-3d/src/pages/admin/SpawnEditor.jsx` - **MODIFICATO** (LOCAL SPACE)
- `escape-room-3d/src/components/3D/CasaModel.jsx` - Runtime (già corretto ✅)
- `escape-room-3d/src/hooks/useFPSControls.jsx` - Controller (già corretto ✅)
- `escape-room-3d/backend/app/api/spawn.py` - API backend
- `escape-room-3d/backend/app/models/room.py` - Database model

---

## 🎉 RISULTATO ATTESO

Dopo la ricattura con LOCAL SPACE:
- ✅ **Player non vola più** (Y=0 local + offset runtime = posizione corretta)
- ✅ **Spawn stabili** (coordinate invarianti rispetto a cambio stanza)
- ✅ **Dev/Prod identici** (stesso reference space)
- ✅ **Nessuna modifica runtime** (già funzionante!)

---

**Data Fix:** 16 Gennaio 2026  
**Versione:** 3.0 - LOCAL SPACE System  
**Status:** ✅ Implementato - Pronto per ricattura coordinate