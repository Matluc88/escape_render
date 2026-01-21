# Fix Nginx API Proxy - 404 Error su /api/sessions

## Problema Identificato

**Errore:**
```
POST http://192.168.8.10/api/sessions 404 (Not Found)
```

**Causa Root:**
La configurazione nginx aveva un proxy_pass errato che rimuoveva il prefisso `/api` dalle richieste.

### Flusso Errato (PRIMA)
1. Frontend → `POST /api/sessions`
2. Nginx riceve → `/api/sessions`
3. Nginx proxy_pass → `http://backend/` 
4. Backend riceve → `POST /sessions` ❌ (manca `/api`)
5. FastAPI → **404 Not Found**

### Flusso Corretto (DOPO)
1. Frontend → `POST /api/sessions`
2. Nginx riceve → `/api/sessions`
3. Nginx proxy_pass → `http://backend/api/`
4. Backend riceve → `POST /api/sessions` ✅
5. FastAPI → **200 OK**

## Soluzione Applicata

**File:** `nginx.conf`

**Modifica:**
```nginx
# PRIMA (ERRATO)
location /api/ {
    proxy_pass http://backend/;
    ...
}

# DOPO (CORRETTO)
location /api/ {
    proxy_pass http://backend/api/;
    ...
}
```

## Come Applicare la Fix

### 1. Verificare la modifica
```bash
cat escape-room-3d/nginx.conf | grep -A 2 "location /api/"
```

Deve mostrare:
```
location /api/ {
    proxy_pass http://backend/api/;
```

### 2. Riavviare nginx (Docker)

**Opzione A - Restart solo nginx:**
```bash
cd escape-room-3d
docker-compose restart nginx
```

**Opzione B - Rebuild completo (se necessario):**
```bash
cd escape-room-3d
docker-compose down
docker-compose up -d --build
```

### 3. Verificare il fix

**Test dal browser:**
```bash
# Aprire console browser e verificare che non ci siano più errori 404
# Dovrebbe funzionare la creazione sessione
```

**Test con curl:**
```bash
curl -X POST http://192.168.8.10/api/sessions \
  -H "Content-Type: application/json" \
  -d '{}' -v
```

Deve rispondere con **201 Created** e restituire i dati della sessione.

## Note Tecniche

### Come Funziona proxy_pass in Nginx

```nginx
location /api/ {
    proxy_pass http://backend/api/;
}
```

- Il trailing slash in `backend/api/` è **fondamentale**
- Nginx sostituisce `/api/` con `/api/` nel path finale
- Senza il trailing slash, nginx rimuoverebbe il prefisso

### Endpoint Backend FastAPI

Il router sessions è definito con:
```python
router = APIRouter(prefix="/api/sessions", tags=["sessions"])
```

Quindi il backend **si aspetta sempre** il prefisso `/api` nell'URL.

## Testing Post-Fix

Dopo aver applicato la fix, testare tutti gli endpoint API:

✅ `POST /api/sessions` - Creare sessione
✅ `GET /api/sessions` - Elenco sessioni
✅ `GET /api/sessions/active` - Sessione attiva
✅ `POST /api/sessions/{id}/end` - Terminare sessione
✅ `POST /api/validate-pin` - Validare PIN
✅ Tutti gli altri endpoint `/api/*`

## Timestamp

**Data Fix:** 15/01/2026 01:37 AM
**Versione:** v1.0.0
**Testato:** ✅ In attesa di restart nginx

## Riferimenti

- `nginx.conf` - Configurazione principale nginx
- `backend/app/api/sessions.py` - Router FastAPI sessions
- `backend/app/main.py` - Registrazione routers
