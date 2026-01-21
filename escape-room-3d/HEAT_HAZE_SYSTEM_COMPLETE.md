# 🌡️ Heat Haze Post-Processing System - Documentazione Completa

## 📋 Panoramica

Sistema di **distorsione aria calda** implementato con **post-processing shader** per la camera da letto. L'effetto si attiva quando la porta-finestra viene chiusa (tasto J), simulando aria calda che entra dalle fessure.

---

## 🎯 Comportamento

### Logica Fisica Realistica

```
Porta APERTA (default)  → Heat Haze OFF (aria circola normalmente)
                          ↓ 
                     Tasto J premuto
                          ↓
Porta CHIUSA            → Heat Haze ON (aria calda entra dalle fessure)
                          ↓ Fade in smooth 0.8s
                     Effetto visibile
                          ↓
                     Tasto J premuto
                          ↓
Porta APERTA            → Heat Haze OFF (fade out 0.8s)
```

**Motivazione:** Quando la porta è chiusa, l'aria calda esterna entra dalle fessure creando distorsione ottica visibile.

---

## 🏗️ Architettura

### 1️⃣ HeatHazeShader.js
**Percorso:** `src/shaders/HeatHazeShader.js`

#### Uniforms Configurabili
```javascript
{
  tDiffuse: Texture,        // Scena renderizzata (auto)
  time: Float,              // Tempo animazione (auto)
  heatStrength: 0.008,      // Intensità distorsione
  heatFrequency: 20.0,      // Numero onde visibili
  heatSpeed: 1.2,           // Velocità movimento
  heatHeight: 0.65,         // Altezza zona effetto (0-1)
  noiseScale: 1.8,          // Scala noise organico
  enabled: 0.0/1.0          // ON/OFF (con fade)
}
```

#### Algoritmo Shader
```glsl
1. Legge scena da tDiffuse
2. Calcola maschera verticale (forte in basso, debole in alto)
3. Genera onde sinusoidali animate
4. Aggiunge noise FBM per variazione organica
5. Distorce UV della texture
6. Clamp UV per evitare artefatti
7. Campiona texture con UV distorte
```

**Tecniche utilizzate:**
- Smooth noise con interpolazione hermite
- Fractional Brownian Motion (3 ottave)
- Maschera verticale con smoothstep
- Doppio layer di onde sinusoidali

---

### 2️⃣ HeatHazeEffect.jsx
**Percorso:** `src/components/effects/HeatHazeEffect.jsx`

#### Props
```javascript
<HeatHazeEffect 
  enabled={boolean}      // Attiva/disattiva effetto
  strength={0.008}       // Intensità (default)
  fadeTime={0.8}         // Durata fade in/out (secondi)
/>
```

#### Funzionalità
- **Setup EffectComposer** una sola volta (mount)
- **RenderPass** per scena normale
- **ShaderPass** con HeatHazeShader
- **Fade interpolato** con delta time
- **Resize handler** automatico
- **Cleanup** proper su unmount

#### Performance
- Pixel ratio max 2x su mobile
- Render priority 1 (dopo scena)
- Un solo composer per tutta la scena

---

### 3️⃣ Integrazione BedroomScene
**Percorso:** `src/components/scenes/BedroomScene.jsx`

#### State Management
```javascript
// State porta-finestra
const [portaFinestraOpen, setPortaFinestraOpen] = useState(true)

// Handler tasto J (evento composito)
if (key === 'j') {
  // Toggle porta
  setPortaFinestraOpen(prev => !prev)
  
  // Nota: hotAirActive deprecato, ora usiamo direttamente portaFinestraOpen
}
```

#### Rendering nel Canvas
```jsx
<Suspense fallback={<LoadingIndicator />}>
  {/* ... altri componenti ... */}
  
  {/* Heat Haze Effect - Porta CHIUSA = ON */}
  <HeatHazeEffect 
    enabled={!portaFinestraOpen}  // Inverte: porta chiusa = true
    strength={0.008}
    fadeTime={0.8}
  />
  
  {/* ... environment ... */}
</Suspense>
```

---

## 🎨 Effetto Visivo

### Cosa Vedi
- **Distorsione ottica** dell'intera scena (come guardare attraverso aria calda)
- **Intensità massima** in basso (vicino al pavimento)
- **Attenuazione** progressiva verso l'alto
- **Movimento fluido** con onde che salgono
- **Fade smooth** in/out quando toggle

### Dove È Visibile
- **Zona bassa:** Distorsione forte (pavimento, mobili bassi)
- **Zona media:** Distorsione moderata
- **Zona alta:** Distorsione leggera/assente (soffitto)

---

## ⚙️ Parametri Tweakabili

### In HeatHazeShader.js

```javascript
// Intensità complessiva (0.001 = impercettibile, 0.05 = molto forte)
heatStrength: { value: 0.008 }

// Densità onde (10 = larghe, 50 = strette)
heatFrequency: { value: 20.0 }

// Velocità animazione (0.5 = lenta, 3.0 = veloce)
heatSpeed: { value: 1.2 }

// Altezza zona effetto (0.0 = tutto schermo, 1.0 = solo bordo inf)
heatHeight: { value: 0.65 }

// Dettaglio noise (1.0 = uniforme, 5.0 = molto dettagliato)
noiseScale: { value: 1.8 }
```

### In BedroomScene.jsx

```jsx
<HeatHazeEffect 
  enabled={!portaFinestraOpen}
  strength={0.008}    // Override intensità (opzionale)
  fadeTime={0.8}      // Durata transizione (secondi)
/>
```

---

## 🧪 Testing

### Test Funzionale
1. Avvia ambiente di sviluppo
2. Naviga alla camera da letto
3. **Verifica stato iniziale:** porta APERTA → NO distorsione
4. **Premi J:** porta si chiude → distorsione fade in (0.8s)
5. **Osserva effetto:** pavimento/mobili ondulati, soffitto stabile
6. **Premi J:** porta si apre → distorsione fade out (0.8s)

### Test Performance
```bash
# Desktop
- FPS target: 60fps stabile
- Overhead: ~2-3ms per frame

# Mobile
- FPS target: 30fps+ 
- Pixel ratio limitato a 2x
- Shader ottimizzato (3 ottave noise max)
```

---

## 🔧 Troubleshooting

### Problema: Effetto non visibile
**Soluzione:**
1. Verifica console browser per errori shader
2. Controlla che `portaFinestraOpen` sia `false`
3. Prova ad aumentare `strength` a 0.02 temporaneamente

### Problema: Performance bassa su mobile
**Soluzione:**
1. Riduci `heatStrength` a 0.005
2. Riduci `heatFrequency` a 15.0
3. Nel shader, riduci ottave FBM da 3 a 2

### Problema: Artefatti ai bordi schermo
**Soluzione:**
- Le UV sono già clamped (0.0-1.0) nello shader
- Se persiste, riduci `heatStrength`

---

## 📚 File Coinvolti

```
escape-room-3d/
├── src/
│   ├── shaders/
│   │   └── HeatHazeShader.js          ✅ GLSL shader definition
│   ├── components/
│   │   ├── effects/
│   │   │   └── HeatHazeEffect.jsx     ✅ R3F component + composer
│   │   └── scenes/
│   │       └── BedroomScene.jsx       ✅ Integrazione + controlli
│   └── components/3D/
│       ├── HotAirEffect.jsx           ⚠️  Layer system (deprecated, ma mantenuto)
│       └── HotAirEffectLive.jsx       ⚠️  Particle system (separato)
└── HEAT_HAZE_SYSTEM_COMPLETE.md       📖 Questa documentazione
```

---

## 🚀 Estensioni Future

### Idee Implementabili

1. **Heat Mask Localizzata**
   ```javascript
   // Aggiungi uniform per texture mask
   heatMask: { value: maskTexture }
   // Usa mask per limitare effetto a zone specifiche
   ```

2. **Intensità Variabile nel Tempo**
   ```javascript
   // Simula aria calda intermittente
   strength = baseStrength * (sin(time * 0.5) * 0.5 + 0.5)
   ```

3. **Controllo WebSocket**
   ```javascript
   // Attiva/disattiva via sensori esterni
   socket.on('hotAirDetected', () => setHeatHazeEnabled(true))
   ```

4. **Variante Freddo (Blur Frost)**
   ```glsl
   // Inverte la logica: porta aperta = aria fredda
   // Usa blur invece di distorsione
   ```

---

## 🎓 Principi Tecnici

### Perché Post-Processing?
- **Pro:** Copre tutta la scena automaticamente
- **Pro:** Performance migliori di N layer 3D
- **Pro:** Effetto più realistico (simula fenomeno ottico)
- **Contro:** Compatibilità browser (WebGL 2 required)

### Perché Fade Interpolato?
- **Motivo:** Transizioni brusche rompono immersione
- **Implementazione:** Interpola uniform `enabled` con delta time
- **Risultato:** Fade naturale percettivamente corretto

### Perché FBM Noise?
- **Motivo:** Onde sinusoidali pure troppo regolari
- **Soluzione:** 3 ottave di noise sovrapposto
- **Risultato:** Distorsione organica e variata

---

## ✅ Checklist Finale

- [x] Shader GLSL funzionante
- [x] EffectComposer integrato
- [x] Stato porta sincronizzato
- [x] Fade smooth implementato
- [x] Performance ottimizzate mobile
- [x] Documentazione completa
- [x] Sistema mantenibile ed estendibile

---

## 📝 Note Implementative

### Decisioni Architetturali

1. **Separazione Concerns**
   - Shader = logica GLSL pura
   - Effect = gestione Three.js/R3F
   - Scene = business logic

2. **Mantenimento Retrocompatibilità**
   - `HotAirEffect.jsx` layer system mantenuto
   - `HotAirEffectLive.jsx` particle system separato
   - Possono coesistere o essere sostituiti

3. **Parametri Sensoriali**
   - `strength: 0.008` = percezione naturale
   - `fadeTime: 0.8s` = transizione fluida
   - `heatHeight: 0.65` = fisicamente plausibile

---

**Implementato:** 28 Dicembre 2025  
**Versione:** 1.0  
**Status:** ✅ Production Ready
