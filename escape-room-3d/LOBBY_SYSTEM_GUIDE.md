# 🎮 Sistema Lobby e Gioco - Guida Completa

## 📋 Panoramica

Il sistema è stato completamente implementato con le seguenti funzionalità:

### ✅ Completato

1. **Database**
   - Tabella `players` per gestire i giocatori
   - Tabella `puzzles` per gestire gli enigmi (13 totali)
   - Campo `status` in `game_sessions` (waiting, countdown, playing, completed)

2. **Backend API**
   - `/players/*` - Gestione giocatori
   - `/puzzles/*` - Gestione enigmi
   - WebSocket eventi: registerPlayer, joinLobby, startCountdown, puzzleSolved, etc.

3. **Frontend Admin**
   - Dashboard: crea sessione → redirect a Lobby
   - Lobby: visualizza giocatori in tempo reale, pulsante "VIA!" per avviare

4. **Frontend Student**
   - Landing: inserimento nome → Waiting Room
   - Waiting Room: lista giocatori, countdown 5 secondi, auto-redirect a gioco

## 🚀 Avvio del Sistema

### 1. Avviare il Backend

```bash
cd escape-room-3d/backend

# Applicare migration database
alembic upgrade head

# Avviare il server
python -m uvicorn app.main:app --reload --port 3000
```

### 2. Avviare il Frontend

```bash
cd escape-room-3d

# Installare dipendenze (se necessario)
npm install

# Avviare dev server
npm run dev
```

## 🎯 Flusso Completo di Gioco

### Fase 1: Creazione Sessione
1. Admin va su `/admin`
2. Clicca "Crea Nuova Sessione"
3. Viene reindirizzato a `/admin/session/{id}/lobby`

### Fase 2: Connessione Giocatori
1. Admin mostra i QR codes (link nella lobby)
2. Studenti scansionano QR → `/s/{sessionId}/{room}`
3. Studenti inseriscono nickname
4. **WebSocket** registra il giocatore
5. Admin vede i nickname apparire nella lobby in tempo reale
6. Studenti vedono lista giocatori aggiornata

### Fase 3: Avvio Gioco
1. Admin clicca "VIA!" quando tutti sono pronti
2. Backend inizializza 13 enigmi nel database
3. **WebSocket** invia evento `gameStarting` a tutti
4. Countdown 5 secondi (visibile a tutti)
5. **WebSocket** invia evento `navigateToGame`
6. Tutti vengono reindirizzati a `/play/{sessionId}/esterno`

### Fase 4: Gioco (DA IMPLEMENTARE)
1. **Esterno**: Tutti insieme risolvono 1 enigma
2. Quando risolto → distribuzione nelle 4 stanze
3. **4 Stanze**: Ogni stanza ha 3 enigmi (12 totali)
4. Quando tutti 13 enigmi risolti → Vittoria!

## 📡 Eventi WebSocket

### Client → Server
- `registerPlayer` - Studente si registra nella lobby
- `joinLobby` - Admin entra nella lobby
- `startCountdown` - Admin avvia il countdown
- `puzzleSolved` - Giocatore risolve enigma
- `requestPlayersList` - Richiedi lista giocatori

### Server → Client
- `updatePlayersList` - Lista giocatori aggiornata
- `playerConnected` - Nuovo giocatore connesso
- `gameStarting` - Countdown avviato
- `navigateToGame` - Redirect alla scena
- `puzzleResolved` - Enigma risolto da qualcuno
- `puzzleUnlocked` - Prossimo enigma sbloccato
- `roomDistribution` - Distribuzione stanze
- `gameComplete` - Tutti enigmi completati

## 🔧 API Endpoints

### Players
```
GET    /players/session/{id}              - Lista giocatori
GET    /players/session/{id}/nicknames    - Solo nickname
GET    /players/session/{id}/room/{room}  - Giocatori per stanza
POST   /players/session/{id}/distribute   - Distribuisci nelle stanze
GET    /players/session/{id}/distribution - Distribuzione corrente
```

### Puzzles
```
POST   /puzzles/session/{id}/initialize                      - Inizializza 13 enigmi
GET    /puzzles/session/{id}                                 - Lista tutti enigmi
GET    /puzzles/session/{id}/room/{room}                     - Enigmi per stanza
POST   /puzzles/session/{id}/room/{room}/puzzle/{n}/solve    - Risolvi enigma
GET    /puzzles/session/{id}/room/{room}/progress            - Progresso stanza
GET    /puzzles/session/{id}/progress                        - Progresso totale
GET    /puzzles/session/{id}/victory                         - Check vittoria
GET    /puzzles/session/{id}/room/{room}/next                - Prossimo enigma
```

## 🛠️ Prossimi Passi

### 1. Componenti UI (PROSSIMO)
- [ ] `PlayersList.jsx` - Lista nickname visibile in gioco
- [ ] `PuzzleProgress.jsx` - Barra progresso enigmi
- [ ] `Countdown.jsx` - Componente countdown riutilizzabile

### 2. Sistema Enigmi
- [ ] Integrare chiamate API quando enigma risolto
- [ ] Mostrare quali enigmi sono locked/unlocked
- [ ] Notifiche real-time quando qualcuno risolve

### 3. Distribuzione Stanze
- [ ] Dopo enigma Esterno, chiamare `/players/session/{id}/distribute`
- [ ] Redirect giocatori alle rispettive stanze
- [ ] Mostrare assegnazioni

### 4. Pulizia Scene
- [ ] Rimuovere console.log eccessivi
- [ ] Rimuovere messaggi hardcoded
- [ ] Mantenere dev tools (K, L keys, AnimationEditor, etc.)

### 5. Integrazione Completa
- [ ] Collegare enigmi reali alle API
- [ ] Testare flusso completo end-to-end
- [ ] Victory screen con statistiche

## 🐛 Testing

### Test Manuale
1. Apri 2+ browser in incognito
2. Un browser = Admin (`/admin`)
3. Altri browser = Studenti (`/s/{sessionId}/esterno`)
4. Testa connessione, countdown, redirect

### Test con più giocatori
- 1-4 giocatori: uno per stanza
- 5+ giocatori: distribuiti random

## 📝 Note Importanti

- **Session ID**: Può essere numerico o stringa
- **WebSocket**: Usa socket.io su porta 3000
- **Enigmi**: 1 esterno + 12 nelle altre stanze = 13 totali
- **Countdown**: Fisso a 5 secondi
- **Stanze disponibili**: esterno, cucina, soggiorno, bagno, camera

## 🎨 Customizzazione

### Modificare durata countdown
In `backend/app/websocket/handler.py`:
```python
await sio.emit('gameStarting', {
    'countdown': 10,  # Cambia qui
    'message': 'Il gioco sta per iniziare!'
}, room=f"session_{session_id}")

await asyncio.sleep(10)  # E qui
```

### Aggiungere enigmi
In `backend/app/services/puzzle_service.py`, funzione `initialize_puzzles_for_session`

### Modificare stanze distribuzione
In `backend/app/services/room_distribution_service.py`:
```python
self.available_rooms = ["cucina", "soggiorno", "bagno", "camera"]
```

## 🔍 Debugging

### WebSocket non connette
- Verifica `VITE_WS_URL` in `.env`
- Controlla console browser per errori
- Backend deve essere su porta 3000

### Giocatori non appaiono
- Verifica evento `registerPlayer` nei log
- Controlla connessione WebSocket
- SessionID deve essere consistente

### Countdown non funziona
- Verifica evento `gameStarting` nei log
- Controlla setTimeout/setInterval client
- SessionID deve corrispondere

---

**Autore**: Implementato il 23/12/2025
**Versione**: 1.0.0
