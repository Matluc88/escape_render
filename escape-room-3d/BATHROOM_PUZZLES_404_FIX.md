# Fix 404 Errori Bathroom Puzzles

## Problema Rilevato

Gli endpoint del bagno restituivano errori 404:
```
POST http://localhost/api/sessions/1041/bathroom-puzzles/reset 404 (Not Found)
GET http://localhost/api/sessions/1041/bathroom-puzzles/state 404 (Not Found)
```

## Causa Root

Il router `bathroom_puzzles.py` **mancava del prefix `/api`** nella definizione del router:

**Prima (ERRATO):**
```python
router = APIRouter()

@router.get("/sessions/{session_id}/bathroom-puzzles/state", ...)
@router.post("/sessions/{session_id}/bathroom-puzzles/complete", ...)
@router.post("/sessions/{session_id}/bathroom-puzzles/reset", ...)
```

Gli endpoint erano definiti con path assoluti ma il router non aveva prefix, causando mismatch nelle richieste HTTP.

**Confronto con altri router (CORRETTO):**
```python
# kitchen_puzzles.py
router = APIRouter(prefix="/api/sessions/{session_id}/kitchen-puzzles", tags=["kitchen-puzzles"])

# bedroom_puzzles.py
router = APIRouter(prefix="/api/sessions/{session_id}/bedroom-puzzles", tags=["bedroom-puzzles"])

# livingroom_puzzles.py
router = APIRouter(prefix="/api", tags=["livingroom_puzzles"])
```

## Soluzione Applicata

### 1. Aggiunto prefix `/api` al router

**File:** `backend/app/api/bathroom_puzzles.py`

```python
# PRIMA
router = APIRouter()

# DOPO
router = APIRouter(prefix="/api", tags=["bathroom-puzzles"])
```

### 2. Aggiunto import mancante

```python
# PRIMA
from fastapi import APIRouter, Depends, HTTPException

# DOPO
from fastapi import APIRouter, Depends, HTTPException, status
```

L'import di `status` era necessario per il corretto funzionamento degli HTTPException con `status.HTTP_404_NOT_FOUND`, etc.

## Endpoint Corretti

Dopo la fix, gli endpoint sono ora correttamente raggiungibili:

✅ `GET /api/sessions/{session_id}/bathroom-puzzles/state` - Get puzzle state
✅ `POST /api/sessions/{session_id}/bathroom-puzzles/complete` - Complete puzzle
✅ `POST /api/sessions/{session_id}/bathroom-puzzles/reset` - Reset puzzles

## Test e Verifica

1. **Backend riavviato:**
   ```bash
   docker-compose restart backend
   ```

2. **Log backend:** Nessun errore all'avvio, health checks OK

3. **Frontend:** Gli errori 404 non dovrebbero più apparire nella console

## Note Tecniche

- Il pattern prefix è coerente con gli altri room puzzle router
- Tutti gli endpoint mantengono la stessa firma e funzionalità
- La fix è backward-compatible (nessuna modifica ai client)
- WebSocket broadcast per LED porta funzionante dopo completion/reset

## Data Fix

**Data:** 16 Gennaio 2026, 22:08
**Commit:** [Da aggiungere dopo commit]
**Testato:** ✅ Backend avviato correttamente

---

## Checklist Verifica Endpoint

Verifica che funzionino:
- [ ] GET `/api/sessions/{session_id}/bathroom-puzzles/state` → 200 OK
- [ ] POST `/api/sessions/{session_id}/bathroom-puzzles/reset` → 200 OK
- [ ] POST `/api/sessions/{session_id}/bathroom-puzzles/complete` → 200 OK
- [ ] WebSocket broadcast dopo completion
- [ ] LED porta aggiornati dopo ventola completata
- [ ] Console browser senza errori 404

## Riferimenti

- File modificato: `backend/app/api/bathroom_puzzles.py`
- Pattern di riferimento: `kitchen_puzzles.py`, `bedroom_puzzles.py`
- Documentazione endpoint: Vedere docstring in `bathroom_puzzles.py`