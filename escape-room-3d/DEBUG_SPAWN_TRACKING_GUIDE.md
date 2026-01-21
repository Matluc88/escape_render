# 🔍 GUIDA DEBUG SPAWN - Sistema di Tracciamento Dettagliato

**Data:** 10 Gennaio 2026  
**Problema:** Bagno/Soggiorno/Camera spawnano "fuori dalla casa", solo Cucina funziona correttamente  
**Soluzione:** Aggiunti log dettagliati per tracciare posizione WORLD del player

---

## 📝 LOG AGGIUNTI

### BathroomScene.jsx (e da replicare nelle altre scene)

Ho aggiunto un sistema di log completo che ogni **2 secondi** stampa:

```javascript
// ✅ POSIZIONE WORLD CAMERA
const cameraWorldPos = new THREE.Vector3()
camera.getWorldPosition(cameraWorldPos)

// ✅ POSIZIONE WORLD PLAYERROOT
let playerRootWorldPos = null
if (camera.parent && camera.parent.parent) {
  playerRootWorldPos = new THREE.Vector3()
  camera.parent.parent.getWorldPosition(playerRootWorldPos)
}
```

### Output Log Previsto

```
[BathroomScene] 📷 Camera LOCAL: (0.00, 0.00, 0.00)
[BathroomScene] 🌍 Camera WORLD: (1.30, 1.40, 2.60)
[BathroomScene] 🎯 PlayerRoot WORLD: (1.30, 0.00, 2.60)
[BathroomScene] 📏 Distance from ground: 0.00m
```

---

## 🎯 COME INTERPRETARE I LOG

### ✅ SPAWN CORRETTO (Cucina)

```
[KitchenScene] 🌍 Camera WORLD: (0.00, 1.60, -2.00)
[KitchenScene] 🎯 PlayerRoot WORLD: (0.00, 0.00, -2.00)
```

➡️ **PlayerRoot** è nella posizione corretta (coordinate DB)  
➡️ **Camera** è offset di +1.6m in Y (eyeHeight)

### ❌ SPAWN ERRATO (Bagno/Altre Scene)

Se vedi qualcosa tipo:

```
[BathroomScene] 🌍 Camera WORLD: (15.50, 1.40, 20.30)
[BathroomScene] 🎯 PlayerRoot WORLD: (15.50, 0.00, 20.30)
```

➡️ **PROBLEMA**: PlayerRoot non è a (1.30, 0, 2.60) come da DB!  
➡️ Il player viene spawna in coordinate completamente diverse

---

## 🔍 PROSSIMI PASSI

### FASE 1: Raccolta Dati (ORA)

1. **Vai sul sito** → `localhost/room/bagno?session=999`
2. **Apri Console Browser** (F12)
3. **Aspetta 5 secondi** per vedere i log periodici
4. **Copia i log** che iniziano con `[BathroomScene] 📷` / `🌍` / `🎯`

### FASE 2: Confronto con Cucina

1. **Vai in Cucina** → `localhost/room/cucina?session=999`
2. **Raccogli gli stessi log**
3. **Confronta** le coordinate WORLD

### FASE 3: Diagnosi

**Scenario A: Coordinate PlayerRoot SBAGLIATE**
```
Camera WORLD diversa da DB → spawn position NON viene applicata correttamente
```
➡️ Problema nel sistema `useFPSControls` o `initialPosition`

**Scenario B: Coordinate PlayerRoot CORRETTE ma modello 3D offset**
```
PlayerRoot OK, ma modello CasaModel ha posizione Y diversa
```
➡️ Problema `modelYOffset` o offset del gruppo 3D

**Scenario C: Camera slegata da PlayerRoot**
```
Camera WORLD non segue PlayerRoot
```
➡️ Problema gerarchia oggetti (Camera → CameraRig → PlayerRoot)

---

## 📋 CHECKLIST DEBUG

- [ ] Frontend riavviato (✅ FATTO)
- [ ] Hard refresh browser (Cmd+Shift+R / Ctrl+Shift+R)
- [ ] Vai in `/room/bagno?session=999`
- [ ] Console aperta (F12)
- [ ] Log raccolti dopo 5 secondi
- [ ] Confronto con log Cucina
- [ ] Identificato scenario A/B/C

---

## 🔄 REPLICARE SU ALTRE SCENE

Una volta risolto il bug, ricordati di aggiungere gli stessi log a:

- `BedroomScene.jsx` (Camera)
- `LivingRoomScene.jsx` (Soggiorno)

Cerca il vecchio log:
```javascript
console.log(`[SceneName] 📷 Camera Y: ...`)
```

E sostituiscilo con il nuovo sistema WORLD tracking.

---

## ⚙️ PARAMETRI SPAWN CORRETTI (Riferimento)

Dal database `spawn_data` sessione 999:

| Stanza | X | Y | Z | Yaw (rad) | Yaw (deg) |
|--------|---|---|---|-----------|-----------|
| **cucina** | 0.00 | 0 | -2.00 | 3.14 | 180° |
| **camera** | -4.15 | 0 | 3.17 | 4.71 | 270° |
| **soggiorno** | -3.53 | 0 | -2.48 | 1.57 | 90° |
| **bagno** | 1.30 | 0 | 2.60 | 3.65 | 209° |

---

## 💡 SUGGERIMENTI

1. **Muoviti lentamente** → I log si aggiornano ogni 2 secondi
2. **Confronta PRIMA le coordinate WORLD** → Non le LOCAL
3. **Se PlayerRoot è corretto ma sei "fuori"** → Problema rendering/modello, non spawn
4. **Se PlayerRoot è sbagliato** → Problema applicazione initialPosition

---

**Autore:** Cline AI Assistant  
**Ultima modifica:** 10/01/2026 11:14
