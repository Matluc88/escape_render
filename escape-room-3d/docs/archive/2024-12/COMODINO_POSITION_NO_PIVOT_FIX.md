# 🔧 COMODINO - Fix Loop Infinito Tab Posizione

**Data:** 22/12/2025  
**File modificato:** `src/hooks/useComodinoAnimation.js`

---

## 🎯 Obiettivo

Eliminare il loop infinito che si verifica nel **tab POSIZIONE** quando si clicca "🪑 Autosetup Comodino", mantenendo intatta la funzionalità del **tab ROTAZIONE**.

---

## 🔍 Analisi Problema

### Loop Infinito (Tab Posizione)
```
[useComodinoAnimation] 🧹 Cleanup ROTATION: rimuovo pivot
[useComodinoAnimation] 🔍 Setup comodino...
(ripetuto infinite volte!)
```

**Causa**: Il codice creava il pivot group ANCHE per animazioni di posizione, causando:
1. Setup → `pivotGroup.attach(obj)` → reparenting
2. React rileva cambio gerarchia → ri-esegue useEffect  
3. Cleanup → `parent.attach(obj)` → reparenting inverso
4. React rileva di nuovo → **loop infinito!** 🔄

### Cardine Rosso Non Visibile (Tab Rotazione)
Il `PivotHelper` probabilmente ha condizioni di rendering che non supportano il multi-object mode.

---

## ✅ Soluzione Implementata

### Principio Chiave
**"Il pivot serve SOLO per rotazioni, NON per traslazioni!"**

- **Rotazione**: Serve pivot per ruotare più oggetti attorno a un punto comune
- **Posizione**: Animazione diretta di ogni oggetto (pattern pentola)

---

## 📝 Modifiche al Codice

### 1. Setup: Pivot Condizionale

```javascript
// ✅ SPLIT: Pivot SOLO per rotazioni!
if (config.mode === 'rotation') {
  // ========== MODALITÀ ROTATION: USA PIVOT ==========
  const pivotGroup = new THREE.Group()
  pivotGroup.name = 'PIVOT_Comodino'
  parent.add(pivotGroup)
  
  // Attach oggetti al pivot
  objects.forEach(obj => pivotGroup.attach(obj))
  
  pivotGroupRef.current = pivotGroup
  
  return () => {
    // Cleanup: reparenta oggetti
    const parts = [...pivotGroupRef.current.children]
    parts.forEach(obj => parent.attach(obj))
    parent.remove(pivotGroupRef.current)
  }
  
} else if (config.mode === 'position') {
  // ========== MODALITÀ POSITION: NO PIVOT ==========
  pivotGroupRef.current = null // Nessun pivot!
  
  // ✅ NESSUN CLEANUP necessario (no reparenting!)
  return () => {
    console.log('[useComodinoAnimation] 🧹 Cleanup POSITION: nulla da fare')
  }
}
```

### 2. Start Animation: Salva Posizioni Iniziali

```javascript
if (config?.mode === 'position') {
  if (pivotGroupRef.current) {
    // Con pivot: salva posizione pivot
    initialPositionRef.current = pivotGroupRef.current.position.clone()
  } else {
    // ✅ Senza pivot: salva array di posizioni per ogni oggetto
    initialPositionRef.current = objects.map(obj => obj.position.clone())
  }
  
  // Calcola distanza totale
  totalDistanceRef.current = initialPositionRef.current[0].distanceTo(localEnd)
}
```

### 3. useFrame: Animazione Diretta

```javascript
// Guard: Per POSITION senza pivot, controlla objects
if (config.mode === 'rotation' && !pivotGroupRef.current) {
  return // Rotation necessita pivot
}

if (config.mode === 'position' && !pivotGroupRef.current && 
    (!comodinoPartsRef.current || comodinoPartsRef.current.length === 0)) {
  return // Position senza pivot necessita objects
}

// ========================================
// MODALITÀ POSIZIONE (animazione diretta)
// ========================================
if (config.mode === 'position') {
  const objects = comodinoPartsRef.current
  const worldEnd = new THREE.Vector3(config.endX, config.endY, config.endZ)
  
  // ✅ Interpola posizione di OGNI oggetto direttamente
  objects.forEach((obj, index) => {
    // Conversione world→local
    let localEnd
    if (obj.parent) {
      obj.parent.updateWorldMatrix(true, false)
      localEnd = obj.parent.worldToLocal(worldEnd.clone())
    } else {
      localEnd = worldEnd.clone()
    }
    
    // Usa posizione iniziale salvata
    if (initialPositionRef.current && initialPositionRef.current[index]) {
      obj.position.lerpVectors(
        initialPositionRef.current[index], 
        localEnd, 
        clampedProgress
      )
    }
  })
}
```

### 4. Return Value: Supporto Dual-Mode

```javascript
return {
  isReady: setupDoneRef.current && 
           (pivotGroupRef.current !== null || comodinoPartsRef.current.length > 0),
  partsCount: pivotGroupRef.current ? 
              pivotGroupRef.current.children.length : 
              comodinoPartsRef.current.length,
  pivotGroup: pivotGroupRef.current,  // null per position
  objects: comodinoPartsRef.current   // sempre disponibile
}
```

---

## 📊 Confronto Prima/Dopo

### Tab POSIZIONE

#### Prima (con pivot → loop):
```
Setup → crea pivot → attach oggetti
↓
Cleanup → reparenta oggetti → rimuovi pivot
↓
Setup → React vede cambio → crea pivot di nuovo
↓
LOOP INFINITO! 🔄
```

#### Dopo (senza pivot → OK):
```
Setup → salva riferimenti (NO pivot, NO attach)
↓
useFrame → anima oggetti direttamente
↓
Cleanup → nulla da fare (NO reparenting!)
✅ Nessun loop!
```

### Tab ROTAZIONE

#### Prima e Dopo (invariato):
```
Setup → crea pivot → attach oggetti
↓
useFrame → ruota pivot (oggetti seguono)
↓
Cleanup → reparenta oggetti → rimuovi pivot
✅ Funziona come prima!
```

---

## 🧪 Come Testare

### Test 1: Tab POSIZIONE (loop fix)
1. Ricarica pagina (CMD+R / CTRL+R)
2. Apri Animation Editor (tasto `E`)
3. Tab "Posizione"
4. Click "🪑 Autosetup Comodino"
5. **✅ Risultato atteso:**
   - Log setup UNA volta sola
   - Nessun "Cleanup POSITION" ripetuto
   - Nessun loop infinito nella console

6. Click "▶ Test Animation"
7. **✅ Risultato atteso:**
   - Animazione parte
   - Log progresso: 25%, 50%, 75%
   - Tutti e 4 gli oggetti si muovono insieme
   - Arrivano alla destinazione

### Test 2: Tab ROTAZIONE (non regressionato)
1. Ricarica pagina
2. Apri Animation Editor (tasto `E`)
3. Tab "Rotazione"  
4. Click "🪑 Autosetup Comodino"
5. **✅ Risultato atteso:**
   - Setup crea pivot
   - 4 oggetti attaccati al pivot
   - **Cardine rosso visibile** (se PivotHelper corretto)

6. Click "▶ Test Animation"
7. **✅ Risultato atteso:**
   - Animazione rotazione funziona
   - Tutti gli oggetti ruotano attorno al pivot

---

## ✅ Vantaggi

1. **Nessun loop infinito** ✅
   - Position: NO reparenting = NO trigger React
   - Rotation: Reparenting controllato (una sola volta)

2. **Codice più pulito** ✅
   - Logica separata per rotation vs position
   - Più facile da debuggare

3. **Pattern coerente** ✅
   - Position usa pattern pentola (animazione diretta)
   - Rotation usa pattern pivot (quando serve)

4. **Performance migliori** ✅
   - Position: nessun overhead di pivot/reparenting
   - Animazione diretta più efficiente

---

## 🔧 Issue Secondario: Cardine Rosso

**Problema**: Nel tab ROTAZIONE, il cardine rosso (`PivotHelper`) non è visibile.

**Causa probabile**: `BedroomScene.jsx` renderizza il `PivotHelper` solo per `selectedObject` (singolo), non supporta `multiObjectMode`.

**Fix necessario**: Verificare condizioni di rendering in `BedroomScene.jsx` per supportare multi-object mode.

---

## 📋 Files Modificati

- ✅ `src/hooks/useComodinoAnimation.js` - Logica pivot condizionale
- ⏳ `src/components/scenes/BedroomScene.jsx` - Da verificare per PivotHelper

---

## 🎯 Pattern Applicabile

Questo pattern può essere utilizzato per:
- Altri hook multi-object che necessitano rotazioni E traslazioni
- Evitare reparenting quando non necessario
- Separare logiche diverse in base al tipo di animazione

**Regola generale**:
- **Traslazione**: animazione diretta (no pivot)
- **Rotazione attorno a punto**: usa pivot
- **Rotazione locale**: animazione diretta rotation.y/x/z

---

## ✅ Status

**IMPLEMENTATO** - Loop infinito eliminato, rotation preservata.  
**DA TESTARE** - Verificare entrambi i tab funzionino correttamente.  
**DA FIXARE** - PivotHelper non visibile in tab rotation (issue secondario).

---

**Commit message suggerito:**  
`fix(comodino): split pivot logic - use only for rotation, direct animation for position`
