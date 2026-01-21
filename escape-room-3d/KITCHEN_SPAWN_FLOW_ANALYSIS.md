# 🍳 ANALISI FLUSSO DI CARICAMENTO CUCINA
## Perché la Cucina Funziona Perfettamente

**Data:** 16/01/2026 ore 08:43  
**Fonte:** KitchenScene.jsx analisi completa

---

## 🎯 COORDINATE DEFINITIVE APPLICATE

### Database Locale (✅ AGGIORNATO)
```sql
cucina:    x: -0.94, y: 0, z: 2.14, yaw: 2.48 (142°)
soggiorno: x:  0.54, y: 0, z: 1.51, yaw: 5.39 (309°)
bagno:     x:  1.31, y: 0, z: 2.77, yaw: 3.53 (202°)
camera:    x: -0.56, y: 0, z: 1.31, yaw: 0.46 (26°)
```

### File Aggiornati
1. ✅ `backend/alembic/versions/002_add_spawn_data.py`
2. ✅ `src/utils/cameraPositioning.js`
3. ✅ `fix-spawn-DEFINITIVE-16-GEN-2026.sql`

---

## 🔍 PERCHÉ IL FLUSSO CUCINA FUNZIONA BENE

### 1. **LOADING OVERLAY ROBUSTO**
```javascript
// ✅ Parte SUBITO come TRUE - copre immediatamente
const [isLoading, setIsLoading] = useState(true)

// ✅ Timer garantito di 5 secondi
useEffect(() => {
  const startTime = Date.now()
  const duration = 5000
  
  const progressInterval = setInterval(() => {
    const elapsed = Date.now() - startTime
    const progress = Math.min(100, (elapsed / duration) * 100)
    setLoadingProgress(progress)
    
    if (elapsed >= duration) {
      clearInterval(progressInterval)
      setIsLoading(false)  // ← GARANTITO dopo 5s
    }
  }, 100)
}, [])
```

**Perché funziona:**
- Overlay visibile dal primo frame
- Progress bar animata (feedback visivo)
- Timer garantisce chiusura anche se altri sistemi falliscono
- Nessun "flash" di scena non caricata

---

### 2. **GUARD ANTI-DOPPIO-MOUNT (React StrictMode)**
```javascript
const spawnLoadedRef = useRef(false)

useEffect(() => {
  // 🛡️ PREVIENE doppio caricamento da StrictMode
  if (spawnLoadedRef.current) {
    console.log('🔒 Spawn già caricato, skip doppio mount')
    return
  }
  spawnLoadedRef.current = true
  
  // Carica spawn solo UNA volta
  loadSpawnPosition()
}, [])
```

**Perché funziona:**
- React StrictMode in dev causa doppio mount intenzionale
- Guard con useRef previene doppia chiamata API
- Coordinate caricate UNA sola volta
- Nessuna race condition

---

### 3. **CARICAMENTO ASYNC SPAWN + FALLBACK**
```javascript
const loadSpawnPosition = async () => {
  try {
    // ✅ Carica da DATABASE via API
    const captured = await getCapturedPosition('cucina')
    
    if (captured) {
      setSpawnPosition({
        x: captured.position.x,
        y: captured.position.y,
        z: captured.position.z
      })
      setHasCapturedPosition(true)
    } else {
      // ⚠️ FALLBACK se API non risponde
      setSpawnPosition({ x: 0, y: 0, z: 0 })
      setHasCapturedPosition(false)
    }
  } catch (error) {
    // ❌ Fallback in caso di errore
    setSpawnPosition({ x: 0, y: 0, z: 0 })
  }
}
```

**Perché funziona:**
- Try-catch robusto
- Fallback sempre disponibile
- Nessun crash se API offline
- State aggiornato in OGNI caso

---

### 4. **CANVAS RENDER CONDIZIONALE**
```javascript
{/* NON renderizzare Canvas finché spawn non è caricato */}
{safeSpawnPosition && (
  <Canvas>
    <PerspectiveCamera
      makeDefault
      fov={75}
      position={[safeSpawnPosition.x, eyeHeight, safeSpawnPosition.z]}
    />
    
    {/* Aspetta spawn prima di creare FPSController */}
    {safeSpawnPosition && (
      <FPSController 
        initialPosition={safeSpawnPosition}
        initialYaw={initialYaw}
        // ...
      />
    )}
  </Canvas>
)}
```

**Perché funziona:**
- Canvas non renderizzato fino a coordinate pronte
- Nessun "jitter" di camera non posizionata
- FPSController riceve SEMPRE coordinate valide
- Doppio guard per sicurezza

---

### 5. **CAMERA ESPLICITA CON makeDefault**
```javascript
<PerspectiveCamera
  makeDefault  // ← FORZA questa come camera attiva!
  fov={75}
  near={0.1}
  position={[safeSpawnPosition.x, eyeHeight, safeSpawnPosition.z]}
/>
```

**Perché funziona:**
- `makeDefault` forza R3F a usare questa camera
- Evita conflitti con altre camere nel modello
- Position esplicita al momento del mount
- Sync perfetto con FPSControls

---

### 6. **YAW CARICATO SEPARATAMENTE**
```javascript
const [initialYaw, setInitialYaw] = useState(1.57) // Default: 90°

useEffect(() => {
  const loadYaw = async () => {
    const captured = await getCapturedPosition('cucina')
    if (captured && captured.yaw !== undefined) {
      setInitialYaw(captured.yaw)
    }
  }
  loadYaw()
}, [])
```

**Perché funziona:**
- Yaw ha default sensato (90°)
- Caricato async senza bloccare spawn position
- Se API fallisce, usa default
- FPSController riceve yaw corretto

---

### 7. **COLLISION SYSTEM OTTIMIZZATO**
```javascript
// CasaModel fornisce liste PRE-CALCOLATE
if (modelRef && (modelRef.forcedCollidables || modelRef.forcedGrounds)) {
  console.log('🚀 USANDO LISTE FORZATE DA CASAMODEL')
  
  let cols = modelRef.forcedCollidables || []
  let grnds = modelRef.forcedGrounds || []
  
  setCollisionObjects(cols)
  setGroundObjects(grnds)
}
```

**Perché funziona:**
- CasaModel calcola collisioni UNA volta
- Nessun traverse pesante ad ogni frame
- Liste passate direttamente a FPSController
- Performance ottimale

---

## 🎓 PATTERN CHIAVE DA REPLICARE

### ✅ CHECKLIST Sistema Spawn Robusto

1. **Loading Overlay**
   - [ ] Parte da `true` al mount
   - [ ] Timer minimo garantito (es. 5s)
   - [ ] Progress bar animata
   - [ ] Visibile FINO a coordinate pronte

2. **Guard Anti-Doppio-Mount**
   - [ ] useRef per tracciare mount
   - [ ] Check all'inizio di useEffect
   - [ ] Skip se già montato

3. **Caricamento Async**
   - [ ] Try-catch completo
   - [ ] Fallback sempre disponibile
   - [ ] State aggiornato in OGNI caso
   - [ ] Log dettagliato per debug

4. **Render Condizionale**
   - [ ] Canvas renderizzato SOLO con coordinate
   - [ ] FPSController riceve coordinate valide
   - [ ] Doppio guard per sicurezza

5. **Camera Setup**
   - [ ] PerspectiveCamera con `makeDefault`
   - [ ] Position esplicita da spawn
   - [ ] Yaw caricato separatamente con default

6. **Collision Ottimizzato**
   - [ ] Liste pre-calcolate da CasaModel
   - [ ] Nessun traverse ad ogni frame
   - [ ] Performance costante

---

## 📊 CONFRONTO: Cucina vs Altre Stanze

| Feature | Cucina ✅ | Soggiorno ❌ | Bagno ❌ | Camera ❌ |
|---------|-----------|--------------|----------|-----------|
| Loading Overlay Garantito | ✅ Timer 5s | ⚠️ Dipende da FPS | ⚠️ Dipende da FPS | ⚠️ Dipende da FPS |
| Guard Anti-Doppio-Mount | ✅ useRef | ❌ No | ❌ No | ❌ No |
| Try-Catch Spawn | ✅ Completo | ⚠️ Parziale | ⚠️ Parziale | ⚠️ Parziale |
| Canvas Condizionale | ✅ Doppio guard | ⚠️ Singolo | ⚠️ Singolo | ⚠️ Singolo |
| Camera makeDefault | ✅ Esplicita | ❓ Verificare | ❓ Verificare | ❓ Verificare |
| Yaw Default Sensato | ✅ 90° | ✅ 299° | ✅ 209° | ✅ 35° |

---

## 🔧 AZIONI DA FARE

### Database Raspberry (MANUALE)
```bash
# 1. SSH sul Raspberry
ssh pi@192.168.8.10

# 2. Copia lo script SQL
# (trasferisci fix-spawn-DEFINITIVE-16-GEN-2026.sql tramite USB o altro metodo)

# 3. Esegui lo script
docker exec escape-db psql -U escape_user -d escape_db < fix-spawn-DEFINITIVE-16-GEN-2026.sql

# 4. Verifica
docker exec escape-db psql -U escape_user -d escape_db -c "SELECT name, spawn_data FROM rooms WHERE name IN ('livingroom', 'bathroom', 'bedroom', 'kitchen') ORDER BY name;"
```

### Test Completo
1. ✅ Cucina - Verificare che coordinate siano corrette
2. ⚠️ Soggiorno - Testare con nuove coordinate
3. ⚠️ Bagno - Testare con nuove coordinate
4. ⚠️ Camera - Testare con nuove coordinate

---

## 🎯 CONCLUSIONE

Il flusso di caricamento della **Cucina** funziona perfettamente perché:

1. **Overlay garantito** - Timer minimo 5 secondi
2. **Guard robusti** - Previene doppi caricamenti
3. **Fallback sempre disponibili** - Nessun crash
4. **Render condizionale** - Canvas solo con coordinate
5. **Camera esplicita** - `makeDefault` forza sync
6. **Performance ottimizzate** - Liste pre-calcolate

Questi pattern andrebbero **replicati in TUTTE le altre scene** per garantire la stessa robustezza!

---

**File correlati:**
- `src/components/scenes/KitchenScene.jsx` - Implementazione di riferimento
- `src/utils/cameraPositioning.js` - Sistema spawn unificato
- `backend/alembic/versions/002_add_spawn_data.py` - Coordinate database