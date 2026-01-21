# 🔍 Guida Verifica Runtime - Sistema Forced Lists

## 🎯 Obiettivo

Verificare in runtime (DEV e PROD) che l'ordine degli eventi sia sempre:
1. CasaModel traverse → liste complete
2. Double-rAF → matrici stabili
3. modelRef aggiornato → isReady = true
4. onReady() chiamato
5. FPSController monta

## 📋 Log da Cercare nella Console

### ✅ Sequenza Corretta (ATTESA)

```
[CasaModel] 🏡 Piano terra alzato di 2.0m
[CasaModel] 🔒 FORZA COLLIDABILE: VetrataCucina(...)
[CasaModel] 🚶 Modello umano NON-collidabile: Humano_XXX
[CasaModel] 🧱 Muro collidabile: MuroEsterno(...)
... (altri mesh processati)
[CasaModel] 🔄 Preparazione liste: 342 collision, 12 grounds
[CasaModel] 🎯 Double-rAF completato - mondo garantito stabile
[CasaModel] ✅ Mondo READY - trasformazioni completate, spawn può procedere
[KitchenScene] ✅ CasaModel READY (event-driven) - Mondo stabile, autorizzando spawn
[KitchenScene] 🚀 USANDO LISTE FORZATE DA CASAMODEL
[KitchenScene] ✅ Configurazione: 342 collision, 12 grounds, 18 interattivi
```

### 🔑 Punti Chiave da Verificare

**1. Liste Pre-Computate**
```
[CasaModel] 🔄 Preparazione liste: 342 collision, 12 grounds
```
✅ Le liste sono costruite PRIMA del double-rAF

**2. Stabilità Garantita**
```
[CasaModel] 🎯 Double-rAF completato - mondo garantito stabile
```
✅ Two frames garantiscono che Three.js ha applicato tutte le trasformazioni

**3. Ready Event**
```
[CasaModel] ✅ Mondo READY - trasformazioni completate, spawn può procedere
[KitchenScene] ✅ CasaModel READY (event-driven) - Mondo stabile, autorizzando spawn
```
✅ onReady() chiamato DOPO che liste sono pronte

**4. Liste Forzate Usate**
```
[KitchenScene] 🚀 USANDO LISTE FORZATE DA CASAMODEL
[KitchenScene] ✅ Configurazione: 342 collision, 12 grounds, 18 interattivi
```
✅ CASO 1 attivo (forced lists), NON fallback

### ❌ Red Flags (NON dovrebbero apparire)

**Fallback Attivato (BAD)**
```
[KitchenScene] ⚠️ Fallback: Calcolo liste manualmente (LENTO)
```
❌ Significa che modelRef non ha `forcedCollidables` o `forcedGrounds`

**Ordine Sbagliato (BAD)**
```
[KitchenScene] ✅ CasaModel READY
[CasaModel] 🔄 Preparazione liste: ...
```
❌ Scene pronta PRIMA che liste siano costruite

**Mount Multipli FPSController (BAD per stesso mount)**
```
[KitchenScene] ✅ CasaModel READY (1)
[KitchenScene] ✅ Configurazione: ...
[KitchenScene] ✅ CasaModel READY (2)  ← Doppio mount!
[KitchenScene] ✅ Configurazione: ...
```
❌ FPSController monta 2 volte senza unmount intermedio

## 🧪 Test Procedure

### Test 1: DEV Mode (npm run dev)

1. **Avvia server di sviluppo**
   ```bash
   cd escape-room-3d
   npm run dev
   ```

2. **Apri DevTools Console** (F12)

3. **Naviga alla scena Cucina**

4. **Verifica sequenza log**
   - ✅ `🔄 Preparazione liste` PRIMA di `🎯 Double-rAF completato`
   - ✅ `✅ Mondo READY` PRIMA di `✅ CasaModel READY (event-driven)`
   - ✅ `🚀 USANDO LISTE FORZATE` presente (NO fallback)
   - ✅ Configurazione mostra `342 collision, 12 grounds`

5. **Conta mount FPSController**
   - ⚠️ In StrictMode (dev): possibile doppio mount al primo caricamento
   - ✅ Ma dopo stabilizzazione: solo 1 mount per apertura scena

### Test 2: Production Build (Docker)

1. **Build produzione**
   ```bash
   cd escape-room-3d
   docker-compose up --build
   ```

2. **Apri browser** → `http://localhost`

3. **DevTools Console** (F12)

4. **Verifica sequenza log** (stessa checklist Test 1)

5. **Conta mount FPSController**
   - ✅ SEMPRE 1 solo mount per apertura scena (no StrictMode)
   - ✅ Stesso comportamento su hot reload

### Test 3: Cambio Scena (Navigation)

1. **Start in Cucina** → verifica log

2. **Cambia scena** (es. Bagno)
   - ✅ `[KitchenScene]` logs STOP
   - ✅ `[BathroomScene]` logs START
   - ✅ Sequenza identica (traverse → rAF → ready → lists)

3. **Ritorna a Cucina**
   - ✅ Sequenza identica riparte da capo
   - ✅ FPSController rimonta correttamente

### Test 4: Hot Reload (Dev Only)

1. **Con app aperta in DEV**

2. **Modifica file** (es. aggiungi commento in KitchenScene.jsx)

3. **Salva** → Fast Refresh

4. **Verifica console**
   - ✅ Nessun errore
   - ✅ Sequenza log riparte correttamente
   - ✅ Nessun spawn duplicato

## 📊 Metriche da Raccogliere

### Timing (Production Build)

Usa `performance.now()` per misurare:

```javascript
// In CasaModel.jsx (già implementato nei log)
const t0 = performance.now()
// ... traverse ...
const t1 = performance.now()
console.log(`[CasaModel] Traverse completato in ${t1 - t0}ms`)
```

**Valori attesi:**
- Traverse: ~200-300ms (dipende da complessità modello)
- Double-rAF: ~32-48ms (2 frame @ 60fps)
- Total ready time: ~250-350ms

### Conteggio Oggetti

```
[CasaModel] 🔄 Preparazione liste: X collision, Y grounds
```

**Valori attesi per Cucina:**
- Collidables: ~300-400 oggetti
- Grounds: ~10-15 pavimenti

Se numeri molto diversi → possibile bug nel tagging

## ✅ Checklist Finale Verifica

**DEV Mode:**
- [ ] Sequenza log corretta
- [ ] Liste forzate usate (no fallback)
- [ ] FPSController monta 1 volta (dopo stabilizzazione StrictMode)
- [ ] Hot reload funziona senza errori
- [ ] Cambio scena pulito

**PROD Build (Docker):**
- [ ] Sequenza log corretta
- [ ] Liste forzate usate (no fallback)
- [ ] FPSController monta 1 sola volta (no StrictMode)
- [ ] Cambio scena pulito
- [ ] Timing < 350ms per ready

**Identità DEV vs PROD:**
- [ ] Stessa sequenza log (escluso StrictMode)
- [ ] Stessi numeri collision/grounds
- [ ] Stesso comportamento funzionale
- [ ] Nessun fallback in entrambi

## 🐛 Troubleshooting

### Problema: "Fallback: Calcolo liste manualmente"

**Causa:** modelRef non ha `forcedCollidables`

**Fix:**
1. Verifica che CasaModel riceva prop `modelRef`
2. Verifica che `modelRef({ forcedCollidables, forcedGrounds })` sia chiamato
3. Check timing: Scene monta prima che CasaModel finisca?

### Problema: Mount FPSController multiplo (PROD)

**Causa:** worldReady cambia più volte

**Fix:**
1. Verifica che `handleWorldReady` sia memoizzato con `useCallback`
2. Aggiungi guard `readyCalledRef` (vedi doc principale)
3. Check che onReady() non sia chiamato in loop

### Problema: Numeri collision/grounds diversi tra run

**Causa:** Non-determinismo nel traverse o condizioni variabili

**Fix:**
1. Verifica che tagging sia deterministico (no condizioni temporali)
2. Check che tutti i mesh siano sempre processati
3. Verifica `scene.updateWorldMatrix(true, true)` prima del traverse

## 📝 Report Template

```markdown
# Runtime Verification Report

**Data:** [DATA]
**Build:** DEV / PROD
**Browser:** Chrome / Firefox / Safari

## Sequenza Log

✅/❌ Traverse → Double-rAF → modelRef → onReady() → FPSController
✅/❌ Liste forzate usate (no fallback)
✅/❌ FPSController mount singolo

## Metriche

- Traverse time: XXXms
- Total ready time: XXXms
- Collision objects: XXX
- Ground objects: XX

## Note

[Eventuali anomalie o osservazioni]
```

## 🎯 Conclusione

Se TUTTI i test passano → Sistema è **PRODUCTION-READY** e comportamento è **deterministico**.

Se alcuni test falliscono → Usare troubleshooting per identificare e fixare il problema specifico.