# 🔧 FIX COLLISION RADIUS UNIFORMATO (0.22m)

**Data:** 10 Gennaio 2026  
**Aggiornamento:** 10 Gennaio 2026 (ore 14:08)  
**Problema:** Personaggio spawnava fuori dal bagno nonostante coordinate corrette nei log

## 🎯 Root Cause

Il `collisionRadius` era impostato a **0.3m** (30cm di raggio) in 3 scene interne:
- BathroomScene
- BedroomScene  
- LivingRoomScene

Questo causava **espulsione automatica** dalla fisica quando il personaggio spawnava vicino ai muri, perché:
- Collision radius 0.3m = **60cm di diametro totale**
- Il motore fisico rilevava compenetrazione → espelleva il player

## ✅ Soluzione Applicata

**AGGIORNAMENTO FINALE: collision radius portato da 0.15m → 0.22m per miglior bilanciamento**

### Storia delle modifiche:
1. **Prima iterazione:** Ridotto da 0.3m → 0.15m (troppo stretto)
2. **Seconda iterazione:** Aumentato da 0.15m → 0.22m (bilanciamento ottimale)

### File Modificati

1. **BathroomScene.jsx**
   ```javascript
   // PRIMA
   const scaledCollisionRadius = 0.3 * modelScale
   
   // DOPO
   const scaledCollisionRadius = 0.15 * modelScale  // ← RIDOTTO da 0.3 a 0.15 (bagno stretto!)
   ```

2. **BedroomScene.jsx**
   ```javascript
   // PRIMA
   const scaledCollisionRadius = 0.3 * modelScale
   
   // DOPO
   const scaledCollisionRadius = 0.15 * modelScale  // ← RIDOTTO da 0.3 a 0.15 (uniformato con altre scene)
   ```

3. **LivingRoomScene.jsx**
   ```javascript
   // PRIMA
   const scaledCollisionRadius = 0.3 * modelScale
   
   // DOPO
   const scaledCollisionRadius = 0.15 * modelScale  // ← RIDOTTO da 0.3 a 0.15 (uniformato con altre scene)
   ```

## 📊 Confronto Valori

| Scena | PRIMA (radius) | DOPO (radius) | Diametro Totale DOPO |
|-------|----------------|---------------|---------------------|
| Bagno | 0.3m | **0.15m** | 30cm |
| Camera | 0.3m | **0.15m** | 30cm |
| Soggiorno | 0.3m | **0.15m** | 30cm |
| Cucina | 0.15m | **0.15m** | 30cm ✅ (già ok) |
| Esterno | 0.15m | **0.15m** | 30cm ✅ (già ok) |

## 🎯 Benefici

1. **Spawn preciso:** Coordinate nel DB ora corrispondono al render
2. **Uniformità:** Tutte le scene usano lo stesso valore (0.15m)
3. **Meno espulsioni:** Collision radius più piccolo = meno conflitti con muri
4. **Navigazione migliore:** Il personaggio può avvicinarsi di più ai muri senza essere respinto

## 📝 Note Implementazione

- **Altezza occhi (eyeHeight):** NON modificata, rimane scene-specifica
- **Velocità movimento:** NON modificata, rimane 1.35 u/s
- **Player height:** NON modificata, rimane 1.8m per collisioni verticali
- **Scene già ok:** Cucina e Esterno avevano già 0.15m, non toccate

## 🧪 Test Consigliati

1. **Spawn bagno:** Verificare che personaggio appaia dentro il bagno (coordinate DB: 1.18, 2.59)
2. **Spawn camera:** Verificare posizione corretta senza espulsioni
3. **Spawn soggiorno:** Verificare posizione corretta senza espulsioni
4. **Navigazione:** Testare che movimento vicino ai muri funzioni senza bug

## 🔗 File Correlati

- `src/components/scenes/BathroomScene.jsx`
- `src/components/scenes/BedroomScene.jsx`
- `src/components/scenes/LivingRoomScene.jsx`
- `src/hooks/useFPSControls.js` (usa il valore passato)

## ✅ Status

**COMPLETATO** - Tutte e 3 le scene aggiornate e uniformate.

---

**Fix by:** Cline AI Assistant  
**Reviewed:** 10/01/2026
