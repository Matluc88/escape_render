# 🚀 GUIDA DEPLOY COMPLETO RASPBERRY PI

## 📋 Panoramica

Lo script `deploy-raspberry-full-update.sh` automatizza completamente il processo di deploy di tutte le modifiche locali sul Raspberry Pi.

## ✨ Cosa Fa lo Script

### 1. **Pulizia File Temporanei**
   - Rimuove `*.pyc`, `__pycache__`, `.DS_Store`
   - Pulisce file di log

### 2. **Build Frontend**
   - Esegue `npm install`
   - Esegue `npm run build`
   - Verifica che la directory `dist` sia creata correttamente

### 3. **Creazione Archivio**
   - Comprime tutto il progetto in un `.tar.gz`
   - Esclude: `node_modules`, `.git`, file temporanei
   - Timestamp nel nome file per tracciabilità

### 4. **Test Connessione**
   - Verifica che il Raspberry Pi sia raggiungibile
   - Test SSH prima del trasferimento

### 5. **Trasferimento**
   - Upload automatico dell'archivio sul Raspberry
   - Usa `sshpass` per autenticazione automatica

### 6. **Backup Automatico**
   - Crea backup della versione precedente
   - Mantiene solo gli ultimi 3 backup
   - Estrae la nuova versione

### 7. **Rebuild Docker**
   - Stop di tutti i container
   - Rebuild **senza cache** di frontend e backend
   - Garantisce che tutte le modifiche siano applicate

### 8. **Avvio e Test**
   - Avvia tutti i servizi Docker
   - Attende 20 secondi per l'avvio completo
   - Test automatici degli endpoint
   - Mostra status dei container

## 🚀 Utilizzo

### Comando Rapido

```bash
cd /Users/matteo/Desktop/ESCAPE
./deploy-raspberry-full-update.sh
```

### Processo Interattivo

Lo script chiederà conferma prima di iniziare:

```
Continuare con il deploy? (y/N)
```

Premi `y` per procedere.

## 📊 Output dello Script

Lo script fornisce output colorato e ben formattato:

- 🔵 **BLU** - Headers delle sezioni
- 🔶 **CYAN** - Step in esecuzione
- ✅ **VERDE** - Operazioni completate con successo
- ⚠️ **GIALLO** - Warning e note importanti
- ❌ **ROSSO** - Errori

### Esempio Output

```
╔════════════════════════════════════════════════╗
║  🚀 DEPLOY COMPLETO SU RASPBERRY PI            ║
╚════════════════════════════════════════════════╝

Target:     pi@192.168.8.10
Progetto:   /Users/matteo/Desktop/ESCAPE/escape-room-3d
Archivio:   escape-room-full-update-20260117-095230.tar.gz

▶ Verifica prerequisiti...
✅ Prerequisiti OK

▶ Build frontend (npm run build)...
✅ Frontend buildato (15M)

▶ Compressione progetto...
✅ Archivio creato: 45M

▶ Upload archivio (45M)...
✅ Archivio trasferito

...
```

## ⚙️ Requisiti

### Software Locale (Mac)

1. **sshpass** (per autenticazione SSH automatica)
   ```bash
   brew install sshpass
   ```

2. **npm** (per build frontend)
   ```bash
   # Già presente se hai Node.js installato
   node --version
   npm --version
   ```

3. **tar** e **curl** (già presenti su macOS)

### Raspberry Pi

1. **Docker e Docker Compose** già installati
2. **SSH abilitato**
3. **Connessione di rete** (IP: 192.168.8.10)

## 🔧 Configurazione

Se necessario, modifica queste variabili all'inizio dello script:

```bash
RASPBERRY_IP="192.168.8.10"        # IP del Raspberry
RASPBERRY_USER="pi"                # Username SSH
RASPBERRY_PASS="escape"            # Password SSH
PROJECT_DIR="/Users/matteo/Desktop/ESCAPE/escape-room-3d"  # Path progetto
```

## 📝 Cosa Viene Deployato

### Frontend
- ✅ Codice React/Vite compilato (`npm run build`)
- ✅ Assets statici (immagini, modelli 3D)
- ✅ Configurazione Nginx

### Backend
- ✅ Codice Python FastAPI
- ✅ Routes e endpoints
- ✅ Migrations Alembic
- ✅ Configurazione MQTT

### Configurazioni
- ✅ `docker-compose.yml`
- ✅ `.env.production`
- ✅ `nginx.conf`
- ✅ File di configurazione Mosquitto

## 🎯 Vantaggi dello Script

### vs Deploy Manuale
- ⏱️ **Risparmio tempo**: ~15 minuti → ~5 minuti
- 🔒 **Sicurezza**: Backup automatico prima di ogni deploy
- ✅ **Affidabilità**: Nessun passaggio dimenticato
- 🧹 **Pulizia**: Rimozione automatica file temporanei

### vs Script Separati
- 🎯 **Unico comando**: Non serve ricordare sequenze complesse
- 🔄 **Consistenza**: Sempre lo stesso workflow testato
- 📊 **Feedback**: Progress chiaro e test automatici

## 🛠️ Troubleshooting

### Errore: "sshpass non installato"

```bash
brew install sshpass
```

### Errore: "Impossibile connettersi a 192.168.8.10"

Verifica:
1. Raspberry Pi acceso
2. Connesso alla stessa rete
3. IP corretto (controlla con `ping 192.168.8.10`)

### Errore: "Build frontend fallito"

Verifica:
```bash
cd /Users/matteo/Desktop/ESCAPE/escape-room-3d
npm install
npm run build
```

Se fallisce manualmente, risolvi gli errori npm prima del deploy.

### Container non si avviano

SSH sul Raspberry e controlla i logs:

```bash
ssh pi@192.168.8.10
cd escape-room-3d
docker compose logs -f
```

### Cache del browser

Dopo il deploy, fai un **hard refresh** nel browser:
- **Chrome/Edge**: `Ctrl+Shift+R` (Win) o `Cmd+Shift+R` (Mac)
- **Firefox**: `Ctrl+F5` (Win) o `Cmd+Shift+R` (Mac)

Oppure:
1. Apri DevTools (F12)
2. Click destro su icona Refresh
3. Seleziona "Svuota cache e ricaricamento forzato"

## 📂 File Esclusi dall'Archivio

Lo script **NON trasferisce**:
- `node_modules/` (verrà reinstallato)
- `.git/` (non serve in produzione)
- `__pycache__/` (cache Python)
- `*.pyc` (bytecode Python)
- `.DS_Store` (metadati macOS)
- `backups/` (backup locali)
- `*.log` (file di log)
- `.env.local` (env locale, non prod)

## 🔄 Workflow Completo

### Sviluppo Locale

1. Fai modifiche al codice
2. Test locale: `npm run dev` / `docker compose up`
3. Verifica che tutto funzioni

### Deploy su Raspberry

```bash
# Unico comando!
./deploy-raspberry-full-update.sh
```

### Verifica Post-Deploy

1. Apri browser: http://192.168.8.10
2. Test funzionalità modificate
3. Controlla console per errori

## 📊 Timeline Tipica

| Step | Tempo | Descrizione |
|------|-------|-------------|
| Pulizia | ~5s | Rimozione file temporanei |
| Build Frontend | ~30-60s | npm install + build |
| Compressione | ~20-30s | Creazione tar.gz |
| Trasferimento | ~30-60s | Upload su Raspberry (dipende da rete) |
| Estrazione | ~10-15s | Untar sul Raspberry |
| Rebuild Docker | ~3-5min | Build container senza cache |
| Avvio | ~20-30s | Startup servizi |
| **TOTALE** | **~5-8min** | Deploy completo |

## ✅ Checklist Pre-Deploy

Prima di eseguire lo script, verifica:

- [ ] Tutte le modifiche salvate e testate localmente
- [ ] Raspberry Pi acceso e raggiungibile
- [ ] Nessun deploy in corso (altri utenti)
- [ ] Backup importante fatto (se modifiche critiche)
- [ ] `sshpass` installato sul Mac

## 🎯 Post-Deploy

Dopo un deploy con successo:

1. **Test Immediato**
   - Frontend caricato correttamente?
   - API rispondono?
   - WebSocket funzionano?

2. **Test Funzionalità**
   - Le modifiche sono visibili?
   - Nessuna regressione?

3. **Monitoraggio**
   - Controlla logs per 5-10 minuti
   - Verifica nessun errore inaspettato

## 🆘 Comandi Utili Post-Deploy

```bash
# Logs in tempo reale
ssh pi@192.168.8.10 'cd escape-room-3d && docker compose logs -f'

# Status containers
ssh pi@192.168.8.10 'cd escape-room-3d && docker compose ps'

# Restart singolo servizio
ssh pi@192.168.8.10 'cd escape-room-3d && docker compose restart frontend'

# Restart completo
ssh pi@192.168.8.10 'cd escape-room-3d && docker compose restart'

# Stop tutto
ssh pi@192.168.8.10 'cd escape-room-3d && docker compose down'

# Ripristina backup precedente (se necessario)
ssh pi@192.168.8.10
cd /home/pi
ls -lt | grep backup  # trova ultimo backup
mv escape-room-3d escape-room-3d.broken
mv escape-room-3d.backup-XXXXXXXX escape-room-3d
cd escape-room-3d
docker compose up -d
```

## 💾 Gestione Backup

Lo script mantiene automaticamente **gli ultimi 3 backup** sul Raspberry:

```bash
# Sul Raspberry Pi, visualizza backup disponibili
ls -lh /home/pi/ | grep backup

# Output esempio:
# escape-room-3d.backup-20260117-095230
# escape-room-3d.backup-20260116-143522
# escape-room-3d.backup-20260115-091045
```

I backup più vecchi vengono eliminati automaticamente per risparmiare spazio.

## 🔐 Sicurezza

**ATTENZIONE**: Lo script contiene la password SSH in chiaro!

Per ambienti di produzione reali, considera:

1. **Chiave SSH invece di password**
   ```bash
   ssh-copy-id pi@192.168.8.10
   # Poi rimuovi RASPBERRY_PASS e sshpass
   ```

2. **Variabili d'ambiente**
   ```bash
   export RASPBERRY_PASS="escape"
   # Nello script: usa $RASPBERRY_PASS
   ```

3. **File di configurazione separato**
   ```bash
   # config.env (aggiungi a .gitignore!)
   RASPBERRY_PASS=escape
   ```

## 📈 Prossimi Miglioramenti

Possibili enhancement futuri:

- [ ] Rollback automatico se deploy fallisce
- [ ] Test automatici post-deploy più estesi
- [ ] Notifiche (email/Slack) a deploy completato
- [ ] Deploy selettivo (solo frontend o solo backend)
- [ ] Dry-run mode (simula senza eseguire)
- [ ] Log persistenti dei deploy

---

**Creato**: 17/01/2026  
**Versione**: 1.0  
**Autore**: Sistema di Deploy Automatico Escape Room