# 📊 RESOCONTO COMPLETO ANIMAZIONI - ESCAPE ROOM 3D

> **Data generazione:** 10 Gennaio 2026  
> **Analisi:** 14 animazioni (10 file JSON + 4 hardcoded)  
> **Stanze:** 5 (Esterno, Cucina, Bagno, Camera da Letto, Soggiorno)

---

## 📋 INDICE

1. [Riepilogo Generale](#-riepilogo-generale)
2. [Esterno (Ingresso)](#-1-esterno-ingresso)
3. [Cucina](#-2-cucina)
4. [Bagno](#-3-bagno)
5. [Camera da Letto](#-4-camera-da-letto)
6. [Soggiorno](#-5-soggiorno)
7. [Statistiche e Analisi](#-statistiche-e-analisi)
8. [Tabelle Comparative](#-tabelle-comparative)
9. [Note Tecniche](#-note-tecniche)

---

## 🎯 RIEPILOGO GENERALE

### Totali
- **File analizzati:** 10 JSON + 2 file JavaScript (KitchenScene.jsx, usePentolaAnimation.js)
- **Animazioni totali:** 14 (1 file multi-object con 2 animazioni + 4 hardcoded)
- **Stanze coperte:** 5
- **Tipi di animazione:** Rotazione, Posizione, Sequenza Mista, Multi-Object

### Distribuzione per Stanza
| Stanza | N° Animazioni | File |
|--------|---------------|------|
| Esterno | 1 | `porta_ingresso_sequence.json` |
| Cucina | 4 | `porta_cucina_sequence.json`, `usePentolaAnimation.js`, `KitchenScene.jsx (anta mobile, frigo)` |
| Bagno | 2 | `porta_finestra_bagno_sequence.json`, `anta_doccia_sequence.json` |
| Camera da Letto | 3 | `porta_finestra_camera_sequence.json`, `comodino_sequence.json`, `materasso_sequence.json` |
| Soggiorno | 3 | `humano_soggiorno_sequence.json`, `couch_soggiorno_sequence.json`, `pianta_soggiorno_sequence.json` |

---

## 🏠 1. ESTERNO (INGRESSO)

### 1.1 Porta d'Ingresso

**File:** `porta_ingresso_sequence.json`

#### Specifiche Tecniche
```json
{
  "objectName": "PORTA_INGRESSO",
  "UUID": "BE4CFAD9-5A47-4C4C-AE3F-433A4A7694F3",
  "mode": "rotation"
}
```

#### Parametri Animazione
| Parametro | Valore | Note |
|-----------|--------|------|
| **Tipo** | Rotazione | Apertura porta |
| **Asse** | Z | Apertura laterale |
| **Angolo** | 90° | Apertura completa |
| **Direzione** | -1 (negativa) | Senso orario |
| **Durata** | 1.5s | Con easing |
| **Easing** | easeInOutCubic | Movimento fluido |
| **Pivot** | Automatico | Calcolato da bbox (lato destro) |
| **Auto-Pivot** | right | Sistema automatico |

#### Elementi Collegati
- **Maniglie:** 2 UUID collegati
  - `C79AFA0F-3538-48BE-9380-3D385F83BF71`
  - `2AE21696-5B61-4DBB-B9A6-D60D43EEDED8`

#### Note Implementative
- ✅ Asse Z corretto per apertura laterale
- ✅ Pivot calcolato automaticamente dalla bounding box
- ✅ Sistema autoPivot implementato
- Sistema più avanzato rispetto alle altre porte

---

## 🍳 2. CUCINA

### 2.1 Porta Cucina

**File:** `porta_cucina_sequence.json`

#### Specifiche Tecniche
```json
{
  "objectName": "PORTA_CUCINA",
  "UUID": "4677853D-8C06-4363-BBE7-FACF26F193E9",
  "mode": "rotation"
}
```

#### Parametri Animazione
| Parametro | Valore | Note |
|-----------|--------|------|
| **Tipo** | Rotazione | Rotazione su cardini |
| **Asse** | Y | ✅ Rotazione verticale (corretto) |
| **Angolo** | 90° | Apertura completa |
| **Direzione** | +1 (positiva) | Senso antiorario |
| **Velocità** | 45°/s | Velocità standard |
| **Pivot Manuale** | (-0.696, 0.543, 0.251) | Lato sinistro |

#### Coordinate Pivot
- **X:** -0.696 (lato sinistro)
- **Y:** 0.5425608825683598 (altezza cardine)
- **Z:** 0.251 (profondità)

#### Note Implementative
- ✅ **CORREZIONE APPLICATA:** Asse Y (era precedentemente errato)
- Pivot manuale specificato per cardini lato sinistro
- Rotazione verticale corretta per porta con cardini

---

### 2.2 Pentola (Hardcoded)

**File:** `src/hooks/usePentolaAnimation.js`

#### Specifiche Sistema
```javascript
{
  "objectName": "PENTOLA",
  "UUID": "PENTOLA(FC640F14-10EB-486E-8AED-5773C59DA9E0)",
  "mode": "position",
  "source": "coordinates_PENTOLA_1766086342062.json (exported, then hardcoded)"
}
```

#### Caratteristiche
- **Tipo:** Posizione (traslazione one-shot)
- **Trigger:** Tasto 5 (puzzle fornelli)
- **Implementazione:** Coordinate hardcoded in hook JavaScript
- **Origine:** Esportate da Animation Editor, poi integrate nel codice

#### Parametri Animazione
| Parametro | Valore | Note |
|-----------|--------|------|
| **Tipo** | Posizione | Spostamento lineare |
| **Trigger** | Tasto 5 | Pentola sui fornelli |
| **Velocità** | 24 m/s | Movimento veloce |
| **Reversibile** | ✅ Sì (Tasto 6) | Torna alla posizione originale |

#### Coordinate Movimento

**ORIGINE (nel mobile smart):**
```javascript
x: -1.0153120000000007
y: -0.10899887084960827
z:  0.8566409999999999
```

**TARGET (sui fornelli - Feu_1_460):**
```javascript
x: -0.9743261086178183
y:  0.2103601837158211
z:  1.53566625767261
```

#### Delta Movimento
| Asse | Valore Start | Valore End | Delta | Significato |
|------|--------------|------------|-------|-------------|
| **X** | -1.015 | -0.974 | **+0.041m** | Si sposta leggermente a destra |
| **Y** | -0.109 | 0.210 | **+0.319m** | Si alza di 32cm (dal mobile ai fornelli) |
| **Z** | 0.857 | 1.536 | **+0.679m** | Si sposta in avanti verso fornelli |
| **Distanza** | - | - | **~0.756m** | Distanza 3D totale |

#### Analisi Movimento
- **Direzione principale:** Avanti (Z+) e Su (Y+)
- **Altezza:** Sale di 32cm per posizionarsi sul piano cottura
- **Profondità:** 68cm in avanti, dal mobile interno ai fornelli esterni
- **Durata stimata:** ~0.03s (molto veloce: 0.756m / 24 m/s)

#### Metadata Implementazione
```javascript
{
  "hook": "usePentolaAnimation",
  "pattern": "PENTOLA",
  "targetPattern": "Feu_1_460",
  "offsetY": 0.1,
  "coordinateSpace": "world",
  "conversion": "world→local (parent-aware)",
  "animationType": "one-shot"
}
```

#### Sistema di Conversione
- **Coordinate:** World Space (assolute)
- **Conversione:** Automatica world→local tramite `parent.worldToLocal()`
- **Parent-aware:** ✅ Gestisce correttamente la gerarchia 3D
- **Interpolazione:** Linear (lerpVectors)

#### Note Implementative
- ⚠️ **NON esiste file JSON:** Coordinate hardcoded direttamente nel JavaScript
- ✅ **Origine Animation Editor:** Coordinate estratte e poi integrate nel codice
- ✅ **Sistema avanzato:** Gestione world/local space automatica
- ✅ **Puzzle Integration:** Collegato al sistema puzzle fornelli (LED)
- 🔄 **Reversibile:** Tasto 6 riporta pentola alla posizione originale
- 📊 **Logging completo:** Sistema di debug dettagliato con percentuali progresso
- ⚡ **Velocità molto alta:** 24 m/s potrebbe essere intenzionale per effetto immediato

#### Relazione con Puzzle
```javascript
// In KitchenScene.jsx
if (pentolaSuiFornelli && puzzleStates.fornelli === 'active') {
  completeFornelli() // ← Completa puzzle fornelli
  // LED passa da RED → GREEN
}
```

---

### 2.3 Sportello Frigo Inferiore (Hardcoded)

**File:** `src/components/scenes/KitchenScene.jsx`

#### Specifiche Sistema
```javascript
{
  objectName: "SPORTELLO_FRIGO_INFERIORE(942812A9-5DFF-4798-9B55-D5C8DE35CC5A)",
  mode: "rotation",
  source: "hardcoded in KitchenScene.jsx"
}
```

#### Caratteristiche
- **Tipo:** Rotazione (apertura sportello)
- **Trigger:** Tasto 3 (apri) / Tasto 4 (chiudi)
- **Implementazione:** Coordinate hardcoded in fridgeDoorConfig
- **Hook:** `useAnimatedDoor` (stesso sistema delle porte)
- **Stato iniziale:** APERTO (true) - per enigma

#### Parametri Animazione

| Parametro | Valore | Note |
|-----------|--------|------|
| **Tipo** | Rotazione | Apertura laterale |
| **Asse** | Z (Roll) | Apertura laterale sportello |
| **Angolo** | 105° | Apertura completa |
| **Direzione** | +1 (positiva) | Antioraria |
| **Velocità** | 105°/s | Più veloce dello standard (45°/s) |
| **Pivot** | (-0.947, 0.767, 1.353) | Cardine hardcoded |

#### Coordinate Pivot
- **X:** -0.947 (lato cardine)
- **Y:** 0.767 (altezza cardine)
- **Z:** 1.353 (profondità)

#### Metadata Implementazione
```javascript
{
  hook: "useAnimatedDoor",
  pattern: "SPORTELLO_FRIGO_INFERIORE",
  initialState: true,  // APERTO per enigma
  puzzle: "frigo",
  coordinateSpace: "world",
  animationType: "hinged_door"
}
```

#### Sistema di Controllo
- **Apertura:** `setFridgeDoorOpen(true)` - Tasto 3
- **Chiusura:** `setFridgeDoorOpen(false)` - Tasto 4
- **Hook animazione:** `useAnimatedDoor(fridgeDoorObject, fridgeDoorOpen, fridgeDoorConfig)`

#### Note Implementative
- ⚠️ **NON esiste file JSON:** Coordinate hardcoded direttamente in KitchenScene.jsx
- ✅ **Sistema condiviso:** Usa useAnimatedDoor come le porte
- ✅ **Puzzle Integration:** Collegato al sistema puzzle frigo (LED)
- 🚪 **Simile a porta ingresso:** Asse Z per apertura laterale
- 🎮 **Stato iniziale aperto:** Parte aperto (true) per permettere il puzzle
- ⚡ **Velocità custom:** 105°/s invece dei 45°/s standard
- 🔧 **Pivot manuale:** Specificato esplicitamente (no autoPivot)

#### Relazione con Puzzle
```javascript
// In KitchenScene.jsx
// Quando frigo si chiude → completa enigma
if (prevFridgeState.current === true && fridgeDoorOpen === false) {
  if (puzzleStates.frigo === 'active') {
    closeFrigo() // ← Completa puzzle frigo
    // LED passa da RED → GREEN
  }
}
```

#### Confronto con altre animazioni
- **Simile a:** Porta ingresso (asse Z, apertura laterale)
- **Differenza chiave:** Hardcoded vs JSON esterno
- **Velocità:** 2.3x più veloce dello standard (105°/s vs 45°/s)
- **Pivot:** Manuale (no autoPivot come porta ingresso)

---

### 2.4 Anta Mobile Smart (Hardcoded)

**File:** `src/components/scenes/KitchenScene.jsx`

#### Specifiche Sistema
```javascript
{
  objectName: "sweethome3d_opening_on_hinge_1_door_511(D5F6C9BE-7802-4730-83AE-0BEB2ACAABFA)",
  mode: "rotation",
  source: "hardcoded in KitchenScene.jsx"
}
```

#### Caratteristiche
- **Tipo:** Rotazione (apertura sportello mobile)
- **Trigger:** Tasto 1 (apri) / Tasto 2 (chiudi)
- **Implementazione:** Coordinate hardcoded in animatedDoorConfig
- **Hook:** `useAnimatedDoor` (stesso sistema delle porte)
- **Funzione:** Anta decorativa del mobile smart cucina

#### Parametri Animazione

| Parametro | Valore | Note |
|-----------|--------|------|
| **Tipo** | Rotazione | Apertura laterale |
| **Asse** | Z (Roll) | Apertura laterale sportello |
| **Angolo** | 90° | Apertura completa |
| **Direzione** | -1 (negativa) | Oraria |
| **Velocità** | 90°/s | 2x più veloce dello standard (45°/s) |
| **Pivot** | (-2.872, 0.754, 0.571) | Cardine hardcoded |

#### Coordinate Pivot
- **X:** -2.872 (lato cardine)
- **Y:** 0.754 (altezza cardine)
- **Z:** 0.571 (profondità)

#### Metadata Implementazione
```javascript
{
  hook: "useAnimatedDoor",
  pattern: "sweethome3d_opening_on_hinge_1_door_511",
  initialState: true,  // INVERTITO per ESP32
  coordinateSpace: "world",
  animationType: "hinged_door"
}
```

#### Sistema di Controllo
- **Apertura:** `setAnimatedDoorOpen(true)` - Tasto 1
- **Chiusura:** `setAnimatedDoorOpen(false)` - Tasto 2
- **Hook animazione:** `useAnimatedDoor(animatedDoorObject, animatedDoorOpen, animatedDoorConfig)`

#### Note Implementative
- ⚠️ **NON esiste file JSON:** Coordinate hardcoded direttamente in KitchenScene.jsx
- ✅ **Sistema condiviso:** Usa useAnimatedDoor come le porte e il frigo
- 🎮 **Anta decorativa:** Non collegata a puzzle, puramente estetica
- 🚪 **Simile a porta ingresso e frigo:** Asse Z per apertura laterale
- ⚡ **Velocità custom:** 90°/s (2x più veloce dello standard 45°/s)
- 🔧 **Pivot manuale:** Specificato esplicitamente (no autoPivot)
- 🔄 **Stato iniziale:** true (invertito per compatibilità ESP32)

#### Relazione con altri oggetti
```javascript
// Contiene la PENTOLA (animazione 2.2)
// L'anta si apre per accedere all'interno del mobile
// Dove la pentola parte per andare sui fornelli
```

#### Confronto con altre animazioni cucina
- **Simile a:** Sportello frigo e porta ingresso (asse Z)
- **Velocità:** Intermedia tra standard (45°/s) e frigo (105°/s)
- **Scopo:** Decorativa, non puzzle-integrated
- **Pivot:** Manuale come il frigo

---

## 🚿 3. BAGNO

### 3.1 Porta-Finestra Bagno

**File:** `porta_finestra_bagno_sequence.json`

#### Specifiche Tecniche
```json
{
  "sequence": [
    {
      "objectName": "VETRO_PORTA_FINESTRA_BAGNO",
      "UUID": "85EEAEFB-4D36-4CBE-9482-25218ED49A17"
    }
  ]
}
```

#### Parametri Animazione
| Parametro | Valore | Note |
|-----------|--------|------|
| **Tipo** | Rotazione | Apertura porta-finestra |
| **Asse** | Y | ✅ Rotazione verticale (corretto) |
| **Angolo** | 30° | Apertura parziale |
| **Direzione** | +1 (positiva) | Senso antiorario |
| **Velocità** | 45°/s | Velocità standard |
| **Pivot** | Automatico | Lato destro (autoPivot) |

#### Elementi Collegati
- **Maniglie:** 2 UUID collegati
  - `B570A3EE-B02E-4660-B048-396C6099E228`
  - `91ED1413-7981-462E-84D4-5F050F2C827C`

#### Note Implementative
- ✅ **CORREZIONE APPLICATA:** Asse Y per rotazione verticale
- Formato sequenza (array) anche se contiene un solo elemento
- Apertura parziale (30°) per porta-finestra

---

### 3.2 Anta Doccia + Maniglia (Multi-Object)

**File:** `anta_doccia_sequence.json`

#### Specifiche Sistema
```json
{
  "name": "anta_doccia_multi_object",
  "version": "1.0",
  "sync_type": "simultaneous"
}
```

#### Caratteristiche
- **Tipo:** Animazione sincronizzata ⚡
- **Oggetti:** 2 (anta + maniglia)
- **Trigger:** Tasto L
- **Modalità:** Simultanea
- **Reversibile:** true

#### Oggetto 1: ANTA_DOCCIA

| Parametro | Valore |
|-----------|--------|
| **UUID** | `8757EC12-8FFC-44E5-A699-89C491F80102` |
| **Tipo** | Rotazione |
| **Asse** | Y (verticale) |
| **Angolo** | 60° |
| **Direzione** | +1 |
| **Velocità** | 45°/s |
| **Pivot** | (2.583, 0.558, 3.078) |

#### Oggetto 2: MANIGLIA_ANTA_DOCCIA

| Parametro | Valore |
|-----------|--------|
| **UUID** | `C58A35D0-728B-43DF-B7D7-7004734BDE25` |
| **Tipo** | Rotazione |
| **Asse** | Y (verticale) |
| **Angolo** | 60° |
| **Direzione** | +1 |
| **Velocità** | 45°/s |
| **Pivot** | (2.583, 0.558, 3.078) - **stesso** |

#### Note Implementative
- ✅ Sistema multi-object avanzato
- ✅ Pivot condiviso tra anta e maniglia
- ✅ Animazione perfettamente sincronizzata
- Metadata completi per gestione scene

---

## 🛏️ 4. CAMERA DA LETTO

### 4.1 Porta-Finestra Camera

**File:** `porta_finestra_camera_sequence.json`

#### Specifiche Tecniche
```json
{
  "objectName": "VETRO_PORTA_FINESTRA_LETTO",
  "UUID": "B1E6A326-9FEF-48E1-9368-60BC0465B81D",
  "mode": "rotation"
}
```

#### Parametri Animazione
| Parametro | Valore | Note |
|-----------|--------|------|
| **Tipo** | Rotazione | Apertura porta-finestra |
| **Asse** | Y | ✅ Rotazione verticale (corretto da Z) |
| **Angolo** | 30° | Apertura parziale |
| **Direzione** | +1 (positiva) | Senso antiorario |
| **Velocità** | 45°/s | Velocità standard |
| **Pivot Manuale** | (0.119, 0.596, -0.663) | Posizione cardine |

#### Elementi Collegati
- **Maniglie:** 2 UUID collegati
  - `B570A3EE-B02E-4660-B048-396C6099E228`
  - `91ED1413-7981-462E-84D4-5F050F2C827C`

#### Note Implementative
- ✅ **CORREZIONE CRITICA:** Asse Z errato → Y corretto
- Pivot manuale specificato
- Stesse maniglie della porta-finestra bagno (riuso componenti)

---

### 4.2 Comodino Samuelson (Sequenza Doppia)

**File:** `comodino_sequence.json`

#### Specifiche Sistema
```json
{
  "objectName": "Comodino_Samuelson",
  "objectIds": [4 UUID],
  "description": "Sequenza: 1) Rotazione 45°, 2) Spostamento al muro"
}
```

#### Caratteristiche
- **Tipo:** Sequenza mista (rotation → position)
- **Componenti:** 4 UUID (multi-component)
- **Trigger:** Tasto K
- **Fasi:** 2 (automatiche in sequenza)

#### FASE 1: ROTAZIONE

| Parametro | Valore | Note |
|-----------|--------|------|
| **Tipo** | Rotazione | Rotazione preliminare |
| **Asse** | Y | Rotazione verticale |
| **Angolo** | 45° | Rotazione parziale |
| **Direzione** | +1 | Antiorario |
| **Velocità** | 45°/s | Velocità standard |
| **Pivot** | (-1.592, **0**, 0.075) | ✅ pivotY = 0 (pavimento) |
| **Durata** | ~1.0s | Stimata |

#### FASE 2: POSIZIONE (Traslazione)

| Parametro | Valore | Note |
|-----------|--------|------|
| **Tipo** | Posizione | Spostamento lineare |
| **Start** | (-1.592, **0**, 0.075) | Posizione iniziale |
| **End** | (-1.85, **0**, -0.15) | Posizione finale |
| **Velocità** | 2.0 m/s | Velocità traslazione |
| **Distanza** | 0.779m | Distanza calcolata |
| **Durata** | ~0.39s | Stimata |

#### Delta Movimento
- **ΔX:** -0.258m (verso sinistra)
- **ΔY:** 0m (nessun cambio altezza)
- **ΔZ:** -0.225m (verso il muro)

#### Correzioni Applicate
- ✅ **pivotY = 0** (era 0.556, corretto a pavimento)
- ✅ **startY = 0** (era 0.556, corretto a pavimento)
- ✅ **Coordinate END invertite** per direzione corretta
  - Formula: `newEnd = start - (oldEnd - start)`

#### Note Implementative
- Sistema sequenziale automatico
- Due fasi consecutive: prima ruota, poi trasla
- Coordinate corrette per movimento realistico verso muro

---

### 4.3 Materasso / Letto a Scomparsa

**File:** `materasso_sequence.json`

#### Specifiche Sistema
```json
{
  "objectName": "Matress_Cube_236",
  "objectIds": [2 UUID],
  "description": "Letto a scomparsa: scende dal muro verso pavimento"
}
```

#### Caratteristiche
- **Tipo:** Letto a scomparsa (hinged_door)
- **Componenti:** 2 UUID (letto + maniglia/parte aggiuntiva)
- **Trigger:** Tasto M
- **Animazione:** Rotazione abbattimento

#### Parametri Animazione

| Parametro | Valore | Note |
|-----------|--------|------|
| **Tipo** | Rotazione | Abbattimento |
| **Asse** | Z (Roll) | Rotazione verso il basso |
| **Angolo** | 90° | Abbattimento completo |
| **Direzione** | -1 (negativa) | Oraria, verso basso |
| **Velocità** | 45°/s | Velocità standard |
| **Pivot** | (-2.05, 0.641, 0.771) | Cardine in alto |
| **Pivot Location** | right | Lato destro |
| **Durata** | ~2.0s | Stimata |

#### Posizione Oggetto
- **X:** -1.015
- **Y:** -0.109
- **Z:** 0.857

#### Metadata Avanzati
```json
{
  "editorMode": "advanced",
  "realisticConfig": true,
  "animationType": "hinged_door",
  "preset": "rotation_piano",
  "exact_coordinates": true,
  "source": "animation_editor_export",
  "timestamp": "2025-12-27T22:27:51.850Z"
}
```

#### Note Implementative
- ✅ Coordinate ESATTE da Animation Editor V2.0
- ✅ Sistema multi-object: oggetti "cuciti" insieme
- ✅ Configurazione realistica attiva
- ✅ Preset "Rotazione Piano (Mobili)"
- ✅ Nessuna conversione applicata - dati diretti dall'editor
- Movimento realistico di letto che scende dal muro

---

## 🛋️ 5. SOGGIORNO

### 5.1 Humano (Personaggio)

**File:** `humano_soggiorno_sequence.json`

#### Specifiche Tecniche
```json
{
  "objectName": "Humano_02Casual_18_30K",
  "UUID": "DD8B908D-EA31-4441-8A46-382EB50A15B3",
  "mode": "rotation"
}
```

#### Parametri Animazione
| Parametro | Valore |
|-----------|--------|
| **Tipo** | Rotazione |
| **Asse** | Y |
| **Angolo** | 22° |
| **Direzione** | -1 (negativa) |
| **Velocità** | 45°/s |
| **Pivot** | (2.603, 0.752, 0.539) |
| **Trigger** | Tasto M |
| **Timestamp** | 2025-12-29T20:21:06.527Z |

---

### 5.2 CouchSet (Divano)

**File:** `couch_soggiorno_sequence.json`

#### Specifiche Tecniche
```json
{
  "objectName": "CouchSet",
  "UUID": "DFBB52B8-5818-4301-AA60-E98CE42CB71A",
  "mode": "rotation"
}
```

#### Parametri Animazione
| Parametro | Valore |
|-----------|--------|
| **Tipo** | Rotazione |
| **Asse** | Y |
| **Angolo** | 22° |
| **Direzione** | -1 (negativa) |
| **Velocità** | 45°/s |
| **Pivot** | (2.603, 0.752, 0.539) |
| **Trigger** | Tasto M |
| **Timestamp** | 2025-12-29T20:20:30.060Z |

#### ⚡ NOTA IMPORTANTE
**Humano e CouchSet condividono lo stesso pivot!**
- Pivot identico: `(2.603, 0.752, 0.539)`
- Stesso trigger: Tasto M
- Stesso angolo: 22°
- Stessa direzione: -1

**→ Probabile animazione sincronizzata!**

---

### 5.3 Pianta

**File:** `pianta_soggiorno_sequence.json`

#### Specifiche Tecniche
```json
{
  "objectName": "Pianta",
  "UUID": "59C82E89-705B-40B0-8BD7-3BBF4897BC4D",
  "mode": "position"
}
```

#### Parametri Animazione
| Parametro | Valore | Note |
|-----------|--------|------|
| **Tipo** | Posizione | Spostamento one-shot |
| **Trigger** | Tasto G | Diverso dagli altri |
| **Velocità** | 30 m/s | Più lenta rispetto al comodino |
| **Timestamp** | 2026-01-04T10:37:27.028Z | Più recente |

#### Coordinate Movimento

**Start:**
- X: -1.014
- Y: -0.132
- Z: 0.809

**End:**
- X: -1.718
- Y: 0.268
- Z: -0.724

#### Delta Movimento
| Asse | Delta | Note |
|------|-------|------|
| **ΔX** | -0.739m | Spostamento orizzontale sx |
| **ΔY** | +0.400m | Si alza |
| **ΔZ** | -1.533m | Spostamento profondità |
| **Distanza** | 1.748m | Distanza totale |

#### Metadata Animazione
```json
{
  "type": "movable",
  "state": "origin",
  "distance": 1.7479580769754104
}
```

#### Note Implementative
- Unico oggetto del soggiorno con animazione di posizione
- Movimento one-shot (non reversibile automaticamente)
- Trigger diverso (G invece di M)

---

## 📈 STATISTICHE E ANALISI

### Per Tipo di Animazione

| Tipo | Quantità | Percentuale | Oggetti |
|------|----------|-------------|---------|
| **Rotazione** | 9 | 69.2% | Porte, sportelli, personaggi, mobili |
| **Posizione** | 3 | 23.1% | Comodino (fase 2), Pianta, **Pentola** |
| **Sequenza Mista** | 1 | 7.7% | Comodino (rot + pos) |
| **Multi-Object** | 2 | 15.4% | Anta doccia, Materasso |

### Per Asse di Rotazione

| Asse | Quantità | Uso Principale | Note |
|------|----------|----------------|------|
| **Y** | 6 | Porte con cardini, personaggi | Rotazione verticale standard |
| **Z** | 4 | Porta ingresso, anta mobile, sportello frigo, materasso | Aperture laterali, abbattimenti |

### Velocità Utilizzate

| Velocità | Uso | Oggetti |
|----------|-----|---------|
| **105°/s** | Rotazioni molto veloci | **Sportello frigo** |
| **90°/s** | Rotazioni veloci | **Anta mobile smart** |
| **45°/s** | Standard rotazioni | Maggior parte porte e oggetti |
| **24 m/s** | Traslazioni veloci | **Pentola** |
| **2.0 m/s** | Traslazioni medie | Comodino (posizione) |
| **30 m/s** | Traslazioni medie | Pianta |

### Durate Stimate

| Oggetto | Tipo | Durata | Calcolo |
|---------|------|--------|---------|
| Porta Ingresso | Rotazione | 1.5s | Specificata con easing |
| Comodino (rot) | Rotazione | 1.0s | 45° a 45°/s |
| Comodino (pos) | Posizione | 0.39s | 0.779m a 2m/s |
| Materasso | Rotazione | 2.0s | 90° a 45°/s |

---

## 📊 TABELLE COMPARATIVE

### Porte: Confronto Assi e Parametri

| Porta | Asse | Angolo | Pivot | Tipo Pivot | Note |
|-------|------|--------|-------|------------|------|
| Ingresso | **Z** | 90° | Auto | right | Apertura laterale |
| Cucina | Y | 90° | Manuale | left | Cardini verticali |
| Finestra Bagno | Y | 30° | Auto | right | Apertura parziale |
| Finestra Camera | Y | 30° | Manuale | - | Cardini verticali |
| Anta Doccia | Y | 60° | Manuale | - | Multi-object |

### Oggetti Camera: Complessità

| Oggetto | Fasi | Tipo | UUID | Caratteristiche |
|---------|------|------|------|-----------------|
| Porta-Finestra | 1 | Rotazione | 1 | Standard |
| Comodino | 2 | Seq. Mista | 4 | Rotazione + Posizione |
| Materasso | 1 | Rotazione | 2 | Multi-object, letto scomparsa |

### Oggetti Soggiorno: Sincronizzazione

| Oggetto | Pivot | Angolo | Trigger | Sincronizzato |
|---------|-------|--------|---------|---------------|
| Humano | (2.603, 0.752, 0.539) | 22° | M | ✅ Con Couch |
| CouchSet | (2.603, 0.752, 0.539) | 22° | M | ✅ Con Humano |
| Pianta | - | - | G | ❌ Indipendente |

---

## 🔧 NOTE TECNICHE

### Correzioni Applicate

#### 1. Assi di Rotazione
- ✅ **Porta Cucina:** Corretto da asse errato a Y
- ✅ **Porta-Finestra Bagno:** Corretto a Y per rotazione verticale
- ✅ **Porta-Finestra Camera:** CRITICO - corretto da Z a Y
- ✅ **Porta Ingresso:** Confermato Z corretto per apertura laterale

#### 2. Coordinate e Pivot
- ✅ **Comodino pivotY:** Corretto da 0.556 a 0 (pavimento)
- ✅ **Comodino startY:** Corretto da 0.556 a 0 (pavimento)
- ✅ **Comodino coordinate END:** Invertite per direzione corretta

#### 3. Sistemi Avanzati
- ✅ **Anta Doccia:** Sistema multi-object perfettamente sincronizzato
- ✅ **Materasso:** Coordinate esatte da Animation Editor V2.0
- ✅ **Porta Ingresso:** Sistema autoPivot implementato

### Standard Utilizzati

#### Velocità Rotazione
- **Standard:** 45°/s (usato nella maggior parte dei casi)
- **Con Easing:** 1.5s totale (porta ingresso)

#### Velocità Traslazione
- **Veloce:** 2.0 m/s (comodino)
- **Media:** 30 m/s (pianta) ⚠️ Sembra un errore - probabilmente 0.3 m/s

#### Pivot
- **Automatico:** Calcolato da bounding box (es. porta ingresso)
- **Manuale:** Specificato esplicitamente (es. porta cucina, materasso)

### Pattern Ricorrenti

1. **Porte con Cardini:** Sempre asse Y
2. **Aperture Laterali:** Asse Z
3. **Abbattimenti:** Asse Z con direzione negativa
4. **Multi-Object:** Stesso pivot per sincronizzazione
5. **Sequenze:** Rotazione → Posizione (automatica)

### Trigger Keyboard

| Tasto | Oggetti | Stanza |
|-------|---------|--------|
| **K** | Comodino | Camera |
| **M** | Materasso, Humano, CouchSet | Camera, Soggiorno |
| **L** | Anta Doccia | Bagno |
| **G** | Pianta | Soggiorno |
| **1** | **Anta Mobile Smart** (apri) | **Cucina** |
| **2** | **Anta Mobile Smart** (chiudi) | **Cucina** |
| **3** | **Sportello Frigo** (apri) | **Cucina** |
| **4** | **Sportello Frigo** (chiudi) | **Cucina** |
| **5** | **Pentola** (sui fornelli) | **Cucina** |
| **6** | **Pentola** (posizione originale) | **Cucina** |

---

## 🎓 CONCLUSIONI

### Punti di Forza
1. ✅ Sistema animazioni ben strutturato
2. ✅ Supporto multi-object avanzato
3. ✅ Sequenze automatiche implementate
4. ✅ Metadata completi per debugging
5. ✅ Coordinate precise da Animation Editor

### Aree di Attenzione
1. ⚠️ Velocità pianta (30 m/s) e pentola (24 m/s) sembrano eccessive
2. ⚠️ Alcune correzioni assi necessarie (già applicate)
3. ℹ️ Sincronizzazione Humano+Couch da verificare nel codice
4. ℹ️ **Animazioni hardcoded (4):** Anta mobile, Pentola, Sportello frigo - considerare esportazione JSON
5. ℹ️ **Velocità custom cucina:** Frigo 105°/s (2.3x), Anta mobile 90°/s (2x)

### Sistemi Più Complessi
1. **Comodino:** Sequenza doppia (rotazione + posizione)
2. **Materasso:** Letto a scomparsa con sistema hinged_door
3. **Anta Doccia:** Multi-object perfettamente sincronizzato
4. **Porta Ingresso:** Sistema autoPivot più avanzato
5. **Pentola:** Coordinate hardcoded con conversione world→local automatica
6. **Sportello Frigo:** Puzzle-integrated con velocità custom e stato iniziale aperto
7. **Anta Mobile Smart:** Decorativa con velocità custom, collegata alla pentola

---

**Documento generato automaticamente dall'analisi di tutti i file JSON di sequenze di animazione + hook/scene hardcoded.**  
**Ultima revisione:** 10 Gennaio 2026, 19:06
