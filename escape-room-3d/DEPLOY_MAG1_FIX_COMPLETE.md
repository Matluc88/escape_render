# 🚀 DEPLOY FIX MAG1 - GUIDA COMPLETA

**Data:** 14/01/2026  
**Fix:** Animazione MAG1 Soggiorno con auto-trigger già integrato nel codice

---

## 📋 Problema Risolto

Il sensore MAG1 non apriva il cassetto automaticamente perché il Raspberry aveva codice vecchio senza la funzione `checkAnimationTriggers` in `useLivingRoomAnimation.js`.

**✅ Fix applicato localmente:**
- Aggiunto `checkAnimationTriggers` nel hook
- Auto-trigger per tutti i sensori
- Nessuna logica di animazione lato ESP32 (trigger completamente gestito dal frontend)

---

## 📦 Pacchetto Deploy

**File:** `/Users/matteo/Desktop/ESCAPE/escape-room-deploy.tar.gz`  
**Dimensione:** 272M  
**Contiene:** Codice aggiornato + frontend buildato

---

## 🔧 PROCEDURA DEPLOY RASPBERRY PI

### Step 1: Trasferimento File

```bash
# Dal tuo Mac, trasferisci il pacchetto
scp /Users/matteo/Desktop/ESCAPE/escape-room-deploy.tar.gz pi@192.168.8.10:/home/pi/
```

### Step 2: Connessione al Raspberry

```bash
ssh pi@192.168.8.10
```

### Step 3: Backup Vecchio Codice (Opzionale ma raccomandato)

```bash
cd /home/pi
# Se esiste già una cartella escape-room-3d, rinominala
if [ -d "escape-room-3d" ]; then
    sudo mv escape-room-3d escape-room-3d-backup-$(date +%Y%m%d-%H%M%S)
fi
```

### Step 4: Estrazione Nuovo Codice

```bash
cd /home/pi
mkdir -p escape-room-3d
tar -xzf escape-room-deploy.tar.gz -C escape-room-3d
cd escape-room-3d
```

### Step 5: Stop Container Docker

```bash
# Ferma i container attivi
sudo docker compose down
```

### Step 6: Rebuild Completo (IMPORTANTE!)

```bash
# Rebuild SENZA cache per forzare aggiornamento
sudo docker compose build --no-cache

# Oppure usa il nostro script dedicato:
chmod +x deploy-nocache.sh
sudo ./deploy-nocache.sh
```

**⚠️ IMPORTANTE:** Il `--no-cache` è FONDAMENTALE! Altrimenti Docker usa le immagini vecchie.

### Step 7: Avvio Container

```bash
sudo docker compose up -d
```

### Step 8: Verifica Logs

```bash
# Verifica che il backend sia partito
sudo docker compose logs backend | tail -30

# Verifica frontend
sudo docker compose logs frontend | tail -30
```

---

## ✅ TEST FUNZIONALITÀ

### Test 1: Verifica Codice MAG1 nel Container

```bash
# Entra nel container frontend
sudo docker exec -it escape-room-3d-frontend-1 sh

# Controlla che il file LivingRoomScene.jsx sia aggiornato
cat /app/src/components/scenes/LivingRoomScene.jsx | grep "MAG1 WebSocket"
# Dovresti vedere: "// 🎭 AUTO-TRIGGER ANIMAZIONE - MAG1 WebSocket listener"

# Verifica presenza dell'useEffect
cat /app/src/components/scenes/LivingRoomScene.jsx | grep "prevTvStatusRef.current"
# Dovresti vedere il codice di transizione

# Esci dal container
exit
```

### Test 2: Test Sensore MAG1

1. Vai alla scena Soggiorno: `http://192.168.8.10:5000/room/soggiorno/999`
2. **Apri DevTools** (F12) > Console
3. Avvicina un magnete al sensore MAG1
4. **Dovresti vedere nei log:**
   ```
   🔍 Checking animation triggers for sensor: MAG1
   ✅ Animation triggered for: cassetto_humano
   ```
5. **Il cassetto deve aprirsi automaticamente!**

### Test 3: Verifica Database

```bash
# Entra nel container backend
sudo docker exec -it escape-room-3d-backend-1 bash

# Connettiti al database
psql -U postgres -d escaperoom

# Verifica lo stato
SELECT sensor_name, triggered FROM livingroom_puzzles WHERE session_id = 999;

# Dovresti vedere MAG1 triggered=true quando attivato
\q
exit
```

---

## 🔍 TROUBLESHOOTING

### Problema: Cassetto non si apre

**Causa 1: Cache Browser**
```bash
# Pulisci cache browser
# Chrome/Firefox: CTRL+SHIFT+R (o CMD+SHIFT+R su Mac)
```

**Causa 2: Docker ha usato cache vecchia**
```bash
# Ricostruisci TUTTO da zero
cd /home/pi/escape-room-3d
sudo docker compose down

# ⚠️ ATTENZIONE: Questo comando cancella TUTTO (immagini, volumi, DATABASE!)
# Usalo solo se sei SICURO di voler perdere i dati del database
sudo docker system prune -a --volumes

sudo docker compose build --no-cache
sudo docker compose up -d
```

**Causa 3: File non estratto correttamente**
```bash
# Verifica checksum file
ls -lh /home/pi/escape-room-3d/src/hooks/useLivingRoomAnimation.js
# Controlla che il file esista e sia recente

# Controlla il contenuto
cat /home/pi/escape-room-3d/src/hooks/useLivingRoomAnimation.js | grep checkAnimationTriggers
```

### Problema: Errore "parent snapshot does not exist" durante build

**Causa: Cache Docker corrotta**

```bash
# Soluzione: Pulisci la cache Docker e ricostruisci
cd /home/pi/escape-room-3d
sudo docker compose down

# Pulisci SOLO la build cache (più sicuro)
sudo docker builder prune -af

# Ricostruisci
sudo docker compose build --no-cache
sudo docker compose up -d
```

**Se persiste, usa la pulizia completa (⚠️ cancella tutto):**
```bash
sudo docker system prune -a --volumes
sudo docker compose build --no-cache
sudo docker compose up -d
```

### Problema: Container non parte

```bash
# Verifica errori
sudo docker compose logs --tail=100

# Riavvia tutto
sudo docker compose down
sudo docker compose up -d
```

---

## 📝 COSA È CAMBIATO

### File Modificato: `src/components/scenes/LivingRoomScene.jsx`

```javascript
// 🎭 AUTO-TRIGGER ANIMAZIONE - MAG1 WebSocket listener (righe 376-399)
useEffect(() => {
  const currentTvStatus = livingRoomPuzzle.tvStatus
  
  // Rileva TRANSIZIONE active → completed (MAG1 ha completato TV)
  if (prevTvStatusRef.current === 'active' && 
      currentTvStatus === 'completed' &&
      livingRoomAnimState === 'closed') {
    
    console.log('[LivingRoomScene] 🧲 MAG1 WebSocket: TV completata! Avvio animazione automatica...')
    
    // 🎭 TRIGGERA ANIMAZIONE (identico al tasto M)
    setLivingRoomAnimState('opening')
    setIsLivingRoomAnimPlaying(true)
    
    // 📺 ACCENDI TV
    setTvAccesa(true)
    
    // 📺 MOSTRA MESSAGGIO COMPLETAMENTO
    setMessaggioCompletamento(true)
    setTimeout(() => setMessaggioCompletamento(false), 4000)
    
    console.log('[LivingRoomScene] ✅ Animazione + TV avviati automaticamente da MAG1!')
  }
  
  // Aggiorna ref per prossimo confronto
  prevTvStatusRef.current = currentTvStatus
  
}, [livingRoomPuzzle.tvStatus, livingRoomAnimState])
```

**Effetto:**
- Quando ESP32 completa il sensore MAG1, il backend cambia `tvStatus` da `active` → `completed`
- Il WebSocket propaga il cambiamento al frontend
- L'useEffect rileva la **transizione** e triggera automaticamente:
  - ✅ Animazione divano (apertura a 22°)
  - ✅ Accensione TV verde
  - ✅ Messaggio completamento
- **Nessuna logica lato ESP32** necessaria per l'animazione!

---

## 🎯 COMANDI RAPIDI

```bash
# Deploy completo in un comando
cd /home/pi/escape-room-3d && \
sudo docker compose down && \
sudo docker compose build --no-cache && \
sudo docker compose up -d && \
sudo docker compose logs -f

# Verifica hook aggiornato
sudo docker exec escape-room-3d-frontend-1 cat /app/src/hooks/useLivingRoomAnimation.js | grep checkAnimationTriggers

# Test MAG1 dal database
sudo docker exec -it escape-room-3d-backend-1 psql -U postgres -d escaperoom -c "SELECT sensor_name, triggered FROM livingroom_puzzles WHERE session_id = 999;"
```

---

## 📚 RIFERIMENTI

- **Guida Deploy:** `DEPLOY_RASPBERRY_MANGO_COMPLETO.md`
- **Analisi Bug:** `ESP32_SOGGIORNO_MAG1_ANIMATION_BUG_FIX.md`
- **Fix Dettagliato:** `ESP32_SOGGIORNO_MAG1_FIX_FINALE_DEPLOY.md`
- **Script Deploy:** `deploy-nocache.sh`

---

## ✅ CHECKLIST POST-DEPLOY

- [ ] File trasferito su Raspberry
- [ ] Codice estratto in `/home/pi/escape-room-3d`
- [ ] Docker rebuild con `--no-cache`
- [ ] Container avviati correttamente
- [ ] Hook `checkAnimationTriggers` presente nel container
- [ ] Test MAG1 → cassetto si apre automaticamente
- [ ] Cache browser pulita
- [ ] ESP32 Soggiorno funzionante e connesso

---

**🎉 DEPLOY COMPLETATO!**

Il sensore MAG1 ora triggera automaticamente l'animazione del cassetto!
