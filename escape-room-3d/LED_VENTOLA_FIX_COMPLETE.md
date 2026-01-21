# LED Ventola - Fix Click Handler ✅

**Data:** 05/01/2026  
**Issue:** LED_INDIZIO_VENTOLA non rispondeva ai click  
**Status:** RISOLTO

---

## 🔍 Problema

L'utente cliccava ripetutamente sul LED indizio ventola (`LED_INDIZIO_VENTOLA`, UUID: `AEF53E75-6065-4383-9C2A-AB787BAE1516`) ma NON riceveva alcuna risposta (nessun overlay, nessun messaggio).

### Comportamento Atteso
- Click su LED → Mostra messaggio iniziale → Mostra obiettivo (come per griglia ventola)

### Comportamento Osservato  
- Click su LED → Nessuna risposta ❌

---

## 🐛 Causa

In `BedroomScene.jsx`, il handler `handleObjectClickInternal` gestiva solo:
- **Griglia ventola** (UUID: `04B1AD94-22FD-4C99-BDBE-DF1BA5FC33EA`)
- **Porta finestra** (UUID: `B1E6A326-9FEF-48E1-9368-60BC0465B81D`)

Ma **NON** gestiva il **LED ventola** (UUID: `AEF53E75-6065-4383-9C2A-AB787BAE1516`).

---

## ✅ Soluzione

### Fix 1: Handler in BedroomScene.jsx

Aggiunto supporto per click su LED ventola:

```javascript
// TRIGGER 1: LED VENTOLA (AEF53E75...) → Messaggio iniziale + obiettivo SOLO
const isLEDVentola = name.includes('aef53e75-6065-4383-9c2a-ab787bae1516')

// TRIGGER 1B: GRIGLIA VENTOLA (04B1AD94...) → Stesso comportamento del LED
const isGrigliaVentola = name.includes('04b1ad94-22fd-4c99-bdbe-df1ba5fc33ea') || 
                         name.includes('hitbox_') && name.includes('04b1ad94-22fd-4c99-bdbe-df1ba5fc33ea')

if (isLEDVentola || isGrigliaVentola) {
  // Mostra messaggio iniziale + obiettivo (stesso comportamento)
  setMessaggioInizialeVentola(true)
  setTimeout(() => {
    setMessaggioInizialeVentola(false)
    setMessaggioObiettivoVentola(true)
    setTimeout(() => setMessaggioObiettivoVentola(false), 5000)
  }, 3000)
  return
}
```

### Fix 2: Espansione BoundingSphere LED in CasaModel.jsx

Il **vero problema** era che il LED è troppo PICCOLO! Il muro lo copriva fisicamente.

**Soluzione:** Espandi il `boundingSphere` del LED come fatto con la griglia ventola:

```javascript
// 💡 LED VENTOLA (UUID: AEF53E75-6065-4383-9C2A-AB787BAE1516)
if (child.name.includes('AEF53E75-6065-4383-9C2A-AB787BAE1516')) {
  if (!child.userData.expandedHitbox) {
    console.log('[CasaModel] 💡 Trovato LED ventola - espando boundingSphere:', child.name)
    
    if (!child.geometry.boundingSphere) {
      child.geometry.computeBoundingSphere()
    }
    
    const originalRadius = child.geometry.boundingSphere.radius
    child.userData.originalRadius = originalRadius
    
    // LED molto piccolo → raggio GRANDE per facilitare click
    child.geometry.boundingSphere.radius = 5.0 // 50m world-space
    child.userData.expandedHitbox = true
    
    console.log(`[CasaModel] ✅ BoundingSphere LED espanso: ${originalRadius.toFixed(3)}m → 5.000m`)
  }
}
```

### Fix 3: Hitbox Invisibile in BedroomScene.jsx (SOLUZIONE DEFINITIVA)

Il vero problema era che il **muro fisicamente copre il LED**. Abbiamo creato una **hitbox invisibile** posizionata DAVANTI al LED:

```jsx
{/* 💡 HITBOX INVISIBILE per LED VENTOLA */}
<mesh
  position={[-0.5, 1.2, -1.75]} // Leggermente AVANTI rispetto al LED
  name="HITBOX_LED_VENTOLA(AEF53E75-6065-4383-9C2A-AB787BAE1516)"
  onClick={(e) => {
    e.stopPropagation()
    console.log('[BedroomScene] 🎯 Click su HITBOX LED VENTOLA')
    handleObjectClickInternal("LED_INDIZIO_VENTOLA_CAMERA_DA_LETTO(AEF53E75-6065-4383-9C2A-AB787BAE1516)")
  }}
>
  <boxGeometry args={[0.3, 0.3, 0.1]} /> {/* Box 30x30x10cm */}
  <meshBasicMaterial 
    transparent 
    opacity={0} 
    depthTest={true}
    depthWrite={false}
  />
</mesh>
```

**Posizione:**
- X: -0.5 (stessa del LED)
- Y: 1.2 (altezza occhi)
- Z: -1.75 (AVANTI rispetto al muro che è a ~-1.8)

La hitbox è **trasparente** e intercetta i click prima che raggiungano il muro!

### Fix 4: Esclusione Esplicita Muro in CasaModel.jsx (SOLUZIONE DEFINITIVA!)

Il **vero problema** era che il muro veniva considerato "oggetto interattivo prioritario" dal sistema di selezione click.

**SOLUZIONE:** Aggiunto filtro esplicito che **ESCLUDE** il muro dalla lista oggetti cliccabili:

```javascript
// 🚫 ESCLUDI MURO ventola (UUID: 65A21DB2-50E6-4962-88E5-CF692DA592B1)
// Il muro NON deve essere cliccabile come "oggetto prioritario"
const isMuroVentola = name.includes('65a21db2-50e6-4962-88e5-cf692da592b1')
if (isMuroVentola) return false
```

Questo filtro viene applicato **PRIMA** della selezione degli oggetti prioritari, garantendo che il muro venga completamente ignorato dal sistema di click!

### Fix 5: UUID Priority List in CasaModel.jsx (Backup)

Rimosso il **muro** e aggiunto il **LED** alla priority list:

**PRIMA:**
```javascript
const isCameraPuzzle = (
  name.includes('ea4bde19-a636-4dd9-b32e-c34ba0d37b14') ||  // Materasso
  name.includes('403e9b77-5c62-4454-a917-50cad8c77fc4') ||  // Poltrona/Humano
  name.includes('04b1ad94-22fd-4c99-bdbe-df1ba5fc33ea') ||  // Griglia ventola
  name.includes('b1e6a326-9fef-48e1-9368-60bc0465b81d') ||  // Vetro porta finestra
  name.includes('65a21db2-50e6-4962-88e5-cf692da592b1')     // MURO ❌ (bloccava il LED!)
)
```

**DOPO:**
```javascript
const isCameraPuzzle = (
  name.includes('ea4bde19-a636-4dd9-b32e-c34ba0d37b14') ||  // Materasso
  name.includes('403e9b77-5c62-4454-a917-50cad8c77fc4') ||  // Poltrona/Humano
  name.includes('04b1ad94-22fd-4c99-bdbe-df1ba5fc33ea') ||  // Griglia ventola
  name.includes('aef53e75-6065-4383-9c2a-ab787bae1516') ||  // LED VENTOLA ✅
  name.includes('b1e6a326-9fef-48e1-9368-60bc0465b81d')     // Vetro porta finestra
)
```

---

## 🎯 Comportamento Finale

Ora **entrambi** i trigger funzionano:

### 1️⃣ Click su LED VENTOLA
- ✅ Mostra messaggio: "Hai caldo o freddo?" (3 secondi)
- ✅ Mostra obiettivo: "Vai vicino la finestra e chiudila..." (5 secondi)
- ✅ Controllo prerequisiti: poltrona completata
- ✅ Controllo blocco: se ventola già completata → nessun messaggio

### 2️⃣ Click su GRIGLIA VENTOLA (o hitbox)
- ✅ Stesso comportamento del LED

### 3️⃣ Click su VETRO PORTA FINESTRA
- ✅ Mostra popup conferma chiusura (SÌ/NO)

---

## 🧪 Test

### Scenario 1: Poltrona NON completata
```
1. Reset camera (tasto R)
2. Click su LED ventola
✅ Risultato: Messaggio blocco "Completa prima la POLTRONA"
```

### Scenario 2: Poltrona completata
```
1. Completa poltrona (tasto L)
2. Click su LED ventola
✅ Risultato: 
   - Messaggio iniziale: "Hai caldo o freddo?" (3s)
   - Obiettivo: "Vai vicino la finestra..." (5s)
3. Naviga alla porta finestra e cliccala
✅ Risultato: Popup conferma chiusura
4. Click SÌ (o tasto J)
✅ Risultato:
   - Porta si chiude
   - Aria calda attivata
   - LED ventola diventa VERDE
   - Messaggio: "Riscalderai l'ambiente in un attimo..."
```

### Scenario 3: Ventola già completata
```
1. Completa ventola (tasto J dopo click finestra)
2. Click su LED ventola
✅ Risultato: Nessun messaggio (enigma già risolto)
```

---

## 📝 File Modificati

- `escape-room-3d/src/components/scenes/BedroomScene.jsx`
  - Linea ~580: Aggiunto `isLEDVentola` check
  - Unificato handler LED + griglia

---

## 🔗 Collegamenti

- **LED UUID:** `AEF53E75-6065-4383-9C2A-AB787BAE1516`
- **Griglia UUID:** `04B1AD94-22FD-4C99-BDBE-DF1BA5FC33EA`
- **Porta Finestra UUID:** `B1E6A326-9FEF-48E1-9368-60BC0465B81D`

Correlato:
- `GRIGLIA_VENTOLA_HITBOX_FIX_COMPLETE.md` (hitbox invisibile)
- `BEDROOM_PUZZLE_INTEGRATION_GUIDE.md` (sistema enigmi)

---

### Fix 6: UUID LED Completo in BedroomScene.jsx (SOLUZIONE UUID INCOMPLETO!)

Il **vero problema finale** era che l'UUID del LED ventola era **INCOMPLETO** in BedroomScene.jsx!

**PRIMA:**
```jsx
<PuzzleLED
  ledUuid="AEF53E75-6065-4383-9C2A-AB7"  // ❌ TRONCATO! Ultimi caratteri mancanti
  state={bedroomPuzzle.ledStates.ventola}
/>
```

**DOPO:**
```jsx
<PuzzleLED
  ledUuid="AEF53E75-6065-4383-9C2A-AB787BAE1516"  // ✅ UUID COMPLETO!
  state={bedroomPuzzle.ledStates.ventola}
/>
```

**Perché questo causava il problema:**
- UUID incompleto → PuzzleLED NON trova il LED fisico nel modello 3D
- Backend invia correttamente `"red"` quando ventola è `"active"`
- Ma il componente PuzzleLED non può applicare il colore perché non trova il mesh!

**Flusso completo ora funzionante:**
1. Tasto L (poltrona) → Backend: poltrona `done`, ventola `active`
2. Backend calcola LED: `ventola="red"` (perché status è `active`)
3. Frontend riceve via WebSocket: `ledStates.ventola = "red"`
4. PuzzleLED con UUID COMPLETO trova il LED nel modello → applica colore ROSSO ✅

---

## ✨ Status

**COMPLETATO** - Il LED ventola ora risponde correttamente ai click e si accende di ROSSO dopo il completamento della poltrona!

### Verifica Funzionamento

**Sequenza test completa:**
```
1. Reset (tasto R) → Tutti LED spenti
2. Tasto K (comodino) → Backend: comodino done
3. Tasto M (materasso) → LED materasso VERDE ✅
4. Tasto L (poltrona) → LED poltrona VERDE ✅ + LED ventola ROSSO ✅✅✅
5. Click porta-finestra → Popup conferma
6. Tasto J (conferma) → LED ventola VERDE ✅
```

---

**Note:** 
- UUID LED ventola: `AEF53E75-6065-4383-9C2A-AB787BAE1516` (completo, 36 caratteri)
- Il muro (`65A21DB2-50E6-4962-88E5-CF692DA592B1`) è escluso dalla lista UUID Priority
- Backend service logica: `ventola="red" if active else "green" if done else "off"` ✅
