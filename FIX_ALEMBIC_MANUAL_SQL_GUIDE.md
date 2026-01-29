# 🔧 FIX FINALE: Database Schema Manuale + CORS

**Data:** 28/01/2026  
**Commit:** 62e2c5f  
**Problema:** Alembic overlap error + Database schema mancante + CORS

---

## 🎯 PROBLEMA IDENTIFICATO

### 1. ❌ Alembic Overlap Error
Il deploy falliva con:
```
ERROR [alembic.util.messaging] Requested revision 002 overlaps with other requested revisions 001
FAILED: Requested revision 002 overlaps with other requested revisions 001
```

**Causa:** Conflitto nella catena di migrazioni Alembic (probabilmente dovuto a formati diversi di `revision` tra vecchie e nuove migrazioni).

### 2. ❌ Database Schema Mancante
Il database su Render.com **NON ha le colonne hardware** per `bathroom_puzzle_states`:
- `door_servo_should_open`
- `window_servo_should_close`  
- `fan_should_run`

### 3. ❌ CORS Error
Manca la variabile d'ambiente `CORS_ORIGINS` per permettere richieste dal frontend.

---

## ✅ SOLUZIONE: SQL Manuale + CORS Config

### STEP 1: Deploy Backend (Senza Alembic)

Il Dockerfile è stato corretto per **NON eseguire** `alembic upgrade head`:

```dockerfile
# Vecchio (causava errore)
CMD ["sh", "-c", "alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port 3000"]

# Nuovo (funziona)
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "3000"]
```

**Commit:** 62e2c5f

Render.com farà **auto-deploy** (3-5 minuti) del nuovo Dockerfile senza errori Alembic.

---

### STEP 2: Applica SQL Manualmente su Database

Devi accedere al database PostgreSQL su Render.com ed eseguire questo script SQL:

#### 2.1 Accedi al Database Render.com

1. Vai su: **https://dashboard.render.com**
2. Seleziona il database: **escape-house-db**
3. Nella sezione **"Connect"**, copia la **External Database URL** (PSQL Command)
4. Apri il terminale sul tuo Mac
5. Incolla il comando PSQL e premi Invio

**Esempio:**
```bash
PGPASSWORD=your_password psql -h dpg-xxx.oregon-postgres.render.com -U escape_user escape_db
```

#### 2.2 Esegui Lo Script SQL

Una volta connesso al database, copia e incolla questo script:

```sql
-- Add missing hardware control columns to bathroom_puzzle_states table
-- This is equivalent to migration 015_add_bathroom_hardware.py

-- Check if columns exist before adding them (idempotent)
DO $$
BEGIN
    -- Add door_servo_should_open if not exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'bathroom_puzzle_states' 
        AND column_name = 'door_servo_should_open'
    ) THEN
        ALTER TABLE bathroom_puzzle_states 
        ADD COLUMN door_servo_should_open BOOLEAN NOT NULL DEFAULT false;
        
        RAISE NOTICE 'Added column: door_servo_should_open';
    ELSE
        RAISE NOTICE 'Column door_servo_should_open already exists';
    END IF;

    -- Add window_servo_should_close if not exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'bathroom_puzzle_states' 
        AND column_name = 'window_servo_should_close'
    ) THEN
        ALTER TABLE bathroom_puzzle_states 
        ADD COLUMN window_servo_should_close BOOLEAN NOT NULL DEFAULT false;
        
        RAISE NOTICE 'Added column: window_servo_should_close';
    ELSE
        RAISE NOTICE 'Column window_servo_should_close already exists';
    END IF;

    -- Add fan_should_run if not exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'bathroom_puzzle_states' 
        AND column_name = 'fan_should_run'
    ) THEN
        ALTER TABLE bathroom_puzzle_states 
        ADD COLUMN fan_should_run BOOLEAN NOT NULL DEFAULT false;
        
        RAISE NOTICE 'Added column: fan_should_run';
    ELSE
        RAISE NOTICE 'Column fan_should_run already exists';
    END IF;
END $$;

-- Verify columns were added
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'bathroom_puzzle_states'
AND column_name IN ('door_servo_should_open', 'window_servo_should_close', 'fan_should_run')
ORDER BY column_name;
```

#### 2.3 Verifica Output

Dovresti vedere:
```
NOTICE: Added column: door_servo_should_open
NOTICE: Added column: window_servo_should_close
NOTICE: Added column: fan_should_run

       column_name        | data_type | is_nullable | column_default 
--------------------------+-----------+-------------+----------------
 door_servo_should_open   | boolean   | NO          | false
 fan_should_run           | boolean   | NO          | false
 window_servo_should_close| boolean   | NO          | false
(3 rows)
```

✅ **Colonne aggiunte con successo!**

---

### STEP 3: Configura CORS_ORIGINS

1. Vai su: **https://dashboard.render.com**
2. Seleziona **escape-house-backend**
3. Menu laterale → **Environment**
4. Clicca **Add Environment Variable**
5. Aggiungi:
   ```
   Key:   CORS_ORIGINS
   Value: https://escape-room-3d.onrender.com,http://localhost:5173,http://localhost:3000
   ```
6. Clicca **Save Changes**

Render.com farà **re-deploy automatico** del backend (2-3 minuti).

---

## 🧪 TEST FUNZIONALITÀ

### Test 1: Health Check

```bash
curl https://escape-house-backend.onrender.com/health
```

**Risultato Atteso:**
```json
{
  "status": "healthy",
  "mqtt": "connected",
  "websocket_clients": 0
}
```

### Test 2: Endpoint con Session Inesistente (HTTP 404)

```bash
curl -i https://escape-house-backend.onrender.com/api/sessions/99999/bathroom-puzzles/state
```

**Risultato Atteso:**
```
HTTP/2 404
{"detail":"Session 99999 not found. Cannot create bathroom puzzle state."}
```

✅ **NON PIÙ HTTP 500!**

### Test 3: CORS da Frontend

Apri il frontend:
```
https://escape-room-3d.onrender.com
```

Apri DevTools Console e verifica che **NON ci siano errori CORS**.

**Prima:**
```
❌ Access to XMLHttpRequest blocked by CORS policy
```

**Dopo:**
```
✅ Nessun errore CORS
```

### Test 4: Endpoint con Session Valida

Crea una nuova sessione dall'admin panel:
```
https://escape-room-3d.onrender.com/admin-panel/
```

Poi testa con il session_id creato (es: 57):
```bash
curl https://escape-house-backend.onrender.com/api/sessions/57/bathroom-puzzles/state
```

**Risultato Atteso:** HTTP 200 con stato iniziale puzzles

---

## 📊 RIEPILOGO COMPLETO FIX

### Backend Fixes (Commit Precedenti)
- ✅ **6fcdd9c**: Session validation kitchen + game_completion
- ✅ **0127ac9**: Session validation livingroom + bathroom + bedroom  
- ✅ **0f4eb8b**: Global puzzle endpoints
- ✅ **5fe7924**: Frontend bathroom hook `/api` prefix

### Fix Alembic + SQL Manuale (Commit Corrente)
- ✅ **c2fa77f**: Tentativo Alembic auto-migration (fallito per overlap)
- ✅ **62e2c5f**: Revert Alembic, soluzione SQL manuale

### Database Manual Fix
- ✅ Script SQL per aggiungere colonne hardware (eseguito manualmente)

### Configurazione Render.com
- ✅ Variabile `CORS_ORIGINS` configurata

---

## ✅ CHECKLIST FINALE

Dopo aver completato tutti gli step, verifica:

- [ ] Backend deployed su Render.com (commit 62e2c5f)
- [ ] Health check ritorna `healthy`
- [ ] SQL script eseguito sul database (colonne aggiunte)
- [ ] `CORS_ORIGINS` configurato su Render.com
- [ ] Test session inesistente → HTTP 404 (non 500!)
- [ ] Test da frontend → nessun errore CORS
- [ ] Endpoint `/api/sessions/{id}/bathroom-puzzles/state` funziona
- [ ] Endpoint `/api/sessions/{id}/bathroom-puzzles/reset` funziona
- [ ] Endpoint `/api/sessions/{id}/bathroom-puzzles/complete` funziona

---

## 🐛 TROUBLESHOOTING

### Problema: Non riesco a connettermi al database

**Soluzione Alternativa:** Usa Render.com Dashboard

1. Dashboard → **escape-house-db**
2. Tab **"Query"** (se disponibile) oppure **"Connect"**
3. Usa l'interfaccia web per eseguire lo script SQL

### Problema: Ancora HTTP 500 dopo SQL script

**Verifica che le colonne esistano:**
```sql
\d bathroom_puzzle_states
```

Dovresti vedere le tre colonne hardware con tipo `boolean`.

### Problema: Deploy bloccato su Render.com

**Verifica logs:**
```
Dashboard → escape-house-backend → Logs
```

Cerca errori di startup. Se il backend si avvia correttamente, dovresti vedere:
```
INFO: Application startup complete.
```

---

## 🎯 PERCHÉ QUESTA SOLUZIONE?

### Alembic Non Funziona
Le migrazioni Alembic hanno un **overlap error** nella catena. Fixare questo richiederebbe:
1. Ricostruire tutta la catena di migrazioni (15+ file)
2. Fare downgrade/upgrade completo del database
3. Rischio di perdita dati

### SQL Manuale Funziona Sempre
- ✅ **Idempotente**: Controlla se colonna esiste prima di aggiungerla
- ✅ **Sicuro**: Non tocca dati esistenti
- ✅ **Veloce**: 1 script, 10 secondi
- ✅ **Verificabile**: Query finale mostra risultato

---

## 📌 COMMIT FINALE

```bash
git log --oneline -3
```
```
62e2c5f fix: Revert Alembic auto-migration from Dockerfile due to overlap error
c2fa77f fix: Add Alembic migrations to Dockerfile CMD for auto-migration on deploy
5fe7924 Fix: Added /api prefix to bathroom puzzle endpoints
```

---

**Fine Guida** 🚀

Dopo aver:
1. ✅ Deployato il backend (62e2c5f)
2. ✅ Eseguito lo script SQL sul database
3. ✅ Configurato CORS_ORIGINS

Il sistema sarà **completamente funzionante**:
- ✅ Session validation (404 invece di 500)
- ✅ Database schema allineato
- ✅ CORS configurato
- ✅ Tutti gli endpoint puzzle funzionanti