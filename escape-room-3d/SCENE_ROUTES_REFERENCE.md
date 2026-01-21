# 🗺️ GUIDA COMPLETA ROUTE E LINK SCENE - Escape Room 3D

**Documento di Riferimento** - Tutti i percorsi disponibili per accedere alle scene dell'Escape Room

**Data Ultima Modifica:** 29/12/2025

---

## 📊 RIEPILOGO GENERALE

### Scene Disponibili
L'Escape Room comprende **5 scene giocabili**:

| N. | Nome Scena | ID Route | Descrizione |
|---|---|---|---|
| 1 | 🏡 Esterno | `esterno` | Area esterna della casa |
| 2 | 🍳 Cucina | `cucina` | Stanza cucina con puzzle |
| 3 | 🛋️ Soggiorno | `soggiorno` | Stanza soggiorno |
| 4 | 🚿 Bagno | `bagno` | Stanza bagno |
| 5 | 🛏️ Camera | `camera` | Stanza camera da letto |

### Formati URL Disponibili
Ogni scena può essere raggiunta tramite **4 formati URL diversi** a seconda del contesto:

| Formato | Pattern | Uso | Tools Disponibili |
|---|---|---|---|
| **Admin Dev** | `/play/test-session/{room}?name=Admin` | Sviluppo con tools admin | ✅ Tutti |
| **Quick Dev** | `/dev/{room}` | Accesso rapido sviluppo | ✅ Tutti |
| **Produzione** | `/play/{sessionId}/{room}` | Gioco normale con sessione reale | ⚠️ Player mode |
| **Student Landing** | `/s/{sessionId}/{room}` | Landing page studenti | ⚠️ Pre-game |

**Totale combinazioni possibili:** 5 scene × 4 formati = **20 link univoci**

---

## 🔗 LINK DIRETTI - FORMATO ADMIN DEV

**Prerequisito:** Server in esecuzione su `http://localhost:5173`

Questi link forniscono **accesso completo agli strumenti di sviluppo** (Animation Editor, Position Picker, Debug Panels, ecc.)

### 🏡 Esterno
```
http://localhost:5173/play/test-session/esterno?name=Admin
```

### 🍳 Cucina
```
http://localhost:5173/play/test-session/cucina?name=Admin
```

### 🛋️ Soggiorno
```
http://localhost:5173/play/test-session/soggiorno?name=Admin
```

### 🚿 Bagno
```
http://localhost:5173/play/test-session/bagno?name=Admin
```

### 🛏️ Camera
```
http://localhost:5173/play/test-session/camera?name=Admin
```

#### 🛠️ Strumenti Disponibili con `?name=Admin`
- **Tasto K**: Salva animazione corrente
- **Tasto L**: Carica ultima animazione salvata
- **Position Picker**: Cattura coordinate oggetti 3D
- **Animation Editor**: Editor visuale animazioni
- **MQTT Status Panel**: Monitor connessioni MQTT
- **WebSocket Info**: Debug connessioni real-time
- **LED Controls**: Test controllo LED puzzle
- **Debug Buttons**: Pulsanti sviluppo rapido

---

## ⚡ LINK DIRETTI - FORMATO QUICK DEV

**Route:** `/dev/{room}`

Accesso rapido senza specificare session ID. Utile per test veloci durante lo sviluppo.

### Link Diretti
```
http://localhost:5173/dev/esterno
http://localhost:5173/dev/cucina
http://localhost:5173/dev/soggiorno
http://localhost:5173/dev/bagno
http://localhost:5173/dev/camera
```

#### ⚠️ Note
- Session ID impostato automaticamente a `1`
- Mantiene tutti i tools di sviluppo
- Modalità consigliata per iterazioni rapide

---

## 🎮 FORMATO PRODUZIONE

**Route:** `/play/{sessionId}/{room}`

Utilizzato durante il gioco reale con sessioni create dalla Dashboard Admin.

### Esempio con Session ID Reale
```
http://localhost:5173/play/abc123xyz/cucina
http://localhost:5173/play/session-456/bagno
http://localhost:5173/play/game-789/camera
```

### Caratteristiche
- ✅ Session ID **deve esistere** nel database
- ✅ Player name richiesto (passato via query `?name=NomeGiocatore`)
- ✅ WebSocket sincronizzazione multi-player
- ✅ Stato puzzle persistito nel backend
- ❌ Tools admin **disabilitati** (a meno di `?name=Admin`)

### Come Creare una Sessione
1. Vai alla Dashboard: `http://localhost:5173/admin`
2. Crea nuova sessione
3. Ottieni il Session ID generato
4. Usa il formato: `/play/{sessionId}/{room}?name={playerName}`

---

## 🎓 FORMATO STUDENT LANDING

**Route:** `/s/{sessionId}/{room}`

Landing page per studenti prima di entrare nella scena. Mostra informazioni sulla stanza assegnata.

### Esempio
```
http://localhost:5173/s/abc123xyz/cucina
http://localhost:5173/s/session-456/soggiorno
```

### Caratteristiche
- 📋 Mostra informazioni sulla stanza assegnata
- 🎯 Presenta obiettivi del puzzle
- ▶️ Pulsante "Inizia" per entrare nella scena
- 🔄 Redirect automatico a `/play/{sessionId}/{room}`

---

## 🔧 PARAMETRI URL DISPONIBILI

### Query Parameters Supportati

| Parametro | Valori | Descrizione | Esempio |
|---|---|---|---|
| `name` | `Admin` / nome player | Modalità admin o nome giocatore | `?name=Admin` |
| `forceMobile` | `1` / `0` | Forza interfaccia mobile | `?name=Admin&forceMobile=1` |
| `debug` | `1` / `0` | Abilita debug extra (se implementato) | `?name=Admin&debug=1` |

### Esempi Combinati
```
# Admin con interfaccia mobile
http://localhost:5173/play/test-session/cucina?name=Admin&forceMobile=1

# Giocatore normale con nome
http://localhost:5173/play/abc123/cucina?name=Mario

# Dev rapido con mobile
http://localhost:5173/dev/camera?forceMobile=1
```

---

## 📱 TEST MOBILE DA DESKTOP

Per testare l'interfaccia mobile senza usare un dispositivo fisico:

```bash
# Aggiungi &forceMobile=1 alla fine dell'URL
http://localhost:5173/play/test-session/cucina?name=Admin&forceMobile=1
```

Oppure usa i Chrome DevTools:
1. F12 → Toggle Device Toolbar (Ctrl+Shift+M)
2. Seleziona un dispositivo mobile dall'elenco
3. Ricarica la pagina

---

## 🚀 WORKFLOW SVILUPPO CONSIGLIATO

### Setup Iniziale
```bash
cd escape-room-3d
npm run dev
```

### Sviluppo su Scena Specifica
1. **Apri il link admin dev** della scena su cui vuoi lavorare
2. **Modifica il codice** in VS Code (es. componenti, hooks, shader)
3. **Hot Reload automatico** - vedi le modifiche immediatamente
4. **Usa i tools admin** (K/L per animazioni, Position Picker, ecc.)
5. **Testa con forceMobile=1** per verificare responsive

### Esempio Workflow Cucina
```bash
# 1. Avvia server
npm run dev

# 2. Apri in browser
http://localhost:5173/play/test-session/cucina?name=Admin

# 3. Modifica file
# src/components/scenes/KitchenScene.jsx

# 4. Salva → Hot Reload automatico

# 5. Test mobile
http://localhost:5173/play/test-session/cucina?name=Admin&forceMobile=1
```

---

## 🗂️ STRUTTURA ROUTING NEL CODICE

Le route sono definite in `src/App.jsx`:

```jsx
// Route Admin/Dashboard
<Route path="/admin" element={<Dashboard />} />
<Route path="/admin/session/:sessionId/lobby" element={<Lobby />} />
<Route path="/admin/session/:sessionId/qrcodes" element={<QRCodesPage />} />
<Route path="/admin/spawn-editor" element={<SpawnEditor />} />

// Route Player
<Route path="/join" element={<JoinGame />} />
<Route path="/s/:sessionId/:room" element={<StudentLanding />} />
<Route path="/play/:sessionId/:room" element={<RoomScene />} />

// Route Victory
<Route path="/victory/:sessionId" element={<Victory />} />

// Route Dev Quick Access
<Route path="/dev/:room" element={<RoomScene />} />
<Route path="/dev" element={<Navigate to="/dev/cucina" replace />} />

// Route Debug
<Route path="/debug/collision" element={<DebugCollisionScene />} />

// Default Redirect
<Route path="/" element={<Navigate to="/admin" replace />} />
```

---

## 🎯 RIFERIMENTO RAPIDO SVILUPPO

### Link Più Usati (Copy-Paste Ready)

#### Dashboard Admin
```
http://localhost:5173/admin
```

#### Scene Dev (Admin Mode)
```
http://localhost:5173/play/test-session/esterno?name=Admin
http://localhost:5173/play/test-session/cucina?name=Admin
http://localhost:5173/play/test-session/soggiorno?name=Admin
http://localhost:5173/play/test-session/bagno?name=Admin
http://localhost:5173/play/test-session/camera?name=Admin
```

#### Scene Dev (Quick Access)
```
http://localhost:5173/dev/esterno
http://localhost:5173/dev/cucina
http://localhost:5173/dev/soggiorno
http://localhost:5173/dev/bagno
http://localhost:5173/dev/camera
```

#### Debug Special
```
http://localhost:5173/debug/collision
http://localhost:5173/admin/spawn-editor
```

---

## 📝 NOTE IMPORTANTI

### Session ID in Sviluppo
- Usa `test-session` come session ID fittizio per sviluppo
- Non serve creare sessioni nel database per testare
- Alcuni sistemi potrebbero richiedere sessione reale (es. sincronizzazione puzzle multi-room)

### Nome Giocatore
- `?name=Admin` → Abilita **tutti** gli strumenti di sviluppo
- `?name=AltroNome` → Modalità giocatore normale (senza debug UI)
- Senza parametro `name` → Potrebbe richiedere input nome

### Hot Reload Vite
- Modifiche a `.jsx` `.js` → Reload istantaneo
- Modifiche a `.css` → Inject CSS senza reload
- Modifiche a `vite.config.js` → Richiede restart server

### URL Produzione
In produzione, sostituisci `localhost:5173` con il dominio reale:
```
https://tuo-dominio.com/play/{sessionId}/{room}
```

---

## 🔍 TROUBLESHOOTING

### Link non funziona
- ✅ Verifica che il server sia avviato (`npm run dev`)
- ✅ Controlla che la porta 5173 sia libera
- ✅ Verifica il nome della scena (deve essere esatto: `cucina`, non `Cucina`)

### Tools Admin non visibili
- ✅ Assicurati di usare `?name=Admin` (case-sensitive)
- ✅ Controlla la console browser per errori
- ✅ Prova a ricaricare con Ctrl+Shift+R (hard reload)

### Session ID non trovato (in produzione)
- ✅ Verifica che la sessione esista nella dashboard
- ✅ Controlla che il backend sia online
- ✅ Usa `test-session` per bypass in sviluppo

---

## 📚 DOCUMENTI CORRELATI

- `LINK_SVILUPPO_SCENE.md` - Quick reference originale
- `SPAWN_COORDINATES_REFERENCE.md` - Coordinate spawn per ogni scena
- `LOBBY_SYSTEM_GUIDE.md` - Sistema lobby e creazione sessioni
- `ROOM_DISTRIBUTION_SYSTEM.md` - Sistema distribuzione giocatori nelle stanze
- `ANIMATION_EDITOR_GUIDE.md` - Guida uso Animation Editor (Tasto K/L)

---

## 📊 TABELLA RIEPILOGATIVA COMPLETA

| Scena | Admin Dev | Quick Dev | Produzione | Student |
|---|---|---|---|---|
| **Esterno** | `/play/test-session/esterno?name=Admin` | `/dev/esterno` | `/play/{sid}/esterno` | `/s/{sid}/esterno` |
| **Cucina** | `/play/test-session/cucina?name=Admin` | `/dev/cucina` | `/play/{sid}/cucina` | `/s/{sid}/cucina` |
| **Soggiorno** | `/play/test-session/soggiorno?name=Admin` | `/dev/soggiorno` | `/play/{sid}/soggiorno` | `/s/{sid}/soggiorno` |
| **Bagno** | `/play/test-session/bagno?name=Admin` | `/dev/bagno` | `/play/{sid}/bagno` | `/s/{sid}/bagno` |
| **Camera** | `/play/test-session/camera?name=Admin` | `/dev/camera` | `/play/{sid}/camera` | `/s/{sid}/camera` |

*{sid} = Session ID*

---

**🎮 Buon Sviluppo!**

_Ultimo aggiornamento: 29/12/2025_
