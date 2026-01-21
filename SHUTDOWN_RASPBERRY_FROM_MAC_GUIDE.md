# 🔴 Guida Spegnimento Raspberry Pi DA MAC

## 📋 Overview

Questi script ti permettono di spegnere il Raspberry Pi **direttamente dal tuo Mac** senza doversi connettere manualmente via SSH.

---

## 🚀 Installazione sshpass

Prima di usare gli script, devi installare `sshpass` sul tuo Mac:

### Metodo 1: Homebrew (Consigliato)
```bash
brew install hudochenkov/sshpass/sshpass
```

### Metodo 2: Homebrew alternativo
```bash
brew tap esolitos/ipa
brew install sshpass
```

### Verifica installazione:
```bash
sshpass -V
# Output: sshpass 1.x.x
```

---

## 📄 Script Disponibili

### 1. **shutdown-raspberry-from-mac.sh** (Consigliato)
Script completo con conferma e feedback dettagliato.

**Caratteristiche:**
- ✅ Connessione automatica al Raspberry Pi
- ✅ Password gestita automaticamente (escape)
- ✅ Richiede conferma prima dello spegnimento
- ✅ Test connessione prima di procedere
- ✅ Stop Docker containers
- ✅ Sincronizzazione filesystem
- ✅ Output colorato e informativo

**Uso:**
```bash
cd /Users/matteo/Desktop/ESCAPE
chmod +x shutdown-raspberry-from-mac.sh
./shutdown-raspberry-from-mac.sh
```

---

### 2. **shutdown-raspberry-from-mac-quick.sh**
Script veloce senza conferma (per emergenze).

**Caratteristiche:**
- ⚡ Spegnimento immediato
- 🚫 Nessuna conferma richiesta
- ✅ Stop Docker e sync automatici

**Uso:**
```bash
cd /Users/matteo/Desktop/ESCAPE
chmod +x shutdown-raspberry-from-mac-quick.sh
./shutdown-raspberry-from-mac-quick.sh
```

---

## 🎯 Uso Pratico

### Scenario 1: Spegnimento Standard

1. **Apri il Terminale sul Mac**

2. **Vai nella directory degli script:**
   ```bash
   cd /Users/matteo/Desktop/ESCAPE
   ```

3. **Esegui lo script:**
   ```bash
   ./shutdown-raspberry-from-mac.sh
   ```

4. **Output esempio:**
   ```
   ==============================================
     🔴 SHUTDOWN RASPBERRY PI DA MAC
   ==============================================
   
   📋 Spegnerò il Raspberry Pi all'indirizzo: 192.168.8.10
   
   🔴 Sei sicuro di voler spegnere il Raspberry Pi? (s/n): s
   
   🚀 Connessione al Raspberry Pi...
   
   ✅ Connesso al Raspberry Pi!
   
   ⏸️  Stopping Docker containers...
      ✅ Docker containers fermati
   
   💾 Sincronizzazione filesystem...
      ✅ Filesystem sincronizzato
   
   🔴 Invio comando di spegnimento...
   
   ✅ Comando di shutdown inviato con successo!
   
   📋 Il Raspberry Pi si sta spegnendo...
      Attendere che tutti i LED si spengano prima di scollegare l'alimentazione.
   
   🎉 Operazione completata!
   ```

5. **Attendi LED spenti e scollega alimentazione**

---

### Scenario 2: Spegnimento Quick

1. **Terminale sul Mac:**
   ```bash
   cd /Users/matteo/Desktop/ESCAPE
   ./shutdown-raspberry-from-mac-quick.sh
   ```

2. **Spegnimento immediato (nessuna conferma)**

---

## ⚙️ Configurazione

Gli script usano queste impostazioni di default:

```bash
RASPBERRY_IP="192.168.8.10"
RASPBERRY_USER="escape"
RASPBERRY_PASSWORD="escape"
```

### Modificare le impostazioni:

Se devi cambiare IP o password, modifica lo script:

```bash
nano shutdown-raspberry-from-mac.sh
```

Cerca le righe:
```bash
RASPBERRY_IP="192.168.8.10"
RASPBERRY_USER="escape"
RASPBERRY_PASSWORD="escape"
```

E cambia i valori necessari.

---

## 🚨 Troubleshooting

### Problema: "sshpass: command not found"

**Soluzione:**
```bash
brew install hudochenkov/sshpass/sshpass
```

### Problema: "Permission denied"

**Soluzione:** Rendi lo script eseguibile:
```bash
chmod +x shutdown-raspberry-from-mac.sh
```

### Problema: "Impossibile connettersi al Raspberry Pi"

**Cause possibili:**
1. Raspberry Pi spento
2. IP cambiato
3. Rete non connessa
4. Password errata

**Soluzioni:**
```bash
# Test connessione manuale
ping 192.168.8.10

# Test SSH manuale
ssh escape@192.168.8.10
# Password: escape
```

### Problema: "Host key verification failed"

**Soluzione:** Gli script usano `-o StrictHostKeyChecking=no`, ma se persiste:
```bash
ssh-keygen -R 192.168.8.10
```

### Problema: "sudo: a password is required"

**Soluzione:** Il comando shutdown richiede sudo. Gli script gestiscono automaticamente questo, ma se hai problemi, puoi configurare sudo senza password sul Raspberry:

Sul Raspberry Pi:
```bash
sudo visudo
```

Aggiungi:
```
escape ALL=(ALL) NOPASSWD: /sbin/shutdown
```

---

## 🔐 Sicurezza

### ⚠️ Nota sulla Password in Chiaro

Gli script contengono la password "escape" in chiaro. Questo è **OK per una rete locale privata** dell'escape room, ma considera:

**Opzioni più sicure:**

1. **SSH Key invece di password:**
   ```bash
   # Sul Mac, genera chiave se non ce l'hai
   ssh-keygen -t rsa
   
   # Copia la chiave sul Raspberry
   ssh-copy-id escape@192.168.8.10
   
   # Ora puoi connetterti senza password
   ssh escape@192.168.8.10
   ```

2. **Variabili d'ambiente:**
   ```bash
   # In ~/.zshrc o ~/.bashrc
   export RASPBERRY_PASSWORD="escape"
   
   # Nello script:
   RASPBERRY_PASSWORD="${RASPBERRY_PASSWORD:-escape}"
   ```

---

## 🎯 Alternative senza sshpass

Se non vuoi installare sshpass, puoi usare SSH keys:

### Setup SSH Keys (One-time):
```bash
# 1. Genera chiave (se non ce l'hai già)
ssh-keygen -t rsa -b 4096

# 2. Copia sul Raspberry
ssh-copy-id escape@192.168.8.10
# Password: escape (ultima volta!)

# 3. Test
ssh escape@192.168.8.10
# Nessuna password richiesta!
```

### Script senza sshpass:
```bash
#!/bin/bash
# shutdown-raspberry-from-mac-nopass.sh

echo "🔴 Spegnimento Raspberry Pi..."
ssh escape@192.168.8.10 "docker stop \$(docker ps -q) 2>/dev/null; sync; sync; sudo shutdown -h now"
echo "✅ Comando inviato!"
```

---

## 📦 Comandi Utili

### Verifica stato Raspberry da Mac:
```bash
# Ping
ping 192.168.8.10

# SSH manuale
ssh escape@192.168.8.10

# Esegui comando remoto
sshpass -p escape ssh escape@192.168.8.10 "uptime"

# Check Docker
sshpass -p escape ssh escape@192.168.8.10 "docker ps"
```

---

## 🎨 Personalizzazione

### Aggiungere notifica sonora:
```bash
# Alla fine dello script aggiungi:
afplay /System/Library/Sounds/Glass.aiff
```

### Creare alias nel tuo .zshrc/.bashrc:
```bash
# In ~/.zshrc
alias shutdown-pi='/Users/matteo/Desktop/ESCAPE/shutdown-raspberry-from-mac.sh'
alias shutdown-pi-quick='/Users/matteo/Desktop/ESCAPE/shutdown-raspberry-from-mac-quick.sh'

# Ora puoi usare:
shutdown-pi
```

---

## ✨ Quick Reference

| Comando | Descrizione |
|---------|-------------|
| `./shutdown-raspberry-from-mac.sh` | Spegnimento con conferma |
| `./shutdown-raspberry-from-mac-quick.sh` | Spegnimento veloce |
| `brew install hudochenkov/sshpass/sshpass` | Installa sshpass |
| `ssh-copy-id escape@192.168.8.10` | Setup SSH keys |

---

## 🎉 Conclusione

Ora puoi spegnere il Raspberry Pi comodamente dal tuo Mac senza doversi connettere manualmente! Gli script gestiscono tutto automaticamente:

- ✅ Connessione automatica
- ✅ Password gestita
- ✅ Stop Docker
- ✅ Sync filesystem
- ✅ Shutdown sicuro

**Spegnimento mai stato così facile! 🚀**