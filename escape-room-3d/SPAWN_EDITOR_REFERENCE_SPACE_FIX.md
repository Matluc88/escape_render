# 🎯 Spawn Editor - Reference Space Fix

## 📋 PROBLEMA IDENTIFICATO

### Sintomo Originale
I marker nello spawn editor si spostavano visivamente quando cambiavo stanza, creando l'illusione che le coordinate fossero "sbagliate". Questo portava a salvare coordinate riferite a un frame concettuale diverso.

### Root Cause
**SpawnEditor.jsx** applicava correttamente l'offset dinamico per ogni stanza (0.6m esterno, 2.0m interno), ma **mostrava contemporaneamente i marker di TUTTE le stanze**.

**Effetto visivo ingannevole:**
1. Cambio da soggiorno (offset 2.0m) a esterno (offset 0.6m)
2. Il modello si riposiziona verticalmente di -1.4m (giustamente)
3. I marker world-space restano fermi (giustamente)
4. **Visivamente** sembra che i marker si siano "spostati"
5. L'utente pensa che le coordinate siano sbagliate

**In realtà:**
- I marker erano in **world-space assoluto** (corretto!)
- Il modello si riposizionava per applicare l'offset corretto (corretto!)
- Il problema era **solo visivo**: vedere marker di altre stanze mentre il modello aveva un offset diverso

---

## ✅ SOLUZIONE IMPLEMENTATA

### Modifiche a `SpawnEditor.jsx`

**PRIMA (BUGGY):**
```jsx
{/* Mostrava TUTTI i marker TRANNE quello della stanza corrente */}
{Object.entries(savedPositions).map(([roomId, pos]) => {
  const room = rooms.find(r => r.id === roomId)
  if (!room || roomId === selectedRoom) return null  // ← BUG!
  return <PositionMarker ... />
})}
```

**DOPO (CORRETTO):**
```jsx
{/* Marker temporaneo - solo quando stai posizionando */}
{tempPosition && (
  <PositionMarker 
    position={tempPosition} 
    yaw={tempYaw}
    color={currentRoomColor}
    showArrow={true}
  />
)}

{/* Marker salvato - SOLO stanza corrente, SOLO se NON stai posizionando */}
{!tempPosition && savedPositions[selectedRoom] && (
  <PositionMarker 
    position={savedPositions[selectedRoom]}
    yaw={savedYaws[selectedRoom] || 0}
    color={currentRoomColor}
    showArrow={true}
  />
)}
```

### Logica Corretta

| Condizione | Marker Mostrato | Colore |
|------------|----------------|--------|
| `tempPosition` presente | Solo marker temporaneo | Colore stanza corrente |
| `tempPosition` assente + spawn salvato | Solo marker salvato stanza corrente | Colore stanza corrente |
| `tempPosition` assente + spawn non salvato | Nessun marker | - |

### Miglioramento UX: Indicatore Visivo nella Leggenda
```jsx
{room.id === selectedRoom && ' 👈'}  // Indica quale stanza stai editando
```

---

## 🎯 ALLINEAMENTO EDITOR ↔ RUNTIME

### CasaModel.jsx (Runtime) - RIFERIMENTO
```jsx
useLayoutEffect(() => {
  const PIANO_TERRA_HEIGHT = sceneType === 'esterno' ? 0.6 : 2.0
  groupRef.current.position.set(-center.x, -targetGroundY + PIANO_TERRA_HEIGHT, -center.z)
}, [scene, enableShadows, sceneType])  // ← sceneType FISSO per ogni scena!
```

**Caratteristiche:**
- Ogni scena ha il suo `sceneType` **fisso** (non cambia mai)
- KitchenScene → `sceneType='cucina'` → offset 2.0m (FISSO)
- LivingRoomScene → `sceneType='soggiorno'` → offset 2.0m (FISSO)
- ExteriorScene → `sceneType='esterno'` → offset 0.6m (FISSO)
- Il modello **non si muove mai** durante il runtime

### SpawnEditor.jsx (Editor) - POST-FIX
```jsx
useEffect(() => {
  const PIANO_TERRA_HEIGHT = selectedRoom === 'esterno' ? 0.6 : 2.0
  groupRef.current.position.set(-center.x, -targetGroundY + PIANO_TERRA_HEIGHT, -center.z)
}, [scene, selectedRoom])  // ← selectedRoom cambia quando switchi stanze
```

**Caratteristiche:**
- L'offset **si adatta dinamicamente** alla stanza selezionata
- Quando cambi stanza, il modello **si riposiziona** con l'offset corretto
- I marker world-space **rimangono fermi** (come devono!)
- **POST-FIX:** Mostriamo solo il marker della stanza corrente → nessuna confusione

**Garanzia di Allineamento:**
- Soggiorno in editor (offset 2.0m) = Soggiorno runtime (offset 2.0m) ✅
- Cucina in editor (offset 2.0m) = Cucina runtime (offset 2.0m) ✅
- Esterno in editor (offset 0.6m) = Esterno runtime (offset 0.6m) ✅

---

## 📊 FEATURES GIÀ IMPLEMENTATE

| Feature | Status | Note |
|---------|--------|------|
| **Y coordinata reale** | ✅ COMPLETO | Non più forzata a 0 |
| **Offset dinamico** | ✅ COMPLETO | 0.6m esterno, 2.0m interno |
| **Raycast filtrato** | ✅ COMPLETO | Solo pavimenti (esclude cantina) |
| **Ground detection** | ✅ COMPLETO | Trova piano terra automaticamente |
| **World-space assoluto** | ✅ COMPLETO | Marker indipendenti dal group |
| **Marker visibility fix** | ✅ COMPLETO | Solo stanza corrente visibile |
| **Indicatore stanza** | ✅ COMPLETO | Emoji 👈 nella leggenda |

---

## 🚀 PROSSIMI PASSI: RICATTURA COORDINATE

### Workflow Consigliato

1. **Avvia Dev Server**
   ```bash
   cd escape-room-3d
   npm run dev
   ```

2. **Apri Spawn Editor**
   ```
   http://localhost:5173/admin/spawn-editor
   ```

3. **Reset Cache Locale (IMPORTANTE!)**
   - Click su "🗑️ Reset Cache Locale" per eliminare coordinate vecchie
   - Questo garantisce un "fresh start"

4. **Ricattura Spawn - Ordine Consigliato:**

   **a) 🛋️ Soggiorno (PRIORITÀ 1)**
   - Seleziona "Soggiorno" dalla lista
   - Il modello applica offset 2.0m (interno)
   - Click sul punto spawn desiderato sul pavimento
   - Verifica coordinate X, Y, Z nei log console
   - Regola rotazione (yaw) se necessario
   - Click "💾 Salva Posizione"
   
   **b) 🍳 Cucina**
   - Seleziona "Cucina"
   - Modello si riposiziona (stesso offset 2.0m)
   - Click spawn → Salva
   
   **c) 🚿 Bagno**
   - Seleziona "Bagno"
   - Click spawn → Salva
   
   **d) 🛏️ Camera**
   - Seleziona "Camera"
   - Click spawn → Salva
   
   **e) 🌳 Esterno (Offset Diverso!)**
   - Seleziona "Esterno"
   - **NOTA:** Il modello si abbassa di 1.4m (offset passa da 2.0m a 0.6m)
   - Questo è **CORRETTO** e intenzionale!
   - Click spawn → Salva

5. **Export Coordinate**
   - Click "📥 Esporta Tutte le Posizioni"
   - Salva il file JSON generato
   - Coordinate copiate automaticamente negli appunti

6. **Verifica Console Logs**
   ```
   [SpawnEditor] 🎯 REFERENCE SPACE IDENTICO A CASAMODEL
   Stanza: soggiorno
   Offset applicato: 2.0m (interno)
   Model Group Y: 1.483m
   ```

---

## 🔍 DEBUG E VERIFICA

### Log Chiave da Monitorare

**Setup Modello:**
```
[SpawnEditor] 🏠 Piano terra trovato: "..." a Y=...
[SpawnEditor] ✅ Usando pavimento piano terra come riferimento
[SpawnEditor] 🎯 REFERENCE SPACE IDENTICO A CASAMODEL
```

**Click su Mappa:**
```
[SpawnEditor] 📍 CLICK POSITION (WORLD COORDINATES)
Mesh colpito: PATTERN_...
World X: -1.23
World Y: 2.00  ← COORDINATA Y REALE (non forzata a 0!)
World Z: 4.56
```

**Salvataggio:**
```
[SpawnEditor] 💾 SALVATAGGIO COORDINATA
Stanza: soggiorno
Offset applicato: 2.0m
Coordinata salvata: {position: {x: -1.23, y: 2.00, z: 4.56}, yaw: 0}
```

### Verifica Allineamento Dev/Docker

Dopo la ricattura:

1. **Test in Dev:**
   - Vai a `http://localhost:5173/lobby`
   - Entra in ogni stanza
   - Verifica che lo spawn sia corretto

2. **Deploy Docker:**
   - Build immagine: `docker compose build frontend`
   - Riavvia: `docker compose up -d`
   
3. **Test in Docker:**
   - Vai a `http://localhost`
   - Entra in ogni stanza
   - **Verifica 1:1 con Dev**

---

## 📐 COORDINATE REFERENCE

### Esempio JSON Export
```json
[
  {
    "room": "soggiorno",
    "name": "🛋️ Soggiorno",
    "position": { "x": -1.23, "y": 2.00, "z": 4.56 },
    "yaw": 0,
    "yaw_degrees": 0
  },
  {
    "room": "esterno",
    "name": "🌳 Esterno",
    "position": { "x": 5.00, "y": 0.60, "z": -3.00 },
    "yaw": 3.14,
    "yaw_degrees": 180
  }
]
```

**Note:**
- `y` per interno: ~2.0m (offset PIANO_TERRA_HEIGHT)
- `y` per esterno: ~0.6m (offset ridotto per giardino)
- `yaw`: radianti (0 = Nord, π/2 = Est, π = Sud, 3π/2 = Ovest)

---

## ✅ VALIDAZIONE COMPLETATA

- [x] Fix implementato in SpawnEditor.jsx
- [x] Marker visibility corretta (solo stanza corrente)
- [x] Indicatore stanza in leggenda
- [x] Allineamento garantito con CasaModel.jsx
- [x] World-space assoluto preservato
- [x] Coordinata Y reale salvata
- [x] Raycast filtrato per stanza
- [x] Ground detection automatico

**STATUS:** ✅ Pronto per ricattura coordinate

---

## 📚 FILE CORRELATI

- `escape-room-3d/src/pages/admin/SpawnEditor.jsx` - Editor spawn (MODIFICATO)
- `escape-room-3d/src/components/3D/CasaModel.jsx` - Runtime model (RIFERIMENTO)
- `escape-room-3d/src/hooks/useFPSControls.jsx` - Controller player con spawn
- `escape-room-3d/backend/routers/rooms.py` - Backend API spawn positions

---

**Data Fix:** 16 Gennaio 2026  
**Versione:** 2.0 - Reference Space Alignment Complete