# 🧪 Test Diagnostico Bagno - Collisioni Disabilitate

## ✅ Modifica Applicata

**File:** `BathroomScene.jsx`

Ho disabilitato TUTTE le collisioni orizzontali passando un array vuoto a `useFPSControls`:

```javascript
// 🧪 TEST DIAGNOSTICO: Array vuoto per testare push-out orizzontale
const testCollisions = [] // ✅ ARRAY VUOTO PER TEST

useFPSControls(
  testCollisions, // ← FORZA VUOTO invece di collisionObjects
  mobileInput,
  groundObjects,
  boundaryLimits,
  initialPosition,
  initialYaw,
  eyeHeight,
  scaledCollisionRadius,
  scaledPlayerHeight,
  MOVE_SPEED,
  true // DISABLE GRAVITY già attivo
)
```

---

## 🎯 Test da Eseguire SUBITO

### 1. NON serve rebuild! Solo refresh browser

```bash
# Apri il bagno (o refresh se già aperto)
http://localhost/room/bagno?sessionId=999
```

**IMPORTANTE:** 
- ✅ NO rebuild Docker
- ✅ NO restart server
- ✅ Basta un **CTRL+R** (refresh pagina)

---

## 📊 Risultati Attesi

### SCENARIO A: Spawni DENTRO il bagno ✅
**→ Il problema ERA il push-out orizzontale!**

**Cause possibili:**
1. `collisionRadius=0.15m` troppo grande per bagno stretto
2. Coordinate spawn troppo vicine a un muro
3. BVH collision mesh non allineata con visual mesh

**Soluzioni:**
- Ridurre `collisionRadius` da 0.15m a **0.05m** per bagno
- O spostare coordinate spawn più al centro
- O aggiornare collision mesh nel modello 3D

---

### SCENARIO B: Spawni ancora FUORI bagno ❌
**→ Il problema è nella trasformazione/parenting!**

**Cause possibili:**
1. PlayerRoot è diventato **figlio** di CasaModel invece che di Scene
2. CasaModel ha trasformazione attiva (rotation, scale, position offset)
3. Coordinate spawn lette PRIMA che il modello sia pronto

**Soluzioni:**
- Verificare hierarchy: PlayerRoot deve essere child di Scene, NON di CasaModel
- Controllare che CasaModel abbia solo offset Y, non trasformazioni X/Z
- Aspettare che modelRef sia completamente inizializzato prima di spawn

---

## 🔍 Come Interpretare i Log

Dopo il refresh, controlla console browser (F12):

```
[BathroomScene] 🌍 Camera WORLD: (X, Y, Z)
[BathroomScene] 🎯 PlayerRoot WORLD: (X, Y, Z)
```

**Coordinate ATTESE per spawn corretto:**
```
PlayerRoot WORLD: (1.18, ~2.0, 2.59)
```

**Se vedi coordinate DIVERSE:**
- X ≠ 1.18 → Problema trasformazione/offset
- Z ≠ 2.59 → Problema trasformazione/offset
- Y >> 2.0 → Problema ground detection (ma è già disabilitato)

---

## 📝 Fornisci Feedback

Dopo il test, dimmi:

1. ✅ **Spawni dentro o fuori il bagno?**
2. 📊 **Coordinate PlayerRoot WORLD dai log**
3. 🎮 **Puoi muoverti liberamente? Passi attraverso i muri?**

In base alla risposta applicherò la fix definitiva! 🚀

---

## 🔄 Come Annullare il Test

Per tornare alle collisioni normali:

```javascript
// Rimuovi "const testCollisions = []"
// Ripristina:
useFPSControls(
  collisionObjects, // ← Torna a usare collisionObjects originale
  mobileInput,
  // ... resto uguale
)
```

**Stato:** ⏳ In attesa test dall'utente
