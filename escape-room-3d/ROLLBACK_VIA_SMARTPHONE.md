# 📱 ROLLBACK VIA SMARTPHONE/TABLET - GUIDA URGENTE

**Data:** 15/01/2026 01:05  
**Problema:** Raspberry Pi non raggiungibile da Mac, serve rollback immediato

---

## ⚠️ SITUAZIONE

- ❌ Deploy fallito ha rotto la pagina JoinGame
- ❌ Raspberry non raggiungibile da Mac (probabilmente spento o disconnesso)
- ❌ Nessun accesso fisico (tastiera/monitor)
- ✅ **Soluzione:** SSH da smartphone/tablet

---

## 📲 GUIDA PASSO-PASSO

### **STEP 1: Verifica che il Raspberry sia acceso** 🔍

1. Controlla il LED di alimentazione del Raspberry (rosso fisso = acceso)
2. Se spento, collega l'alimentazione

---

### **STEP 2: Installa app SSH sul telefono** 📱

**iOS (iPhone/iPad):**
- Termius (gratuita, consigliata)
- Prompt (gratuita)
- Shelly (gratuita)

**Android:**
- Termius (gratuita, consigliata)  
- JuiceSSH (gratuita)
- ConnectBot (gratuita)

**Consiglio:** Usa **Termius** (disponibile sia iOS che Android).

---

### **STEP 3: Connettiti alla stessa rete WiFi del Raspberry** 📶

Il Raspberry dovrebbe essere sulla rete:
- **Nome WiFi:** mango (o la tua rete principale)
- Assicurati che il telefono sia sulla stessa rete

---

### **STEP 4: Trova l'IP del Raspberry** 🔍

**Opzione A: Accedi al router**
1. Apri browser sul telefono
2. Vai a `192.168.8.1` (o l'indirizzo del tuo router)
3. Login al router
4. Cerca "dispositivi connessi" o "DHCP clients"
5. Trova il Raspberry Pi (cerca "raspberrypi" o MAC che inizia con `b8:27:eb`, `dc:a6:32` o `e4:5f:01`)

**Opzione B: Prova gli IP comuni**
- `192.168.8.10` (IP configurato)
- `192.168.8.xxx` (prova da .2 a .254)

---

### **STEP 5: Connettiti via SSH** 🔐

Nell'app SSH (Termius):

1. **Crea nuovo host:**
   - **Nome:** Raspberry Pi
   - **Host:** 192.168.8.10 (o l'IP trovato)
   - **Port:** 22
   - **Username:** pi
   - **Password:** ESCAPE

2. **Connetti** - Tap sul host per connetterti

Se vedi un avviso "host key fingerprint", tap su **Yes/Accept**.

---

### **STEP 6: Esegui il rollback** ⚙️

Una volta connesso via SSH, copia e incolla **questi comandi uno alla volta**:

```bash
cd /home/pi/escape-room-3d
```

```bash
sudo docker compose down
```

Attendi che i container si fermino (circa 10 secondi).

```bash
cd /home/pi
```

```bash
sudo mv escape-room-3d escape-room-3d-BROKEN
```

```bash
BACKUP_DIR=$(ls -td escape-room-3d-backup-* 2>/dev/null | head -1)
```

```bash
echo "Backup trovato: $BACKUP_DIR"
```

Verifica che mostri il nome del backup (es: `escape-room-3d-backup-20250114-120000`).

```bash
sudo cp -r "$BACKUP_DIR" escape-room-3d
```

```bash
cd /home/pi/escape-room-3d
```

```bash
sudo docker compose up -d
```

Attendi 10-15 secondi per l'avvio.

```bash
sudo docker compose ps
```

Dovresti vedere i container "Up" e "(healthy)".

---

### **STEP 7: Verifica funzionamento** ✅

1. Apri browser sul telefono
2. Vai a: `http://192.168.8.10:5000`
3. Prova la pagina JoinGame:
   - Inserisci un PIN
   - Inserisci un nome
   - **Verifica che entri nella waiting room**

Se funziona = **ROLLBACK COMPLETATO!** 🎉

---

## 🆘 SE NON FUNZIONA

### **Problema: Non trovo l'IP del Raspberry**

**Soluzione A:** Usa un'app di network scanner:
- iOS: Fing (gratuita)
- Android: Fing (gratuita)

Apri Fing, tap "Scan", cerca "Raspberry Pi" nella lista.

**Soluzione B:** Il Raspberry potrebbe essere spento o disconnesso dalla rete WiFi.

---

### **Problema: SSH non si connette**

1. Verifica che il telefono sia sulla stessa rete WiFi
2. Prova ping prima: apri Termius → Tools → Ping → inserisci IP
3. Se il ping non risponde, il Raspberry è probabilmente offline

---

### **Problema: Password errata**

La password predefinita è `ESCAPE` (tutto maiuscolo).

Se non funziona, potrebbe essere stata cambiata. Prova:
- `raspberry` (password predefinita Raspberry Pi)
- `escape` (minuscolo)

---

### **Problema: "No backups found"**

Se il comando mostra "Backup trovato: " (vuoto), significa che non ci sono backup.

In questo caso:
1. Spegni il Raspberry: `sudo shutdown now`
2. Serve accesso fisico per ripristinare da SD card backup

---

## 💡 TIPS

### **Come copiare/incollare su smartphone:**

**iOS:**
- Tap e tieni premuto sul comando
- Tap "Copia"
- Nell'app SSH, tap e tieni premuto → "Incolla"

**Android:**
- Tap sul comando
- Tap "Copia"
- Nell'app SSH, long press → "Paste"

### **Termius Pro Tip:**

Termius ha una funzione "Snippets" dove puoi salvare i comandi per riutilizzarli facilmente.

---

## 📞 SUPPORTO

Se hai difficoltà:

1. **Screenshot dell'errore** che vedi
2. **Output del comando** `sudo docker compose ps`
3. **Risultato di** `ping 192.168.8.10` (dal telefono)

---

## ✅ CHECKLIST ROLLBACK

- [ ] App SSH installata
- [ ] Connesso alla stessa rete WiFi del Raspberry
- [ ] IP del Raspberry trovato
- [ ] SSH connesso con successo
- [ ] Comandi rollback eseguiti senza errori
- [ ] Container Docker avviati (status "Up")
- [ ] Sito web funzionante da browser
- [ ] JoinGame testato e funzionante

---

**IMPORTANTE:** Una volta completato il rollback, il sistema sarà tornato alla versione funzionante precedente. Il fix MAG1 che abbiamo provato a deployare NON sarà presente, ma il sistema funzionerà correttamente.
