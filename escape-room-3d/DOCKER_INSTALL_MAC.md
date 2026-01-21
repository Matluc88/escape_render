# 🐳 Installazione Docker su Mac

## Metodo 1: Docker Desktop (Consigliato)

### 1. Scarica Docker Desktop

Vai su: **https://www.docker.com/products/docker-desktop/**

Oppure usa questo link diretto:
- **Mac con Apple Silicon (M1/M2/M3)**: https://desktop.docker.com/mac/main/arm64/Docker.dmg
- **Mac con Intel**: https://desktop.docker.com/mac/main/amd64/Docker.dmg

### 2. Installa

1. Apri il file `.dmg` scaricato
2. Trascina Docker nell'icona Applications
3. Apri Docker da Applications
4. Accetta i termini di servizio
5. Configura le impostazioni (opzionale)
6. Attendi che Docker si avvii (icona della balena nella barra menu)

### 3. Verifica l'Installazione

Apri il terminale e esegui:

```bash
docker --version
docker compose version
```

Dovresti vedere qualcosa tipo:
```
Docker version 24.0.x
Docker Compose version v2.x.x
```

---

## Metodo 2: Homebrew (Alternativo)

Se hai Homebrew installato:

```bash
# Installa Docker Desktop
brew install --cask docker

# Apri Docker Desktop
open /Applications/Docker.app
```

Attendi che Docker si avvii, poi verifica:

```bash
docker --version
```

---

## ⚙️ Configurazione Consigliata per Mac

### Risorse Docker Desktop

1. Apri Docker Desktop
2. Vai su **Settings** (ingranaggio in alto a destra)
3. Vai su **Resources**
4. Configura:
   - **CPUs**: 4-6 (dipende dal tuo Mac)
   - **Memory**: 4-6 GB
   - **Disk**: 60 GB

### Abilita Features

In Settings:
- ✅ **Use Docker Compose V2**
- ✅ **Enable VirtioFS** (per performance migliori su Apple Silicon)

---

## 🚀 Dopo l'Installazione

Una volta installato Docker, torna alla cartella del progetto e:

```bash
cd /Users/matteo/Desktop/ESCAPE/escape-room-3d

# Build delle immagini
docker compose build

# Avvia i servizi
docker compose up -d

# Verifica che tutto funzioni
docker compose ps
```

Oppure usa il Makefile:

```bash
make build
make up
make logs
```

L'applicazione sarà disponibile su: **http://localhost**

---

## ❓ Problemi Comuni

### Docker non parte

- Verifica che Docker Desktop sia in esecuzione (icona balena nella barra menu)
- Riavvia Docker Desktop
- Verifica i logs in Docker Desktop → Troubleshoot

### "Cannot connect to Docker daemon"

```bash
# Verifica che Docker sia in esecuzione
docker info

# Se non funziona, riavvia Docker Desktop
```

### Build Lento

La prima build può richiedere 10-20 minuti. È normale!

```bash
# Vedi il progresso
docker compose build --progress=plain
```

---

## 📚 Prossimi Passi

Una volta installato Docker:

1. ✅ Verifica: `docker --version`
2. ✅ Build: `docker compose build`
3. ✅ Avvia: `docker compose up -d`
4. ✅ Apri: http://localhost

---

**Nota**: Docker Desktop include già Docker Compose V2, quindi non serve installare nulla di extra!
