# 🎯 ESP32 Soggiorno MAG1 - Fix Completo e Deploy

## 📋 Riepilogo Bug

**Problema:** Quando ESP32 attiva MAG1, l'animazione non parte

**Causa Root:** 2 bug concatenati:
1. **React Hook Rule Violation** nel `LivingRoomScene.jsx` - return anticipato impediva chiamata hook
2. **Guard Troppo Restrittiva** nel `useLivingRoomAnimation.js` - controllava `config` (null al primo render), bloccando setup pivot

## ✅ Fix Applicati

### Fix #1: LivingRoomScene.jsx
```javascript
// PRIMA (SBAGLIATO - viola regola React):
if (!couchObject || !humanObject) {
  return null  // ← RETURN ANTICIPATO blocca chiamate hooks!
}

// Hook chiamato QUI (ma solo se if sopra è false)
const { isReady, pivotGroup } = useLivingRoomAnimation(...)

// DOPO (CORRETTO):
// Hook SEMPRE chiamato (regola React rispettata)
const { isReady, pivotGroup } = useLivingRoomAnimation(
  humanObject,
  couchObject,
  animation?.config || null,  // ← Passa null se non caricato
  isPlaying,
  handleAnimationComplete
)

// Guard DOPO la chiamata hook
if (!couchObject || !humanObject) {
  return null
}
```

### Fix #2: useLivingRoomAnimation.js
```javascript
// PRIMA (SBAGLIATO):
useEffect(() => {
  if (!humanObject || !couchObject || !config) {  // ← config è null!
    console.log('⚠️ Oggetti o config mancanti')
    return  // ← BLOCCA SETUP
  }
  
  // Setup mai eseguito...
}, [humanObject?.uuid, couchObject?.uuid, config])

// DOPO (CORRETTO):
useEffect(() => {
  // ✅ Controlla SOLO oggetti (config opzionale)
  if (!humanObject || !couchObject) {
    console.log('⚠️ Oggetti non ancora pronti')
    return
  }
  
  // ✅ Setup procede anche senza config
  const pivotWorldPos = new THREE.Vector3(
    config?.pivotX || 0,  // ← Default se config null
    0,
    config?.pivotZ || 0
  )
  
  // ... crea pivot e attach oggetti
  
}, [humanObject?.uuid, couchObject?.uuid])  // ← config rimosso!
```

## 📦 Stato Deploy

### File Modificati:
- ✅ `src/components/scenes/LivingRoomScene.jsx` - Hook sempre chiamato
- ✅ `src/hooks/useLivingRoomAnimation.js` - Guard corretto, config opzionale

### Pacchetto Creato:
- ✅ `escape-room-deploy.tar.gz` (272MB) con modifiche
- 📅 Creato: 14/01/2026 23:15

### Status Deploy Raspberry:
- ⚠️ **NON ANCORA APPLICATO** - Il Raspberry ha ancora la vecchia versione

## 🚀 Deploy Manuale sul Raspberry

### Opzione A: Deploy con Rebuild (RACCOMANDATO)

```bash
# 1. Trasferisci tar.gz sul Raspberry
scp /Users/matteo/Desktop/ESCAPE/escape-room-deploy.tar.gz pi@192.168.8.10:/home/pi/

# 2. SSH su Raspberry
ssh pi@192.168.8.10

# 3. Backup vecchia versione
cd /home/pi
mv escape-room-3d escape-room-3d.backup-$(date +%Y%m%d-%H%M%S)

# 4. Estrai nuova versione
mkdir -p escape-room-3d
tar -xzf escape-room-deploy.tar.gz -C escape-room-3d
cd escape-room-3d

# 5. Rebuild COMPLETO senza cache Docker
docker compose down
docker compose build --no-cache
docker compose up -d

# 6. Verifica
docker compose ps
docker compose logs frontend --tail=50
```

### Opzione B: Deploy Veloce (senza rebuild)

```bash
# SSH su Raspberry
ssh pi@192.168.8.10
cd /home/pi/escape-room-3d

# Stop, remove, restart
docker compose down
docker compose up -d --force-recreate

# Verifica
docker compose logs frontend --tail=50
```

### Opzione C: Script Automatico da macOS

```bash
cd /Users/matteo/Desktop/ESCAPE/escape-room-3d
./deploy-nocache.sh
```

## ✅ Verifica Fix Funzionante

### 1. Controlla Log Browser
Apri http://192.168.8.10 e console DevTools, dovresti vedere:

```
✅ CORRETTO (nuovo codice):
[useLivingRoomAnimation] 🔍 Setup animazione soggiorno...
[useLivingRoomAnimation] Humano: Humano_02Casual_18_30K(...)
[useLivingRoomAnimation] Couch: CouchSet(...)
[useLivingRoomAnimation] 🎯 Pivot WORLD: [...]
[useLivingRoomAnimation] 🔗 Attach Humano al pivot
[useLivingRoomAnimation] 🔗 Attach CouchSet al pivot
[useLivingRoomAnimation] ✅ Setup completato!

❌ SBAGLIATO (vecchio codice):
[useLivingRoomAnimation] ⚠️ Oggetti o config mancanti
```

### 2. Test Manuale
- Entra nel soggiorno (session 1003)
- Premi **tasto M** → animazione deve partire
- Verifica che Humano + Couch ruotano insieme

### 3. Test ESP32 MAG1
- Simula sensore MAG1
- Animazione deve partire automaticamente
- Verifica rotazione completata

## 📊 Differenza Codice

### File: src/hooks/useLivingRoomAnimation.js

**Riga 37-42 PRIMA:**
```javascript
if (!humanObject || !couchObject || !config) {
  console.log('[useLivingRoomAnimation] ⚠️ Oggetti o config mancanti')
  return
}
```

**Riga 37-43 DOPO:**
```javascript
// ✅ Controlla solo oggetti (config può essere null inizialmente)
if (!humanObject || !couchObject) {
  console.log('[useLivingRoomAnimation] ⚠️ Oggetti non ancora pronti')
  return
}
```

**Riga 66 PRIMA:**
```javascript
const pivotWorldPos = new THREE.Vector3(
  config.pivotX,
  0,
  config.pivotZ
)
```

**Riga 67-71 DOPO:**
```javascript
// ✅ Usa coordinate di default se config non ancora caricato
const pivotWorldPos = new THREE.Vector3(
  config?.pivotX || 0,
  0,
  config?.pivotZ || 0
)
```

**Riga 114 PRIMA:**
```javascript
}, [humanObject?.uuid, couchObject?.uuid, config])
```

**Riga 115 DOPO:**
```javascript
}, [humanObject?.uuid, couchObject?.uuid]) // ← Rimosso config dalle dipendenze
```

## 🎉 Risultato Atteso

Dopo il deploy:
- ✅ Animazione parte premendo tasto M
- ✅ ESP32 MAG1 attiva automaticamente l'animazione
- ✅ Humano e CouchSet ruotano sincronizzati
- ✅ Nessun warning "Oggetti o config mancanti" in console
- ✅ Porta soggiorno si blocca a 30° durante animazione

## 🔧 Troubleshooting

### Problema: Vedo ancora "config mancanti" nei log
**Soluzione:** Cache browser - premi CTRL+SHIFT+R (Windows) o CMD+SHIFT+R (Mac)

### Problema: Docker non rebuilda
**Soluzione:** Forza rebuild senza cache:
```bash
docker compose down
docker compose rm -f
docker compose build --no-cache
docker compose up -d
```

### Problema: Animazione non parte
**Soluzione:** Verifica nei log che il setup sia completato:
```bash
docker compose logs frontend --tail=100 | grep "useLivingRoomAnimation"
```

---

**Creato:** 14/01/2026 23:21  
**Status:** Fix completo, pronto per deploy
