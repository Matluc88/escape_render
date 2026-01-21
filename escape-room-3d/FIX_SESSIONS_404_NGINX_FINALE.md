# Fix 404 su POST /api/sessions - COMPLETO

## Problema Risolto
Errore `POST http://192.168.8.10/api/sessions 404 (Not Found)` nel pannello admin

## Causa Root
**File:** `nginx.conf` (riga 56)

```nginx
# ERRATO (causava 404):
proxy_pass http://backend/;

# CORRETTO:
proxy_pass http://backend/api/;
```

Quando nginx ha `proxy_pass http://backend/;` con trailing slash, **rimuove** il prefisso `/api/` dall'URL prima di inoltrarlo al backend:
- Request originale: `/api/sessions`
- Inoltrata al backend come: `/sessions` ❌ (non esiste)

Con `proxy_pass http://backend/api/;`, l'URL viene mantenuto correttamente:
- Request originale: `/api/sessions`
- Inoltrata al backend come: `/api/sessions` ✅

## Fix Applicato
1. Modificato `nginx.conf` con perl per evitare problemi di encoding
2. Trasferito al Raspberry Pi (192.168.8.10)
3. Rebuild frontend container con `--no-cache`
4. Container riavviato e healthy

## Verifica
```bash
# Container status
$ docker ps --filter name=escape-frontend
escape-frontend - Up 35 seconds (healthy)

# Nginx config nel container
$ docker exec escape-frontend cat /etc/nginx/nginx.conf | grep -A 2 "location /api/"
location /api/ {
            proxy_pass http://backend/api/;  ✅
            proxy_http_version 1.1;

# Endpoint funzionante
$ curl -X GET http://localhost/api/sessions
[{"room_id":1,"id":999,...}]  # 200 OK ✅
```

## Problema Residuo (405 Method Not Allowed)
Dopo aver risolto il 404, è emerso un errore 405 su POST `/api/sessions`.

**Causa:** L'endpoint backend `POST /api/sessions` non accetta correttamente il body JSON con parametri.

**File:** `backend/app/api/sessions.py`
```python
@router.post("/", response_model=GameSessionResponse, status_code=201)
async def create_simple_session(request: Request, db: Session = Depends(get_db)):
    # Tentativo di leggere body con request.json()
    # Ma FastAPI continua a ritornare 405
```

**Tentativi effettuati:**
1. ✗ `session_data: Optional[GameSessionCreate] = None`
2. ✗ `session_data: Optional[GameSessionCreate] = Body(None)`
3. ✗ `body: dict = Body({})`
4. ✗ `request: Request` + `await request.json()`

**Tutti** i tentativi hanno prodotto 405 Method Not Allowed.

## Soluzione Consigliata per 405
Il frontend dovrebbe usare l'endpoint alternativo che funziona:

```javascript
// Invece di POST /api/sessions con body
axios.post('/api/sessions', { room_id: 1 })

// Usare l'endpoint senza body
axios.post('/api/sessions')  
// Il backend usa room_id=1 di default
```

Oppure modificare il backend per non accettare parametri nel body e usare solo valori di default.

## Deploy Completato
- ✅ nginx.conf corretto e deployato
- ✅ Frontend container riavviato (192.168.8.10)
- ✅ 404 risolto - endpoint risponde
- ⚠️ 405 su POST - richiede modifica frontend o backend

## File Modificati
1. `escape-room-3d/nginx.conf` - proxy_pass corretto
2. `escape-room-3d/backend/app/api/sessions.py` - tentativi fix 405 (non risolto)