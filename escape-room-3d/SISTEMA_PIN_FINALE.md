# Sistema PIN - Guida Completa

## ⚠️ IMPORTANTE: Stato Attuale

Il backend Docker contiene codice VECCHIO senza gli endpoint PIN che abbiamo creato.
Per far funzionare il sistema ADESSO, usa questo workflow:

## 🎯 Workflow Funzionante (Con Codice Attuale)

### 1. Admin Crea Sessione

L'admin NON può creare sessioni tramite Dashboard perché richiede backend aggiornato.

**WORKAROUND:**
Crea sessione manualmente via psql:

```bash
docker exec escape-db psql -U escape_user -d escape_db -c "
INSERT INTO game_sessions (room_id, start_time, expected_players, connected_players, status, pin)
VALUES (1, NOW(), 10, 0, 'waiting', '1234')
RETURNING *;
"
```

Questo crea una sessione con:
- `id`: (generato automaticamente, es. 42)
- `pin`: '1234' (scegli tu, 4 cifre)
- `status`: 'waiting'

### 2. Admin Va in Lobby

```
http://localhost:5173/admin/lobby?sessionId=42
```

Sostituisci `42` con l'ID della sessione creata.

### 3. Studenti Entrano

```
http://localhost:5173/join?pin=1234
```

Il PIN viene validato lato frontend e convertito in sessionId.

### 4. Admin Avvia

Click "VIA!" → Countdown → Tutti nella scena

## 🔧 Per Attivare Il Sistema Completo

Devi ricostruire il Docker backend con il nuovo codice:

```bash
cd escape-room-3d

# Ferma tutto
docker-compose down

# Rimuovi immagine vecchia
docker rmi escape-room-3d-backend

# Rebuild con nuovo codice
docker-compose build backend

# Riavvia
docker-compose up -d
```

Dopo il rebuild, la Dashboard funzionerà e creerà sessioni con PIN automaticamente.

## 📋 File Modificati (Da Includere nel Rebuild)

- ✅ `backend/app/models/game_session.py` → Campo `pin` aggiunto
- ✅ `backend/app/models/player.py` → Modello Player
- ✅ `backend/app/models/puzzle.py` → Modello Puzzle
- ✅ `backend/app/services/session_service.py` → generate_unique_pin(), validate_pin()
- ✅ `backend/app/api/sessions.py` → Endpoint /by-pin, /validate-pin
- ✅ `src/pages/JoinGame.jsx` → Validazione PIN
- ✅ `src/pages/admin/Lobby.jsx` → Display PIN
- ✅ `src/pages/admin/QRCodesPage.jsx` → QR con PIN
- ✅ `docker-compose.yml` → Porta 3000 esposta, CORS configurato
- ✅ `.env.local` → Frontend punta a localhost:3000

## ✅ Dopo il Rebuild

Il flusso sarà automatico:

1. Admin → Dashboard → "Crea Sessione" → PIN auto-generato
2. Studenti → /join → Digita PIN → Validato da backend → Entra
3. Admin vede lista giocatori real-time
4. Admin → "VIA!" → Countdown → Gioco inizia

## 🚀 Verifica Backend Aggiornato

```bash
# Test endpoint
curl http://localhost:3000/sessions/by-pin/1234

# Se risponde con la sessione = BACKEND AGGIORNATO ✅
# Se risponde 404 = BACKEND VECCHIO, serve rebuild ❌
```
