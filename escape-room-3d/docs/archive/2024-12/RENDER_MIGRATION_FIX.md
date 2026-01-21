# 🔧 Fix Database Migration su Render

## ❌ Problema

Il backend su Render sta crashando con questo errore:
```
psycopg2.errors.UndefinedColumn: column rooms.spawn_data does not exist
```

**Causa**: Le database migrations non sono state eseguite. Il database ha le tabelle base ma mancano colonne aggiunte dalle migrations recenti.

---

## ✅ Soluzione: Eseguire le Migrations

### **Metodo 1: Via Render Shell (CONSIGLIATO)**

#### Step 1: Apri Render Shell
1. Vai su https://dashboard.render.com
2. Clicca sul servizio **escape-house-backend**
3. In alto a destra, clicca sul tab **"Shell"**
4. Aspetta che la shell si carichi

#### Step 2: Verifica Directory
```bash
pwd
# Dovresti vedere: /app
```

#### Step 3: Controlla Migrations Disponibili
```bash
cd /app
alembic current
# Mostra la versione corrente del database
```

#### Step 4: Vedi Migrations Pending
```bash
alembic history
# Mostra tutte le migrations disponibili
```

#### Step 5: Esegui Migrations
```bash
alembic upgrade head
# Applica tutte le migrations mancanti
```

**Output atteso**:
```
INFO  [alembic.runtime.migration] Running upgrade -> 001_initial
INFO  [alembic.runtime.migration] Running upgrade 001 -> 002_add_spawn_data
INFO  [alembic.runtime.migration] Running upgrade 002 -> 003_xxx
...
```

#### Step 6: Verifica Successo
```bash
alembic current
# Dovresti vedere l'ultima versione
```

#### Step 7: Esci dalla Shell
```bash
exit
```

#### Step 8: Riavvia il Backend
1. Nel Dashboard Render → **escape-house-backend**
2. Clicca **"Manual Deploy"** in alto a destra
3. Scegli **"Clear build cache & deploy"** (opzionale ma consigliato)
4. Aspetta il deploy (~2-3 minuti)
5. Controlla i logs - non dovrebbero più esserci errori

---

### **Metodo 2: Migrations Automatiche (Non Raccomandato per Produzione)**

Se preferisci che le migrations si eseguano automaticamente all'avvio:

#### Step 1: Aggiungi Variabile Ambiente
1. Backend Service → **Environment**
2. Clicca **"Add Environment Variable"**
3. Key: `AUTO_MIGRATE`
4. Value: `true`
5. **Save Changes**

Il servizio si riavvierà automaticamente.

⚠️ **Attenzione**: Questo metodo è comodo ma NON raccomandato per produzione perché:
- Può causare problemi con deploy simultanei
- Non hai controllo su quando le migrations vengono eseguite
- Rischio di race conditions

---

### **Metodo 3: Da Locale (se hai accesso al Database URL)**

Se hai l'External Database URL:

```bash
# Nel tuo computer
cd /Users/matteo/Desktop/ESCAPE/escape-room-3d/backend

# Configura DATABASE_URL
export DATABASE_URL="postgresql://escape_user:PASSWORD@dpg-xxx-a.oregon-postgres.render.com/escape_db"

# Esegui migrations
alembic upgrade head
```

⚠️ Usa l'**External Database URL** (con `-a.oregon-postgres.render.com`)

---

## 📋 Checklist Post-Migration

Dopo aver eseguito le migrations:

- [ ] Backend service è "Live" (verde)
- [ ] Logs non mostrano più errori di colonne mancanti
- [ ] Puoi accedere a `/health` endpoint
- [ ] API docs funzionano: `/docs`
- [ ] Frontend si connette correttamente al backend

---

## 🧪 Test Backend

### Via Browser:
```
https://escape-house-backend.onrender.com/health
```

Dovresti vedere:
```json
{"status": "healthy"}
```

### Via cURL:
```bash
curl https://escape-house-backend.onrender.com/health
```

### API Docs:
```
https://escape-house-backend.onrender.com/docs
```

---

## 🐛 Troubleshooting

### Errore: "alembic: command not found"
```bash
# Verifica di essere in /app
pwd

# Verifica che alembic sia installato
pip list | grep alembic
```

### Errore: "Can't locate revision"
```bash
# Potrebbe essere un problema con il database
# Verifica che DATABASE_URL sia configurato
env | grep DATABASE_URL

# Forza la re-stampa dello schema
alembic stamp head
alembic upgrade head
```

### Backend continua a crashare
1. Controlla i logs completi
2. Verifica che tutte le variabili ambiente siano configurate
3. Prova a fare un "Clear build cache & deploy"

---

## 📚 Migrations Disponibili

Nel progetto ci sono queste migrations:

1. **001_initial.py** - Schema base (users, rooms, etc.)
2. **002_add_spawn_data.py** - Aggiunge colonna `spawn_data` a `rooms` ⬅️ QUESTA MANCA!
3. **003_xxx.py** - Altre migrations
4. **004_add_players_and_puzzles.py** - Tabelle players e puzzles
5. **005_add_session_pin.py** - PIN per sessioni

---

## ⚠️ Fix per "DuplicateTable" Error

Se ottieni errore `relation "rooms" already exists`, significa che le tabelle esistono ma Alembic non sa a che versione è il database.

### Soluzione:
```bash
# 1. Apri Shell su Render (escape-house-backend)
cd /app

# 2. Verifica versione corrente
alembic current
# Se dice "None" o non mostra nessuna versione, continua:

# 3. Stampa versione iniziale (tabelle base già esistono)
alembic stamp 001

# 4. Ora esegui solo le migrations mancanti
alembic upgrade head

# 5. Verifica successo
alembic current
# Dovrebbe mostrare l'ultima versione (005 o simile)
```

---

## ✅ Risoluzione Rapida (TL;DR)

```bash
# 1. Apri Shell su Render (escape-house-backend)
cd /app

# 2. Se hai errore "DuplicateTable", usa questo:
alembic stamp 001
alembic upgrade head

# 3. Altrimenti (database nuovo):
alembic upgrade head

# 4. Esci e riavvia il servizio
exit

# 5. Manual Deploy → Clear build cache & deploy

# 6. Test:
curl https://escape-house-backend.onrender.com/health
```

---

**Ultimo aggiornamento**: 27 Dicembre 2025
**Fix per**: Database migration error su Render deployment
