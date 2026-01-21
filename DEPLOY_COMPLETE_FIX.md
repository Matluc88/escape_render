# 🚀 DEPLOY COMPLETO - Fix Reset Lobby + Console Cleanup + Messaggi

## 📦 File Modificati (4 totali)

1. **nginx.conf** - Fix 404 reset API (proxy_pass corretto)
2. **CasaModel.jsx** - Rimossi 3 log spam console
3. **BedroomScene.jsx** - Messaggi enigmi aggiornati
4. **KitchenScene.jsx** - Messaggi indizi aggiornati

**Tarball**: `escape-frontend-complete-fix.tar.gz` (64KB)

---

## 🔧 ISTRUZIONI DEPLOY

### STEP 1: Trasferire Tarball su Raspberry Pi

```bash
# Dal Mac - Inserisci password quando richiesto
scp /Users/matteo/Desktop/ESCAPE/escape-frontend-complete-fix.tar.gz pi@192.168.8.10:~/
```

### STEP 2: Connettersi al Raspberry Pi

```bash
ssh pi@192.168.8.10
```

### STEP 3: Estrarre File (sul Raspberry Pi)

```bash
# Vai nella directory escape-room
cd ~/escape-room

# Estrai i file (sovrascrive i vecchi)
tar -xzf ~/escape-frontend-complete-fix.tar.gz

# Verifica file estratti
ls -lh nginx.conf
ls -lh src/components/3D/CasaModel.jsx
ls -lh src/components/scenes/BedroomScene.jsx
ls -lh src/components/scenes/KitchenScene.jsx
```

### STEP 4: Rebuild Frontend Docker

```bash
# Rebuild completo (NO cache) - ci vogliono ~10 minuti
docker compose build --no-cache frontend
```

### STEP 5: Restart Containers

```bash
# Spegni container
docker compose down

# Riavvia tutto
docker compose up -d

# Verifica che siano running
docker compose ps
```

### STEP 6: Verifica Logs

```bash
# Log frontend (verifica che non ci siano errori)
docker compose logs frontend | tail -50

# Log backend (verifica che non ci siano errori)
docker compose logs backend | tail -50
```

---

## ✅ TEST COMPLETO

### 1. Test Reset Lobby (Fix 404)

1. Apri browser: `http://192.168.8.10/admin`
2. Crea/seleziona una sessione
3. Vai alla lobby della sessione
4. Clicca pulsante **"🔄 RESET ENIGMI"**
5. **VERIFICA**: Dovrebbe mostrare alert "✅ Reset completato!" invece di 404

### 2. Test Console Cleanup (CasaModel)

1. Apri una scena qualsiasi (cucina/camera/bagno/soggiorno)
2. Apri DevTools console (F12)
3. **VERIFICA**: NON devono esserci log spam "[CasaModel] 🔬 COMPONENT BODY EXECUTING"
4. Console dovrebbe essere silenziosa (solo log normali)

### 3. Test Messaggi Camera (BedroomScene)

Apri `http://192.168.8.10/play/SESSIONE_ID/camera`

**Enigma 1 - Letto (Tasto 1):**
```
Per rimettere ordine devi prima entrare in casa e poi preparare il letto.
```

**Enigma 2 - Poltrona (Tasto 2):**
```
Per rilassarti devi prima entrare in casa e poi sederti in poltrona.
```

**Enigma 3 - Ventola (Tasto 3):**
```
Per accendere la ventola devi prima entrare in casa.
```

### 4. Test Messaggi Cucina (KitchenScene)

Apri `http://192.168.8.10/play/SESSIONE_ID/cucina`

**Indizio 1 - Fornelli (Tasto 1):**
```
Posiziona la pentola per accenderlo!
```

**Indizio 2 - Frigo (Tasto 2):**
```
Apri lo sportello del frigo!
```

**Indizio 3 - Serra (Tasto 3):**
```
Accendi il neon della serra!
```

### 5. Test MAG1 Bagno (già deployato)

1. Apri `http://192.168.8.10/play/SESSIONE_ID/bagno`
2. Simula sensore MAG1 (anta doccia) via ESP32
3. **VERIFICA**: Animazione doccia si attiva correttamente

### 6. Test Spawn (tutti scenari)

**Verifica che NON ci siano problemi di spawn in NESSUNA scena:**

- Esterno: spawn corretto all'ingresso
- Cucina: spawn corretto vicino tavolo
- Camera: spawn corretto vicino letto
- Bagno: spawn corretto vicino doccia
- Soggiorno: spawn corretto vicino divano

---

## 📊 RIEPILOGO MODIFICHE

### nginx.conf
```diff
- proxy_pass http://backend/api/;
+ proxy_pass http://backend/;
```
**Fix**: Rimuove `/api/` duplicato che causava 404 su reset endpoint

### CasaModel.jsx
```diff
- console.log('[CasaModel] 🔬 COMPONENT BODY EXECUTING - Render #', Date.now())
- console.log('[CasaModel] 🔬 scene loaded:', !!scene)
- console.log('[CasaModel] 🔬 groupRef.current:', !!groupRef.current)
```
**Fix**: Rimuove 3 log diagnostici che spammavano console (180+ log/sec)

### BedroomScene.jsx
**Fix**: Messaggi enigmi aggiornati (3 enigmi)

### KitchenScene.jsx
**Fix**: Messaggi indizi aggiornati (3 indizi)

---

## ⏱️ TEMPI STIMATI

- Transfer tarball: 10 sec
- Estrazione: 5 sec
- Rebuild Docker: **~10 minuti**
- Restart: 30 sec
- Test completo: 5 min

**Totale: ~16 minuti**

---

## 🆘 TROUBLESHOOTING

### Problema: 404 persiste dopo deploy

```bash
# Verifica che nginx.conf sia stato aggiornato
docker compose exec frontend cat /etc/nginx/nginx.conf | grep "proxy_pass http://backend/"
# Dovrebbe mostrare: proxy_pass http://backend/; (SENZA /api/)
```

### Problema: Console ancora con spam

```bash
# Verifica che CasaModel.jsx sia stato aggiornato
docker compose exec frontend grep -n "COMPONENT BODY EXECUTING" /usr/share/nginx/html/assets/*.js
# Dovrebbe essere vuoto (nessun match)
```

### Problema: Messaggi non aggiornati

```bash
# Verifica che BedroomScene.jsx sia stato aggiornato
docker compose exec frontend ls -lh /app/src/components/scenes/BedroomScene.jsx
# Timestamp dovrebbe essere recente (oggi)
```

### Problema: Rebuild fallisce

```bash
# Pulisci tutto e riprova
docker compose down
docker system prune -af
docker compose build --no-cache
docker compose up -d
```

---

## ✅ CHECKLIST FINALE

- [ ] Tarball trasferito su Raspberry Pi
- [ ] File estratti correttamente
- [ ] Frontend rebuilded (10 min)
- [ ] Container riavviati
- [ ] Logs senza errori
- [ ] Reset lobby funziona (200 OK)
- [ ] Console pulita (no spam)
- [ ] Messaggi camera corretti
- [ ] Messaggi cucina corretti
- [ ] MAG1 bagno funziona
- [ ] Spawn funzionanti in tutte le scene

---

**Deploy completato con successo! 🎉**