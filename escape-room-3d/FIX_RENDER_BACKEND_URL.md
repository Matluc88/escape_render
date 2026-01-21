# 🚨 FIX URGENTE: CORS Error su Render

## ❌ Problema

```
Access to XMLHttpRequest at 'https://escape-house-backend.onrender.com/sessions/999/...'
from origin 'https://escape-room-3d.onrender.com' has been blocked by CORS policy
```

## 🔍 Causa

Il frontend chiama:
```
❌ https://escape-house-backend.onrender.com/sessions/999/...
```

Dovrebbe chiamare:
```
✅ https://escape-house-backend.onrender.com/api/sessions/999/...
```

**Manca `/api/` nell'URL!**

## ✅ Soluzione

### 1. Vai su Render Dashboard Frontend

1. Apri: https://dashboard.render.com
2. Seleziona il servizio **escape-room-3d** (frontend)
3. Vai su **Environment**

### 2. Aggiungi/Modifica Variabili

Cerca e modifica ENTRAMBE le variabili:

```
VITE_BACKEND_URL=https://escape-house-backend.onrender.com
VITE_WS_URL=wss://escape-house-backend.onrender.com
```

**IMPORTANTE:** 
- **NON** aggiungere `/api/` (il backend lo aggiunge automaticamente)
- WebSocket usa `wss://` (secure WebSocket over HTTPS)

### 3. Redeploy Frontend

Dopo aver salvato la variabile d'ambiente:
- Render farà automaticamente il redeploy
- Oppure forza il redeploy manualmente: **Manual Deploy → Clear build cache & deploy**

### 4. Verifica

Dopo il deploy (5-10 minuti):
1. Apri: https://escape-room-3d.onrender.com/play/26/cucina?name=Test
2. Apri Console Browser (F12)
3. Verifica che gli URL chiamati contengano `/api/`:
   ```
   ✅ https://escape-house-backend.onrender.com/api/sessions/26/...
   ```

---

## 🎯 Checklist

- [ ] Vai su Render Dashboard → Frontend Service
- [ ] Modifica env: `VITE_BACKEND_URL=https://escape-house-backend.onrender.com/api`
- [ ] Salva (Render farà redeploy automatico)
- [ ] Aspetta 5-10 minuti
- [ ] Apri clear-spawn-cache-render.html e cancella cache
- [ ] Testa: https://escape-room-3d.onrender.com/play/26/cucina?name=Test
- [ ] Verifica Console: URL devono avere `/api/`

---

## 📚 Note Tecniche

### Perché `/api/`?

Il backend FastAPI è configurato con prefix `/api`:
```python
# backend/app/main.py
app.include_router(sessions_router, prefix="/api")
app.include_router(kitchen_puzzles_router)  # già ha /api/sessions nel router
```

### Dove si configura?

- **Locale:** File `.env` → `VITE_BACKEND_URL=http://localhost:8001`
- **Render:** Dashboard Render → Environment Variables

### Alternative

Se NON vuoi modificare l'env su Render, puoi:
1. Modificare il backend per accettare chiamate senza `/api/`
2. Aggiungere un redirect nel backend da `/` a `/api/`

Ma la soluzione PIÙ SEMPLICE è aggiungere `/api/` all'URL del backend su Render.

---

**Data:** 07 Gennaio 2026  
**Status:** ⚠️ DA FIXARE SU RENDER
