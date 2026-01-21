# 🔧 Guida Fix Errore 500 su Render

## 📋 Problema

Errore 500 quando viene chiamato l'endpoint:
```
POST /api/sessions/29/kitchen-puzzles/reset
```

## 🔍 Analisi

L'errore è probabilmente causato da:
1. **Coordinate spawn incorrette** nel database Render
2. **Possibili dati mancanti o inconsistenti** nelle tabelle del database

## ✅ Soluzione in 3 Fasi

### FASE 1: Fix Database Spawn Coordinates

#### Passo 1.1 - Ottieni la DATABASE_URL da Render

1. Vai su [Render Dashboard](https://dashboard.render.com)
2. Seleziona il tuo **Database PostgreSQL**
3. Nella sezione **Connections**, copia l'**External Database URL**
4. Dovrebbe avere questo formato:
   ```
   postgresql://user:password@host.render.com/database_name
   ```

#### Passo 1.2 - Esegui lo Script di Fix

Nel terminale, esegui:

```bash
cd /Users/matteo/Desktop/ESCAPE/escape-room-3d

# Imposta la variabile d'ambiente con la tua DATABASE_URL
export DATABASE_URL='postgresql://user:password@host.render.com/database'

# Esegui lo script di fix
./fix-render-database.sh
```

Lo script:
- ✅ Verificherà lo stato corrente delle coordinate
- ✅ Applicherà le coordinate corrette da `fix-spawn-coordinates-FINALI.sql`
- ✅ Mostrerà il risultato finale

### FASE 2: Deploy del Codice Aggiornato

Il codice è stato aggiornato con:
- ✅ **Logging dettagliato** nell'endpoint `/reset` per diagnostica
- ✅ **Verifica esplicita** dell'esistenza della sessione
- ✅ **Error handling robusto** con stack trace

#### Passo 2.1 - Commit e Push

```bash
cd /Users/matteo/Desktop/ESCAPE/escape-room-3d

# Aggiungi i file modificati
git add backend/app/api/kitchen_puzzles.py
git add fix-render-database.sh
git add FIX_RENDER_ERROR_500_GUIDE.md

# Commit
git commit -m "🔧 Fix: Add detailed logging and error handling for /reset endpoint"

# Push su GitHub
git push origin main
```

#### Passo 2.2 - Deploy su Render

1. Vai su [Render Dashboard](https://dashboard.render.com)
2. Seleziona il tuo **Web Service** (backend)
3. Clicca **"Manual Deploy"**
4. Seleziona **"Clear build cache & deploy"**
5. Attendi il completamento del deploy (circa 2-5 minuti)

### FASE 3: Verifica e Test

#### Passo 3.1 - Controlla i Log su Render

1. Su Render Dashboard, vai al tuo Web Service
2. Clicca sulla tab **"Logs"**
3. Prova a chiamare l'endpoint `/reset` dal frontend
4. Osserva i log dettagliati:
   ```
   🔄 [API /reset] START - session_id=29, level=full
   🔍 [API /reset] Step 1: Verifying session exists...
   ✅ [API /reset] Session 29 exists
   🔍 [API /reset] Step 2: Resetting puzzles...
   ...
   ```

#### Passo 3.2 - Se Persiste l'Errore

Se vedi ancora l'errore 500, i log mostreranno esattamente in quale step fallisce:

- **Step 1 fails** → La sessione 29 non esiste
  - **Soluzione**: Crea sessioni di test con `create-test-sessions-render-fixed.sql`
  
- **Step 2 fails** → Problema con reset dei puzzle
  - **Soluzione**: Controlla che la tabella `kitchen_puzzle_states` esista
  
- **Step 4 fails** → Problema con `game_completion_states`
  - **Soluzione**: Verifica che tutte le migration siano state applicate

## 🔍 Debugging Avanzato

### Verifica Tabelle sul Database Render

Connettiti al database Render e verifica le tabelle:

```bash
psql "$DATABASE_URL"
```

```sql
-- Verifica che tutte le tabelle esistano
\dt

-- Verifica sessioni esistenti
SELECT id, pin, status FROM game_sessions;

-- Verifica coordinate spawn
SELECT name, spawn_data FROM room_spawn_coordinates;

-- Verifica puzzle states
SELECT session_id, puzzle_states FROM kitchen_puzzle_states;

-- Verifica game completion
SELECT session_id, rooms_status, game_won FROM game_completion_states;
```

### Crea Sessione di Test (se necessario)

Se la sessione 29 non esiste:

```bash
# Connetti al database
psql "$DATABASE_URL"

# Esegui le query
\i create-test-sessions-render-fixed.sql
```

## 📊 Checklist Finale

Prima di considerare il problema risolto, verifica:

- [ ] Script `fix-render-database.sh` eseguito con successo
- [ ] Coordinate spawn corrette verificate nel database
- [ ] Codice con logging dettagliato deployato su Render
- [ ] Deploy completato senza errori
- [ ] Endpoint `/reset` testato dal frontend
- [ ] Log su Render mostrano l'esecuzione corretta
- [ ] Nessun errore 500 nei log

## 🆘 Troubleshooting

### Problema: "psql: command not found"

**Soluzione**: Installa PostgreSQL client

```bash
# macOS
brew install postgresql

# Verifica installazione
psql --version
```

### Problema: "Session 29 not found" nei log

**Soluzione**: Crea la sessione

```bash
psql "$DATABASE_URL" -f create-test-sessions-render-fixed.sql
```

### Problema: "Table does not exist"

**Soluzione**: Applica le migration

```bash
# Su Render, vai al Shell del Web Service
cd backend
alembic upgrade head
```

## 📞 Contatti

Se il problema persiste dopo aver seguito questa guida:

1. Copia i **log completi** da Render (dalla tab Logs)
2. Invia i log che includono:
   - `🔄 [API /reset] START`
   - Tutti i log fino a `❌ [API /reset] EXCEPTION`
3. Include anche l'output di:
   ```bash
   psql "$DATABASE_URL" -c "SELECT name, spawn_data FROM room_spawn_coordinates;"
   ```

## 🎯 Prossimi Passi

Dopo aver risolto l'errore 500:

1. **Test completo** di tutti gli endpoint della cucina
2. **Verifica LED** funzionano correttamente
3. **Test spawn points** in tutte le stanze
4. **Deploy in produzione** con confidence

---

**Ultimo aggiornamento**: 07/01/2026, 21:43
**Versione**: 1.0
