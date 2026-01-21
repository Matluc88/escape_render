# 🚨 ROLLBACK MANUALE RASPBERRY PI - GUIDA URGENTE

**Data:** 15/01/2026 01:00  
**Problema:** Deploy con build-and-transfer.sh ha rotto la pagina JoinGame (WebSocket non funziona)

---

## 🎯 OBIETTIVO

Ripristinare la versione precedente funzionante del sistema.

---

## 📋 ISTRUZIONI PASSO-PASSO

### 1️⃣ **Accedi al Raspberry Pi**

Collega tastiera e monitor al Raspberry, oppure SSH da un altro computer sulla rete locale:

```bash
ssh pi@192.168.8.10
```

---

### 2️⃣ **Ferma i container Docker**

```bash
cd /home/pi/escape-room-3d
sudo docker compose down
```

**Attendi** che tutti i container si fermino (circa 10 secondi).

---

### 3️⃣ **Sposta la versione broken**

```bash
cd /home/pi

# Rimuovi eventuale backup broken precedente
sudo rm -rf escape-room-3d-BROKEN

# Rinomina la versione attuale (broken) come backup
sudo mv escape-room-3d escape-room-3d-BROKEN
```

---

### 4️⃣ **Trova il backup precedente**

```bash
# Lista i backup disponibili
ls -la | grep escape-room-3d-backup
```

**Output atteso:**
```
drwxr-xr-x  escape-room-3d-backup-YYYYMMDD-HHMMSS
```

**Annota il nome** della directory del backup più recente.

---

### 5️⃣ **Ripristina il backup**

Sostituisci `NOME_BACKUP` con il nome trovato al passo precedente:

```bash
# Copia il backup come versione attiva
sudo cp -r escape-room-3d-backup-YYYYMMDD-HHMMSS escape-room-3d
```

---

### 6️⃣ **Avvia i container**

```bash
cd /home/pi/escape-room-3d
sudo docker compose up -d
```

**Attendi** 10-15 secondi per l'avvio completo.

---

### 7️⃣ **Verifica stato servizi**

```bash
sudo docker compose ps
```

**Output atteso:**
```
NAME                    STATUS
escape-room-3d-backend  Up X seconds (healthy)
escape-room-3d-frontend Up X seconds (healthy)
```

---

### 8️⃣ **Verifica funzionamento**

1. Apri il browser su un dispositivo sulla rete
2. Vai a: `http://192.168.8.10:5000`
3. Testa la pagina JoinGame:
   - Inserisci un PIN
   - Inserisci un nome
   - **Verifica che entri nella waiting room** ✅

---

## 🎉 ROLLBACK COMPLETATO!

Il sistema è tornato alla versione precedente funzionante.

---

## 📊 RIEPILOGO DIRECTORY

Dopo il rollback, la struttura dovrebbe essere:

```
/home/pi/
├── escape-room-3d/           ← Versione attiva (ripristinata)
├── escape-room-3d-BROKEN/    ← Versione broken (deploy fallito)
└── escape-room-3d-backup-*/  ← Backup originale (NON eliminare!)
```

---

## 🐛 SE IL PROBLEMA PERSISTE

### **Opzione A: Verifica logs**

```bash
cd /home/pi/escape-room-3d
sudo docker compose logs -f backend
```

Cerca errori nel log.

### **Opzione B: Riavvio completo**

```bash
sudo docker compose down
sudo docker compose up -d --force-recreate
```

### **Opzione C: Clear cache browser**

Sul dispositivo client:
- Chrome/Edge: `Ctrl+Shift+Del` → Cancella cache
- Safari iOS: Impostazioni → Safari → Cancella dati

---

## 📝 COSA È ANDATO STORTO?

Il deploy con `build-and-transfer.sh` ha buildato il frontend con **variabili d'ambiente sbagliate**.

**Problema specifico:** Il WebSocket URL è `/ws` invece di `''` (stringa vuota).

**Causa:** Durante il build sul Mac, il file `.env.production` non è stato caricato correttamente.

---

## 🔧 COME FIXARE PER IL PROSSIMO DEPLOY?

1. Verificare che `.env.production` contenga:
   ```
   VITE_WS_URL=
   VITE_BACKEND_URL=/api
   ```

2. Build con flag esplicito:
   ```bash
   NODE_ENV=production npm run build
   ```

3. Testare in locale prima di deployare

---

## 📞 SUPPORTO

Se hai problemi con il rollback, contattami con:
- Screenshot degli errori
- Output del comando `sudo docker compose ps`
- Log del backend (se disponibile)

---

**IMPORTANTE:** NON eliminare la directory `escape-room-3d-BROKEN` finché non hai verificato che il rollback funziona!
