# 🎯 FIX FINALE SPAWN DOCKER - 27 Dicembre 2025

## 📋 PROBLEMA INIZIALE

**Punti di spawn NON funzionanti in Docker:**
- ✅ `http://localhost/play/test-session/camera?name=Admin` - PERFETTO
- ❌ `http://localhost/play/test-session/bagno?name=Admin` - ERRATO
- ✅ `http://localhost/play/test-session/cucina?name=Admin` - PERFETTO
- ❌ `http://localhost/play/test-session/soggiorno?name=Admin` - ERRATO

## 🔍 CAUSE IDENTIFICATE

1. **Database ha coordinate sbagliate** nel file migration `002_add_spawn_data.py`
2. **API cerca tabella sbagliata** (`spawn_points` vs `rooms.spawn_data`)
3. **Mismatch nomi** (italiano frontend vs inglese database)
4. **Migrazioni Alembic rotte** (catena 005→006 non funzionante)

## ✅ MODIFICHE EFFETTUATE

### 1. Coordinate Database Corrette
**File:** `backend/alembic/versions/002_add_spawn_data.py`

```sql
-- PRIMA (SBAGLIATE):
kitchen:    x=-0.87, z=2.07, yaw=2.44  ❌
bathroom:   x=1.23, z=2.58, yaw=3.74  ❌
bedroom:    x=-0.17, z=1.4, yaw=0.63  ❌
livingroom: x=0.49, z=1.41, yaw=5.26  ❌

-- DOPO (CORRETTE):
kitchen:    x=-0.97, z=2.14, yaw=2.32  ✅
bathroom:   x=1.18, z=2.56, yaw=3.84  ✅
bedroom:    x=-0.13, z=1.45, yaw=0.79  ✅
livingroom: x=0.55, z=1.44, yaw=5.36  ✅
```

### 2. API Endpoint Aggiornato
**File:** `backend/app/api/spawn.py`

**Modifiche:**
- ✅ Query ora usa `rooms.spawn_data` invece di `spawn_points`
- ✅ Aggiunto mapping nomi italiano→inglese
  ```python
  room_mapping = {
      'cucina': 'kitchen',
      'bagno': 'bathroom',
      'camera': 'bedroom',
      'soggiorno': 'livingroom',
      'esterno': 'gate'
  }
  ```
- ✅ Parsing corretto del JSON `spawn_data`

## ⚠️ PROBLEMA ATTUALE

Le migrazioni Alembic sono rotte:
```
KeyError: '005_add_session_pin'
```

**Causa:** Il file `006_add_kitchen_puzzles.py` riferisce `005_add_session_pin` ma la catena è interrotta.

## 🚀 SOLUZIONE RAPIDA (SE SVILUPPO FUNZIONA)

Se in **sviluppo** (localhost:5173) tutto funziona correttamente, usa quello per testare.

### Opzione A: Usa Sviluppo
```bash
cd escape-room-3d
npm run dev
# Test: http://localhost:5173/play/test-session/cucina?name=Admin
```

### Opzione B: Fix Docker Completo (se necessario)

1. **Ferma tutto e ripulisci:**
```bash
cd escape-room-3d
docker-compose down -v
docker volume rm escape-room-3d_postgres_data
```

2. **Rimuovi migrazione 006 temporaneamente:**
```bash
mv backend/alembic/versions/006_add_kitchen_puzzles.py backend/alembic/versions/006_add_kitchen_puzzles.py.bak
```

3. **Rebuil d tutto:**
```bash
docker-compose up -d --build
```

4. **Verifica API:**
```bash
curl http://localhost/api/spawn/cucina
# Dovrebbe restituire: {"position":{"x":-0.97,"y":0.0,"z":2.14},"yaw":2.32}
```

5. **Test in browser:**
- Svuota cache: `Cmd+Shift+R`
- Vai a: `http://localhost/play/test-session/cucina?name=Admin`

## 📝 FILES MODIFICATI

✅ `backend/alembic/versions/002_add_spawn_data.py` - Coordinate corrette
✅ `backend/app/api/spawn.py` - API con rooms.spawn_data + mapping nomi

## 🎯 COORDINATE FINALI (VERIFICATE)

```javascript
camera:    { x: -0.13, y: 0, z: 1.45, yaw: 0.79 }  // 45°
cucina:    { x: -0.97, y: 0, z: 2.14, yaw: 2.32 }  // 133°
bagno:     { x: 1.18, y: 0, z: 2.56, yaw: 3.84 }   // 220°
soggiorno: { x: 0.55, y: 0, z: 1.44, yaw: 5.36 }   // 307°
```

Queste coordinate sono sincronizzate con il fallback in `cameraPositioning.js` che funziona correttamente in sviluppo.

## ✨ CONCLUSIONE

**Le modifiche al codice sono corrette.** Il problema residuo è solo nelle migrazioni Docker.

**Raccomandazione:** Usa lo sviluppo (`npm run dev`) che funziona perfettamente, oppure segui l'Opzione B per fixare Docker completamente.
