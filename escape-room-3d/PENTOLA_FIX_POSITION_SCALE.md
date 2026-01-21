# 🍳 FIX PENTOLA - Posizione e Scala Corrette

**Data**: 12 Gennaio 2026, 14:53  
**Problema**: Pentola trovata nei log MA invisibile nella scena  
**Causa**: Posizione troppo alta (sopra occhi) + Scala troppo piccola

---

## 🔴 PROBLEMA IDENTIFICATO

La pentola veniva posizionata ma NON era visibile perché:

1. **Y Position = 1.5m** → SOPRA l'altezza occhi (1.4m)
   - La pentola era letteralmente FUORI dal campo visivo della camera
   - Il giocatore guardava verso il basso, pentola sopra la testa

2. **Scala = 0.5** → Dimensioni ridotte a metà
   - Anche se in campo visivo, sarebbe stata troppo piccola

---

## ✅ SOLUZIONE APPLICATA

### Modifiche a `KitchenScene.jsx` - Componente `PentolaFix`

```javascript
// ❌ PRIMA (ERRATO):
movable.position.set(-1.5, 1.5, 0.8)  // Y = 1.5m (sopra occhi)
movable.scale.setScalar(0.5)  // Scala ridotta

// ✅ DOPO (CORRETTO):
movable.position.set(-1.5, 1.0, 0.8)  // Y = 1.0m (sotto occhi)
movable.scale.setScalar(1.0)  // Scala normale
```

### Parametri Corretti

| Parametro | Prima | Dopo | Motivo |
|-----------|-------|------|--------|
| **posizione Y** | 1.5m | 1.0m | Sotto occhi invece che sopra |
| **scala** | 0.5 | 1.0 | Dimensione normale invece di metà |

---

## 📊 LOGICA DELLA CORREZIONE

### Altezze di Riferimento
- **Camera eyeHeight**: 1.4m (altezza occhi giocatore)
- **Pentola Y (prima)**: 1.5m → 10cm SOPRA occhi ❌
- **Pentola Y (dopo)**: 1.0m → 40cm SOTTO occhi ✅

### Posizione Finale
```javascript
X: -1.5  // A sinistra (coordinate mondo)
Y:  1.0  // All'altezza del tavolo/piano di lavoro
Z:  0.8  // Davanti al giocatore
```

---

## 🔄 REBUILD NECESSARIO

Dopo la modifica del codice:

```bash
# 1. Rebuild frontend Docker (--no-cache per forzare)
cd /Users/matteo/Desktop/ESCAPE/escape-room-3d
docker-compose build --no-cache frontend
docker-compose up -d frontend

# 2. Hard Refresh browser
# Chrome/Edge: Ctrl+Shift+R (Win) / Cmd+Shift+R (Mac)
# Firefox: Ctrl+F5 (Win) / Cmd+Shift+R (Mac)
```

---

## ✅ TEST DOPO IL FIX

Dopo rebuild + hard refresh, la pentola DOVREBBE essere visibile:

1. **Posizione**: Davanti e a sinistra del giocatore
2. **Altezza**: All'altezza del piano di lavoro (1.0m)
3. **Dimensione**: Grandezza normale (scala 1.0)
4. **Log DevTools**: `✅ PENTOLA FORZATA VISIBILE (via name)`

### Log Attesi

```
🍳 Pentola trovata! {matchedBy: 'name', name: '...', uuid: '...'}
🔥 FIX PENTOLA (name-based): {...}
✅ PENTOLA FORZATA VISIBILE (via name)
🎥 CAMERA DIAGNOSTICS: {type: 'PerspectiveCamera', position: {...}}
```

---

## 🐛 SE ANCORA INVISIBILE

Possibili cause rimanenti:

1. **Cache browser ostinato**: Provare Incognito/Private
2. **Materiale trasparente**: Controllare material.opacity
3. **Fuori frustum**: Camera near/far plane
4. **Parent nascosto**: Traverse parents per visibility

### Debug Avanzato

Usa DevTools Console:
```javascript
// Trova pentola
const pentola = window.__DEBUG.pentola
console.log('Pentola:', pentola)
console.log('Visible:', pentola.visible)
console.log('Position:', pentola.position)
console.log('Scale:', pentola.scale)

// Forza visibilità manualmente
pentola.visible = true
pentola.scale.setScalar(2.0)  // Prova scala GIGANTE
```

---

## 📝 FILE MODIFICATI

- ✅ `escape-room-3d/src/components/scenes/KitchenScene.jsx`
  - Componente `PentolaFix`
  - Riga ~2890: Y position 1.5 → 1.0
  - Riga ~2892: Scala 0.5 → 1.0

---

## 🎯 PROSSIMI PASSI

1. ✅ Modifica codice KitchenScene.jsx (FATTO)
2. ⏳ **Rebuild Docker frontend** (IN CORSO)
3. ⏳ **Hard Refresh browser** (DA FARE)
4. ⏳ **Test visibilità pentola** (DA VERIFICARE)

---

**Status**: 🔄 In attesa del rebuild Docker...
