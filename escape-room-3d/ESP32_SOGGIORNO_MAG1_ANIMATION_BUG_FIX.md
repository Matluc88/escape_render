# 🐛 ESP32 Soggiorno MAG1 - Bug Animazione Divano RISOLTO

**Data:** 14/01/2026  
**Issue:** L'animazione divano+humano non partiva al completamento TV (MAG1)  
**Status:** ✅ RISOLTO

---

## 🔍 Analisi Problema

### Sintomi
- Console mostrava errore: `Warning: React has detected a change in the order of Hooks`
- L'animazione NON partiva quando MAG1 completava la TV
- WebSocket funzionava (stato TV cambiava correttamente)
- Auto-trigger rilevava la transizione `active → completed`

### Root Cause
**Violazione regola fondamentale di React:** Gli hook devono essere chiamati **sempre nello stesso ordine** ad ogni render.

Nel componente `LivingRoomAnimationController` c'era un **return anticipato** che impediva la chiamata dell'hook:

```javascript
// ❌ CODICE BUGGATO
function LivingRoomAnimationController({ modelRef, config, isPlaying, animState, onComplete }) {
  const [humanObject, setHumanObject] = useState(null)
  const [couchObject, setCouchObject] = useState(null)
  
  useEffect(() => {
    // Trova oggetti...
  }, [modelRef])
  
  // ❌ BUG: Return PRIMA dell'hook!
  if (!humanObject || !couchObject || !config) {
    return null // ← Esce PRIMA di chiamare l'hook!
  }
  
  // ❌ Hook MAI raggiunto quando config è null!
  useLivingRoomAnimation(
    humanObject,
    couchObject,
    config,
    isPlaying,
    onComplete
  )
  
  return null
}
```

### Perché si verificava solo al primo caricamento?
1. Al mount iniziale, `config` era `null` (ancora in caricamento)
2. Il componente usciva al `return` anticipato
3. L'hook `useLivingRoomAnimation` NON veniva chiamato
4. React registrava: "0 hook chiamati in questo componente"
5. Quando `config` si caricava, tentava di chiamare l'hook
6. React rilevava: "Prima 0 hook, ora 1 hook → ERRORE!"

---

## ✅ Soluzione (2 Fix Necessari)

### Fix #1: Rimosso return anticipato in LivingRoomAnimationController

```javascript
// ✅ CODICE CORRETTO
function LivingRoomAnimationController({ modelRef, config, isPlaying, animState, onComplete }) {
  const [humanObject, setHumanObject] = useState(null)
  const [couchObject, setCouchObject] = useState(null)
  
  useEffect(() => {
    // Trova oggetti...
  }, [modelRef])
  
  // ✅ Hook SEMPRE chiamato (regola React rispettata!)
  useLivingRoomAnimation(
    humanObject,
    couchObject,
    config,
    isPlaying,
    onComplete
  )
  
  return null
}
```

### Fix #2: Rimossa guard troppo restrittiva nel useEffect setup

**Problema:** Il setup useEffect dell'hook usciva se `config` era null, impedendo la creazione del pivot!

```javascript
// ❌ GUARD TROPPO RESTRITTIVA
useEffect(() => {
  if (!humanObject || !couchObject || !config) {  // ← config è null al primo render!
    return // Esce SENZA creare pivot
  }
  // ... crea pivot ...
}, [humanObject?.uuid, couchObject?.uuid, config?.mode])

// ✅ GUARD CORRETTA - Controlla solo oggetti
useEffect(() => {
  if (!humanObject || !couchObject) {  // ← OK se config è null
    return
  }
  
  // Usa coordinate di default se config non ancora caricato
  const pivotWorldPos = new THREE.Vector3(
    config?.pivotX || 0,
    0,
    config?.pivotZ || 0
  )
  // ... crea pivot ...
}, [humanObject?.uuid, couchObject?.uuid]) // ← Rimosso config dalle dipendenze
```

**Perché è necessario:**
- `config` viene caricato asincronamente dal JSON file
- Al primo render è `null`
- La guard precedente impediva la creazione del pivot
- Ora il pivot viene creato appena gli oggetti sono trovati
- `useFrame` ha già la sua guard per controllare config prima di animare

L'hook `useLivingRoomAnimation` ha già la sua guard nel `useFrame` per controllare config:

```javascript
// Hook ha guard nel useFrame (NON nel setup!)
export function useLivingRoomAnimation(humanObject, couchObject, config, isPlaying, onComplete) {
  // Setup pivot (può avvenire prima che config sia caricato)
  useEffect(() => {
    if (!humanObject || !couchObject) return
    // Crea pivot con coordinate di default se config è null
    const pivotPos = new THREE.Vector3(
      config?.pivotX || 0, 
      0, 
      config?.pivotZ || 0
    )
    // ... crea pivot e attach oggetti ...
  }, [humanObject?.uuid, couchObject?.uuid])
  
  // Animazione (controlla config prima di animare)
  useFrame(() => {
    // ✅ Guard per animazione
    if (!isPlaying || !config || !pivotGroupRef.current) return
    
    // ... animazione ...
  })
}
```

---

## 📚 Regole React Hook (ripasso)

### ✅ Regola #1: Chiamare gli hook sempre nello stesso ordine
```javascript
// ❌ SBAGLIATO
if (condition) {
  useEffect(() => {}, [])  // Condizionale!
}

// ✅ CORRETTO
useEffect(() => {
  if (condition) {
    // Logica condizionale DENTRO l'hook
  }
}, [])
```

### ✅ Regola #2: Nessun return prima degli hook
```javascript
// ❌ SBAGLIATO
if (!data) return null
useSomeHook(data)  // Mai raggiunto!

// ✅ CORRETTO
useSomeHook(data)  // Sempre chiamato
if (!data) return null  // Return DOPO
```

### ✅ Regola #3: Hook all'inizio del componente
```javascript
// ✅ CORRETTO: Hook prima di ogni altra logica
function Component() {
  const [state, setState] = useState(null)
  const value = useSomeHook()
  
  if (!value) return null  // OK dopo gli hook
  
  return <div>{value}</div>
}
```

---

## 🎯 Testing

### Test 1: Caricamento Iniziale
✅ Console pulita (nessun warning hook)  
✅ Config caricato senza errori  

### Test 2: Animazione Manuale (Tasto M)
✅ Divano ruota a 22°  
✅ TV si accende verde  
✅ LED pianta passa a ROSSO  

### Test 3: MAG1 Auto-Trigger
✅ ESP32 invia completamento TV  
✅ Backend aggiorna stato `completed`  
✅ WebSocket notifica frontend  
✅ Animazione parte automaticamente  

---

## 📝 Files Modificati

- `src/components/scenes/LivingRoomScene.jsx` (LivingRoomAnimationController)

## 🚀 Deploy

```bash
./deploy-404fix.sh
```

---

## 🎓 Lezione Imparata

**SEMPRE rispettare le regole degli hook React!**

Quando un hook ha bisogno di parametri che potrebbero essere null:
1. ✅ Chiamare SEMPRE l'hook (regola React)
2. ✅ Gestire i null DENTRO l'hook con guard interne
3. ❌ MAI usare return anticipati prima degli hook

Gli hook React non sono normali funzioni - hanno requirements speciali per il tracking interno di React!

---

**Status Finale:** 🎉 Bug risolto - Animazione soggiorno funzionante!
