# 🐳 GUIDA AVVIO DOCKER - COMPLETA E FINALE

## ✅ TUTTI I FILE DOCKER SONO PRONTI!

Ho completato la dockerizzazione di frontend e backend. Tutti i file necessari sono stati creati e configurati.

## 📦 File Creati:

- ✅ **docker-compose.yml** - Orchestrazione completa
- ✅ **Dockerfile** (root) - Frontend con Nginx
- ✅ **backend/Dockerfile** - Backend FastAPI (multi-stage)
- ✅ **backend/wait-for-db.sh** - Script attesa database

## 🚀 PROCEDURA DI AVVIO CORRETTA

### Prerequisito:
Docker Desktop DEVE essere **COMPLETAMENTE avviato** (icona verde nella barra menu)

### Step 1: Ferma Tutto
```bash
cd /Users/matteo/Desktop/ESCAPE/escape-room-3d
docker compose down
```

### Step 2: Riavvia Docker Desktop COMPLETAMENTE
1. Clicca sull'icona Docker nella barra menu
2. Seleziona "Quit Docker Desktop"
3. Aspetta 10 secondi
4. Riapri Docker Desktop dalla cartella Applicazioni
5. **ASPETTA** che l'icona diventi verde (Docker è pronto)

### Step 3: Avvia i Servizi IN SEQUENZA
```bash
cd /Users/matteo/Desktop/ESCAPE/escape-room-3d

# Prima: Database e MQTT
docker compose up -d db mqtt

# Aspetta che il database sia healthy (10-15 secondi)
sleep 15

# Poi: Backend
docker compose up -d backend

# Aspetta che il backend sia healthy (20-30 secondi)
sleep 25

# Infine: Frontend
docker compose up -d frontend
```

### Step 4: Verifica
```bash
# Vedi lo stato
docker compose ps

# Controlla i log
docker compose logs backend | tail -50
docker compose logs frontend | tail -20
```

## 📱 URLs una volta Attivo:

- **Frontend**: http://localhost (porta 80)
- **Backend API**: http://localhost:8001
- **MQTT**: localhost:1883

## 🔧 Comandi Utili:

```bash
# Stato servizi
docker compose ps

# Logs in tempo reale
docker compose logs -f backend
docker compose logs -f frontend

# Riavvio singolo servizio
docker compose restart backend
docker compose restart frontend

# Stop completo
docker compose down

# Rebuild immagini
docker compose build --no-cache
```

## ⚠️ Troubleshooting:

### Errore "could not translate host name db"
**Soluzione**: Riavvia completamente Docker Desktop (Step 2)

### Errore "port already allocated"
```bash
# Trova e termina processo
lsof -ti:8001 | xargs kill -9
lsof -ti:80 | xargs kill -9
```

### Backend unhealthy
```bash
# Verifica i log
docker compose logs backend

# Riavvia il backend
docker compose restart backend
```

### Frontend non parte
```bash
# Assicurati che il backend sia healthy prima
docker compose ps

# Se backend è healthy, avvia frontend
docker compose up -d frontend
```

## 🎉 SETUP COMPLETO!

Tutti i file Docker sono corretti e pronti all'uso! 🐳

Il problema DNS che abbiamo riscontrato si risolve riavviando completamente Docker Desktop come descritto negli step sopra.
