# 🌿 Sistema Illuminazione Serra - Documentazione

Sistema cinematografico di illuminazione dinamica per la serra dell'escape room.

## 📦 Componenti

### 1. **SerraLight.jsx** - Luce Dinamica
Luce cinematografica con effetti organici e stati reattivi.

**Features:**
- ✨ Respirazione organica (pulsazione lenta con easing)
- 🎨 Sfumature multiple di verde (acido, smeraldo, lime)
- ⚡ Flicker irregolare naturale (Perlin noise)
- 🎯 Stati reattivi al gioco (locked/active/solved)
- 💫 Bloom volumetrico integrato

**Props:**
```jsx
<SerraLight 
  state="active"          // 'locked' | 'active' | 'solved'
  position={[0, 2, 0]}   // Posizione world
  enabled={true}          // Visibilità
/>
```

**Stati:**
- **`locked`**: Rosso pulsante lento (energia bloccata)
- **`active`**: Verde respirazione (enigma attivo) - DEFAULT
- **`solved`**: Verde stabile luminoso (completato)

---

### 2. **SerraParticles.jsx** - Sistema Particellare
Particelle cinematografiche sincronizzate alla luce.

**Features:**
- 🌊 Movimento sinusoidale 3D complesso
- 🎨 Colori reattivi sincronizzati alla luce
- ✨ Glow volumetrico soft
- 🌱 300 particelle (polline/micro-spore)
- 🎯 Performance ottimizzate

**Props:**
```jsx
<SerraParticles 
  enabled={true}
  count={300}             // Numero particelle
  lightState="active"     // Sync con SerraLight
  position={[0, 0, 0]}    // Offset posizione
/>
```

---

## 🎮 Controlli Tastiera (KitchenScene)

| Tasto | Azione |
|-------|--------|
| **Z** | Serra ON (luce + particelle) |
| **X** | Serra OFF |

---

## 🎨 Palette Colori

### Stato `active` (Verde - Default)
- **Primary**: `#00ff00` (Verde acido)
- **Secondary**: `#00d966` (Smeraldo)
- **Tertiary**: `#7fff00` (Lime)

### Stato `locked` (Rosso)
- **Primary**: `#ff0000` (Rosso intenso)
- **Secondary**: `#ff4500` (Arancione-rosso)
- **Tertiary**: `#cc0000` (Rosso scuro)

### Stato `solved` (Verde Luminoso)
- **Primary**: `#00ff88` (Verde brillante)
- **Secondary**: `#00ffaa` (Verde acqua)
- **Tertiary**: `#88ffaa` (Verde chiaro)

---

## 💡 Esempio Integrazione

```jsx
import SerraLight from '../3D/SerraLight'
import SerraParticles from '../3D/SerraParticles'

// Nel component
const [neonSerraAcceso, setNeonSerraAcceso] = useState(false)
const [serraState, setSerraState] = useState('active')

// Nel render
{neonSerraAcceso && (
  <group position={[0, 2, 0]}>
    <SerraLight 
      state={serraState} 
      position={[0, 0.5, 0]} 
      enabled={true} 
    />
    <SerraParticles 
      enabled={true}
      count={300}
      lightState={serraState}
      position={[0, -0.5, 0]}
    />
  </group>
)}
```

---

## 🎬 Effetti Visivi

### Respirazione Organica
- Frequenza: 0.3-0.6 Hz (in base allo stato)
- Easing: Sine in/out per movimento naturale
- Ampiezza: 0.3-0.6x intensità base

### Flicker Naturale
- Multi-frequency Perlin noise (3.7 Hz, 8.3 Hz, 1.2 Hz)
- Intensità: 2%-15% (in base allo stato)
- Non stroboscopico (smooth)

### Movimento Particelle
- Sinusoidale 3D su tutti gli assi
- Frequenze diverse per X/Y/Z
- Rotazione spirale attorno all'origine
- Fadeout basato su distanza e altezza

---

## ⚙️ Parametri Performance

### SerraLight
- 2 Point Lights (principale + secondaria)
- 2 Mesh emissivi (core + alone)
- Shadow rendering: Disabilitato su mobile

### SerraParticles
- 300 particelle (configurabile)
- Shader GLSL custom
- Additive blending per glow
- Frustum culling automatico

---

## 🚀 Note Tecniche

### Shader GLSL
Entrambi i componenti usano shader custom per performance:
- **Vertex Shader**: Movimento e trasformazioni
- **Fragment Shader**: Colore, glow, alpha

### Sincronizzazione
Luce e particelle condividono lo stesso `lightState` per:
- Colori sempre sincronizzati
- Transizioni smooth (lerp)
- Comportamento coerente

### Mobile Optimization
- Particle count ridotto su mobile
- Shadow rendering disabilitato
- Shader ottimizzati per GPU mobile

---

## 📝 TODO Future

- [ ] Aggiungi controllo intensità globale
- [ ] Particle physics con collision
- [ ] Sound reactive (opzionale)
- [ ] Post-processing pass per bloom
- [ ] Animation curves configurabili

---

**Created**: 19/12/2025
**Version**: 1.0.0
**Style**: Cinematografico, soft sci-fi, emozionale
