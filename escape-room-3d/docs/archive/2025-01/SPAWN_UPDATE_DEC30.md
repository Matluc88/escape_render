# 📍 Aggiornamento Coordinate Spawn - 30 Dicembre 2025

## ✅ Stato: COMPLETATO

Aggiornamento delle coordinate di spawn nel database con i nuovi valori catturati.

---

## 📋 Coordinate Aggiornate - CORRETTE

Le seguenti coordinate CORRETTE sono state aggiornate nel database di sviluppo:

### 🛋️ Soggiorno (livingroom)
- **Posizione**: x=0.53, y=0, z=1.52
- **Yaw**: 5.17 radianti (296°)

### 🍳 Cucina (kitchen)
- **Posizione**: x=-0.9, y=0, z=2.12
- **Yaw**: 2.45 radianti (140°)

### 🚿 Bagno (bathroom)
- **Posizione**: x=1.18, y=0, z=2.59
- **Yaw**: 3.75 radianti (215°)

### 🛏️ Camera (bedroom)
- **Posizione**: x=-0.21, y=0, z=1.46
- **Yaw**: 0.82 radianti (47°)

### 🌳 Esterno (gate)
- **Posizione**: x=0.57, y=0, z=7.24
- **Yaw**: 4.98 radianti (285°)

---

## 🔧 File Modificati

### 1. Script SQL di aggiornamento
- **File**: `update-spawn-positions-2025-12-30.sql`
- **Eseguito su**: Database Docker DEV (`escape-db-dev`)
- **Risultato**: 5 record aggiornati con successo

### 2. Migrazione Alembic
- **File**: `backend/alembic/versions/002_add_spawn_data.py`
- **Modifiche**: Aggiornate le coordinate di default nella migrazione
- **Motivo**: Per mantenere la coerenza tra database e migrazioni future

---

## 🎯 Verifica Database

Query di verifica eseguita:
```sql
SELECT name, spawn_data FROM rooms ORDER BY name;
```

Risultato (CORRETTE):
```
    name    |                         spawn_data
------------+------------------------------------------------------------
 bathroom   | {"position": {"x": 1.18, "y": 0, "z": 2.59}, "yaw": 3.75}
 bedroom    | {"position": {"x": -0.21, "y": 0, "z": 1.46}, "yaw": 0.82}
 gate       | {"position": {"x": 0.57, "y": 0, "z": 7.24}, "yaw": 4.98}
 kitchen    | {"position": {"x": -0.9, "y": 0, "z": 2.12}, "yaw": 2.45}
 livingroom | {"position": {"x": 0.53, "y": 0, "z": 1.52}, "yaw": 5.17}
```

✅ Tutti i record sono stati aggiornati correttamente!

---

## 🚀 Prossimi Passi

### Per l'ambiente di sviluppo:
- ✅ Database aggiornato e funzionante
- ✅ Migrazione Alembic aggiornata
- ⚠️ **IMPORTANTE**: Cancella cache del browser per vedere le nuove coordinate

### Per l'ambiente di produzione:
Quando necessario, eseguire:
```bash
# Su Render o ambiente di produzione
cd escape-room-3d
# Le migrazioni Alembic verranno applicate automaticamente al deploy
# oppure eseguire manualmente:
docker exec <container-db-prod> psql -U escape_user -d escape_db < update-spawn-positions-2025-12-30.sql
```

---

## 📝 Note Tecniche

1. **Container Docker**: Aggiornamento eseguito su `escape-db-dev` (porta 5433)
2. **File sorgente**: `spawn-positions-2025-12-30.json` (fornito dall'utente)
3. **Database**: PostgreSQL 15 con campo JSON `spawn_data` nella tabella `rooms`
4. **API**: Le modifiche sono immediatamente disponibili tramite l'endpoint `/spawn/{room_name}`

---

## 🔗 File Correlati

- Script SQL: `update-spawn-positions-2025-12-30.sql`
- Migrazione: `backend/alembic/versions/002_add_spawn_data.py`
- API Endpoint: `backend/app/api/spawn.py`
- Documentazione precedente: `SPAWN_UPDATE_DEC27_V2.md`

---

**Data**: 30 Dicembre 2025, ore 22:04
**Ambiente**: Docker Development (escape-db-dev)
**Status**: ✅ Operazione completata con successo
