# 🔍 Bagno Spawn - Test Diagnostico

## ✅ Stato Attuale

Il bagno ha **GIÀ** `disableGravity={true}` nel codice:

```javascript
// BathroomScene.jsx, linea ~320
useFPSControls(
  collisionObjects,
  mobileInput,
  groundObjects,
  boundaryLimits,
  initialPosition,
  initialYaw,
  eyeHeight,
  scaledCollisionRadius,
  scaledPlayerHeight,
  MOVE_SPEED,
  true // ✅ DISABLE GRAVITY già attivo
)
```

**Questo significa che il ground detection è DISABILITATO.**

---

## 🎯 Test da Eseguire

### 1. Apri il bagno nel browser (sessione 999)

```bash
# URL da testare
http://localhost/room/bagno?sessionId=999
```

### 2. Controlla i log della console del browser

Apri DevTools (F12) e cerca questi log specifici:

```
[BathroomScene] 📷 Camera LOCAL: (x, y, z)
[BathroomScene] 🌍 Camera WORLD: (x, y, z)
[BathroomScene] 🎯 PlayerRoot WORLD: (x, y, z)
```

### 3. Annotare coordinate esatte

Dopo che la scena è caricata (~5 secondi), annota:

**Camera WORLD:**
- X: _____
- Y: _____
- Z: _____

**PlayerRoot WORLD:**
- X: _____
- Y: _____
- Z: _____

### 4. Coordinate ATTESE per il bagno (da database)

Se le coordinate sono corrette nel database, dovremmo vedere:

```
PlayerRoot WORLD: (1.18, ~2.0, 2.59)
```

- **X = 1.18** ← Centro bagno
- **Y = ~2.0** ← Altezza pavimento
- **Z = 2.59** ← Vicino al lavandino

---

## 🔴 Problemi Possibili

### Scenario A: Coordinate database sbagliate
Se nei log vedi coordinate DIVERSE da quelle attese → Il database ha valori errati

**Soluzione:** Aggiornare database con SQL

### Scenario B: Coordinate database corrette, ma render sbagliato
Se nei log vedi:
- **API/Database:** X=1.18, Z=2.59 ✅
- **PlayerRoot WORLD:** X≠1.18 o Z≠2.59 ❌

→ C'è una trasformazione che modifica X/Z durante il render

**Soluzione:** Forzare coordinate hardcoded `Y=2.109` nel componente

### Scenario C: Collision radius troppo grande
Se spawni dentro il bagno ma vieni respinto verso l'esterno:

→ Il `collisionRadius=0.15` è ancora troppo grande per un bagno stretto

**Soluzione:** Ridurre ulteriormente a `0.10` o `0.05`

---

## 📊 Fornisci i Log

Per favore copia e incolla qui i log esatti che vedi nella console:

```
[Da compilare con i log reali]
```

---

## 🛠️ Prossimi Passi

In base ai risultati del test, applicheremo una delle seguenti soluzioni:

1. **Fix Database** → SQL per correggere coordinate
2. **Fix Hardcoded Y** → Forzare `Y=2.109` nel componente
3. **Fix Collision Radius** → Ridurre a 0.05m per bagno stretto

**Stato:** ⏳ In attesa dei log dall'utente
