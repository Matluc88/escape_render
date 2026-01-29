# 🔧 GUIDA: Fix CORS e HTTP 404 su Render.com

**Data:** 28/01/2026  
**Problema:** CORS error + HTTP 500 invece di 404 su endpoint puzzle quando session_id non esiste

---

## 🎯 OBIETTIVO

1. ✅ Configurare CORS per permettere richieste da frontend Render.com
2. ✅ Verificare deployment backend con fix session validation
3. ✅ Testare con session_id valido per confermare funzionamento

---

## 📝 STEP 1: Configurare CORS_ORIGINS su Render.com

### 1.1 Accedi al Backend Service

1. Vai su: https://dashboard.render.com
2. Seleziona il servizio **escape-house-backend**

### 1.2 Aggiungi Environment Variable

1. Vai su **Environment** (menu laterale)
2. Clicca **Add Environment Variable**
3. Aggiungi:
   ```
   Key:   CORS_ORIGINS
   Value: https://escape-room-3d.onrender.com,http://localhost:5173,http://localhost:3000
   ```
4. Clicca **Save Changes**

### 1.3 Deploy Automatico

Render.com farà **auto-deploy** del backend con la nuova configurazione.

**Attendi 3-5 minuti** finché non vedi:
```
==> Your service is live 🎉
```

---

## 🔍 STEP 2: Verificare Deployment Backend

### 2.1 Verifica Health Endpoint

Apri nel browser:
```
https://escape-house-backend.onrender.com/health
```

Dovresti vedere:
```json
{
  "status": "healthy",
  "mqtt": "connected",
  "websocket_clients": 0
}
```

### 2.2 Verifica Ultimo Commit

Verifica che il backend abbia gli ultimi commit con le fix:
- Commit **6fcdd9c**: Fix kitchen + game_completion session validation
- Commit **0127ac9**: Fix livingroom + bathroom + bedroom session validation
- Commit **0f4eb8b**: Global puzzles endpoints
- Commit **5fe7924**: Frontend bathroom `/api` prefix fix

Questi commit sono già pushati su GitHub, quindi Render.com dovrebbe averli.

---

## ✅ STEP 3: Creare Session Valida per Test

### 3.1 Vai all'Admin Panel

Apri:
```
https://escape-room-3d.onrender.com/admin-panel/
```

### 3.2 Crea Nuova Sessione

1. Nella sezione **"Gestione Sessioni"**
2. Clicca **"Crea Nuova Sessione"**
3. Inserisci:
   - **Game Master Name**: "Test CORS Fix"
   - **Notes**: "Test session validation"
4. Clicca **"Crea Sessione"**

### 3.3 Annota Session ID

Prendi nota del **Session ID** creato (es: `session_id=57`)

---

## 🧪 STEP 4: Test Endpoint con Session Valida

### 4.1 Test GET /state (Session Esistente)

Apri DevTools Console e lancia:
```javascript
fetch('https://escape-house-backend.onrender.com/api/sessions/57/bathroom-puzzles/state')
  .then(r => r.json())
  .then(d => console.log('✅ State:', d))
  .catch(e => console.error('❌ Error:', e));
```

**Risultato Atteso:** HTTP 200 con stato iniziale puzzles

### 4.2 Test GET /state (Session NON Esistente)

```javascript
fetch('https://escape-house-backend.onrender.com/api/sessions/99999/bathroom-puzzles/state')
  .then(r => {
    console.log('Status:', r.status);
    return r.json();
  })
  .then(d => console.log('Response:', d))
  .catch(e => console.error('Error:', e));
```

**Risultato Atteso:** 
- ✅ HTTP **404** (non più 500!)
- Messaggio: `"Session 99999 not found. Cannot create bathroom puzzle state."`

### 4.3 Test POST /complete (Session NON Esistente)

```javascript
fetch('https://escape-house-backend.onrender.com/api/sessions/99999/bathroom-puzzles/complete', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({puzzle_name: 'specchio'})
})
  .then(r => {
    console.log('Status:', r.status);
    return r.json();
  })
  .then(d => console.log('Response:', d))
  .catch(e => console.error('Error:', e));
```

**Risultato Atteso:** HTTP **404**

### 4.4 Test CORS (Nessun Errore Console)

Dopo aver configurato `CORS_ORIGINS`, **NON dovresti più vedere**:
```
Access to XMLHttpRequest at '...' has been blocked by CORS policy
```

---

## 📊 VERIFICA FINALE

### ✅ Checklist Successo

- [ ] `CORS_ORIGINS` configurato su Render.com
- [ ] Backend deployed correttamente (health check OK)
- [ ] Creata session valida da admin panel
- [ ] Test con session ESISTENTE → HTTP 200
- [ ] Test con session NON ESISTENTE → HTTP 404 (non 500!)
- [ ] NO errori CORS in console

---

## 🐛 TROUBLESHOOTING

### Problema: Ancora CORS Error

**Causa:** Backend non ha ricaricato la configurazione

**Soluzione:**
1. Vai su Render.com Dashboard
2. Seleziona **escape-house-backend**
3. Clicca **Manual Deploy** → **Deploy latest commit**
4. Attendi deploy (3-5 minuti)

### Problema: Ancora HTTP 500 invece di 404

**Causa:** Backend non ha gli ultimi commit

**Verifica commit GitHub:**
```bash
cd /Users/matteo/Desktop/ESCAPE_render
git log --oneline -5
```

Dovresti vedere:
```
5fe7924 Fix: Added /api prefix to bathroom puzzle endpoints
0f4eb8b feat: Add global puzzle management endpoints
0127ac9 fix: Add session validation to livingroom, bathroom, bedroom services
6fcdd9c fix: Add session validation for kitchen and game completion services
```

**Se i commit ci sono**, forza re-deploy su Render.com:
1. Dashboard → escape-house-backend
2. **Manual Deploy** → **Clear build cache & deploy**

---

## 📌 RIEPILOGO FIX IMPLEMENTATE

### Backend Services (Session Validation)
- ✅ `kitchen_puzzle_service.py` - Commit 6fcdd9c
- ✅ `game_completion_service.py` - Commit 6fcdd9c
- ✅ `livingroom_puzzle_service.py` - Commit 0127ac9
- ✅ `bathroom_puzzle_service.py` - Commit 0127ac9
- ✅ `bedroom_puzzle_service.py` - Commit 0127ac9

### Backend API Endpoints (ValueError → 404)
- ✅ Tutti gli endpoint `/state`, `/reset`, `/complete`
- ✅ Pattern: `except ValueError → HTTPException(404)`

### Global Admin Endpoints
- ✅ `POST /api/puzzles/session/{id}/initialize`
- ✅ `POST /api/puzzles/session/{id}/reset`

### Frontend Fix
- ✅ `useBathroomPuzzle.js` - Aggiunti prefissi `/api`

---

## 🎯 PROSSIMI PASSI

1. **Configura CORS_ORIGINS** su Render.com
2. **Attendi deploy** backend (3-5 minuti)
3. **Crea session valida** da admin panel
4. **Testa con session valida** per verificare funzionamento
5. **Testa con session invalida** per verificare HTTP 404

---

**Fine Guida** 🚀