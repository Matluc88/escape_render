# 🎨 GUIDA VISUALIZZAZIONE PERCORSO & WAYPOINTS

## ✅ **STATO ATTUALE**

### **Sistema di Visualizzazione Esistente:**

La `KitchenScene` ha già 2 componenti di visualizzazione:

1. **`PathHelper`** - Linea da Punto A → Punto B
2. **`Ghost Target`** - Sfera rossa brillante sul Punto B

**Funzionalità attuali:**
```
📍 Punto A ─────────────────> 🔴 Punto B
  (verde)    [linea cyan]     (sfera rossa)
```

### **Come Vederli:**

1. **Apri Animation Editor** (Premi E)
2. **Click sulla PENTOLA**
3. **Seleziona modalità "Posizione"**
4. **Click "Pick Destination"** → Clicca sui fornelli

✅ **Vedrai:**
- Linea tratteggiata che collega mobile → fornelli
- Sfera rossa brillante sui fornelli (target)

---

## 🆕 **NUOVO: SISTEMA WAYPOINTS**

### **Obiettivo:**
Permettere di definire **punti intermedi** per controllare il percorso:

```
A ──> W1 ──> W2 ──> B
📍   🟡    🟡   🔴

Esempio:
• A: Mobile (-1.0, -0.1, 0.8)
• W1: Passa sopra il tavolo (-1.5, 0.6, 1.5)
• W2: Vicino ai fornelli (-2.3, 0.9, 2.8)
• B: Sui fornelli (-2.6, 0.95, 3.2)
```

---

## 🔧 **IMPLEMENTAZIONE PROPOSTA**

### **FASE 1: UI Semplificata (1 Waypoint)**

Nel pannello **AnimationEditor**, aggiungere:

```
┌────────────────────────────────────┐
│ 🛤️ CONTROLLO PERCORSO              │
├────────────────────────────────────┤
│                                     │
│ [●] Percorso Diretto (A → B)       │
│ [ ] Percorso con 1 Punto Intermedio│
│                                     │
│ ┌─ SE ATTIVO ────────────────────┐ │
│ │ 🟡 Waypoint 1:                 │ │
│ │    X: -1.500  Y: 0.600  Z: 1.5 │ │
│ │    [📍 Click per Posizionare]  │ │
│ │    [✏️ Modifica Manuale]        │ │
│ └────────────────────────────────┘ │
│                                     │
│ 📊 Distanza totale: 2.8m            │
└────────────────────────────────────┘
```

### **FASE 2: Visualizzazione 3D**

Estendere `PositionPathVisualizer.jsx` per curve:

```javascript
// Invece di linea retta, usa curve Catmull-Rom
const curve = new THREE.CatmullRomCurve3([
  new THREE.Vector3(startX, startY, startZ),
  new THREE.Vector3(wp1X, wp1Y, wp1Z),  // Waypoint 1
  new THREE.Vector3(endX, endY, endZ)
])

// Genera punti sulla curva
const points = curve.getPoints(50)
```

**Risultato visivo:**
```
A ●───╮
      ╰──●─╮  ← Curva smooth
         ╰──● B
```

### **FASE 3: Interazione Drag & Drop**

Permettere di **trascinare** le sfere waypoint:

1. Click sulla sfera gialla (waypoint)
2. Trascina nella scena 3D
3. Rilascia → Posizione aggiornata
4. Percorso si ricalcola in tempo reale

---

## 📊 **STRUTTURA DATI**

### **Configurazione con Waypoints:**

```json
{
  "mode": "position",
  "pathType": "waypoints",
  "points": [
    {
      "type": "start",
      "x": -1.015,
      "y": -0.109,
      "z": 0.857,
      "locked": true
    },
    {
      "type": "waypoint",
      "x": -1.500,
      "y": 0.600,
      "z": 1.500,
      "locked": false
    },
    {
      "type": "end",
      "x": -2.610,
      "y": 0.948,
      "z": 3.233,
      "locked": false
    }
  ],
  "speed": 2.0
}
```

---

## 🎯 **MODIFICHE AI FILE**

### **1. `AnimationEditor.jsx`**

Aggiungere sezione waypoints:

```jsx
// Nuovo state
const [waypointsEnabled, setWaypointsEnabled] = useState(false)
const [waypoints, setWaypoints] = useState([])

// UI toggle
<div className="animation-editor__control">
  <label>
    <input
      type="checkbox"
      checked={waypointsEnabled}
      onChange={(e) => setWaypointsEnabled(e.target.checked)}
    />
    Usa Waypoint Intermedio
  </label>
</div>

{waypointsEnabled && (
  <div className="waypoint-editor">
    <h4>🟡 Waypoint 1</h4>
    <button onClick={handlePickWaypoint}>
      📍 Click per Posizionare
    </button>
    
    {/* Coordinate manuali */}
    <div>
      <label>X: <input type="number" step="0.1" /></label>
      <label>Y: <input type="number" step="0.1" /></label>
      <label>Z: <input type="number" step="0.1" /></label>
    </div>
  </div>
)}
```

### **2. `PositionPathVisualizer.jsx`**

Supportare array di punti:

```jsx
export default function PositionPathVisualizer({ 
  config, 
  visible = true,
  waypoints = []  // NUOVO!
}) {
  // Se ci sono waypoints, usa curva
  if (waypoints.length > 0) {
    const points = [
      new THREE.Vector3(config.startX, config.startY, config.startZ),
      ...waypoints.map(wp => new THREE.Vector3(wp.x, wp.y, wp.z)),
      new THREE.Vector3(config.endX, config.endY, config.endZ)
    ]
    
    const curve = new THREE.CatmullRomCurve3(points)
    const curvePoints = curve.getPoints(50)
    
    return (
      <group>
        <Line points={curvePoints} color="cyan" lineWidth={2} />
        
        {/* Marker per ogni waypoint */}
        {waypoints.map((wp, i) => (
          <mesh key={i} position={[wp.x, wp.y, wp.z]}>
            <sphereGeometry args={[0.06, 16, 16]} />
            <meshBasicMaterial color="yellow" />
          </mesh>
        ))}
      </group>
    )
  }
  
  // Altrimenti linea retta (come prima)
  // ...
}
```

### **3. `usePentolaAnimation.js`**

Seguire i waypoints in sequenza:

```javascript
// Se ci sono waypoints, segui il percorso
if (waypoints.length > 0) {
  // Determina su quale segmento siamo
  const currentSegment = getCurrentSegment(currentPos, waypoints)
  const target = waypoints[currentSegment]
  
  // Muovi verso il waypoint corrente
  currentPos.lerp(target, lerpFactor)
  
  // Se raggiunto, passa al prossimo
  if (currentPos.distanceTo(target) < 0.01) {
    currentWaypointIndex++
  }
}
```

---

## 🚀 **PIANO DI ROLLOUT**

### **FASE 1: Visualizzazione Base (COMPLETATA ✅)**
- PathHelper mostra già A → B
- Ghost Target (sfera rossa) su B

### **FASE 2: 1 Waypoint Fisso** ⬅️ PROSSIMO STEP
- Toggle UI on/off
- Click per posizionare 1 waypoint
- Visualizza curva A → W1 → B

### **FASE 3: Drag & Drop**
- Click + trascina sfere
- Aggiornamento real-time

### **FASE 4: Waypoints Multipli** (Futuro)
- Aggiungi/Rimuovi N waypoints
- Riordina sequenza

---

## 📋 **CHECKLIST IMPLEMENTAZIONE**

### **UI (AnimationEditor):**
- [ ] Aggiungere checkbox "Usa Waypoint"
- [ ] Sezione configurazione waypoint (X/Y/Z)
- [ ] Pulsante "Pick Waypoint" (come Pick Destination)
- [ ] Preview distanza totale percorso

### **Visualizzazione (PositionPathVisualizer):**
- [ ] Supportare array waypoints
- [ ] Renderizzare curve Catmull-Rom
- [ ] Marker gialli per waypoints
- [ ] Numeri sui waypoints (1, 2, 3...)

### **Animazione (usePentolaAnimation):**
- [ ] Logica per seguire waypoints in sequenza
- [ ] Transizioni smooth tra segmenti
- [ ] Velocità costante lungo la curva

### **Testing:**
- [ ] Test con 1 waypoint
- [ ] Test con 2-3 waypoints
- [ ] Test drag & drop (fase 3)
- [ ] Verifica nessun attraversamento muri

---

## 💡 **SUGGERIMENTI D'USO**

### **Caso d'Uso: Pentola Mobile → Fornelli**

**Problema:** Percorso diretto attraversa il muro

```
Mobile ●────X────● Fornelli
         (muro!)
```

**Soluzione:** Aggiungi waypoint sopra il piano cucina

```
Mobile ●───╮
           │ Waypoint sopra
           ╰──● Fornelli
```

### **Best Practices:**
1. **Waypoint 1:** Punto alto centrale (evita collisioni)
2. **Waypoint 2:** Vicino al target finale
3. **Evita** waypoints troppo vicini tra loro
4. **Testa** sempre l'animazione prima di salvare

---

## 🔍 **DEBUG**

### **Visualizzare Coordinate in Console:**

```javascript
console.log('📍 Percorso Pentola:')
console.log('  Start:', config.startX, config.startY, config.startZ)
waypoints.forEach((wp, i) => {
  console.log(`  W${i+1}:`, wp.x, wp.y, wp.z)
})
console.log('  End:', config.endX, config.endY, config.endZ)
```

### **Problemi Comuni:**

**Q:** Il waypoint non appare nella scena
**A:** Verifica che `visible={true}` e coordinate siano definite

**Q:** La curva è strana/va indietro
**A:** Ordina i punti in sequenza corretta A → W1 → W2 → B

**Q:** Attraversa ancora i muri
**A:** Aggiungi più waypoints o aumenta Y (altezza)

---

## 📚 **RISORSE**

- **Three.js Curves:** https://threejs.org/docs/#api/en/extras/curves/CatmullRomCurve3
- **React Three Fiber:** https://docs.pmnd.rs/react-three-fiber/
- **@react-three/drei Line:** https://github.com/pmndrs/drei#line

---

**Creato:** 18/12/2025
**Stato:** Fase 1 Completata - Pronto per Fase 2 (1 Waypoint)
**Next:** Implementare UI toggle + picker waypoint
