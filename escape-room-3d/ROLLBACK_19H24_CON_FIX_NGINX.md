# ✅ ROLLBACK AL BACKUP 14 GEN ORE 19:24 + FIX NGINX

**Data operazione:** 15 Gennaio 2026, 01:15 - 01:25  
**Stato:** ⏳ BUILD IN CORSO (completamento stimato: 5-10 min)

## 🔄 PROBLEMA INIZIALE

Dopo il deployment, il sito mostrava errori 404:
```
api/api/sessions:1 Failed to load resource: the server responded with a status of 404
```

## 🔍 DIAGNOSI

1. **Primo tentativo:** Rollback al backup delle 22:48 (14 Gen)
   - ❌ STESSO PROBLEMA: anche questo backup aveva il bug nginx

2. **Root Cause identificato:**
   ```nginx
   # SBAGLIATO (nginx.conf originale):
   location /api/ {
       proxy_pass http://backend/;  # Rimuove /api dal path!
   }
   ```
   
   Questo causava:
   - Frontend chiama: `/api/sessions`
   - Nginx trasforma in: `/sessions` (rimuove `/api`)
   - Backend si aspetta: `/api/sessions`
   - Risultato: 404 NOT FOUND

3. **Soluzione:** Modificare nginx.conf:
   ```nginx
   # CORRETTO:
   location /api/ {
       proxy_pass http://backend/api/;  # Mantiene /api nel path!
   }
   ```

## 📦 AZIONI ESEGUITE

### 1. Rollback a backup più vecchio (19:24)
```bash
cd /home/pi/escape-room-3d
sudo docker compose down
cd /home/pi
sudo rm -rf escape-room-3d-BROKEN4
sudo mv escape-room-3d escape-room-3d-BROKEN4
sudo cp -r escape-room-3d.backup.20260114-192408 escape-room-3d
cd escape-room-3d
sudo docker compose up -d
```

**Versione ripristinata:**  `escape-room-3d.backup.20260114-192408`  
**Timestamp:** 14 Gennaio 2026, 19:24:08

### 2. Fix nginx.conf
```bash
cd /home/pi/escape-room-3d
sudo sed -i 's|proxy_pass http://backend/;|proxy_pass http://backend/api/;|' nginx.conf
```

### 3. Rebuild frontend con nginx corretto
```bash
sudo docker compose build --no-cache frontend
sudo docker compose up -d frontend
```

**Status:** ⏳ IN CORSO (iniziato ore 01:24)

## 📊 STATO CONTAINER

```
NAME              STATUS
escape-backend    Up, healthy
escape-db         Up, healthy
escape-frontend   Rebuilding...
escape-mqtt       Up
```

## ⏱️ TEMPI STIMATI

- **npm install:** ~2-3 minuti
- **vite build:** ~3-5 minuti  
- **docker copy & restart:** ~1 minuto

**Totale:** 5-10 minuti (Raspberry Pi ARM è lento)

## ✅ VERIFICA POST-DEPLOYMENT

Una volta completato il build, verificare:

1. **Container healthy:**
   ```bash
   ssh pi@192.168.8.10
   cd /home/pi/escape-room-3d
   sudo docker compose ps
   ```
   
   Tutti devono essere "Up (healthy)"

2. **Test sito:**
   - Aprire: http://192.168.8.10/
   - Dashboard Admin dovrebbe caricare
   - Clicking "Crea Nuova Sessione" NON dovrebbe più dare errore 404

3. **Test API:**
   ```bash
   curl http://192.168.8.10/api/health
   ```
   Deve rispondere: `{"status":"healthy"}`

## 📝 FILE CORRETTI

### `/home/pi/escape-room-3d/nginx.conf`
```nginx
# API Backend proxy (CORRETTO)
location /api/ {
    proxy_pass http://backend/api/;  # ← MANTIENE /api
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_connect_timeout 60s;
    proxy_send_timeout 60s;
    proxy_read_timeout 60s;
}
```

## 🗂️ BACKUP DISPONIBILI

Sul Raspberry Pi in `/home/pi/`:

- `escape-room-3d/` - **VERSIONE CORRENTE (19:24 + nginx fix)**
- `escape-room-3d-BROKEN` - primo tentativo rotto  
- `escape-room-3d-BROKEN2` - backup 13:52 (troppo vecchio)
- `escape-room-3d-BROKEN3` - backup 22:48 (con bug nginx)
- `escape-room-3d-BROKEN4` - backup 22:48 secondo tentativo
- `escape-room-3d.backup.20260114-224859` - backup 22:48
- `escape-room-3d.backup.20260114-192408` - backup 19:24 ✅

## 🎯 PROSSIMI PASSI

1. ⏳ **Attendere completamento build** (~5-10 min)
2. ✅ **Verificare container healthy**  
3. ✅ **Testare creazione sessione**
4. ✅ **Testare lobby e websocket**
5. 📝 **Aggiornare nginx.conf locale** per futuri deploy

## 🔧 LEZIONE APPRESA

**IMPORTANTE:** Il file `nginx.conf` è "baked" nell'immagine Docker del frontend.

Per applicare modifiche a nginx.conf:
1. ✏️ Modificare il file
2. 🔨 **Rebuild immagine:** `docker compose build --no-cache frontend`
3. 🚀 Riavviare: `docker compose up -d frontend`

Un semplice `docker compose restart` NON basta!

## 📞 CONTATTI

Per verificare lo stato del build:
```bash
ssh pi@192.168.8.10
sudo docker compose logs -f frontend
```

---
**Fine operazione prevista:** ~01:30 AM  
**Operatore:** Cline AI Assistant
