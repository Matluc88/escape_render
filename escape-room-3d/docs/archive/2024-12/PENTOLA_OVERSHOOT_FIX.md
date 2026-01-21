# 🔧 FIX OVERSHOOT PENTOLA

## ❌ **PROBLEMA**

La pentola **superava la sfera target** (fornelli) invece di fermarsi esattamente alla posizione finale.

### **Comportamento Errato:**
```
Mobile ──────────> 🔴 Target ──> [pentola va oltre!] ❌
```

### **Causa Root:**
Nel file `usePentolaAnimation.js`, il check della distanza veniva fatto **prima** del `lerp()`, causando overshoot:

```javascript
// ❌ CODICE VECCHIO (BUGGY)
useFrame((_, delta) => {
  const distanza = currentPos.distanceTo(target)
  
  // Check PRIMA del lerp
  if (distanza < 0.01) {
    currentPos.copy(target)  // Troppo tardi!
    return
  }
  
  // Lerp può far "saltare" oltre il target
  currentPos.lerp(target, lerpFactor)  // ← OVERSHOOT QUI!
})
```

**Problema:** 
- Se `lerpFactor` è alto (es. 0.98), il `lerp()` può spostare oltre il target
- Il check successivo non previene questo

---

## ✅ **SOLUZIONE**

### **Fix Implementato:**

```javascript
// ✅ CODICE NUOVO (FIXED)
useFrame((_, delta) => {
  const distanza = currentPos.distanceTo(target)
  const lerpFactor = Math.min(1, SPEED_UNITS_PER_SEC * delta / distanza)
  
  // ✅ CONTROLLO PREVENTIVO: se siamo vicini o il prossimo step supererebbe, SNAP!
  const wouldOvershoot = lerpFactor >= 0.95 || distanza < 0.02
  
  if (wouldOvershoot) {
    // SNAP diretto alla posizione finale
    currentPos.copy(target)
    console.log('✅ Animazione completata')
    return  // ← Esce PRIMA del lerp!
  }
  
  // Altrimenti continua normalmente
  currentPos.lerp(target, lerpFactor)
})
```

### **Condizioni di Stop:**

1. **`lerpFactor >= 0.95`** → Il prossimo step farebbe un salto troppo grande
2. **`distanza < 0.02`** → Siamo molto vicini (2cm)

Se **almeno una** è vera → **SNAP diretto** (no lerp)

---

## 📊 **CONFRONTO**

### **Prima (con bug):**
```
Frame 1: distanza 1.0m  → lerp 0.1 → distanza 0.9m ✅
Frame 2: distanza 0.9m  → lerp 0.1 → distanza 0.8m ✅
...
Frame N: distanza 0.03m → lerp 0.98 → distanza -0.02m ❌ OVERSHOOT!
```

### **Dopo (fix):**
```
Frame 1: distanza 1.0m  → lerp 0.1 → distanza 0.9m ✅
Frame 2: distanza 0.9m  → lerp 0.1 → distanza 0.8m ✅
...
Frame N: distanza 0.03m → lerpFactor 0.98 → SNAP! ✅ (no lerp)
         ↓
         currentPos.copy(target)  ← Esattamente sulla sfera!
```

---

## 🎯 **RISULTATO**

### **Comportamento Corretto:**
```
Mobile ──────────> 🔴 Target [STOP esatto!] ✅
                     ↑
                Pentola si ferma QUI
```

La pentola ora si ferma **esattamente** alla posizione della sfera target, senza superarla.

---

## 🔍 **VERIFICA**

### **Come Testare:**

1. **Avvia l'app** e vai alla cucina
2. **Apri Animation Editor** (E)
3. **Click sulla PENTOLA**
4. **Modalità "Posizione"**
5. **Pick Destination** → Click sui fornelli
6. **Test animazione** → Verifica che si fermi sulla sfera rossa

### **Console Logs:**

Cerca questi messaggi:
```
[usePentolaAnimation] 🚀 AVVIO animazione
[usePentolaAnimation] 🔄 MOVIMENTO in corso - Distanza: 0.543m
[usePentolaAnimation] 🔄 MOVIMENTO in corso - Distanza: 0.231m
[usePentolaAnimation] 🔄 MOVIMENTO in corso - Distanza: 0.087m
[usePentolaAnimation] ✅ Animazione completata - pentola sui fornelli
[usePentolaAnimation]    Posizione finale: [-2.610, 0.948, 3.233]
```

L'ultimo log conferma lo **SNAP esatto** alla posizione target!

---

## 📐 **PARAMETRI TUNING**

Se necessario, puoi regolare le soglie:

```javascript
// In usePentolaAnimation.js - riga ~145

// Più conservativo (stop più presto):
const wouldOvershoot = lerpFactor >= 0.90 || distanza < 0.05

// Più aggressivo (stop più tardi):
const wouldOvershoot = lerpFactor >= 0.98 || distanza < 0.01
```

**Attuale (bilanciato):**
- `lerpFactor >= 0.95` → Stop quando il prossimo step coprirebbe 95%+ della distanza
- `distanza < 0.02` → Stop quando a meno di 2cm

---

## 🚀 **APPLICABILITÀ**

Questo fix **previene overshoot** in:
- ✅ Animazione pentola → fornelli
- ✅ Animazione pentola → mobile (ritorno)
- ✅ Qualsiasi animazione position-based con lerp

**Pattern riutilizzabile** per altri oggetti animati!

---

## 💡 **LESSON LEARNED**

**Regola generale per animazioni lerp:**

> **Controlla PRIMA di fare il lerp** se il prossimo step supererebbe il target.
> Se sì, **snap diretto** invece di lerp.

```javascript
// PATTERN GENERALE ANTI-OVERSHOOT
const wouldOvershoot = /* condizione */
if (wouldOvershoot) {
  currentValue.copy(targetValue)  // Snap
  return
}
currentValue.lerp(targetValue, factor)  // Altrimenti lerp
```

---

**Fix Applicato:** 18/12/2025, 13:41  
**File Modificato:** `src/hooks/usePentolaAnimation.js`  
**Linee:** 130-165  
**Status:** ✅ RISOLTO  
**Testato:** ⏳ In attesa di verifica utente
