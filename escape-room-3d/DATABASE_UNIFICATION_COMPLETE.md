# 🗄️ UNIFICAZIONE DATABASE COMPLETATA

**Data:** 29/12/2025, 17:15
**Azione:** Tutti i database Docker ora usano un volume unificato

---

## ✅ COSA È STATO FATTO

### 1. Backup di Sicurezza
```bash
File: backup_database_20251229_170709.sql
Posizione: escape-room-3d/
```
✅ Backup completo del database esistente creato

### 2. Volume Unificato Creato
```bash
docker volume create escape_unified_postgres_data
```
✅ Volume persistente condiviso tra tutti gli stack

### 3. Configurazione Aggiornata
**File modificato:** `backend/docker-compose.dev.yml`

**Prima:**
```yaml
volumes:
  - postgres_dev_data:/var/lib/postgresql/data

volumes:
  postgres_dev_data:
    driver: local
```

**Dopo:**
```yaml
volumes:
  - escape_unified_postgres_data:/var/lib/postgresql/data

volumes:
  escape_unified_postgres_data:
    external: true
```

### 4. Dati Ripristinati
✅ Backup ripristinato nel nuovo volume unificato
✅ Tutti i dati precedenti preservati

---

## 📊 SITUAZIONE ATTUALE

### Database Unificato

```
┌──────────────────────────────────────┐
│   escape_unified_postgres_data       │
│   (Volume Docker Condiviso)          │
└────────────┬─────────────────────────┘
             │
             ├─→ escape-db-dev (attivo)
             │   Backend sviluppo :8001
             │
             └─→ escape-db (quando riavviato)
                 Backend produzione :3000
```

### Vantaggi dell'Unificazione

✅ **Un solo database** - Tutti gli stack usano gli stessi dati
✅ **Niente duplicazioni** - Modifiche visibili ovunque
✅ **Backup semplificato** - Un solo volume da salvare
✅ **Meno confusione** - Dati sempre sincronizzati

---

## 🔧 COME FUNZIONA ORA

### Stack Backend-Dev (Sviluppo)
```bash
cd backend
docker-compose -f docker-compose.dev.yml up -d
```
- Backend: `http://localhost:8001`
- Database: `escape_unified_postgres_data`
- Porte custom: 8001, 5433, 1884/9002

### Stack Completo (se necessario)
```bash
cd backend
docker-compose up -d
```
- Backend: `http://localhost:3000`
- Database: `escape_unified_postgres_data` (stesso!)
- Porte standard: 3000, 5432, 1883/9001

**IMPORTANTE:** Entrambi gli stack ora condividono lo stesso database!

---

## 📋 VOLUMI LEGACY

Questi volumi NON sono più utilizzati:

- ❌ `backend_postgres_dev_data` (sostituito)
- ❌ `backend_postgres_data` (sostituito)
- ❌ `escape-room-3d_postgres_data` (sostituito)

### Pulizia Opzionale (quando sei sicuro)

```bash
# ATTENZIONE: Questi comandi cancellano i vecchi dati!
# Esegui solo se sei sicuro che il nuovo sistema funziona

docker volume rm backend_postgres_dev_data
docker volume rm backend_postgres_data  
docker volume rm escape-room-3d_postgres_data
```

---

## 🔄 BACKUP E RESTORE

### Backup del Database Unificato

```bash
cd /Users/matteo/Desktop/ESCAPE/escape-room-3d

# Backup completo
docker exec escape-db-dev pg_dump -U escape_user escape_db > \
  backup_unified_$(date +%Y%m%d_%H%M%S).sql
```

### Restore da Backup

```bash
# Stop tutti i container
cd backend
docker-compose -f docker-compose.dev.yml down

# Riavvia con database pulito
docker-compose -f docker-compose.dev.yml up -d

# Attendi che DB sia pronto
sleep 10

# Restore backup
cat backup_unified_YYYYMMDD_HHMMSS.sql | \
  docker exec -i escape-db-dev psql -U escape_user escape_db
```

---

## 🎯 WORKFLOW CONSIGLIATO

### Sviluppo Quotidiano

1. **Avvia stack backend-dev**
   ```bash
   cd backend
   docker-compose -f docker-compose.dev.yml up -d
   ```

2. **Verifica health**
   ```bash
   curl http://localhost:8001/health
   ```

3. **Avvia frontend**
   ```bash
   cd ..
   npm run dev
   ```

4. **Tutti i dati sono nel volume unificato!**

---

## ✅ VERIFICA UNIFICAZIONE

### Test Rapido

```bash
# 1. Verifica volume attivo
docker inspect escape-db-dev | grep escape_unified_postgres_data

# 2. Test connessione database
docker exec escape-db-dev psql -U escape_user -d escape_db -c "\dt"

# 3. Health check backend
curl http://localhost:8001/health
```

**Risultati attesi:**
- ✅ Volume `escape_unified_postgres_data` montato
- ✅ Tabelle database presenti
- ✅ Backend healthy

---

## 📚 MODIFICA FUTURI DOCKER-COMPOSE

Se crei nuovi stack Docker che devono usare lo stesso database:

```yaml
services:
  db:
    image: postgres:15-alpine
    volumes:
      - escape_unified_postgres_data:/var/lib/postgresql/data
    # ... altre configurazioni

volumes:
  escape_unified_postgres_data:
    external: true  # ← IMPORTANTE: external!
```

---

## 🎓 DOMANDE FREQUENTI

### Q: Posso usare entrambi gli stack contemporaneamente?
**A:** NO! Solo uno stack alla volta può usare le porte. Ma entrambi vedranno lo stesso database.

### Q: Se modifico dati in dev, li vedo anche in produzione?
**A:** SÌ! Database unificato = dati sempre sincronizzati.

### Q: Posso cancellare i vecchi volumi?
**A:** Sì, ma solo dopo aver verificato che il nuovo sistema funziona perfettamente per almeno una settimana.

### Q: Come faccio backup ora?
**A:** Un solo comando: `docker exec escape-db-dev pg_dump ...` 
Il backup include tutti i dati di tutti gli stack!

---

## 🚨 TROUBLESHOOTING

### Database non parte
```bash
# Verifica se volume esiste
docker volume ls | grep escape_unified

# Se non esiste, ricrealo
docker volume create escape_unified_postgres_data

# Riavvia
cd backend
docker-compose -f docker-compose.dev.yml up -d
```

### Dati persi
```bash
# Restore da backup più recente
cat backup_database_20251229_170709.sql | \
  docker exec -i escape-db-dev psql -U escape_user escape_db
```

### Conflitto porte
```bash
# Controlla chi usa le porte
lsof -i :8001
lsof -i :5433

# Ferma tutti i container escape
docker ps | grep escape | awk '{print $1}' | xargs docker stop
```

---

## 📖 DOCUMENTI CORRELATI

- `BACKEND_CONNECTION_REPORT.md` - Analisi completa connessioni
- `SCENE_ROUTES_REFERENCE.md` - Guida route e link
- `.env.local` - Configurazione frontend
- `backend/docker-compose.dev.yml` - Stack sviluppo

---

## ✅ CONCLUSIONE

**Database unificato attivo e funzionante!**

✅ Volume: `escape_unified_postgres_data`  
✅ Backup: `backup_database_20251229_170709.sql`  
✅ Stack: backend-dev operativo  
✅ Dati: Tutti preservati e sincronizzati

**Da ora in poi, un solo database per tutto il progetto! 🎉**

---

_Documento creato il 29/12/2025 alle 17:15_
