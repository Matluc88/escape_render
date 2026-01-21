# 🎯 Guida Fix Coordinate Spawn - Distribuzione Automatica

## 📋 Problema Identificato

Durante la distribuzione automatica nelle stanze, i giocatori **spawnavano in posizioni sbagliate** (dentro il modello 3D ma in punti diversi da quelli previsti).

### 🔍 Root Cause

**Discrepanza tra coordinate nel database e coordinate di fallback:**

- ✅ **In sviluppo**: Il database a volte non risponde → Frontend usa il **fallback** in `cameraPositioning.js` (coordinate corrette da `SPAWN_COORDINATES_REFERENCE.md`)
- ❌ **In produzione**: Il database PostgreSQL risponde sempre → Carica coordinate **sbagliate** dal database

### 📊 Differenze Coordinate

| Stanza | Database (VECCHIO ❌) | REFERENCE (CORRETTO ✅) | Differenza |
|--------|---------------------|----------------------|------------|
| 🍳 Cucina | `z: 2.12, yaw: 2.45` | `z: 2.07, yaw: 2.55` | 5cm + 0.1 rad |
| 🛋️ Soggiorno | `x: 0.53, yaw: 5.17` | `x: 0.54, yaw: 5.21` | 1cm + 0.04 rad |
| 🚿 Bagno | `x: 1.18, z: 2.59, yaw: 3.75` | `x: 1.27, z: 2.62, yaw: 3.65` | 9cm + 3cm |
| 🛏️ Camera | `x: -0.21, z: 1.46, yaw: 0.82` | `x: -0.18, z: 1.5, yaw: 0.61` | 3cm + 4cm |
| 🌳 Esterno | `x: 0.57, z: 7.24, yaw: 4.98` | `x: 0.53, z: 7.27, yaw: 0` | 4cm + 3cm |

## 🛠️ Soluzione Implementata

### 1️⃣ Script SQL per Produzione

**File**: `fix-spawn-coordinates-PRODUCTION.sql`

```sql
-- Aggiorna tutte le coordinate nel database di produzione
-- con i valori corretti da SPAWN_COORDINATES_REFERENCE.md
```

### 2️⃣ Migration Corretta

**File**: `backend/alembic/versions/002_add_spawn_data.py`

Aggiornata con le coordinate corrette per futuri deployment.

### 3️⃣ Fallback Allineato

**File**: `src/utils/cameraPositioning.js`

Il fallback già contiene le coordinate corrette (da `SPAWN_COORDINATES_REFERENCE.md`).

## 🚀 Come Applicare il Fix

### Opzione A: Database Produzione (Render.com o altro host)

#### Metodo 1 - Via Dashboard Render.com

1. **Accedi** a Render.com Dashboard
2. **Seleziona** il database PostgreSQL
3. **Vai a** "Shell" o "Connect"
4. **Esegui** il contenuto di `fix-spawn-coordinates-PRODUCTION.sql`
5. **Verifica** con la query finale inclusa nello script

#### Metodo 2 - Via psql CLI

```bash
# Connessione al database di produzione
psql $DATABASE_URL

# Copia e incolla il contenuto di fix-spawn-coordinates-PRODUCTION.sql
\i /path/to/fix-spawn-coordinates-PRODUCTION.sql

# Verifica risultato
SELECT name, spawn_data FROM rooms ORDER BY name;

# Esci
\q
```

#### Metodo 3 - Via Python Script

```bash
cd escape-room-3d/backend
python3 << EOF
import os
import psycopg2

db_url = os.getenv('DATABASE_URL')  # URL produzione
conn = psycopg2.connect(db_url)
cursor = conn.cursor()

# Leggi e esegui lo script SQL
with open('../fix-spawn-coordinates-PRODUCTION.sql', 'r') as f:
    cursor.execute(f.read())

conn.commit()
cursor.close()
conn.close()
print("✅ Coordinate aggiornate con successo!")
EOF
```

### Opzione B: Database Locale/Sviluppo

```bash
# Entra nel container Docker
docker-compose exec db psql -U postgres -d escape_room

# Oppure connessione diretta
psql postgresql://postgres:postgres@localhost:5432/escape_room

# Esegui lo script
\i /path/to/fix-spawn-coordinates-PRODUCTION.sql
```

## ✅ Verifica del Fix

### 1. Controlla Database

```sql
SELECT 
    name,
    spawn_data->>'position' as position,
    spawn_data->>'yaw' as yaw
FROM rooms 
ORDER BY name;
```

**Risultato Atteso:**

```
name        | position                       | yaw
------------+--------------------------------+------
bathroom    | {"x": 1.27, "y": 0, "z": 2.62} | 3.65
bedroom     | {"x": -0.18, "y": 0, "z": 1.5} | 0.61
gate        | {"x": 0.53, "y": 0, "z": 7.27} | 0
kitchen     | {"x": -0.9, "y": 0, "z": 2.07} | 2.55
livingroom  | {"x": 0.54, "y": 0, "z": 1.52} | 5.21
```

### 2. Test in Produzione

1. **Crea** una nuova sessione di gioco
2. **Registra** 1-4 giocatori
3. **Avvia** il countdown
4. **Entra** nella scena Esterno
5. **Apri** il cancello (tasto K o attendi il timer)
6. **Attendi** la distribuzione automatica (25 secondi)
7. **Verifica** che i giocatori spawning nelle posizioni corrette

### 3. Verifica Frontend

Controlla la console del browser durante il caricamento della scena:

```
[CameraPositioning] ✅ Loaded spawn from DATABASE for cucina:
{position: {x: -0.9, y: 0, z: 2.07}, yaw: 2.55}
```

## 📝 Per Futuri Deployment

La migration `002_add_spawn_data.py` è stata aggiornata con le coordinate corrette.

**Quando fai un nuovo deployment:**

1. Il database viene ricreato dalle migrations
2. Le coordinate corrette vengono inserite automaticamente
3. ✅ Nessun problema di spawn!

## 🔄 Rollback (se necessario)

Se per qualche motivo devi tornare alle vecchie coordinate:

```sql
-- ROLLBACK alle coordinate vecchie (sconsigliato!)
UPDATE rooms SET spawn_data = '{"position": {"x": -0.9, "y": 0, "z": 2.12}, "yaw": 2.45}'::json WHERE name = 'kitchen';
UPDATE rooms SET spawn_data = '{"position": {"x": 1.18, "y": 0, "z": 2.59}, "yaw": 3.75}'::json WHERE name = 'bathroom';
UPDATE rooms SET spawn_data = '{"position": {"x": -0.21, "y": 0, "z": 1.46}, "yaw": 0.82}'::json WHERE name = 'bedroom';
UPDATE rooms SET spawn_data = '{"position": {"x": 0.53, "y": 0, "z": 1.52}, "yaw": 5.17}'::json WHERE name = 'livingroom';
UPDATE rooms SET spawn_data = '{"position": {"x": 0.57, "y": 0, "z": 7.24}, "yaw": 4.98}'::json WHERE name = 'gate';
```

## 📚 Riferimenti

- **Coordinate Reference**: `SPAWN_COORDINATES_REFERENCE.md`
- **Script SQL Fix**: `fix-spawn-coordinates-PRODUCTION.sql`
- **Migration**: `backend/alembic/versions/002_add_spawn_data.py`
- **Fallback Code**: `src/utils/cameraPositioning.js`

## 🎉 Risultato

Dopo aver applicato il fix:
- ✅ I giocatori spawning nelle posizioni corrette
- ✅ Distribuzione automatica funziona in produzione
- ✅ Coordinate allineate tra database, migration e fallback
- ✅ Nuovi deployment avranno coordinate corrette

---

**Data Fix**: 10/01/2026, 02:30 AM  
**Issue**: Spawn coordinates mismatch between development and production  
**Status**: ✅ RISOLTO
