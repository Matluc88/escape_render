# 🔴 Guida Spegnimento Raspberry Pi - Escape Room

## 📋 Script Disponibili

### 1. **shutdown-raspberry.sh** (Consigliato)
Script completo con conferma e feedback dettagliato.

**Caratteristiche:**
- ✅ Richiede conferma prima dello spegnimento
- ✅ Verifica se sei su Raspberry Pi
- ✅ Stop automatico dei container Docker
- ✅ Sincronizzazione filesystem
- ✅ Output colorato e informativo
- ✅ Sicuro e controllato

**Uso:**
```bash
cd /home/escape/escape-room-3d
chmod +x shutdown-raspberry.sh
./shutdown-raspberry.sh
```

---

### 2. **shutdown-raspberry-quick.sh**
Script veloce senza conferma (per emergenze).

**Caratteristiche:**
- ⚡ Spegnimento immediato (3 secondi)
- 🚫 Nessuna conferma richiesta
- ✅ Stop Docker e sync filesystem

**Uso:**
```bash
cd /home/escape/escape-room-3d
chmod +x shutdown-raspberry-quick.sh
./shutdown-raspberry-quick.sh
```

---

## 🚀 Installazione su Raspberry Pi

### Copia gli script sul Raspberry Pi:

```bash
# Da Mac/PC, copia gli script sul Raspberry
scp shutdown-raspberry.sh escape@192.168.8.10:/home/escape/escape-room-3d/
scp shutdown-raspberry-quick.sh escape@192.168.8.10:/home/escape/escape-room-3d/

# Oppure connettiti via SSH e crea manualmente
ssh escape@192.168.8.10
cd /home/escape/escape-room-3d
nano shutdown-raspberry.sh
# Incolla il contenuto e salva (Ctrl+O, Ctrl+X)
```

### Rendi gli script eseguibili:

```bash
chmod +x shutdown-raspberry.sh
chmod +x shutdown-raspberry-quick.sh
```

---

## 📝 Uso Dettagliato

### Script con Conferma (shutdown-raspberry.sh)

1. **Esegui lo script:**
   ```bash
   ./shutdown-raspberry.sh
   ```

2. **Output esempio:**
   ```
   ==============================================
     🔴 SHUTDOWN RASPBERRY PI - ESCAPE ROOM
   ==============================================
   
   📋 Questo script spegnerà il Raspberry Pi in modo sicuro.
   
   Prima dello spegnimento verranno eseguiti:
     1. ⏸️  Stop di tutti i container Docker
     2. 💾 Sincronizzazione filesystem
     3. 🔴 Shutdown del sistema
   
   🔴 Sei sicuro di voler spegnere il Raspberry Pi? (s/n):
   ```

3. **Conferma con 's' o 'S'**

4. **Attendere lo spegnimento completo** (tutti i LED spenti)

5. **Scollega l'alimentazione**

---

### Script Quick (shutdown-raspberry-quick.sh)

1. **Esegui lo script:**
   ```bash
   ./shutdown-raspberry-quick.sh
   ```

2. **Spegnimento automatico dopo 3 secondi**

3. **Attendere LED spenti e scollegare alimentazione**

---

## 🛡️ Spegnimento Manuale Senza Script

Se gli script non funzionano, usa i comandi manuali:

### Metodo 1: Shutdown standard
```bash
sudo shutdown -h now
```

### Metodo 2: Poweroff
```bash
sudo poweroff
```

### Metodo 3: Halt
```bash
sudo halt
```

### Metodo 4: Con timer (es. 1 minuto)
```bash
sudo shutdown -h +1
```

### Annullare uno shutdown in corso
```bash
sudo shutdown -c
```

---

## ⚠️ IMPORTANTE

### ❌ NON FARE MAI:
- ❌ Scollegare l'alimentazione mentre il sistema è acceso
- ❌ Premere il pulsante reset durante operazioni
- ❌ Spegnere durante aggiornamenti

### ✅ FARE SEMPRE:
- ✅ Usare uno script o comando di shutdown
- ✅ Attendere che tutti i LED si spengano
- ✅ Solo dopo scollegare l'alimentazione

---

## 🔄 Riavvio invece di Spegnimento

Se vuoi **riavviare** invece di spegnere:

```bash
# Riavvio immediato
sudo reboot

# Riavvio con timer (1 minuto)
sudo shutdown -r +1

# Riavvio con messaggio
sudo shutdown -r now "Riavvio per manutenzione"
```

---

## 📊 Verifica Stato Sistema Prima dello Spegnimento

### Check container Docker:
```bash
docker ps
```

### Check processi attivi:
```bash
top
# oppure
htop
```

### Check connessioni attive:
```bash
who
# oppure
w
```

### Check spazio disco:
```bash
df -h
```

---

## 🚨 Troubleshooting

### Problema: "Permission denied"
**Soluzione:**
```bash
chmod +x shutdown-raspberry.sh
```

### Problema: "sudo: command not found"
**Soluzione:** Sei già root, usa direttamente:
```bash
shutdown -h now
```

### Problema: Script non risponde
**Soluzione:** Usa Ctrl+C per interrompere e usa comando manuale:
```bash
sudo shutdown -h now
```

### Problema: Sistema non si spegne
**Soluzione:**
1. Attendi 2-3 minuti
2. Se ancora acceso, usa:
   ```bash
   sudo poweroff -f
   ```
3. Come ultima risorsa (sconsigliato):
   ```bash
   sudo systemctl poweroff --force --force
   ```

---

## 📦 Backup Prima dello Spegnimento (Opzionale)

Se vuoi fare un backup rapido prima dello spegnimento:

```bash
# Backup database
cd /home/escape/escape-room-3d
docker exec escape-room-backend-1 node -e "
const db = require('./src/database');
db.serialize(() => {
  db.all('SELECT * FROM sessions', (err, rows) => {
    console.log(JSON.stringify(rows));
  });
});
" > backup-sessions-$(date +%Y%m%d-%H%M%S).json
```

---

## 🎯 Quick Reference

| Comando | Descrizione |
|---------|-------------|
| `./shutdown-raspberry.sh` | Spegnimento sicuro con conferma |
| `./shutdown-raspberry-quick.sh` | Spegnimento veloce (3 sec) |
| `sudo shutdown -h now` | Spegnimento immediato manuale |
| `sudo reboot` | Riavvio immediato |
| `sudo shutdown -c` | Annulla shutdown in corso |

---

## ✨ Note Finali

- 🔴 Sempre usare shutdown sicuro
- 💾 Sync automatico incluso negli script
- 🐳 Docker stop automatico incluso
- ⚡ LED spenti = sicuro scollegare
- 🔌 Attendere sempre 10 secondi dopo LED spenti prima di scollegare

**Spegnimento completato? Puoi scollegare l'alimentazione in sicurezza! 🎉**