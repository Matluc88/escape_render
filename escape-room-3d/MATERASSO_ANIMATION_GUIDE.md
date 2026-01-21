# 🛏️ Guida Animazione Materasso

## 📋 Panoramica

Sistema di animazione multi-object per il materasso nella camera da letto. Due oggetti (materasso principale e maniglia) si muovono sincronizzati come un corpo rigido, esattamente come una porta con la sua maniglia.

## 🎯 Oggetti Coinvolti

- **Oggetto 236** (EA4BDE19-A636-4DD9-B32E-C34BA0D37B14): Materasso principale (porta)
- **Oggetto 232** (C9FDBCE8-0F2A-4BF2-B05C-4868567DC22F): Maniglia attaccata

Gli oggetti sono "cuciti" insieme e ruotano come un'unica unità.

## 🎮 Attivazione

**Tasto: M** (Materasso)

Premi il tasto M nella scena camera per attivare l'animazione.

## ⚙️ Configurazione Tecnica

### File: `materasso_sequence.json`

```json
{
  "objectName": "Materasso",
  "objectIds": ["EA4BDE19", "C9FDBCE8"],
  "sequence": [{
    "phase": "rotation",
    "mode": "rotation",
    "pivotX": -2.141981502258301,
    "pivotY": 0.5464275360107431,
    "pivotZ": 0.37148306676483167,
    "axis": "y",
    "angle": 90,
    "speed": 45,
    "direction": 1
  }]
}
```

### Parametri Animazione

- **Tipo**: Rotazione tipo porta con cardine
- **Asse**: Y (rotazione verticale)
- **Angolo**: 90° (porta che si apre completamente)
- **Velocità**: 45°/s (2 secondi per completare)
- **Pivot**: Centro della porta al pavimento

## 🏗️ Architettura

### 1. Sistema Multi-Object
Il sistema riutilizza `useComodinoAnimation` hook che:
- Trova gli oggetti tramite UUID Blender
- Li attacca a un pivot comune
- Li ruota come gruppo rigido

### 2. Componenti React

**MaterassoSequencePlayer**
```javascript
// Trova oggetti materasso e avvia animazione
<MaterassoSequencePlayer
  modelRef={modelRef}
  sequenceData={materassoSequenceData}
  config={materassoSequenceConfig}
  onComplete={handleMaterassoComplete}
/>
```

### 3. Flow di Esecuzione

1. **Caricamento**: `materasso_sequence.json` caricato al mount della scena
2. **Attivazione**: Utente preme tasto M
3. **Setup**: Sistema trova i 2 oggetti tramite UUID
4. **Animazione**: 
   - Crea pivot al centro della porta
   - Attacca entrambi gli oggetti al pivot
   - Ruota il pivot di 90°
5. **Completamento**: Callback chiamato, stato resettato

## 📁 File Modificati

### Nuovi File
- `escape-room-3d/materasso_sequence.json` - Configurazione animazione
- `escape-room-3d/public/materasso_sequence.json` - File runtime
- `escape-room-3d/MATERASSO_ANIMATION_GUIDE.md` - Questa guida

### File Modificati
- `escape-room-3d/src/components/scenes/BedroomScene.jsx`:
  - Aggiunto state per materasso sequence
  - Aggiunto caricamento JSON
  - Aggiunto handler tasto M
  - Aggiunto componente MaterassoSequencePlayer

## 🔧 Debug

### Console Logs

L'animazione produce log dettagliati in console:

```
[BedroomScene] ✅ Configurazione materasso caricata
[BedroomScene] 🎬 Tasto M - Avvio animazione materasso
[MaterassoSequencePlayer] 🔍 Cerco UUID: ["EA4BDE19", "C9FDBCE8"]
[MaterassoSequencePlayer] ✅ Match trovato: Matress_Cube_236(EA4BDE19-...)
[MaterassoSequencePlayer] ✅ Match trovato: Matress_Cube_232(C9FDBCE8-...)
[MaterassoSequencePlayer] ✅ Trovati 2 oggetti materasso
[useComodinoAnimation] 🔄 Modalità ROTATION - Creo pivot
[useComodinoAnimation] ✅ Setup ROTATION completato!
[MaterassoSequencePlayer] ✅ Animazione completata
```

### Verifica Funzionamento

1. **Caricamento scena camera**: Controlla console per "✅ Configurazione materasso caricata"
2. **Premi tasto M**: Verifica messaggio "🎬 Tasto M - Avvio animazione"
3. **Osserva animazione**: Materasso e maniglia ruotano insieme
4. **Completamento**: Dopo ~2 secondi, vedi "✅ Animazione completata"

## 🎨 Caratteristiche

### ✅ Multi-Object Sincronizzato
Gli oggetti si muovono come un'unità rigida, mantenendo le loro posizioni relative.

### ✅ Sistema Robusto
Riutilizza il sistema testato del comodino, garantendo stabilità.

### ✅ Non Invasivo
L'animazione non modifica la struttura del modello 3D permanentemente.

### ✅ Ripetibile
Puoi premere M più volte per riavviare l'animazione.

## 🚀 Test

Per testare l'animazione:

1. Avvia il server di sviluppo:
   ```bash
   cd escape-room-3d
   npm run dev
   ```

2. Naviga alla scena camera: `http://localhost:5173/room/camera`

3. Premi **tasto M**

4. Osserva i due oggetti ruotare insieme di 90°

## 📝 Note Tecniche

### UUID Blender
Il sistema cerca gli oggetti tramite UUID Blender parziale nel nome:
- `EA4BDE19` → trova oggetto 236
- `C9FDBCE8` → trova oggetto 232

### Pivot Point
Il pivot è calcolato dal file coordinates fornito e posizionato al centro della porta al livello del pavimento.

### Performance
L'animazione usa `useFrame` per aggiornamenti fluidi a 60 FPS.

## 🔄 Sistema Compatibile

Questa implementazione è compatibile con:
- ✅ Sistema comodino (tasto K)
- ✅ Animation Editor (tasto E)
- ✅ Altri sistemi di animazione nella scena

## 📅 Informazioni

**Creato**: 26 Dicembre 2025  
**Tasto Attivazione**: M (Materasso)  
**Tipo Animazione**: Rotazione multi-object  
**Durata**: ~2 secondi  
**Sistema Base**: useComodinoAnimation hook
