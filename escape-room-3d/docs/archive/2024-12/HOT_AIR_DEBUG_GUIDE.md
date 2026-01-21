# 🌡️ HOT AIR EFFECT - GUIDA DEBUG

## ⚠️ PROBLEMA ATTUALE
L'effetto aria calda non è visibile quando si preme J.

## 🔍 CHECKLIST DEBUG

### 1. Verifica Console Logs
Quando premi **J**, dovresti vedere nella console:
```
[BedroomScene] 🌡️ Tasto J - Aria Calda: ATTIVA
[HotAirEffect] 🌡️ Griglia trovata: GRIGLIA_VENTOLA_LETTO...
[HotAirEffect] 📍 COORDINATE GRIGLIA: ...
[HotAirEffect] 🎯 DIREZIONE CALCOLATA: ...
```

**Se NON vedi questi log:**
- L'effetto non si sta attivando
- Problema nel binding del tasto J
- Verifica che `hotAirActive` cambi stato

### 2. Verifica Griglia Trovata
```javascript
[HotAirEffect] 🌡️ Griglia trovata: GRIGLIA_VENTOLA_LETTO(04B1AD94-22FD-4C99-BDBE-DF1BA5FC33EA)
```

**Se questo log NON appare:**
- La griglia non esiste nel modello GLB
- L'UUID è cambiato
- Il nome dell'oggetto è diverso

### 3. Verifica Posizione Griglia
```
World Position: (-1.015, -0.109, 0.857)
```

**Se la posizione è molto lontana dal player:**
- Le particelle potrebbero essere fuori dalla vista
- La griglia potrebbe essere in un'altra stanza

### 4. Problemi Comuni

#### A) Particelle Invisibili
**Causa**: Shader non compila o geometria non renderizza
**Soluzione**: Verifica errori WebGL nella console

#### B) Gruppo Non Renderizzato
**Causa**: `enabled={false}` o stato React non aggiornato
**Soluzione**: Verifica che `hotAirActive === true`

#### C) Posizionamento Errato
**Causa**: Offset troppo grande o direzione sbagliata
**Soluzione**: Riduci offset a 0 temporaneamente

## 🛠️ TEST SEMPLIFICATO

### STEP 1: Verifica Base
Modifica `HotAirEffect.jsx` linea ~128:

```javascript
// ORIGINALE:
groupRef.current.position.set(-0.3, 0, 0)

// TEST: Nessun offset
groupRef.current.position.set(0, 0, 0)
```

### STEP 2: Particelle Sempre Visibili
Modifica BedroomScene.jsx:

```javascript
// ORIGINALE:
<HotAirEffect
  enabled={hotAirActive}  // ❌ Dipende da stato
  ...
/>

// TEST: Sempre attivo
<HotAirEffect
  enabled={true}  // ✅ SEMPRE ON
  ...
/>
```

### STEP 3: Aumenta Visibilità Estrema
Modifica parametri in BedroomScene.jsx:

```javascript
<HotAirEffect
  enabled={true}
  particleCount={200}      // Più particelle
  particleOpacity={0.8}    // Molto più opache
  particleSize={100}       // Enormi!
  speed={0.3}             // Più lente
  debug={true}            // Debug ON
/>
```

## 🎯 OUTPUT ATTESO

### Console (quando J premuto):
```
[BedroomScene] 🌡️ Tasto J - Aria Calda: ATTIVA
[HotAirEffect] 🌡️ Griglia trovata: GRIGLIA_VENTOLA_LETTO(04B1AD94-22FD-4C99-BDBE-DF1BA5FC33EA)
[HotAirEffect] 📍 COORDINATE GRIGLIA:
  World Position: (-1.015, -0.109, 0.857)
  Dimensioni: (0.005, 0.255, 0.255)
[HotAirEffect] ✅ Effetto vincolato come child della griglia
[HotAirEffect] 🎯 DIREZIONE CALCOLATA:
  Da: (-1.018, -0.109, 0.857)
  A: (-0.170, 0.000, 1.400)
  Direzione normalizzata: (0.837, 0.108, 0.536)
[HotAirEffect] ✅ Direzione aggiornata nello shader
[HotAirEffect] ✨ Particelle configurate: {count: 100, ...}
```

### Visivo (quando J premuto):
- 🟠 Particelle arancioni fluiscono dalla griglia
- 🟢 Wireframe verde del piano (debug mode)
- 📐 Assi RGB alla posizione griglia

## 🚨 SE NULLA FUNZIONA

### Opzione 1: Position Assoluta (no attach)
Invece di attachare alla griglia, usa posizione world assoluta:

```javascript
// In HotAirEffect.jsx, commenta il groupRef.add() e usa:
groupRef.current.position.set(-1.015, -0.109, 0.857) // World position griglia
```

### Opzione 2: Test con Mesh Semplice
Aggiungi un cubo rosso al posto delle particelle:

```jsx
{enabled && (
  <mesh position={[-1.015, -0.109, 0.857]}>
    <boxGeometry args={[0.5, 0.5, 0.5]} />
    <meshBasicMaterial color="red" />
  </mesh>
)}
```

**Se vedi il cubo rosso**: Il problema è nello shader/particelle
**Se NON vedi il cubo**: Il problema è nel posizionamento o enabled

## 📋 INFORMAZIONI UTILI

### Coordinate Griglia (da logs precedenti):
```
World Position: (-1.015, -0.109, 0.857)
Dimensioni: (0.005, 0.255, 0.255)
Rotation: (0.000, 0.000, 0.000)
```

### Coordinate Player Spawn:
```
Position: (-0.17, 0, 1.4)
```

### Distanza Griglia → Player:
```
~1.0 metri (dovrebbe essere ben visibile!)
```

## 🎬 PROSSIMI PASSI

1. ✅ Copia i log della console qui
2. ✅ Prova test STEP 2 (enabled={true})
3. ✅ Prova test STEP 3 (parametri estremi)
4. ✅ Se ancora niente, prova cubo rosso test

---

**Nota**: Se il cubo rosso test non appare, il problema è nel sistema di rendering Three.js, non nello shader particelle!
