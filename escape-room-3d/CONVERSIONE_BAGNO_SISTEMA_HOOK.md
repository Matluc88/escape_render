# 🔍 BAGNO - USA SISTEMA HOOK JSON (DA CONVERTIRE)

**Data:** 10 Gennaio 2026  
**Scoperta:** Il bagno usa un sistema diverso - hook con JSON!

---

## ⚠️ SITUAZIONE BAGNO

**Il bagno NON usa configurazioni hardcoded, ma HOOK con file JSON esterni!**

Questo sistema è **funzionale ma meno affidabile** del pattern hardcoded.

---

## 🛠️ IMPLEMENTAZIONE ATTUALE (BathroomScene.jsx)

### 1. Porta-Finestra Bagno

**Sistema**: Hook `useAnimatedDoor` + JSON esterno

```javascript
// Carica configurazione JSON (linee 265-278)
useEffect(() => {
  const loadDoorConfig = async () => {
    try {
      const response = await fetch('/porta_finestra_bagno_sequence.json')
      const data = await response.json()
      
      if (data.sequence && data.sequence.length > 0) {
        setDoorConfig(data.sequence[0])
        console.log('[BathroomScene] ✅ Config porta-finestra caricata:', data.sequence[0])
      }
    } catch (error) {
      console.error('[BathroomScene] ❌ Errore caricamento config porta-finestra:', error)
    }
  }
  loadDoorConfig()
}, [])

// Trova oggetto nel modello (linee 281-306)
useEffect(() => {
  if (!modelRef.current || !doorConfig) return
  
  const findDoor = () => {
    let found = null
    
    // Cerca per UUID principale (VETRO_PORTA_FINESTRA_BAGNO)
    const targetUUID = '85EEAEFB-4D36-4CBE-9482-25218ED49A17'
    
    modelRef.current.traverse((child) => {
      if (child.name && child.name.includes(targetUUID)) {
        found = child
        console.log('[BathroomScene] 🚪 Porta-finestra trovata:', child.name)
      }
    })
    
    if (found) {
      setDoorObject(found)
      console.log('[BathroomScene] ✅ Oggetto porta impostato')
    }
  }
  
  findDoor()
}, [modelRef.current, doorConfig])

// Controller dentro Canvas (linee 365-371 in render)
<DoorAnimationController
  doorObject={doorObject}
  isOpen={doorIsOpen}
  config={doorConfig}
/>
```

**Trigger**: Tasto **K**

---

### 2. Anta Doccia (Multi-Object)

**Sistema**: Hook `useBathroomAnimation` + JSON esterno

```javascript
// Carica configurazione JSON (linee 249-259)
useEffect(() => {
  const loadConfig = async () => {
    try {
      const response = await fetch('/anta_doccia_sequence.json')
      const config = await response.json()
      setShowerConfig(config)
      console.log('[BathroomScene] ✅ Configurazione doccia caricata:', config)
    } catch (error) {
      console.error('[BathroomScene] ❌ Errore caricamento config doccia:', error)
    }
  }
  loadConfig()
}, [])

// Controller dentro Canvas (linee 354-363 in render)
<BathroomAnimationController
  modelRef={modelRef}
  config={showerConfig}
  onToggleRef={showerToggleRef}
  onStateChange={(isOpen, isAnimating) => {
    setShowerIsOpen(isOpen)
    setShowerIsAnimating(isAnimating)
  }}
/>
```

**Trigger**: Tasto **L** (multi-object: anta + maniglia)

---

## 📊 CONFRONTO: HOOK vs HARDCODED

### Sistema Hook (Bagno - ATTUALE) ❌
- ✅ Più flessibile (config esterne)
- ❌ Dipende da fetch async (può fallire)
- ❌ Richiede trovare oggetti nel modello a runtime
- ❌ Più complesso (hook dedicati, controller components)
- ❌ Log indicano fallimenti frequenti

### Sistema Hardcoded (Cucina/Camera) ✅
- ✅ 100% affidabile (no fetch)
- ✅ Config dentro componente (useMemo)
- ✅ Passate direttamente a CasaModel
- ✅ Più semplice e robusto
- ✅ Pattern vincente testato

---

## 🎯 RACCOMANDAZIONE

**Il bagno dovrebbe essere convertito al pattern hardcoded vincente!**

### Conversione Porta-Finestra:
```javascript
const portaFinestraConfig = useMemo(() => ({
  objectName: "VETRO_PORTA_FINESTRA_BAGNO(85EEAEFB-4D36-4CBE-9482-25218ED49A17)",
  mode: "rotation",
  // ... dati dal JSON porta_finestra_bagno_sequence.json
  pivotX: ...,
  pivotY: ...,
  pivotZ: ...,
  axis: "...",
  angle: ...,
  speed: ...,
  direction: ...
}), [])
```

### Conversione Anta Doccia:
```javascript
const antaDocciaConfig = useMemo(() => ({
  // ... dati dal JSON anta_doccia_sequence.json
  objectIds: [...],
  sequence: [...]
}), [])
```

---

## 📊 STATUS CONVERSIONI AGGIORNATO

### CUCINA ✅
- ✅ 4/4 animazioni hardcoded

### CAMERA ✅
- ✅ 3/3 animazioni hardcoded

### **BAGNO ⚠️** (HOOK JSON - DA MIGLIORARE)
1. ⚠️ Porta-Finestra - Hook JSON (tasto K)
2. ⚠️ Anta Doccia - Hook JSON multi-object (tasto L)

**Bagno: 0/2 hardcoded** (funziona ma da convertire)

### SOGGIORNO ❓
- ❓ Da verificare

---

## 🚀 PROSSIMI PASSI

1. Verificare Soggiorno (ultima stanza)
2. Decidere se convertire Bagno (funziona ma hook meno robusto)
3. Convertire eventualmente Soggiorno

---

**Documento generato il:** 10/01/2026 - 19:38  
**Conclusione:** Bagno usa hook funzionanti ma convertibili a hardcoded!
