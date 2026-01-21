# 🔍 ANALISI PROBLEMA SPAWN

## 🎯 SINTOMO
- ✅ Cucina: spawna correttamente
- ❌ Bagno/Camera/Soggiorno: player VOLA (o è fuori)

## 🔬 DIAGNOSI

### Database (CORRETTO)
```sql
SELECT name, spawn_data FROM rooms;
```
Tutte le stanze hanno **Y=0**:
- cucina: {x: -1.5, **y: 0**, z: 1.2}
- bagno: {x: 1.3, **y: 0**, z: 2.6}
- camera: {x: -0.18, **y: 0**, z: 1.5}  
- soggiorno: {x: 0.54, **y: 0**, z: 1.52}

### Codice CasaModel.jsx (PROBLEMA QUI!)
```javascript
// Riga ~290
const PIANO_TERRA_HEIGHT = sceneType === 'esterno' ? 0.6 : 2.0 // 2.0m per altre scene
groupRef.current.position.set(-center.x, -targetGroundY + actualOffset, -center.z)
```

**IL MODELLO 3D VIENE ALZATO DI +2m!**

## 🤔 PERCHÉ LA CUCINA FUNZIONA?

**Ipotesi:** Quando hai catturato le coordinate della cucina con il tasto K, il sistema ha salvato:
- **Coordinate WORLD** (che includono l'offset +2m del modello)
- **NON coordinate LOCAL** (relative al modello)

Per le altre scene, le coordinate sono state prese in un momento diverso o con un sistema diverso.

## 📋 PROSSIMI PASSI

### 1. Raccogli LOG Browser
Apri Console Browser (F12) e carica:
```
http://localhost/room/bagno?session=999
```

Cerca questi log:
- `[BathroomScene] Usando coordinate da API/cache:`
- `[FPS Controls] 🎯 REPOSITIONING PLAYER TO:`
- `[CasaModel] 🏡 Piano terra alzato di`
- `[CasaModel] 📸 Camera Teleported to:`

### 2. Verifica Coordinate Applicate
Nei log dovresti vedere:
```
✅ CUCINA: Camera Y = ~1.6 (ground + eye height)
❌ BAGNO: Camera Y = ~3.6 (volante!) o Y = -0.4 (sotto terra!)
```

### 3. SOLUZIONE TEMPORANEA (Test Rapido)
In `CasaModel.jsx` riga ~290, **CAMBIA:**
```javascript
const PIANO_TERRA_HEIGHT = sceneType === 'esterno' ? 0.6 : 0.0 // ← CAMBIA 2.0 → 0.0
```

Poi ricarica TUTTO e testa.

## 🎯 SOLUZIONE DEFINITIVA (Dopo test)

Se cambiare a 0.0 funziona → il problema è l'offset model che non viene compensato.

Allora DEVI:
1. **OPZIONE A:** Aggiornare DB con coordinate che includono offset (+2m)
2. **OPZIONE B:** Modificare codice per compensare offset automaticamente

---

**INVIA QUESTI LOG PER CONTINUARE DIAGNOSI**
