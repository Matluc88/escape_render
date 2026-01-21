# FIX PENTOLA - Problema Posizione Y (sotto pavimento)

## 🔍 PROBLEMA IDENTIFICATO
La pentola NON era visibile nella scena cucina all'URL `http://localhost/play/1020/cucina`

## 🎯 CAUSA
Dopo verifica, la pentola era posizionata troppo BASSA:
- **Y precedente:** 1.1 metri
- **Altezza occhi camera:** ~1.4 metri
- **Risultato:** La pentola era SOTTO il pavimento o troppo vicina al suolo, quindi invisibile!

## ✅ SOLUZIONE APPLICATA

### Modifiche a `KitchenScene.jsx` - Componente `PentolaFix`

```javascript
// BEFORE (INVISIBILE)
movable.position.set(-1.5, 1.1, 0.8)  // ❌ Y troppo basso!
movable.scale.setScalar(0.3)  // ❌ Troppo piccola

// AFTER (VISIBILE)
movable.position.set(-1.5, 1.5, 0.8)  // ✅ Y alzata a 1.5m (sopra occhi)
movable.scale.setScalar(0.5)  // ✅ Scala aumentata per visibilità
```

### 📊 Dettagli tecnici
- **Y alzata:** da 1.1m → 1.5m (+40cm)
- **Scala aumentata:** da 0.3 → 0.5 (+66%)
- **Materiale:** MeshBasicMaterial ROSSO (debug)
- **depthTest:** false (sempre visibile)
- **renderOrder:** 9999 (rendering prioritario)

## 🧪 COME TESTARE

1. **Apri browser** a `http://localhost/play/1020/cucina`
2. **Cerca pentola ROSSA** sospesa nell'aria (Y=1.5m)
3. **Verifica console** per log:
   ```
   🍳 Pentola trovata!
   ✅ PENTOLA FORZATA VISIBILE
   🎥 FRAME SYNC: {...}
   ```

4. **Controlla DevTools** (F12):
   ```javascript
   window.__DEBUG.pentola  // Oggetto Three.js esposto
   ```

## 📝 NOTE IMPORTANTI

### ⚠️ REBUILD DOCKER OBBLIGATORIO
**DOPO OGNI MODIFICA AL CODICE, SERVE REBUILD:**
```bash
cd escape-room-3d
docker-compose up -d --build
```

Vedi anche: `REBUILD_SEMPRE_DOPO_MODIFICA.md`

### 🔧 Componente Temporaneo
Il componente `PentolaFix` è una SOLUZIONE TEMPORANEA per:
- Debug visibilità pentola
- Test posizionamento
- Verifica rendering

### 🎯 Prossimi Passi
1. ✅ Verifica visibilità con Y=1.5m
2. 🔄 Se visibile → trova posizione corretta sul mobile
3. 🔄 Integra con `usePentolaAnimation` (attualmente disabilitato)
4. 🔄 Rimuovi PentolaFix quando sistema animazione funziona

## 🐛 DEBUG RAPIDO

### Log Console Attesi
```
[PentolaFix] 🍳 Pentola trovata! {...}
[PentolaFix] 🔥 FIX PENTOLA (name-based): {...}
[PentolaFix] ✅ PENTOLA FORZATA VISIBILE (via name)
[PentolaFix] 🎥 CAMERA DIAGNOSTICS: {...}
[PentolaFix] 🎥 FRAME SYNC: {...}
```

### Se ancora NON visibile
1. **Verifica Y camera:** Dovrebbe essere ~1.4m
2. **Verifica distanza:** Pentola dovrebbe essere a ~2-3m dalla camera
3. **Alza ulteriormente Y:** prova 2.0m o 2.5m
4. **Controlla frustum culling:** è DISABILITATO (`frustumCulled = false`)

## 📅 Data Fix
**12 Gennaio 2026, 14:30**

## 🔗 File Correlati
- `src/components/scenes/KitchenScene.jsx` (componente PentolaFix)
- `src/hooks/usePentolaAnimation.js` (hook disabilitato)
- `PENTOLA_DEBUG_DEVTOOLS_GUIDE.md` (guida debug console)
- `REBUILD_SEMPRE_DOPO_MODIFICA.md` (promemoria rebuild)
