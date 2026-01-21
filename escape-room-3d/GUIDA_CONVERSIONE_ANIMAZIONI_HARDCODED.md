# 🔧 GUIDA CONVERSIONE ANIMAZIONI JSON → HARDCODED

**Data:** 10 Gennaio 2026  
**Scopo:** Convertire le 9 animazioni problematiche da JSON a hardcoded usando il pattern vincente

---

## 🎯 PATTERN VINCENTE - useAnimatedDoor

### Template Base Funzionante al 100%

```javascript
import { useAnimatedDoor } from '../hooks/useAnimatedDoor';

// Nel componente Scene
const doorRef = useRef();

// Configurazione hardcoded
const doorConfig = {
  objectName: "nome_oggetto",    // Nome esatto dall'object 3D
  mode: "rotation",              // Sempre "rotation" per porte
  pivotX: x,                     // Coordinata X del cardine
  pivotY: y,                     // Coordinata Y del cardine (di solito 0.754)
  pivotZ: z,                     // Coordinata Z del cardine
  axis: "x|y|z",                 // Asse di rotazione
  angle: 90,                     // Gradi di rotazione (standard 90°)
  speed: 90,                     // Velocità animazione (standard 90)
  direction: 1 o -1              // 1 = orario, -1 = antiorario
};

// Hook per l'animazione
useAnimatedDoor(doorRef, isOpen, doorConfig);

// Nel JSX
<primitive 
  ref={doorRef}
  object={scene.children.find(child => child.name === 'nome_oggetto')} 
/>
```

---

## ✅ ESEMPI FUNZIONANTI DA REPLICARE

### 1. Anta Mobile Smart (Cucina)
```javascript
const antaMobileConfig = {
  objectName: "anta_mobile_smart",
  mode: "rotation",
  pivotX: -2.872,
  pivotY: 0.754,
  pivotZ: 0.571,
  axis: "z",
  angle: 90,
  speed: 90,
  direction: -1  // Antiorario
};

// Uso
const [isAntaMobileOpen, setIsAntaMobileOpen] = useState(false);
useAnimatedDoor(antaMobileRef, isAntaMobileOpen, antaMobileConfig);

// Trigger
useEffect(() => {
  const handleKeyPress = (e) => {
    if (e.key === '1') setIsAntaMobileOpen(true);
    if (e.key === '2') setIsAntaMobileOpen(false);
  };
  window.addEventListener('keydown', handleKeyPress);
  return () => window.removeEventListener('keydown', handleKeyPress);
}, []);
```

### 2. Sportello Frigo (Cucina)
```javascript
const frigoConfig = {
  objectName: "sportello_frigo",
  mode: "rotation",
  pivotX: 1.725,
  pivotY: 0.754,
  pivotZ: -2.089,
  axis: "y",
  angle: 90,
  speed: 90,
  direction: 1  // Orario
};

// Uso identico al precedente ma con tasti 3-4
```

### 3. Porta Ingresso (Esterno) - CON AUTOPIVOT
```javascript
const portaIngressoConfig = {
  objectName: "porta_ingresso",
  mode: "rotation",
  autoPivot: true,  // Calcolo automatico del pivot!
  axis: "y",
  angle: 90,
  speed: 90,
  direction: 1
};

// Uso con MQTT
useAnimatedDoor(portaRef, isMqttOpen, portaIngressoConfig);
```

---

## 🔨 CONVERSIONI DA FARE (9 animazioni)

### CUCINA

#### 1. Porta Cucina (Tasto 7-8)
**File attuale:** `public/porta_cucina_sequence.json` ❌  
**Convertire a:** Hardcoded in `KitchenScene.jsx`

```javascript
const portaCucinaConfig = {
  objectName: "porta_cucina",  // O nome corretto dal modello
  mode: "rotation",
  autoPivot: true,  // Usa autopivot per semplicità
  axis: "y",        // Di solito le porte ruotano su Y
  angle: 90,
  speed: 90,
  direction: 1
};

const [isPortaCucinaOpen, setIsPortaCucinaOpen] = useState(false);
useAnimatedDoor(portaCucinaRef, isPortaCucinaOpen, portaCucinaConfig);

// Trigger
useEffect(() => {
  const handleKeyPress = (e) => {
    if (e.key === '7') setIsPortaCucinaOpen(true);
    if (e.key === '8') setIsPortaCucinaOpen(false);
  };
  window.addEventListener('keydown', handleKeyPress);
  return () => window.removeEventListener('keydown', handleKeyPress);
}, []);
```

**Passi:**
1. Aprire `src/components/scenes/KitchenScene.jsx`
2. Aggiungere import: `import { useAnimatedDoor } from '../../hooks/useAnimatedDoor';`
3. Creare ref: `const portaCucinaRef = useRef();`
4. Aggiungere useState e useEffect per i tasti
5. Aggiungere configurazione hardcoded
6. Chiamare `useAnimatedDoor(portaCucinaRef, isPortaCucinaOpen, portaCucinaConfig);`
7. Nel JSX, trovare l'oggetto e aggiungere ref
8. **TESTARE** con tasti 7-8
9. Rimuovere/rinominare `public/porta_cucina_sequence.json`

---

### CAMERA

#### 2. Porta-Finestra Camera (Tasto N)
**File attuale:** `public/porta_finestra_camera_sequence.json` ❌  
**Convertire a:** Hardcoded in `BedroomScene.jsx`

```javascript
const portaFinCameraConfig = {
  objectName: "porta_finestra_camera",  // O "porta_letto"
  mode: "rotation",
  autoPivot: true,
  axis: "y",
  angle: 90,
  speed: 90,
  direction: 1
};

const [isPortaFinCameraOpen, setIsPortaFinCameraOpen] = useState(false);
useAnimatedDoor(portaFinCameraRef, isPortaFinCameraOpen, portaFinCameraConfig);

// Trigger tasto N
useEffect(() => {
  const handleKeyPress = (e) => {
    if (e.key === 'n' || e.key === 'N') {
      setIsPortaFinCameraOpen(prev => !prev);  // Toggle
    }
  };
  window.addEventListener('keydown', handleKeyPress);
  return () => window.removeEventListener('keydown', handleKeyPress);
}, []);
```

---

### BAGNO

#### 3. Porta-Finestra Bagno (Tasto B)
**File attuale:** `public/porta_finestra_bagno_sequence.json` ❌  
**Convertire a:** Hardcoded in `BathroomScene.jsx`

```javascript
const portaFinBagnoConfig = {
  objectName: "porta_finestra_bagno",
  mode: "rotation",
  autoPivot: true,
  axis: "y",
  angle: 90,
  speed: 90,
  direction: 1
};

const [isPortaFinBagnoOpen, setIsPortaFinBagnoOpen] = useState(false);
useAnimatedDoor(portaFinBagnoRef, isPortaFinBagnoOpen, portaFinBagnoConfig);

// Trigger tasto B
useEffect(() => {
  const handleKeyPress = (e) => {
    if (e.key === 'b' || e.key === 'B') {
      setIsPortaFinBagnoOpen(prev => !prev);
    }
  };
  window.addEventListener('keydown', handleKeyPress);
  return () => window.removeEventListener('keydown', handleKeyPress);
}, []);
```

#### 4. Anta Doccia Multi-Object (Tasto M)
**File attuale:** `public/anta_doccia_sequence.json` ❌  
**Convertire a:** Hardcoded in `BathroomScene.jsx` con **3 ante sincronizzate**

```javascript
// Configurazione per 3 ante
const antaDoccia1Config = {
  objectName: "anta_doccia_1",  // Nomi da verificare nel modello
  mode: "rotation",
  autoPivot: true,
  axis: "y",
  angle: 90,
  speed: 90,
  direction: 1
};

const antaDoccia2Config = {
  objectName: "anta_doccia_2",
  mode: "rotation",
  autoPivot: true,
  axis: "y",
  angle: 90,
  speed: 90,
  direction: -1  // Direzione opposta?
};

const antaDoccia3Config = {
  objectName: "anta_doccia_3",
  mode: "rotation",
  autoPivot: true,
  axis: "y",
  angle: 90,
  speed: 90,
  direction: 1
};

// 3 refs
const antaDoccia1Ref = useRef();
const antaDoccia2Ref = useRef();
const antaDoccia3Ref = useRef();

// 1 stato condiviso per tutte
const [isAntaDocciaOpen, setIsAntaDocciaOpen] = useState(false);

// 3 hook sincronizzati
useAnimatedDoor(antaDoccia1Ref, isAntaDocciaOpen, antaDoccia1Config);
useAnimatedDoor(antaDoccia2Ref, isAntaDocciaOpen, antaDoccia2Config);
useAnimatedDoor(antaDoccia3Ref, isAntaDocciaOpen, antaDoccia3Config);

// Trigger tasto M
useEffect(() => {
  const handleKeyPress = (e) => {
    if (e.key === 'm' || e.key === 'M') {
      setIsAntaDocciaOpen(prev => !prev);
    }
  };
  window.addEventListener('keydown', handleKeyPress);
  return () => window.removeEventListener('keydown', handleKeyPress);
}, []);
```

**Nota:** Questo pattern è simile a Humano+CouchSet nel soggiorno!

---

### SOGGIORNO

#### 5. Porta Soggiorno (UUID: B4B3C2EF)
**Convertire a:** Hardcoded in `LivingRoomScene.jsx`

```javascript
const portaSoggiornoConfig = {
  objectName: "porta_soggiorno",  // O nome con UUID
  mode: "rotation",
  autoPivot: true,
  axis: "y",
  angle: 90,
  speed: 90,
  direction: 1
};

// Trigger da definire (tasto?)
```

---

### OGGETTI DI POSIZIONE

#### 6. Pentola (Cucina) - Fix Hardcoded
**File attuale:** `usePentolaAnimation.js` ❌ (problematica)  
**Da verificare:** Coordinate hardcoded

Il problema della pentola potrebbe essere nel hook. Verificare:
```javascript
// In usePentolaAnimation.js
const startPosition = [-2.6, 0.8, -0.3];  // Verificare se corrette
const endPosition = [-0.4, 0.8, -0.3];

// Assicurarsi che l'animazione usi correttamente questi valori
```

#### 7. Pianta (Soggiorno) - Da JSON a Hardcoded
**File attuale:** `public/pianta_soggiorno_sequence.json` ❌  
**Convertire a:** Hook hardcoded simile a Pentola

Creare `usePiantaAnimation.js`:
```javascript
import { useEffect } from 'react';
import * as THREE from 'three';

export const usePiantaAnimation = (objectRef, isRaised) => {
  useEffect(() => {
    if (!objectRef.current) return;

    const startY = -2.0;  // Sotto terra
    const endY = 0.5;     // Posizione finale visibile
    const duration = 2000; // 2 secondi
    
    const startTime = Date.now();
    const initialY = objectRef.current.position.y;
    const targetY = isRaised ? endY : startY;
    
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      const eased = 1 - Math.pow(1 - progress, 3); // Ease out cubic
      
      objectRef.current.position.y = 
        initialY + (targetY - initialY) * eased;
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    
    animate();
  }, [objectRef, isRaised]);
};
```

Uso in `LivingRoomScene.jsx`:
```javascript
import { usePiantaAnimation } from '../../hooks/usePiantaAnimation';

const piantaRef = useRef();
const [isPiantaRaised, setIsPiantaRaised] = useState(false);

usePiantaAnimation(piantaRef, isPiantaRaised);

// Trigger tasto P
useEffect(() => {
  const handleKeyPress = (e) => {
    if (e.key === 'p' || e.key === 'P') {
      setIsPiantaRaised(prev => !prev);
    }
  };
  window.addEventListener('keydown', handleKeyPress);
  return () => window.removeEventListener('keydown', handleKeyPress);
}, []);
```

---

## 📋 CHECKLIST CONVERSIONE

### Per ogni animazione:

- [ ] **Step 1:** Identificare nome oggetto nel modello 3D
- [ ] **Step 2:** Creare ref per l'oggetto
- [ ] **Step 3:** Creare useState per lo stato (aperto/chiuso)
- [ ] **Step 4:** Creare configurazione hardcoded
- [ ] **Step 5:** Chiamare useAnimatedDoor con config
- [ ] **Step 6:** Aggiungere trigger (tasti/MQTT)
- [ ] **Step 7:** Collegare ref nel JSX
- [ ] **Step 8:** TESTARE funzionamento
- [ ] **Step 9:** Rimuovere file JSON vecchio
- [ ] **Step 10:** Documentare nel resoconto

---

## 🧪 TESTING

### Come testare ogni conversione:

1. **Salvare il file modificato**
2. **Ricaricare la scena** (Ctrl+R o Cmd+R)
3. **Premere il tasto trigger** (es. tasto 7 per porta cucina)
4. **Verificare che l'animazione:**
   - Parte dall'angolo corretto
   - Ruota nella direzione corretta
   - Si ferma all'angolo giusto (90°)
   - È fluida e senza scatti
5. **Premere il tasto opposto** (es. tasto 8)
6. **Verificare che torna alla posizione iniziale**

### Debug se non funziona:

```javascript
// Aggiungere console.log per debug
useEffect(() => {
  console.log('🚪 Porta config:', portaConfig);
  console.log('🚪 Porta ref:', portaRef.current);
  console.log('🚪 Porta state:', isOpen);
}, []);
```

---

## 🎯 RACCOMANDAZIONI

### 1. Ordine di Conversione Consigliato

1. **Porta Cucina** (più semplice, singola)
2. **Porta Finestra Camera** (simile alla cucina)
3. **Porta Finestra Bagno** (simile alle precedenti)
4. **Porta Soggiorno** (simile alle precedenti)
5. **Anta Doccia** (multi-object, più complessa)
6. **Pentola** (fix esistente)
7. **Pianta** (nuovo hook da creare)

### 2. Pattern autoPivot vs Pivot Manuale

**Usa `autoPivot: true` quando:**
- Non conosci le coordinate esatte del cardine
- L'oggetto ha una forma simmetrica
- Vuoi una soluzione rapida

**Usa pivot manuale quando:**
- Hai le coordinate precise (come anta mobile/frigo)
- L'autoPivot non funziona bene
- Vuoi controllo totale

### 3. Backup Prima di Iniziare

```bash
# Fare backup dei file JSON prima di eliminarli
cd /Users/matteo/Desktop/ESCAPE/escape-room-3d/public
mkdir _backup_json_animations
cp *.json _backup_json_animations/
```

---

## ✅ VANTAGGI PATTERN HARDCODED

1. **Affidabilità 100%** - Testato e funzionante
2. **Performance migliori** - No caricamento JSON
3. **Manutenibilità** - Tutto il codice in un posto
4. **Type safety** - Errori rilevati subito
5. **Debugging facile** - Console.log diretto
6. **Nessuna dipendenza esterna** - No file JSON da gestire

---

## 📊 RISULTATO ATTESO

**Dopo tutte le conversioni:**
- ✅ 14/14 animazioni funzionanti al 100%
- ✅ 0 dipendenze da file JSON problematici
- ✅ Codice pulito e manutenibile
- ✅ Pattern uniforme per tutte le animazioni
- ✅ Testing più semplice e veloce

---

**Documento creato il:** 10/01/2026 - 19:32  
**Versione:** 1.0  
**Autore:** Cline AI Assistant  
**Per:** Conversione completa animazioni JSON → Hardcoded
