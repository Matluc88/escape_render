# 🚀 Setup Admin Authentication su Render.com

## 📋 Guida Rapida per Creare Admin su Render

Dato che il tuo sistema è hostato su **Render.com**, ecco come creare il primo admin.

---

## ⚡ Metodo 1: Variabili Ambiente (RACCOMANDATO)

### Step 1: Configura Password Admin su Render

1. Vai su [Render Dashboard](https://dashboard.render.com)
2. Seleziona il tuo servizio **escape-room-backend**
3. Vai su **Environment**
4. Aggiungi queste variabili:

```
ADMIN_DEFAULT_USERNAME=admin
ADMIN_DEFAULT_EMAIL=tuaemail@example.com
ADMIN_DEFAULT_PASSWORD=TuaPasswordForte123!
```

### Step 2: Modifica lo Startup Command

Nel tuo `render.yaml` o nelle **Settings** del servizio backend, modifica il comando di avvio:

**Prima**:
```bash
uvicorn app.main:app --host 0.0.0.0 --port 3000
```

**Dopo**:
```bash
alembic upgrade head && python create_first_admin_render.py && uvicorn app.main:app --host 0.0.0.0 --port 3000
```

### Step 3: Redeploy

Trigger un nuovo deploy:
- Fai un commit dummy e push su GitHub, oppure
- Clicca **Manual Deploy** su Render Dashboard

### Step 4: Verifica nei Log

Nei log del deploy dovresti vedere:
```
============================================================
CREAZIONE ADMIN DI DEFAULT PER RENDER
============================================================

📝 Creazione admin di default...
   Username: admin
   Email: tuaemail@example.com

============================================================
✅ ADMIN CREATO CON SUCCESSO!
============================================================
```

### Step 5: Login

Vai su `https://tuosito.onrender.com/admin/login.html` e usa:
- **Username**: `admin` (o quello che hai configurato)
- **Password**: quella in `ADMIN_DEFAULT_PASSWORD`

---

## 🛠️ Metodo 2: Render Shell (se disponibile)

Se hai accesso alla Shell su Render:

1. Vai su **Shell** tab nel tuo servizio
2. Esegui:

```bash
cd /app
python create_admin.py
```

3. Inserisci credenziali interattivamente

---

## 🔧 Metodo 3: Endpoint Temporaneo di Setup

### Step 1: Aggiungi Endpoint Temporaneo

Crea file `escape-room-3d/backend/app/api/setup.py`:

```python
from fastapi import APIRouter, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db, SessionLocal
from app.models.admin_user import AdminUser
from app.core.security import get_password_hash
from pydantic import BaseModel

router = APIRouter(prefix="/api/setup", tags=["Setup"])

class FirstAdminCreate(BaseModel):
    username: str
    email: str
    password: str
    secret_key: str  # Protezione temporanea

@router.post("/create-first-admin")
async def create_first_admin(data: FirstAdminCreate):
    """
    Endpoint temporaneo per creare il primo admin
    RIMUOVI DOPO L'USO!
    """
    # Secret key di protezione (mettila in .env)
    SETUP_SECRET = "tuo_secret_temporaneo_12345"  # Cambialo!
    
    if data.secret_key != SETUP_SECRET:
        raise HTTPException(403, "Secret key non valido")
    
    db = SessionLocal()
    try:
        # Verifica che non ci siano admin
        existing = db.query(AdminUser).first()
        if existing:
            raise HTTPException(400, "Admin già esistente")
        
        # Crea admin
        admin = AdminUser(
            username=data.username,
            email=data.email,
            hashed_password=get_password_hash(data.password),
            is_active=True
        )
        db.add(admin)
        db.commit()
        db.refresh(admin)
        
        return {
            "message": "Admin creato con successo",
            "username": admin.username,
            "warning": "RIMUOVI QUESTO ENDPOINT DOPO L'USO!"
        }
    finally:
        db.close()
```

### Step 2: Aggiungi Router in `main.py`

```python
from app.api.setup import router as setup_router
app.include_router(setup_router)
```

### Step 3: Chiama l'Endpoint

```bash
curl -X POST https://tuosito.onrender.com/api/setup/create-first-admin \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "email": "admin@escape.com",
    "password": "TuaPasswordForte123!",
    "secret_key": "tuo_secret_temporaneo_12345"
  }'
```

### Step 4: RIMUOVI L'ENDPOINT

**IMPORTANTE**: Dopo aver creato l'admin, rimuovi:
- Il file `app/api/setup.py`
- Il router da `main.py`
- Fai commit e redeploy

---

## 📊 Verifica Creazione Admin

### Via API:

```bash
# Login
curl -X POST https://tuosito.onrender.com/api/admin/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"tua_password"}'

# Dovresti ricevere un token JWT
```

### Via Frontend:

Vai su `https://tuosito.onrender.com/admin/login.html`

---

## 🔐 Best Practices

### Dopo la Creazione:

1. ✅ **Cambia la password di default** (implementa endpoint change-password)
2. ✅ **Rimuovi variabile ADMIN_DEFAULT_PASSWORD** da environment
3. ✅ **Rimuovi endpoint di setup** se usato
4. ✅ **Verifica che .env non sia mai committato**

### Sicurezza Render:

1. ✅ Usa **HTTPS** (Render lo fornisce automaticamente)
2. ✅ Configura **Custom Domain** se possibile
3. ✅ Abilita **Auto-Deploy** solo da branch protetti
4. ✅ Monitora **Logs** per accessi sospetti

---

## 🆘 Troubleshooting

### Problema: Admin non viene creato

**Verifica**:
1. Log del deploy: cerca "ADMIN CREATO"
2. Environment variables configurate correttamente
3. Migration database eseguita (`alembic upgrade head`)

**Soluzione**:
```bash
# Nei log di Render, cerca errori tipo:
# - "table admin_users does not exist" → Migration non eseguita
# - "ADMIN_DEFAULT_PASSWORD not set" → Variabile mancante
```

### Problema: Password non funziona

**Verifica**:
1. Password corretta (case-sensitive)
2. Spazi non voluti nella variabile ambiente
3. Admin effettivamente creato (controlla database)

**Soluzione**:
Ricrea admin con password nuova o usa endpoint di reset password

---

## 📁 File Necessari

```
Backend:
├── create_first_admin_render.py   # Script auto-creazione admin
├── create_admin.py                # Script interattivo
└── app/api/setup.py               # Endpoint temporaneo (opzionale)

Render Config:
└── Environment Variables:
    ├── ADMIN_DEFAULT_USERNAME
    ├── ADMIN_DEFAULT_EMAIL
    └── ADMIN_DEFAULT_PASSWORD
```

---

## ✅ Checklist Setup Render

- [ ] Aggiunto variabili ambiente su Render Dashboard
- [ ] Modificato startup command per eseguire `create_first_admin_render.py`
- [ ] Fatto deploy e verificato log
- [ ] Testato login su `/admin/login.html`
- [ ] (Opzionale) Rimosso endpoint temporaneo di setup
- [ ] Cambiata password di default
- [ ] Rimossa variabile `ADMIN_DEFAULT_PASSWORD` da environment

---

## 🎯 Comando Finale per Render

Nel tuo servizio backend su Render, usa questo **Start Command**:

```bash
alembic upgrade head && python create_first_admin_render.py && uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

**Spiegazione**:
1. `alembic upgrade head` → Crea tabelle database
2. `python create_first_admin_render.py` → Crea admin se non esiste
3. `uvicorn...` → Avvia server

---

**Setup completato! Ora puoi fare login come admin.** 🎉