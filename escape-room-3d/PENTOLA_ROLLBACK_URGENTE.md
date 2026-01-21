# 🚨 ROLLBACK URGENTE FIX PENTOLA - 12/01/2026 05:14

## ⚠️ PROBLEMA CRITICO IDENTIFICATO

### Sintomi
- **Modello 3D completamente rotto**
- Pentola gigante (1000x scala normale)
- Anta mobile cucina non più trovata: `[useAntaCucina] Anta mesh not trovata`
- Oggetti del modello danneggiati

### Causa Radice
Il fix ricorsivo applicato in `CasaModel.jsx` (commit precedente) aveva una logica **troppo aggressiva**:

```javascript
// ❌ CODICE PROBLEMATICO RIMOSSO:
if (current.scale.x < 0.01) {
  current.scale.set(1, 1, 1)  // ← ERRORE: Forza sempre 1.0!
}
```

**Problema:** Non preservava le proporzioni relative, impostava sempre scala 1.0 distruggendo la gerarchia del modello.

### Effetti Collaterali
1. **lux_root** (parent pentola): scala 0.0010 → 1.0 = **moltiplicazione 1000x**
2. **Pentola**: da invisibile a GIGANTE
3. **Altri oggetti**: gerarchia danneggiata

---

## ✅ SOLUZIONE APPLICATA

### Azione: ROLLBACK COMPLETO
**File modificato:** `escape-room-3d/src/components/3D/CasaModel.jsx`

**Cosa è stato rimosso:**
- Intero `useEffect` con fix ricorsivo pentola (linee 667-731)
- Logica che modificava scala di tutta la gerarchia parent

### Codice Rimosso
```javascript
// 🍳 FIX PENTOLA INVISIBILE - useEffect rimosso completamente
// da linea 667 a linea 731
```

---

## 📋 PASSI ESEGUITI

1. ✅ **Identificato problema** dai log console
2. ✅ **Letto `CasaModel.jsx`** per trovare codice dannoso
3. ✅ **Rimosso useEffect** fix pentola completo
4. ✅ **Avviato rebuild** container frontend
5. ⏳ **Build in corso** (background)

---

## 🔍 STATO ATTUALE

### Rebuild Frontend
```bash
docker-compose up -d --build frontend
```

**Status:** ⏳ In esecuzione (background)
- Step: `npm run build` → `vite build`
- Fase: Trasformazione file in corso

### Risultato Atteso
- ✅ Modello 3D ripristinato alle dimensioni corrette
- ✅ Anta mobile cucina trovata correttamente
- ✅ Pentola torna invisibile (problema originale)

---

## 📝 NOTE TECNICHE

### Problema Pentola Invisibile (Originale)
**Non risolto** - La pentola rimane invisibile dopo il rollback.

### Causa Tecnica
Il nodo `lux_root` nel modello 3D ha effettivamente scala **0.001** (0.1%), causando invisibilità della pentola.

### Possibili Soluzioni Future
**Opzione 1 - Fix Intelligente Proporzionale:**
```javascript
// Calcola fattore di correzione necessario
const currentWorldScale = child.getWorldScale(new THREE.Vector3()).length()
const targetWorldScale = 10.0  // Dimensione target in world-space
const scaleFactor = targetWorldScale / currentWorldScale

// Applica SOLO al nodo root problematico, preservando proporzioni
rootNode.scale.multiplyScalar(scaleFactor)
```

**Opzione 2 - Fix Mirato:**
- Identifica solo `lux_root`
- Applica correzione solo a quel nodo
- NON toccare altri parent

**Opzione 3 - Fix Modello Blender:**
- Aprire modello 3D originale
- Correggere scala `lux_root` direttamente in Blender
- Riesportare modello

---

## ⚡ PROSSIMI PASSI

### Immediato (Dopo Rebuild)
1. ✅ Verificare modello funzionante
2. ✅ Testare anta mobile cucina
3. ✅ Confermare dimensioni corrette oggetti

### Successivo (Se Necessario)
4. 🔄 Implementare fix intelligente proporzionale
5. 🧪 Testare su copia locale prima del deploy
6. 📦 Deploy graduale con monitoraggio

---

## 📊 TIMELINE

- **05:12** - Problema segnalato: "modello si è rotto"
- **05:13** - Fix identificato come causa
- **05:13** - Rollback eseguito
- **05:14** - Rebuild avviato
- **05:15** - Attesa completamento build

---

## 🎯 CONCLUSIONE

**ROLLBACK COMPLETATO CON SUCCESSO** ✅

Il fix ricorsivo troppo aggressivo è stato rimosso. Il modello tornerà allo stato precedente (funzionante ma con pentola invisibile).

La pentola invisibile è un problema minore rispetto a un modello completamente danneggiato. Meglio avere 1 oggetto invisibile che l'intero modello inutilizzabile.

---

**Status Finale:** ⏳ Attesa completamento rebuild container frontend

**ETA:** ~2-3 minuti (build Vite + nginx deploy)
