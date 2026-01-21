# 🔍 DEBUG: Problema Teletrasporto nella Scena Esterno

## 📊 Problema Identificato

Quando si clicca nella scena esterno, il player viene teletrasportato in una posizione casuale.

### Causa Principale

Il problema era causato dalla funzione `teleportAndSnap()` in `CasaModel.jsx` che veniva chiamata **ogni volta** che il `useLayoutEffect` si rieseguiva, incluso quando:
- Si clicca su un oggetto 3D (trigger re-render)
- Props cambiano (come `cancelloAperto`, `ledSerraVerde`, ecc.)
- State updates del parent component

## ✅ Soluzioni Implementate

### 1. Guard Flag `hasInitiallyTeleported`
```javascript
const hasInitiallyTeleported = useRef(false)

// Nel useLayoutEffect:
if (!hasInitiallyTeleported.current) {
  teleportAndSnap(foundSpawnPoint, scene, camera, 1.6)
  hasInitiallyTeleported.current = true
} else {
  console.log('[CasaModel] ⚠️ useLayoutEffect rieseguito ma teleport SKIPPATO')
}
```
**Effetto**: Previene l'esecuzione di `teleportAndSnap()` dopo la prima mount, anche se `useLayoutEffect` viene rieseguito.

### 2. Logging Dettagliato
- **Stack trace** in `teleportAndSnap()` per identificare da dove viene chiamato
- **Log nel click handler** per vedere quali oggetti vengono cliccati
- **Log quando useLayoutEffect viene rieseguito** ma il teleport è skippato

### 3. Enhanced Click Handler
```javascript
onClick={(e) => { 
  console.log('🖱️ [CasaModel] Click su gruppo:', e.object.name, 'sceneType:', sceneType)
  e.stopPropagation(); 
  onObjectClick && onObjectClick(e.object.name) 
}}
```

## 🧪 Come Testare

### Test 1: Spawn Iniziale
1. Avvia l'app: `npm run dev`
2. Vai nella scena esterno
3. **VERIFICA**: La console mostra:
   ```
   [CasaModel] ✅ Prima mount - eseguo teleport iniziale
   🚨 [CasaModel] TELEPORT CHIAMATO!
   ```
4. **RISULTATO ATTESO**: Il player spawna nella posizione corretta (fuori dalla casa)

### Test 2: Click su Oggetti
1. Nella scena esterno, **clicca su vari oggetti** (cancello, muri, terra, ecc.)
2. **VERIFICA**: La console mostra:
   ```
   🖱️ [CasaModel] Click su gruppo: [nome oggetto] sceneType: esterno
   ```
3. **RISULTATO ATTESO**: 
   - ✅ Il player **NON** viene teletrasportato
   - ✅ La console **NON** mostra "🚨 [CasaModel] TELEPORT CHIAMATO!" dopo il click
   - ✅ Se useLayoutEffect viene rieseguito, mostra: "⚠️ useLayoutEffect rieseguito ma teleport SKIPPATO"

### Test 3: Apertura Cancello
1. Premi **'G'** per sbloccare la fotocellula (LED rosso → verde)
2. Clicca sul cancello per aprirlo
3. **VERIFICA**: 
   - Il cancello si apre
   - Il player NON viene teletrasportato
4. **RISULTATO ATTESO**: Animazione cancello funziona senza teletrasporto

### Test 4: Movimento e Collisioni
1. Muoviti liberamente nella scena esterno (WASD o joystick)
2. Avvicinati ai muri, auto, cancello
3. **RISULTATO ATTESO**: 
   - Collisioni funzionano correttamente
   - Nessun teletrasporto durante il movimento

## 🐛 Debug Avanzato

Se il problema persiste, controlla i log nella console:

### Log da Cercare:
- ✅ **BUONO**: `[CasaModel] ⚠️ useLayoutEffect rieseguito ma teleport SKIPPATO`
  - Significa che il guard sta funzionando
  
- ❌ **PROBLEMA**: `🚨 [CasaModel] TELEPORT CHIAMATO!` appare **dopo** il primo spawn
  - Guarda lo stack trace per capire chi ha chiamato teleportAndSnap()
  
- 🔍 **INFO**: `🖱️ [CasaModel] Click su gruppo: [nome]`
  - Mostra quale oggetto è stato cliccato

### Se il Teletrasporto Persiste:

1. **Controlla se ci sono altri useEffect che modificano camera.position**:
   ```bash
   grep -r "camera.position.set" escape-room-3d/src/
   ```

2. **Verifica il parent component** (`RoomScene.jsx` o `App.jsx`):
   - Cerca re-render causati da state updates
   - Verifica se ci sono altri handler di click che potrebbero interferire

3. **Controlla useFPSControls.js**:
   - Il sistema di controlli potrebbe avere un fallback che resetta la posizione
   - Cerca funzioni `detectGround()` o snap automatici

## 📋 Checklist di Verifica

- [ ] Prima mount: teleport avviene SOLO una volta
- [ ] Click su oggetti: NO teletrasporto
- [ ] Apertura cancello: NO teletrasporto
- [ ] Movimento libero: NO teletrasporto
- [ ] Console log: Guard flag attivo dopo la prima mount
- [ ] Console log: NESSUN stack trace di teleport dopo click

## 🎯 Prossimi Passi se il Problema Persiste

Se dopo questi test il teletrasporto continua:

1. **Condividi i log della console** (screenshot o copia/incolla)
2. **Indica esattamente quando succede** (al click, dopo movimento, ecc.)
3. **Verifica se succede anche nelle altre scene** (cucina, bagno, ecc.)

## 📝 Note Tecniche

- Il guard flag `hasInitiallyTeleported` è specifico per **ogni istanza** di CasaModel
- Se cambi scena (es. da esterno a cucina), ogni scena ha il suo guard indipendente
- Il `useLayoutEffect` viene rieseguito quando cambiano le dipendenze: `[scene, enableShadows, sceneType, spawnNodeName]`
- Il click handler usa `e.stopPropagation()` per prevenire la propagazione del click al parent

## 🔧 Modifiche Applicate

**File modificato**: `escape-room-3d/src/components/3D/CasaModel.jsx`

**Righe modificate**:
- Linea ~14: Aggiunto logging dettagliato in `teleportAndSnap()`
- Linea ~79: Aggiunto `hasInitiallyTeleported` ref
- Linea ~197-204: Aggiunto guard flag nel useLayoutEffect
- Linea ~308-316: Enhanced click handler con logging

---

**Data**: 13/12/2025, 00:44
**Versione**: 1.0
