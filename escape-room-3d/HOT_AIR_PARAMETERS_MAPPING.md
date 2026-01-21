# 🎛️ Mappatura Parametri: ParticleEditor → HotAirEffect

## 📊 Tabella di Conversione

| ParticleEditor Param | HotAirEffect Prop | Conversione | Note |
|---------------------|-------------------|-------------|------|
| `particleCount` | `particleCount` | Diretta | 100-1000 |
| `particleSize` | `particleSize` | Diretta | 50-500px |
| `particleOpacity` | `opacity` | Diretta | 0.0-1.0 |
| `speed` | `risingSpeed` | Diretta | 0.1-2.0 |
| `turbulence` | `turbulence` | Diretta | 0.0-1.0 |
| `maxDistance` | ❌ NON USATO | - | Per futuro |
| `warmColor` | `warmColorHex` | HEX string → number | `#FFAA88` → `0xFFAA88` |
| `hotColor` | `coolColorHex` | HEX string → number | `#FF6633` → `0xFF6633` |
| `distortionIntensity` | `distortionScale` | Diretta | 0.0-1.0 |

## 🔧 Parametri HotAirEffect

```javascript
<HotAirEffect
  enabled={true}                    // boolean
  particleCount={120}               // number (100-1000)
  particleSize={50}                 // number (50-500px) 
  warmColorHex={0xFFEEBB}          // number hex
  coolColorHex={0xFF6633}          // number hex
  opacity={0.18}                    // number (0.0-1.0)
  distortionScale={0.5}            // number (0.0-1.0)
  turbulence={0.35}                // number (0.0-1.0)
  risingSpeed={1.0}                // number (0.1-2.0)
  debug={false}                    // boolean
/>
```

## 🎨 Conversione Colori

### Da ParticleEditor (HEX String)
```javascript
const warmColor = "#FFAA88"  // String
const hotColor = "#FF6633"   // String
```

### A HotAirEffect (Number Hex)
```javascript
const warmColorHex = parseInt(warmColor.replace('#', ''), 16)  // 0xFFAA88
const coolColorHex = parseInt(hotColor.replace('#', ''), 16)   // 0xFF6633
```

## 📝 Esempio Integrazione Completa

```javascript
import { useMemo } from 'react'
import HotAirEffect from './HotAirEffect'

function BedroomScene() {
  const { particleConfig } = useParticleEditor()
  
  // Conversione parametri
  const hotAirProps = useMemo(() => ({
    enabled: particleConfig.enabled,
    particleCount: particleConfig.particleCount,
    particleSize: particleConfig.particleSize,
    opacity: particleConfig.particleOpacity,
    risingSpeed: particleConfig.speed,
    turbulence: particleConfig.turbulence,
    distortionScale: particleConfig.distortionIntensity,
    
    // Conversione colori
    warmColorHex: parseInt(particleConfig.warmColor.replace('#', ''), 16),
    coolColorHex: parseInt(particleConfig.hotColor.replace('#', ''), 16)
  }), [particleConfig])
  
  return (
    <>
      <HotAirEffect {...hotAirProps} />
      {/* ... resto scena ... */}
    </>
  )
}
```

## 🎯 Range Consigliati

### Performance Ottimale
```javascript
particleCount: 120-300     // Bilancia qualità/FPS
particleSize: 30-80        // Visibile ma non troppo grande
opacity: 0.15-0.30         // Sottile e naturale
turbulence: 0.3-0.5        // Movimento realistico
risingSpeed: 0.8-1.2       // Convezione naturale
distortionScale: 0.3-0.6   // Distorsione termica percettibile
```

### Effetto Drammatico
```javascript
particleCount: 500-1000    // Denso
particleSize: 80-150       // Grande e visibile
opacity: 0.4-0.6           // Più opaco
turbulence: 0.6-1.0        // Molto caotico
risingSpeed: 1.5-2.0       // Veloce
distortionScale: 0.7-1.0   // Forte distorsione
```

### Effetto Sottile
```javascript
particleCount: 60-120      // Rado
particleSize: 20-40        // Piccolo
opacity: 0.05-0.15         // Molto trasparente
turbulence: 0.2-0.35       // Leggero movimento
risingSpeed: 0.5-0.8       // Lento
distortionScale: 0.2-0.4   // Distorsione leggera
```

## 🚀 Stato Attuale

**✅ Parametri Implementati**
- `particleCount` - Funziona ✓
- `particleSize` - Funziona ✓
- `opacity` - Funziona ✓
- `turbulence` - Funziona ✓
- `risingSpeed` (speed) - Funziona ✓
- `distortionScale` - Funziona ✓
- `warmColorHex` / `coolColorHex` - Funziona ✓

**⚠️ Da Integrare**
- Collegamento automatico ParticleEditor → HotAirEffect
- Sistema conversione colori automatico
- Wrapper component per mappatura trasparente

## 🔗 Prossimi Passi

1. **Creare HotAirEffectLive.jsx** (wrapper)
   - Usa `useParticleEditor`
   - Converte automaticamente parametri
   - Passa props a HotAirEffect

2. **Integrare in BedroomScene.jsx**
   - Import componenti
   - Gestione stato editor
   - Toggle tasto X

3. **Testing completo**
   - Verificare tutti gli slider funzionanti
   - Test performance con valori estremi
   - Validare conversione colori

---

**Last Updated:** 28/12/2025  
**Status:** Mappatura definita, integrazione in attesa
