# 🧲 MAG1 Soggiorno - Procedura Test Finale

## 📋 Status Attuale

**✅ COMPLETATO:**
1. Polling ogni 2 secondi implementato (`useLivingRoomPuzzle.js`)
2. Handler transizione `locked → completed` implementato (`LivingRoomScene.jsx`)
3. Nginx.conf modificato: JS/CSS senza cache, solo immagini/fonts cached
4. File trasferito su Raspberry Pi
5. Docker build in corso...

**⏳ IN CORSO:**
- `docker compose build --no-cache frontend` (npm install ✅, vite build in corso)

---

## 🚀 Procedura Deploy e Test

### Step 1️⃣: Verifica Build Completato
```bash
# Controlla se il processo è ancora attivo
sshpass -p "escape" ssh pi@192.168.8.10 "ps aux | grep 'docker compose build' | grep -v grep"

# Se nessun output → build completato ✅
```

### Step 2️⃣: Restart Container
```bash
# Restart con nuova configurazione
sshpass -p "escape" ssh pi@192.168.8.10 "cd escape-room-3d && docker compose up -d"

# Verifica stato
sshpass -p "escape" ssh pi@192.168.8.10 "cd escape-room-3d && docker compose ps"
```

### Step 3️⃣: Verifica Nginx Config nel Container
```bash
# Controlla che la nuova config sia attiva
sshpass -p "escape" ssh pi@192.168.8.10 "docker exec escape-frontend cat /etc/nginx/nginx.conf" | grep -A 3 "JS/CSS"

# Output atteso:
# JS/CSS files - NO CACHE per development/testing
# location ~* \.(js|css)$ {
#     expires -1;
#     add_header Cache-Control "no-store, no-cache, must-revalidate...
```

### Step 4️⃣: Clear Browser Cache 🔥
**FONDAMENTALE!** Il browser ha ancora il vecchio JS in cache.

**Opzione A - Hard Refresh:**
```
Ctrl + Shift + R (Windows/Linux)
Cmd + Shift + R (Mac)
```

**Opzione B - DevTools (CONSIGLIATO):**
1. Apri DevTools (F12)
2. Click destro sul bottone Refresh
3. Seleziona "Empty Cache and Hard Reload"

**Opzione C - Manuale:**
1. DevTools → Application/Storage → Clear storage
2. Seleziona "Cached images and files"
3. Click "Clear site data"

### Step 5️⃣: Test MAG1 🧲

#### 5.1 Preparazione Test
```bash
# Verifica sessione attiva
curl http://192.168.8.10/api/sessions/active

# Output atteso (esempio):
# {"session_id": 123, ...}
```

#### 5.2 Apri Browser con DevTools
1. Vai a `http://192.168.8.10`
2. Apri DevTools Console (F12)
3. Entra nel Soggiorno
4. Verifica polling attivo:
```
[useLivingRoomPuzzle] 🔄 Polling attivo ogni 2 secondi per session: 123
[useLivingRoomPuzzle] 📡 Polling stato puzzle...
```

#### 5.3 Trigger ESP32 MAG1
```bash
# Avvicina MAGNETE su GPIO 33 (P33)
# Oppure simula con curl:
curl -X POST http://192.168.8.10/api/sessions/123/livingroom-puzzles/tv/complete
```

#### 5.4 Log Attesi in Console 📝
Entro **2 secondi** dovresti vedere:

```javascript
[useLivingRoomPuzzle] 📡 Polling stato puzzle...
[useLivingRoomPuzzle] ✅ Stato ricevuto: { tvStatus: "completed", coinsCollected: 3, magCanCollected: true }

[LivingRoomScene] 🔍 MAG1 Debug - TV Status Check: {
  prevStatus: "locked",
  currentStatus: "completed",
  animState: "closed",
  willTrigger: true
}

[LivingRoomScene] 🧲 MAG1 TRIGGER DETECTED! TV completata! Avvio animazione automatica...
[LivingRoomScene] 🎬 Animazione divano avviata
[LivingRoomScene] 📺 TV accesa
```

#### 5.5 Comportamento Visivo Atteso 👀
- ✅ Divano si apre automaticamente (identico a tasto M)
- ✅ TV si accende
- ✅ Messaggio completamento puzzle appare
- ✅ Animazione fluida senza interruzioni

---

## 🐛 Troubleshooting

### ❌ Problema: Animazione non parte
**Causa possibile:** Browser ha ancora vecchio JS in cache

**Soluzione:**
1. Verifica Cache-Control in DevTools → Network
   - Seleziona un file `.js`
   - Guarda Response Headers
   - Deve dire: `Cache-Control: no-store, no-cache...`
2. Se dice ancora `immutable`, clear cache e riprova

### ❌ Problema: Polling non attivo
**Causa possibile:** sessionId non disponibile

**Soluzione:**
```javascript
// In DevTools Console:
console.log(window.sessionStorage.getItem('sessionId'))
// Deve restituire un numero, non null
```

### ❌ Problema: tvStatus non cambia
**Causa possibile:** Backend non riceve la richiesta

**Soluzione:**
```bash
# Verifica endpoint backend
curl -X POST http://192.168.8.10/api/sessions/123/livingroom-puzzles/tv/complete

# Verifica logs backend
sshpass -p "escape" ssh pi@192.168.8.10 "docker logs escape-backend --tail 50"
```

### ❌ Problema: Handler non triggera
**Causa possibile:** Stato già completed da prima

**Soluzione:**
```bash
# Reset puzzle via admin
curl -X POST http://192.168.8.10/api/admin/reset

# Poi riprova test
```

---

## 📊 Differenza Prima vs Dopo

### ❌ PRIMA (con cache aggressiva):
```nginx
location ~* \.(js|css|...)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```
**Problema:** Browser NON ricarica mai il nuovo JS, anche con F5 o Ctrl+R

### ✅ DOPO (senza cache):
```nginx
location ~* \.(js|css)$ {
    expires -1;
    add_header Cache-Control "no-store, no-cache, must-revalidate";
}
```
**Risultato:** Browser ricarica JS ad ogni refresh, MAG1 funziona correttamente

---

## 🎯 Flow Completo MAG1

```
┌─────────────────────────────────────────────────────────────┐
│ 1. ESP32 P33 rileva MAGNETE                                 │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. POST /api/sessions/{id}/livingroom-puzzles/tv/complete  │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. Backend: tvStatus: "locked" → "completed"               │
│    + WebSocket: puzzle_state_update event                   │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. Frontend: Polling (ogni 2 sec) rileva tvStatus change   │
│    useLivingRoomPuzzle.js → livingRoomPuzzle.tvStatus       │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. Handler useEffect rileva transizione locked→completed    │
│    LivingRoomScene.jsx (linea ~305)                         │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│ 6. TRIGGER ANIMAZIONE (identico a tasto M):                │
│    - setLivingRoomAnimState('opening')                      │
│    - setIsLivingRoomAnimPlaying(true)                       │
│    - setTvAccesa(true)                                       │
│    - setMessaggioCompletamento(true)                         │
└─────────────────────────────────────────────────────────────┘
```

---

## ✅ Checklist Finale

- [ ] Build completato
- [ ] Container restartato con `docker compose up -d`
- [ ] Nginx config verificata nel container (no-cache per JS/CSS)
- [ ] Browser cache svuotata (Ctrl+Shift+R o DevTools)
- [ ] Console aperta con DevTools
- [ ] Polling attivo visibile in console
- [ ] Magnete avvicinato a P33 (o simulato con curl)
- [ ] Animazione divano partita automaticamente
- [ ] TV accesa
- [ ] Nessun errore in console

---

## 📝 Note Importanti

1. **Polling ogni 2 secondi** è un fallback al WebSocket che può avere latenza
2. Il **WebSocket funziona** ma può essere lento (~5-10 secondi), polling garantisce risposta entro 2 sec
3. L'**handler monitora prevTvStatus** per rilevare solo transizioni, non stati statici
4. Il **sistema è identico al tasto M**: MAG1 ora fa ESATTAMENTE quello che fa premere M
5. **Cache disabilitata solo per JS/CSS**: immagini, fonts, modelli 3D mantengono cache per performance

---

## 🎉 Cosa Aspettarsi al Successo

Quando tutto funziona correttamente:
- ⏱️ **Latenza massima:** 2 secondi tra magnete e animazione
- 🔄 **No reload manuale:** animazione parte automaticamente
- 📺 **TV sincronizzata:** si accende insieme al divano
- ✅ **Puzzle completato:** messaggio e stato salvato

**Esattamente come premere il tasto M, ma triggerato da MAG1!** 🎯