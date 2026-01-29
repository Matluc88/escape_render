# 🔧 FIX: Render Pre-Deploy Command

## ❌ Problema
Il deploy del backend fallisce con errore:
```
alembic: error: unrecognized arguments: && python create_first_admin_render.py
```

## 🔍 Causa
Render sta usando il **vecchio comando pre-deploy configurato manualmente** sulla dashboard invece del nostro script `render-predeploy.sh`.

## ✅ Soluzione: Aggiorna su Render Dashboard

### Step 1: Vai su Render Dashboard
1. Apri https://dashboard.render.com/
2. Seleziona il servizio **escape-room-backend**

### Step 2: Modifica Pre-Deploy Command
1. Vai su **Settings** (icona ingranaggio)
2. Scorri fino a **Build & Deploy**
3. Cerca **Pre-Deploy Command**
4. **CANCELLA** il vecchio comando:
   ```
   alembic upgrade head && python create_first_admin_render.py
   ```
5. **SOSTITUISCI** con:
   ```
   ./render-predeploy.sh
   ```
6. Clicca **Save Changes**

### Step 3: Trigger Manual Deploy
1. Vai su **Manual Deploy**
2. Clicca **Deploy latest commit**
3. Attendi il completamento

## 🎯 Cosa Farà lo Script

Lo script `render-predeploy.sh` eseguirà:
```bash
#!/bin/bash
set -e

echo "🔄 Running Alembic migrations..."
alembic upgrade head

echo "👤 Creating default admin user..."
python create_first_admin_render.py

echo "✅ Pre-deploy completed successfully!"
```

## ⚠️ IMPORTANTE: Variabili d'Ambiente

**PRIMA** di fare il deploy, assicurati di aver configurato:
1. Vai su **Environment** tab
2. Aggiungi queste variabili:
   - `ADMIN_DEFAULT_USERNAME` = `admin` (o quello che preferisci)
   - `ADMIN_DEFAULT_EMAIL` = `admin@escape.com`
   - `ADMIN_DEFAULT_PASSWORD` = `TuaPasswordSicura123!`
3. Salva

Senza queste variabili, lo script `create_first_admin_render.py` non può creare l'utente admin!

## 🚀 Alternativa: Usa Render.yaml (Consigliato)

Se preferisci che Render legga automaticamente dal `render.yaml`:

1. **RIMUOVI completamente** il Pre-Deploy Command dalla dashboard (lascia vuoto)
2. Render leggerà automaticamente la configurazione da `render.yaml`:
   ```yaml
   preDeployCommand: ./render-predeploy.sh
   ```
3. Salva e fai redeploy

## ✅ Verifica Successo

Nei log del deploy dovresti vedere:
```
==> Starting pre-deploy: ./render-predeploy.sh
🔄 Running Alembic migrations...
INFO  [alembic.runtime.migration] Context impl PostgresqlImpl.
INFO  [alembic.runtime.migration] Will assume transactional DDL.
👤 Creating default admin user...
✅ Admin user created/verified: admin
✅ Pre-deploy completed successfully!
```

## 📝 Note

- Il render.yaml è già aggiornato con `preDeployCommand: ./render-predeploy.sh`
- Lo script è già eseguibile (`chmod +x`)
- Lo script è già pushato su GitHub (commit c756ea2)
- Devi solo aggiornare la configurazione manuale su Render Dashboard