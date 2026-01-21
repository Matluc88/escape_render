# 🔧 Troubleshooting Sistema Indizi Cucina

Guida completa per risolvere gli errori comuni del sistema indizi cucina.

---

## ❌ Errori Rilevati e Soluzioni

### 1. **WebSocket Connection Failed** 🔌

**Errore:**
```
WebSocket connection to 'ws://localhost:8001/socket.io/?EIO=4&transport=websocket' failed
```

**Causa:** Backend non avviato

**Soluzione:**
```bash
# ⚠️ IMPORTANTE: Usa docker-compose.dev.yml per SVILUPPO
cd escape-room-3d/backend
docker-compose -f docker-compose.dev.yml up -d

# OPPURE backend in modalità sviluppo locale (senza Docker)
cd escape-room-3d/backend
source venv/bin/activate  # O .\venv\Scripts\activate su Windows
uvicorn app.main:app --reload --port 8001
```

**NOTA:** Il file `docker-compose.dev.yml` è specifico per **SVILUPPO** e include:
- Hot reload automatico del backend
- Database PostgreSQL di sviluppo
- Mosquitto MQTT broker
- Volumi persistenti per il database

**Verifica:**
- Backend deve essere su http://localhost:8001
- Controlla con: `curl http://localhost:8001/health`

---

### 2. **HTTP 500 Error su /kitchen-puzzles/reset** ⚠️

**Errore:**
```
:8001/api/sessions/999/kitchen-puzzles/reset:1  
Failed to load resource: the server responded with a status of 500
```

**Causa:** 
- Backend non connesso al database
- Sessione 999 non esiste nel database

**Soluzione:**
```bash
# 1. Verifica che il database sia avviato
docker ps | grep postgres

# 2. Crea la sessione 999 (sessione di test immortale)
cd escape-room-3d
docker exec -i escape-room-3d-postgres-1 psql -U escape_user -d escape_room < create-session-999.sql

# 3. OPPURE crea manualmente
docker exec -it escape-room-3d-postgres-1 psql -U escape_user -d escape_room

# Nel prompt psql:
INSERT INTO game_sessions (id, admin_pin, created_at, is_active) 
VALUES (999, '0000', NOW(), true)
ON CONFLICT (id) DO NOTHING;
\q
```

---

### 3. **objectName non è una stringa** 🐛

**Errore:**
```javascript
[KitchenScene] objectName non è una stringa: object
handleMobileSmartAntaClick @ KitchenScene.jsx:862
```

**Causa:** CasaModel.jsx passa l'oggetto Mesh invece del nome

**Soluzione** - Fix in `CasaModel.jsx`:

```jsx
// ❌ SBAGLIATO (current code)
if (onObjectClick) {
  onObjectClick(clickedObject)  // Passa l'intero oggetto
}

// ✅ CORRETTO (fix needed)
if (onObjectClick) {
  onObjectClick(clickedObject.name)  // Passa SOLO il nome come stringa
}
```

**File da modificare:** `src/components/3D/CasaModel.jsx`

**Cerca questo pattern:**
```jsx
const handleClick = (event) => {
  // ...
  if (onObjectClick) {
    onObjectClick(clickedObject)  // ← FIX: dovrebbe essere clickedObject.name
  }
}
```

**Cambia in:**
```jsx
const handleClick = (event) => {
  // ...
  if (onObjectClick) {
    onObjectClick(clickedObject.name)  // ✅ Passa solo il nome
  }
}
```

---

## 🚀 Avvio Completo Sistema

### Passo 1: Avvia Backend + Database

```bash
cd /Users/matteo/Desktop/ESCAPE/escape-room-3d
docker-compose up -d
```

**Verifica:**
```bash
docker ps  # Dovresti vedere postgres e backend in esecuzione
```

### Passo 2: Crea Sessione 999

```bash
docker exec -i escape-room-3d-postgres-1 psql -U escape_user -d escape_room < create-session-999.sql
```

### Passo 3: Avvia Frontend

```bash
cd /Users/matteo/Desktop/ESCAPE/escape-room-3d
npm run dev
```

### Passo 4: Testa Sistema

1. Apri browser: http://localhost:5173/play/999/cucina
2. Premi **R** per reset puzzle
3. Clicca sui fornelli → Dovresti vedere il messaggio "Posiziona la pentola"
4. Premi **5** → Pentola ai fornelli + messaggio successo
5. Clicca sul frigo → Dovresti vedere "Così sprechi energia"
6. Premi **4** → Frigo si chiude + messaggio successo
7. Premi **Z** → Serra si accende + messaggio finale

---

## 🧪 Test Rapido (Con Backend Avviato)

```bash
# Test API backend
curl http://localhost:8001/api/sessions/999/kitchen-puzzles/state

# Dovrebbe rispondere con JSON:
# {
#   "states": {
#     "fornelli": {"status": "active", ...},
#     "frigo": {"status": "locked", ...},
#     "serra": {"status": "locked", ...}
#   },
#   "led_states": {...}
# }
```

---

## 📋 Checklist Verifica Completa

- [ ] **Backend avviato** (http://localhost:8001)
- [ ] **Database connesso** (docker ps mostra postgres)
- [ ] **Sessione 999 esistente** (curl API funziona)
- [ ] **Frontend avviato** (http://localhost:5173)
- [ ] **WebSocket connesso** (nessun errore in console)
- [ ] **Click sui fornelli mostra messaggio** (fix objectName applicato)
- [ ] **Tasto R resetta puzzle** (LED rosso/off)
- [ ] **Tasto 5 completa fornelli** (LED verde + messaggio)
- [ ] **Tasto 4 chiude frigo** (LED verde + messaggio)
- [ ] **Tasto Z accende serra** (LED verde + messaggio finale)

---

## 🔍 Debug Avanzato

### Controlla Logs Backend

```bash
# Logs in tempo reale
docker logs -f escape-room-3d-backend-1

# Cerca errori specifici
docker logs escape-room-3d-backend-1 | grep ERROR
```

### Controlla Logs Frontend

Apri DevTools (F12) e controlla:
- **Console:** Errori JavaScript
- **Network:** Richieste HTTP fallite
- **WS:** Stato WebSocket

### Reset Completo Database

```bash
# Se tutto è rotto, reset completo
docker-compose down -v
docker-compose up -d
docker exec -i escape-room-3d-postgres-1 psql -U escape_user -d escape_room < create-session-999.sql
```

---

## 🆘 Errori Comuni e Fix Rapidi

| Errore | Fix Veloce |
|--------|-----------|
| WebSocket failed | `docker-compose up -d` |
| HTTP 500 | Crea sessione 999 con SQL |
| objectName non è stringa | Fix CasaModel.jsx (passa .name) |
| LED non cambiano | Verifica WebSocket connesso |
| Messaggi non appaiono | Verifica puzzleStates in console |
| Click non rileva oggetti | Fix CasaModel objectName |

---

## 💡 Pro Tips

1. **Usa tasto R** per reset rapido puzzle
2. **Usa tasto \\** per nascondere tutti i pannelli debug
3. **Controlla console** per vedere gli stati puzzle in tempo reale
4. **LED rosso** = attivo, **LED verde** = completato, **LED off** = bloccato

---

## 📞 Contatti

Se hai problemi persistenti:
1. Controlla tutti i file di log
2. Verifica che TUTTI i servizi siano avviati
3. Prova un reset completo con `docker-compose down -v`

**La causa più comune di errori è il backend non avviato!** ⚠️
