# 📍 Guida Estrazione Coordinate MURO_SERRA

## 🎯 Obiettivo

Ottenere le coordinate 3D esatte del **MURO_SERRA** (UUID: `BA166D41-384C-499E-809C-E932A5015BB4`) nel mondo virtuale.

## ✅ Soluzione Implementata

Ho aggiunto un **console.log dettagliato** in `SerraParticles.jsx` che stampa automaticamente tutte le informazioni quando il componente trova il MURO_SERRA.

## 🚀 Come Vedere le Coordinate

### 1. Avvia l'Applicazione
```bash
cd escape-room-3d
npm run dev
```

### 2. Apri la Console del Browser
- **Chrome/Edge**: `F12` o `Ctrl+Shift+J` (Windows/Linux) / `Cmd+Option+J` (Mac)
- **Firefox**: `F12` o `Ctrl+Shift+K` (Windows/Linux) / `Cmd+Option+K` (Mac)
- **Safari**: `Cmd+Option+C`

### 3. Naviga alla Cucina
- Carica l'app nel browser (`http://localhost:5173`)
- Entra nella scena **Cucina** (`/room/cucina`)

### 4. Cerca il Log nella Console
Vedrai un messaggio come questo:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[SerraParticles] 📍 COORDINATE MURO_SERRA:
  World Position: (1.234, 2.567, 3.890)
  Local Position: (0.000, 0.000, 0.000)
  Rotation: (0.000, 0.000, 0.000)
  Scale: (1.000, 1.000, 1.000)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## 📊 Informazioni Fornite

### World Position
**Coordinate assolute** nel mondo 3D - questa è la posizione che ti serve!
- `x`: Coordinata sinistra/destra
- `y`: Coordinata verticale (altezza)
- `z`: Coordinata avanti/indietro

### Local Position  
Coordinate relative al parent (di solito 0,0,0 se non ha parent)

### Rotation
Rotazione dell'oggetto in radianti (x, y, z)

### Scale
Scala dell'oggetto (1 = dimensioni originali)

## 🎯 Cosa Fare con le Coordinate

Una volta ottenute le coordinate, puoi:

1. **Documentarle** - Salvale per riferimento futuro
2. **Posizionare oggetti** - Usa le coordinate per posizionare luci, particelle, etc.
3. **Debug** - Verifica che la posizione sia corretta nel modello

## 🔧 Rimozione del Log (Opzionale)

Quando non ti servono più le coordinate, puoi rimuovere il log da `SerraParticles.jsx`:

```javascript
// Trova e rimuovi queste righe (circa linea 48-57):
// 📍 LOG COORDINATE WORLD DEL MURO_SERRA
const worldPos = new THREE.Vector3()
muroObj.getWorldPosition(worldPos)
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
console.log('[SerraParticles] 📍 COORDINATE MURO_SERRA:')
console.log(`  World Position: (${worldPos.x.toFixed(3)}, ${worldPos.y.toFixed(3)}, ${worldPos.z.toFixed(3)})`)
console.log(`  Local Position: (${muroObj.position.x.toFixed(3)}, ${muroObj.position.y.toFixed(3)}, ${muroObj.position.z.toFixed(3)})`)
console.log(`  Rotation: (${muroObj.rotation.x.toFixed(3)}, ${muroObj.rotation.y.toFixed(3)}, ${muroObj.rotation.z.toFixed(3)})`)
console.log(`  Scale: (${muroObj.scale.x.toFixed(3)}, ${muroObj.scale.y.toFixed(3)}, ${muroObj.scale.z.toFixed(3)})`)
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
```

## ✅ Note Importanti

- ⏰ Il log appare **immediatamente** dopo il caricamento della scena (circa 100ms)
- 🔄 Se non vedi il log, ricarica la pagina (`F5`)
- 🎯 Il log appare **una sola volta** per sessione
- 📱 Funziona sia su desktop che mobile (usa dev tools remoto su mobile)

## 🌟 Vantaggio di Questo Metodo

✅ **Veloce** - Coordinate disponibili in 30 secondi  
✅ **Accurato** - Valori diretti da Three.js runtime  
✅ **Real-time** - Riflette eventuali trasformazioni dinamiche  
✅ **Completo** - Include posizione, rotazione, scala  

## 📞 Troubleshooting

### ❌ "MURO_SERRA non trovato"
- Verifica che il file `casa.glb` contenga l'oggetto con UUID `BA166D41-384C-499E-809C-E932A5015BB4`
- Controlla che il modello sia stato caricato correttamente

### ❌ Non vedo nessun log
- Apri la console **prima** di caricare la scena
- Verifica di essere nella scena Cucina
- Ricarica la pagina completamente (`Ctrl+F5`)

### ❌ Coordinate sembrano sbagliate
- Le coordinate world tengono conto di TUTTE le trasformazioni del parent
- Verifica che il modello non sia stato spostato/ruotato dopo l'importazione

---

**✨ Buona caccia alle coordinate!**
