# 🔄 Guida Deploy Sistema Reset Enigmi

## 📋 Preparazione

Questa guida spiega come aggiornare il sistema Docker sul Raspberry Pi con la nuova funzionalità di reset enigmi.

## 🚀 Deploy Automatico (Raccomandato)

### Sul Raspberry Pi

```bash
# 1. Vai nella directory del progetto
cd ~/escape-room-3d

# 2. Esegui lo script di deploy
./deploy-puzzle-reset.sh
```

Lo script eseguirà automaticamente:
- ✅ Stop dei container
- ✅ Rebuild backend (con nuovo endpoint API)
- ✅ Rebuild frontend (con nuovo pulsante)
- ✅ Avvio container aggiornati
- ✅ Verifica stato servizi

## 🛠️ Deploy Manuale

Se preferisci eseguire i comandi manualmente:

```bash
# 1. Stop container
docker-compose down

# 2. Rebuild backend
docker-compose build --no-cache backend

# 3. Rebuild frontend
docker-compose build --no-cache frontend

# 4. Avvia tutto
docker-compose up -d

# 5. Verifica stato
docker-compose ps

# 6. Controlla logs
docker-compose logs -f
```

## 📦 Trasferimento File su Raspberry Pi

### Opzione 1: SSH + rsync (Raccomandato)

```bash
# Dal Mac
cd /Users/matteo/Desktop/ESCAPE

# Trasferisci solo i file modificati
rsync -avz --progress \
  --include='escape-room-3d/backend/app/api/puzzles.py' \
  --include='escape-room-3d/backend/app/services/puzzle_service.py' \
  --include='escape-room-3d/src/pages/admin/Lobby.jsx' \
  --include='escape-room-3d/deploy-puzzle-reset.sh' \
  --include='escape-room-3d/PUZZLE_RESET_SYSTEM.md' \
  --include='escape-room-3d/DEPLOY_PUZZLE_RESET.md' \
  --exclude='*' \
  escape-room-3d/ pi@raspberry.local:~/escape-room-3d/
```

### Opzione 2: SCP

```bash
# File Backend
scp escape-room-3d/backend/app/api/puzzles.py \
    pi@raspberry.local:~/escape-room-3d/backend/app/api/

scp escape-room-3d/backend/app/services/puzzle_service.py \
    pi@raspberry.local:~/escape-room-3d/backend/app/services/

# File Frontend
scp escape-room-3d/src/pages/admin/Lobby.jsx \
    pi@raspberry.local:~/escape-room-3d/src/pages/admin/

# Script e Doc
scp escape-room-3d/deploy-puzzle-reset.sh \
    pi@raspberry.local:~/escape-room-3d/

scp escape-room-3d/PUZZLE_RESET_SYSTEM.md \
    pi@raspberry.local:~/escape-room-3d/

scp escape-room-3d/DEPLOY_PUZZLE_RESET.md \
    pi@raspberry.local:~/escape-room-3d/
```

### Opzione 3: Git (se usi repository)

```bash
# Sul Mac
cd /Users/matteo/Desktop/ESCAPE/escape-room-3d
git add .
git commit -m "feat: aggiungi sistema reset enigmi nella lobby"
git push

# Sul Raspberry Pi
cd ~/escape-room-3d
git pull
```

## ✅ Verifica Deploy

### 1. Verifica Container

```bash
docker-compose ps
```

Dovresti vedere tutti i container con status `Up` e `healthy`.

### 2. Testa API Backend

```bash
# Test endpoint reset (dovrebbe restituire 404 se non ci sono enigmi)
curl -X POST http://localhost/api/puzzles/session/1/reset

# Test endpoint progresso
curl http://localhost/api/puzzles/session/1/progress
```

### 3. Testa Frontend

1. Apri browser: `http://raspberry-ip/admin`
2. Crea nuova sessione
3. Vai alla lobby della sessione
4. Verifica presenza pulsante **"🔄 RESET ENIGMI"** (arancione)
5. Clicca sul pulsante e verifica dialog di conferma

## 🎯 Test Completo

### Scenario 1: Reset con Enigmi Risolti

```bash
# 1. Crea sessione e avvia gioco
# 2. Risolvi alcuni enigmi tramite API
curl -X POST http://localhost/api/puzzles/session/1/room/esterno/puzzle/1/solve \
  -H "Content-Type: application/json" \
  -d '{"solved_by": "TestUser"}'

# 3. Verifica progresso (dovrebbe essere 1/13)
curl http://localhost/api/puzzles/session/1/progress

# 4. Resetta enigmi
curl -X POST http://localhost/api/puzzles/session/1/reset

# 5. Verifica progresso (dovrebbe essere 0/13)
curl http://localhost/api/puzzles/session/1/progress
```

### Scenario 2: Reset dalla Lobby

1. Apri lobby: `http://raspberry-ip/admin/session/1/lobby`
2. Click "VIA!" per iniziare il gioco
3. Gioca e risolvi alcuni enigmi
4. Torna alla lobby: `http://raspberry-ip/admin/session/1/lobby`
5. Click "🔄 RESET ENIGMI"
6. Conferma l'azione
7. Verifica messaggio di successo
8. Controlla che enigmi siano resettati

## 🐛 Troubleshooting

### Container non si avvia

```bash
# Controlla logs
docker-compose logs backend
docker-compose logs frontend

# Riavvia singolo container
docker-compose restart backend
docker-compose restart frontend
```

### Pulsante non appare nella Lobby

```bash
# 1. Verifica che frontend sia aggiornato
docker-compose logs frontend | grep "RESET"

# 2. Clear cache browser (Ctrl+F5)

# 3. Rebuild forzato frontend
docker-compose build --no-cache frontend
docker-compose up -d frontend
```

### Endpoint API non funziona

```bash
# 1. Verifica che backend sia in esecuzione
docker-compose ps backend

# 2. Controlla logs backend
docker-compose logs backend | grep "reset"

# 3. Testa endpoint health
curl http://localhost/api/health

# 4. Riavvia backend
docker-compose restart backend
```

### Errore "Nessun enigma trovato"

Questo è normale se:
- Non hai mai avviato il gioco (click "VIA!")
- Gli enigmi non sono stati inizializzati

Soluzione:
1. Vai alla lobby
2. Click "VIA!" per inizializzare gli enigmi
3. Ora il reset funzionerà

## 📊 Monitoraggio

### Logs in tempo reale

```bash
# Tutti i container
docker-compose logs -f

# Solo backend
docker-compose logs -f backend

# Solo frontend
docker-compose logs -f frontend

# Con filtro
docker-compose logs -f | grep "reset"
```

### Stato risorse

```bash
# Uso CPU/RAM
docker stats

# Spazio disco
docker system df
```

## 🔄 Rollback

Se qualcosa non funziona, puoi fare rollback:

```bash
# 1. Stop container
docker-compose down

# 2. Torna alla versione precedente (se usi git)
git checkout HEAD~1

# 3. Rebuild
docker-compose build
docker-compose up -d
```

## 📝 Checklist Deploy

Prima del deploy:
- [ ] Backup database (opzionale ma consigliato)
- [ ] Verifica che Docker sia in esecuzione
- [ ] Verifica spazio disco disponibile (`df -h`)

Durante il deploy:
- [ ] Trasferisci file modificati
- [ ] Esegui script deploy o comandi manuali
- [ ] Attendi completamento rebuild
- [ ] Verifica stato container

Dopo il deploy:
- [ ] Testa API con curl
- [ ] Testa UI nel browser
- [ ] Verifica logs per errori
- [ ] Test completo con scenario reale

## 🎉 Deploy Completato!

Se tutti i test passano, il sistema è pronto per l'uso.

Per ulteriori informazioni, consulta:
- `PUZZLE_RESET_SYSTEM.md` - Documentazione completa funzionalità
- `LOBBY_SYSTEM_GUIDE.md` - Guida sistema lobby

---

**Data Creazione:** 17/01/2026  
**Versione:** 1.0.0  
**Ambiente:** Docker (Raspberry Pi)