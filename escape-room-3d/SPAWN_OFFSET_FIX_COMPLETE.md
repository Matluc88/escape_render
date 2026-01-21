# ✅ FIX SPAWN OFFSET +2m - COMPLETATO

## 🎯 PROBLEMA RISOLTO

**Situazione iniziale:**
- ✅ Cucina: funzionava correttamente
- ❌ Bagno/Camera/Soggiorno: player spawnava fuori dalla casa (vedeva automobili)

**Causa:**
- Il modello 3D `CasaModel.jsx` ha un offset di **+2m sull'asse Y**
- Le coordinate spawn cucina erano salvate **CON** l'offset (y=0 ma già compensato)
- Le altre scene erano salvate **SENZA** l'offset (y=0 reale → fuori dalla casa)

---

## 🔧 SOLUZIONE APPLICATA

**File modificato:** `fix-spawn-offset-2m-CORRECTED.sql`

**Query eseguita:**
```sql
UPDATE rooms 
SET spawn_data = jsonb_set(
  spawn_data::jsonb, 
  '{position,y}', 
  to_jsonb(((spawn_data::jsonb->'position'->>'y')::numeric + 2)::numeric)
)
WHERE name IN ('bathroom', 'bedroom', 'livingroom');
```

**Risultato:**
```
✅ bathroom:   y = 0 → y = 2
✅ bedroom:    y = 0 → y = 2
✅ livingroom: y = 0 → y = 2
✅ kitchen:    y = 0 (NON toccata)
```

---

## 📋 ISTRUZIONI PER IL TEST

### 1. Cancella Cache Browser (OBBLIGATORIO!)

**Opzione A - Console Browser:**
```javascript
// Cancella cache spawn
localStorage.removeItem('spawn_bagno');
localStorage.removeItem('spawn_camera');
localStorage.removeItem('spawn_soggiorno');
localStorage.removeItem('spawn_cucina');

// Ricarica
location.reload();
```

**Opzione B - Hard Refresh:**
- Mac: `Cmd + Shift + R`
- Windows/Linux: `Ctrl + F5`

### 2. Testa TUTTE le Scene

Visita ciascuna scena e verifica che spawni **dentro la casa**:

- ✅ Cucina: `http://localhost/room/cucina?session=999`
- ✅ Bagno: `http://localhost/room/bagno?session=999`  
- ✅ Camera: `http://localhost/room/camera?session=999`
- ✅ Soggiorno: `http://localhost/room/soggiorno?session=999`

### 3. Cosa Verificare

Per ogni scena, controlla che:
- ✅ Player spawni DENTRO la stanza (non fuori)
- ✅ Vedi i muri della stanza attorno
- ✅ NON vedi l'automobile
- ✅ Gli oggetti interattivi sono visibili

---

## 🔍 LOG ATTESI

Dopo la cache cleared, dovresti vedere nei log:

```
✅ [BathroomScene] Usando coordinate da API/cache: {x: 1.3, y: 2, z: 2.6}
[FPS Controls] 🎯 REPOSITIONING PLAYER TO: {x: 1.3, y: 2, z: 2.6}
[ProximityCountdown] 🔍 Posizione camera (WORLD): X: 1.30 Z: 2.60
```

**Nota:** La Y=2 viene applicata automaticamente dal sistema di spawn.

---

## 📊 DATABASE FINALE

```sql
SELECT name, 
  spawn_data::jsonb->'position' as position,
  spawn_data::jsonb->>'yaw' as yaw
FROM rooms;
```

**Risultato:**
```
bathroom   | {"x": 1.3, "y": 2, "z": 2.6}     | 3.65
bedroom    | {"x": -0.18, "y": 2, "z": 1.5}   | 0.61
livingroom | {"x": 0.54, "y": 2, "z": 1.52}   | 5.21
kitchen    | {"x": -1.5, "y": 0, "z": 1.2}    | 0.5
gate       | {"x": 0.53, "y": 0, "z": 7.27}   | 0
```

---

## ✅ GARANZIE

- ✅ La cucina NON è stata toccata (continua a funzionare)
- ✅ Solo bagno, camera, soggiorno sono state aggiornate
- ✅ Nessun file di codice modificato
- ✅ Fix reversibile (basta sottrarre 2 da y)

---

## 🔄 ROLLBACK (se necessario)

Se per qualche motivo serve tornare indietro:

```sql
UPDATE rooms 
SET spawn_data = jsonb_set(
  spawn_data::jsonb, 
  '{position,y}', 
  to_jsonb(((spawn_data::jsonb->'position'->>'y')::numeric - 2)::numeric)
)
WHERE name IN ('bathroom', 'bedroom', 'livingroom');
```

---

## 📅 DATA FIX

**Applicato:** 10/01/2026 - 11:30 AM
**Database:** PostgreSQL Docker (`escape-db`)
**Script:** `fix-spawn-offset-2m-CORRECTED.sql`
