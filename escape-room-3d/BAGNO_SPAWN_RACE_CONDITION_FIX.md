# 🛡️ Fix Race Condition BVH vs Spawn - Bagno

**Data**: 10 Gennaio 2026
**Problema**: Il personaggio spawna correttamente nel bagno ma viene "sparato" fuori dalla stanza

## 🔍 Analisi del Problema

### Timeline Problematica
```
1. [FPS Controls] 🎯 REPOSITIONING PLAYER TO: {x: 1.18, y: 0, z: 2.59}  ✅ Coordinate corrette
2. 🛡️ SPAWN PROTECTION ACTIVATED - protecting for 300 frames (~5s)
3. [CasaModel] 🔨 Building BVH (separate effect)...                     ⚠️ BVH non pronto!
   ...286ms dopo...
4. [CasaModel] ✅ BVH ready: 1456909 triangles in 286.20ms
5. [useAnimatedDoor] 🚪 collidable = false (porta APERTA)               ⚠️ Anta doccia aperta
6. ✅ SPAWN PROTECTION EXPIRED - ground detection now active
```

### Causa Root
**Race Condition**: Il player viene posizionato PRIMA che il BVH sia completamente pronto. Negli ~286ms di build, oggetti come l'anta della doccia (che è in stato "APERTA") possono essere interpretati come "dentro" il personaggio dal motore fisico, causando una spinta verso l'esterno.

## ✅ Soluzione Implementata

### Quick Fix: Aumento Spawn Protection
```javascript
// useFPSControls.js - Riga 74-78
const MAX_SPAWN_PROTECTION_FRAMES = 600 // ~10 seconds protection (increased from 300)
```

**Modifiche**:
- **Prima**: 300 frames (~5 secondi)
- **Dopo**: 600 frames (~10 secondi)

### Logica
1. ✅ Spawn protection impedisce ground detection per ~10 secondi
2. ✅ BVH si costruisce in ~286ms (< 0.3 secondi)
3. ✅ Margine di sicurezza: 10 secondi - 0.3 secondi = **9.7 secondi** di buffer
4. ✅ Player rimane stabile alla posizione di spawn (1.18, 0, 2.59)
5. ✅ Dopo 10 secondi, sistema di collisione completamente operativo

## 📊 Test Attesi

### Comportamento Previsto
```
[BathroomScene] Usando coordinate da API: {x: 1.18, y: 0, z: 2.59}
🛡️ [FPS Controls] SPAWN PROTECTION ACTIVATED - protecting for 600 frames (~10 seconds)
[CasaModel] 🔨 Building BVH...
[CasaModel] ✅ BVH ready: 1456909 triangles in ~286ms
[useAnimatedDoor] 🚪 Anta doccia APERTA (collidable = false)
...10 secondi dopo...
✅ [FPS Controls] SPAWN PROTECTION EXPIRED - player stabile nel bagno
```

### Verifica Visiva
1. **Spawn**: Player appare a (1.18, 0, 2.59) nel bagno ✅
2. **Primi 10s**: Player IMMOBILE, non influenzato da physics ✅
3. **Dopo 10s**: Controlli attivi, movimento fluido ✅
4. **Posizione finale**: Player DENTRO il bagno, non teletrasportato ✅

## 🎯 Parametri di Riferimento

| Parametro | Valore | Note |
|-----------|--------|------|
| Spawn X | 1.18 | Centro bagno |
| Spawn Y | 0.00 | Livello pavimento |
| Spawn Z | 2.59 | Davanti specchio |
| Protection | 600 frames | ~10 secondi @ 60fps |
| BVH Build | ~286ms | Tempo misurato |
| Safety Margin | 9.7s | Protection - BVH build |

## 🔄 Alternative Considerate

### Opzione 1: Wait for BVH Event ✅ (Migliore long-term)
- Spawn protection SI DISATTIVA solo quando BVH è ready
- Richiede refactoring: CasaModel deve emettere evento "bvh-ready"
- Pro: Soluzione robusta, nessun hardcoded timing
- Contro: Richiede più modifiche

### Opzione 2: Pre-build BVH ⚠️ (Complessa)
- Costruire BVH PRIMA di posizionare player
- Richiede cambio architetturale significativo
- Contro: Troppo invasivo

### Opzione 3: Increase Protection Timer 🔧 (IMPLEMENTATA)
- Quick fix, minimal changes
- Pro: Funziona immediatamente, facile da testare
- Contro: Hardcoded timing (ma con ampio margine)

## 📝 Note Tecniche

### Spawn Protection System
```javascript
// Attivazione automatica quando initialPosition cambia
hasSpawnedRef.current = true
spawnProtectionFramesRef.current = 0

// Timer indipendente per progress bar
const PROTECTION_DURATION_MS = (600 / 60) * 1000 // 10 secondi

// Disattivazione dopo 600 frames O 10 secondi (il che avviene prima)
```

### Ground Detection Skip
```javascript
// Condizione per saltare ground detection
if (hasSpawnedRef.current) {
  // Skip ground detection - ancora in protezione
  return // Non modifica Y
}
```

## 🚀 Deploy

```bash
# Riavvio frontend per applicare fix
cd /Users/matteo/Desktop/ESCAPE/escape-room-3d
docker-compose restart frontend
```

## ✅ Checklist Verifica

- [x] Aumentato MAX_SPAWN_PROTECTION_FRAMES da 300 a 600
- [x] Aggiunto commento esplicativo
- [x] Frontend riavviato
- [ ] **TEST VISIVO**: Player spawna nel bagno e ci rimane
- [ ] **TEST MOVIMENTO**: Dopo 10s player si muove normalmente
- [ ] **TEST COLLISIONI**: Sistema di collisione funziona dopo protection

## 🎓 Lesson Learned

**Race conditions in game engines**: Quando si lavora con sistemi asincroni (BVH build, asset loading, physics init), è cruciale garantire che tutti i sistemi siano pronti PRIMA di attivare logica critica come spawn/collisioni.

**Best practice**: Usare eventi/callback invece di timer hardcoded quando possibile, ma timer con ampio margine sono accettabili per quick fixes in produzione.
