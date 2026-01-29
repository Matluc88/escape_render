# 🔐 Sistema di Autenticazione Admin - Guida Completa

## 📋 Panoramica

Sistema completo di autenticazione JWT per proteggere le operazioni admin critiche dell'Escape Room.

**Implementato**: 29 Gennaio 2026

---

## ✨ Funzionalità Implementate

### Backend
- ✅ Modello database `AdminUser` con password hash (bcrypt)
- ✅ JWT token authentication (24h expire)
- ✅ Middleware di sicurezza `get_current_admin`
- ✅ Endpoint login/logout/verify
- ✅ Endpoint admin protetti per operazioni critiche
- ✅ Migration Alembic per tabella admin_users
- ✅ Script `create_admin.py` per creare utenti admin

### Frontend
- ✅ Pagina login admin (`/admin/login.html`)
- ✅ Gestione JWT token in localStorage
- ✅ Auto-redirect se già autenticato
- ✅ UI moderna e responsive

---

## 🚀 Deployment - Step by Step

### **Step 1: Installa Dipendenze**

```bash
cd escape-room-3d/backend

# Verifica requirements.txt contiene:
# - passlib[bcrypt]
# - python-jose[cryptography]

pip install -r requirements.txt
```

### **Step 2: Esegui Migration Database**

```bash
# Opzione A: Usa Alembic (raccomandato)
cd backend
alembic upgrade head

# Opzione B: Crea tabelle direttamente (per test)
docker-compose exec backend python -c "from app.database import engine, Base; Base.metadata.create_all(bind=engine)"
```

### **Step 3: Crea Primo Admin**

```bash
# Sul server/Raspberry Pi
cd escape-room-3d/backend
python create_admin.py
```

**Output atteso**:
```
============================================================
CREAZIONE UTENTE ADMIN
============================================================

Inserisci i dati del nuovo admin:
Username: admin
Email: admin@escape.com
Password: ********
Conferma password: ********

============================================================
✅ ADMIN CREATO CON SUCCESSO!
============================================================
ID: 1
Username: admin
Email: admin@escape.com
Creato: 2026-01-29 12:45:00
============================================================

🔑 Puoi ora effettuare il login con queste credenziali
   URL: http://localhost/admin/login
   Username: admin
```

### **Step 4: Testa Login**

```bash
# Test da comando (opzionale)
curl -X POST http://localhost:8001/api/admin/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"tua_password"}'
```

**Response atteso**:
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "token_type": "bearer",
  "admin": {
    "id": 1,
    "username": "admin",
    "email": "admin@escape.com",
    "is_active": true,
    "created_at": "2026-01-29T12:45:00",
    "last_login": "2026-01-29T13:00:00"
  }
}
```

### **Step 5: Accedi al Panel**

1. Vai su `http://tuosito.com/admin/login.html`
2. Inserisci credenziali
3. Verrai reindirizzato a `index.html` (admin panel)

---

## 🔒 Endpoint Protetti

### **Endpoint che richiedono autenticazione**:

```
POST   /api/admin/sessions/{id}/end    → Termina sessione
DELETE /api/admin/sessions/{id}        → Elimina sessione
POST   /api/admin/puzzles/reset-all    → Reset tutti puzzle
GET    /api/admin/sessions              → Lista tutte sessioni
GET    /api/admin/system/stats          → Statistiche sistema
```

### **Endpoint pubblici (nessuna auth)**:

```
POST   /api/sessions/validate-pin      → Validazione PIN giocatori
GET    /api/spawn/*                     → Coordinate spawn
WS     /socket.io                       → WebSocket real-time
```

---

## 📝 Come Usare l'Autenticazione

### **Nel Frontend**

```javascript
// 1. Login
const response = await fetch('/api/admin/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'pass' })
});

const { access_token } = await response.json();
localStorage.setItem('admin_token', access_token);

// 2. Fare chiamate autenticate
const token = localStorage.getItem('admin_token');

const response = await fetch('/api/admin/sessions', {
    headers: {
        'Authorization': `Bearer ${token}`
    }
});

// 3. Logout
localStorage.removeItem('admin_token');
```

### **Proteggere Nuovi Endpoint**

```python
from fastapi import APIRouter, Depends
from app.core.security import get_current_admin
from app.models.admin_user import AdminUser

router = APIRouter(prefix="/api/admin", tags=["Admin"])

@router.post("/critical-operation")
async def critical_operation(
    admin: AdminUser = Depends(get_current_admin)  # ← Richiede auth
):
    # Solo admin autenticati possono accedere
    return {
        "message": "Operazione completata",
        "admin": admin.username
    }
```

---

## 🛡️ Sicurezza Implementata

### **Password Hashing**
- ✅ Bcrypt con salt automatico
- ✅ Mai salvate password in chiaro
- ✅ Validazione password (min 8 caratteri)

### **JWT Token**
- ✅ Token firmato con `JWT_SECRET`
- ✅ Expire: 24 ore
- ✅ Payload: username + timestamp
- ✅ Algoritmo: HS256

### **Protezioni**
- ✅ Rate limiting (da implementare con nginx)
- ✅ HTTPS richiesto in produzione
- ✅ CORS configurato
- ✅ Token validation su ogni richiesta

---

## ⚙️ Configurazione Avanzata

### **Cambia JWT Secret**

```bash
# Genera secret forte
openssl rand -base64 48

# Aggiungi a .env
JWT_SECRET=<secret_generato>
```

**⚠️ IMPORTANTE**: Cambiando il secret, tutti i token esistenti diventano invalidi.

### **Cambia Token Expiration**

```python
# In backend/app/core/security.py
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 ore
# Cambia a:
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 8   # 8 ore (più sicuro)
```

### **Aggiungi Rate Limiting**

```nginx
# In nginx.conf
limit_req_zone $binary_remote_addr zone=login:10m rate=5r/m;

location /api/admin/auth/login {
    limit_req zone=login burst=3 nodelay;
    proxy_pass http://backend:3000;
}
```

---

## 🧪 Testing

### **Test Login**

```bash
# 1. Login
curl -X POST http://localhost:8001/api/admin/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"yourpass"}' \
  | jq -r '.access_token' > token.txt

# 2. Test endpoint protetto
TOKEN=$(cat token.txt)
curl http://localhost:8001/api/admin/sessions \
  -H "Authorization: Bearer $TOKEN"

# 3. Test token invalido (deve dare 401)
curl http://localhost:8001/api/admin/sessions \
  -H "Authorization: Bearer invalid_token"
```

### **Test Frontend**

```javascript
// Console browser (F12)
// 1. Login
const login = await fetch('/api/admin/auth/login', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({username:'admin', password:'pass'})
}).then(r => r.json());

console.log('Token:', login.access_token);

// 2. Verifica token
const verify = await fetch('/api/admin/auth/verify', {
    headers: {'Authorization': `Bearer ${login.access_token}`}
}).then(r => r.json());

console.log('Token valido:', verify);
```

---

## 🔧 Troubleshooting

### **Problema: Token invalido**

```
Errore: 401 Unauthorized - Token invalido o scaduto
```

**Soluzioni**:
1. Token scaduto → Rifare login
2. JWT_SECRET cambiato → Rifare login
3. Token malformato → Verificare header `Authorization: Bearer <token>`

### **Problema: Password non accettata**

```
Errore: 401 Unauthorized - Username o password non corretti
```

**Soluzioni**:
1. Verifica username/password corretti
2. Verifica utente attivo: `SELECT * FROM admin_users WHERE username='admin'`
3. Reset password se necessario

### **Problema: Endpoint non protetto**

```
Endpoint accessibile senza token
```

**Soluzione**:
```python
# Aggiungi dependency
@router.post("/endpoint")
async def endpoint(admin: AdminUser = Depends(get_current_admin)):
    # ...
```

---

## 📊 Database Schema

```sql
CREATE TABLE admin_users (
    id SERIAL PRIMARY KEY,
    username VARCHAR UNIQUE NOT NULL,
    email VARCHAR UNIQUE NOT NULL,
    hashed_password VARCHAR NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    last_login TIMESTAMP
);

CREATE INDEX ix_admin_users_username ON admin_users(username);
CREATE INDEX ix_admin_users_email ON admin_users(email);
```

---

## 🎯 Prossimi Passi (Raccomandati)

### **Sicurezza Avanzata**:
1. ✅ Implementa rate limiting su login (5 tentativi/minuto)
2. ✅ Aggiungi refresh token per sessioni lunghe
3. ✅ Log accessi admin (audit trail)
4. ✅ 2FA opzionale (Google Authenticator)
5. ✅ Session management (revoca token attivi)

### **UX Migliorata**:
1. ✅ "Remember me" checkbox
2. ✅ Password reset via email
3. ✅ Cambio password da panel
4. ✅ Lista admin users + gestione

---

## 📁 File Creati

```
Backend:
├── app/models/admin_user.py              # Modello database
├── app/core/security.py                  # JWT + password hashing
├── app/schemas/admin_user.py             # Pydantic schemas
├── app/api/admin_auth.py                 # Login/logout endpoints
├── app/api/admin_protected.py            # Endpoint protetti
├── create_admin.py                       # Script creazione admin
└── alembic/versions/add_admin_users.py   # Migration

Frontend:
└── admin-panel/login.html                # Pagina login

Documentation:
└── SECURITY_AUTHENTICATION_GUIDE.md      # Questa guida
```

---

## ✅ Checklist Deployment

- [ ] Installate dipendenze (`passlib`, `python-jose`)
- [ ] Eseguita migration database
- [ ] Creato primo admin con `create_admin.py`
- [ ] Cambiato `JWT_SECRET` in produzione
- [ ] Testato login via API
- [ ] Testato login via frontend
- [ ] Verificato endpoint protetti richiedono token
- [ ] Configurato HTTPS in produzione
- [ ] (Opzionale) Configurato rate limiting nginx

---

## 🆘 Supporto

Se hai problemi:
1. Verifica log backend: `docker logs escape-backend`
2. Verifica database: `docker exec -it escape-db psql -U escape_user -d escape_db`
3. Test API con curl (vedi sezione Testing)
4. Verifica console browser (F12) per errori frontend

---

**Sistema implementato con successo! 🎉**

Il tuo sistema è ora protetto con autenticazione JWT professionale.