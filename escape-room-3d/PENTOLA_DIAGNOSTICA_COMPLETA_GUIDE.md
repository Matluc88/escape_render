# 🍳 GUIDA DIAGNOSTICA COMPLETA PENTOLA

## 📋 Sommario
Sistema diagnostico avanzato per capire **esattamente** dove sta la pentola, quanto è grande, se è visibile e perché potrebbe non apparire.

## 🔍 COME USARE I LOG DIAGNOSTICI

### 1️⃣ Apri la Console del Browser
1. Vai su `http://localhost/play/1020/cucina`
2. Apri DevTools (F12 o Cmd+Option+I su Mac)
3. Vai nella tab **Console**

### 2️⃣ Cerca i Log Diagnostici

Ogni **2 secondi** vedrai un report completo come questo:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔥 SETUP INIZIALE - DIAGNOSTICA PENTOLA COMPLETA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📍 POSIZIONE WORLD:
   X: -1.500m
   Y: 1.000m
   Z: 0.800m
📏 SCALA WORLD:
   X: 1.000
   Y: 1.000
   Z: 1.000
📦 BOUNDING BOX:
   Centro: (-1.50, 1.00, 0.80)
   Dimensioni: 0.15m x 0.20m x 0.15m
   Volume: 0.005m³
📷 CAMERA:
   Posizione: (-1.20, 1.40, 0.50)
   Distanza dalla pentola: 0.42m
   Near plane: 0.1m
   Far plane: 1000m
   FOV: 75°
👁️  VISIBILITÀ:
   Oggetto .visible: ✅ TRUE
   Dentro frustum: ✅ SI
   Distanza OK (near-far): ✅ SI
   frustumCulled: ✅ DISABILITATO
🎨 GEOMETRIA:
   Mesh totali: 3
   Mesh visibili: 3
   Vertici totali: 1456
   Triangoli totali: 812
🔧 MATERIALE (prima mesh):
   Tipo: MeshStandardMaterial
   visible: ✅ TRUE
   opacity: 1.00
   transparent: ✅ FALSE
   depthTest: ✅ TRUE
   depthWrite: ✅ TRUE
   side: FrontSide
🌲 HIERARCHY:
   Nome nodo: "PENTOLA_ROOT"
   Parent: NESSUNO (root scene)
   Children: 3
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## 🎯 COSA CONTROLLARE

### ✅ **PENTOLA VISIBILE** - Tutti i segni OK

Se vedi:
- `📍 POSIZIONE WORLD`: Coordinate ragionevoli (non tutte 0 o NaN)
- `📏 SCALA WORLD`: Tutti valori > 0 (non 0.000)
- `📦 BOUNDING BOX`: Dimensioni > 0 (non 0.00m x 0.00m)
- `👁️ VISIBILITÀ`: 
  - `Oggetto .visible: ✅ TRUE`
  - `Dentro frustum: ✅ SI`
  - `Distanza OK (near-far): ✅ SI`
- `🎨 GEOMETRIA`: `Mesh visibili > 0`
- `🔧 MATERIALE`: `opacity: 1.00`, `transparent: ✅ FALSE`

➡️ **LA PENTOLA DOVREBBE ESSERE VISIBILE!**

---

### ❌ **PROBLEMA 1: Posizione sbagliata**

```
📍 POSIZIONE WORLD:
   X: 0.000m
   Y: 0.000m
   Z: 0.000m
```

**Causa**: Pentola all'origine (0,0,0) invece che davanti al giocatore

**Soluzione**: La pentola viene posizionata a `(-1.5, 1.0, 0.8)` nel fix

---

### ❌ **PROBLEMA 2: Scala troppo piccola**

```
📏 SCALA WORLD:
   X: 0.001
   Y: 0.001
   Z: 0.001
```

**Causa**: Pentola microscopi ca (0.1% della dimensione normale)

**Soluzione**: La scala viene forzata a `1.0` nel fix

---

### ❌ **PROBLEMA 3: Fuori dal frustum**

```
👁️ VISIBILITÀ:
   Dentro frustum: ❌ NO
```

**Causa**: Pentola fuori dalla vista della camera (dietro, sopra, sotto, troppo lontano)

**Soluzione**: Controlla:
- Distanza camera-pentola (deve essere < 10m)
- Posizione relativa (deve essere davanti alla camera)

---

### ❌ **PROBLEMA 4: Materiale trasparente**

```
🔧 MATERIALE (prima mesh):
   opacity: 0.00
   transparent: ⚠️ TRUE
```

**Causa**: Materiale invisibile (opacity = 0)

**Soluzione**: Il fix mantiene il materiale originale senza modifiche

---

### ❌ **PROBLEMA 5: Mesh non visibili**

```
🎨 GEOMETRIA:
   Mesh totali: 3
   Mesh visibili: 0  ← ❌ PROBLEMA!
```

**Causa**: Tutte le mesh hanno `.visible = false`

**Soluzione**: Il fix forza `.visible = true` su tutte le mesh

---

## 🛠️ DEBUGGING AVANZATO

### Test dalla Console Browser

```javascript
// 1. Verifica che la pentola sia esposta
window.__DEBUG.pentola

// 2. Forza rendering
window.__DEBUG.pentola.visible = true

// 3. Cambia posizione manualmente
window.__DEBUG.pentola.position.set(-1, 1.5, 0.5)

// 4. Forza scala normale
window.__DEBUG.pentola.scale.setScalar(1.0)

// 5. Aggiorna matrici
window.__DEBUG.pentola.updateMatrixWorld(true)
```

---

## 📊 INTERPRETARE I VALORI

### Posizione tipica giocatore in cucina:
- X: tra -3.0 e 2.0
- Y: circa 1.4 (altezza occhi)
- Z: tra -2.0 e 3.0

### Pentola posizionata correttamente:
- X: -1.5 (a sinistra del giocatore)
- Y: 1.0 (sotto gli occhi, visibile)
- Z: 0.8 (davanti al giocatore)

### Distanza ottimale:
- **0.3m - 2.0m**: Perfetto, ben visibile
- **2.0m - 5.0m**: Visibile ma lontana
- **> 5.0m**: Troppo lontana, difficile da vedere

---

## 🔄 TIMELINE DEI LOG

1. **🔥 SETUP INIZIALE** (t=6s): Primo report dopo che CasaModel ha caricato tutto
2. **🎥 FRAME UPDATE** (ogni 2s): Report continui durante il gioco

---

## 📝 COSA FARE SE LA PENTOLA NON APPARE

1. ✅ **Controlla i log** - Cerca pattern di errori ripetuti
2. ✅ **Verifica posizione** - Deve essere davanti alla camera
3. ✅ **Controlla scala** - Deve essere 1.0 (non 0.001 o 100.0)
4. ✅ **Verifica frustum** - Deve essere dentro la vista
5. ✅ **Testa in console** - Usa i comandi sopra per forzare visibilità

---

## 🎯 FIX APPLICATI AUTOMATICAMENTE

Il componente `PentolaFix` applica:

1. ✅ Trova la pentola (per UUID o nome)
2. ✅ La attacca alla scena (world space)
3. ✅ La posiziona a (-1.5, 1.0, 0.8)
4. ✅ Forza scala a 1.0
5. ✅ Forza `.visible = true` su tutte le mesh
6. ✅ Disabilita frustum culling
7. ✅ Mantiene materiale originale
8. ✅ Aggiorna matrici ogni frame
9. ✅ **Log diagnostici completi ogni 2 secondi**

---

## 📞 SUPPORTO

Se anche con i log non riesci a capire il problema:

1. Copia l'intero blocco diagnostico dalla console
2. Condividilo per analisi approfondita
3. Include anche screenshot della scena

---

**Ultima modifica**: 12/01/2026, 15:03
**Autore**: Sistema diagnostico automatico
