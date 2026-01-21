# 🎨 Animation Editor - Guida Completa

Sistema di gestione animazioni in real-time per oggetti 3D nella scena cucina.

## 📋 Panoramica

L'Animation Editor permette di:
- ✅ Selezionare oggetti 3D con un click
- ✅ Configurare rotazioni con punto cardine personalizzabile
- ✅ Configurare movimenti di posizione
- ✅ Vedere preview in tempo reale delle modifiche
- ✅ Salvare configurazioni
- ✅ Esportare parametri in JSON

## 🚀 Come Usare

### 1. Attivazione Editor

**Premi il tasto `E`** per attivare/disattivare l'Animation Editor.

Quando attivo, vedrai:
- Banner azzurro in alto a sinistra: "🎨 ANIMATION EDITOR ATTIVO - Clicca su un oggetto"
- Gli oggetti diventano selezionabili con il click

### 2. Selezione Oggetto

1. Con l'editor attivo, **clicca su un oggetto** nella scena 3D
2. L'oggetto selezionato viene evidenziato con:
   - **Bounding box** wireframe azzurro
   - **Marker sferici** agli angoli
3. Il **pannello editor** si apre automaticamente a destra

### 3. Configurazione Animazioni

#### 🔄 MODALITÀ ROTAZIONE

Per animare rotazioni (porte, ante, etc.):

1. **Seleziona modalità**: Click su "🔄 Rotazione"

2. **Configura Cardine (Pivot Point)**:
   - Slider **Cardine X, Y, Z**: Posizione del punto di rotazione
   - Pulsanti rapidi:
     - `◀ Sinistra`: Sposta cardine sul bordo sinistro
     - `Destra ▶`: Sposta cardine sul bordo destro
     - `⊙ Centro`: Centra il cardine

3. **Parametri Rotazione**:
   - **Asse di Rotazione**: Scegli X, Y o Z
   - **Angolo Apertura**: 0-180° (es: 90° per porta standard)
   - **Velocità**: 10-360°/s (velocità animazione)

4. **Preview Visivo**:
   - **Sfera rossa**: Posizione del cardine
   - **Anello**: Indica il piano di rotazione
   - **Linea**: Mostra l'asse di rotazione

#### 📍 MODALITÀ POSIZIONE

Per animare spostamenti (oggetti che si muovono da A a B):

1. **Seleziona modalità**: Click su "📍 Posizione"

2. **Configura Target**:
   - Slider **Target X, Y, Z**: Posizione finale dell'oggetto
   - La posizione di partenza viene rilevata automaticamente

3. **Parametri Movimento**:
   - **Velocità**: 0.5-10 unità/secondo

4. **Preview Visivo**:
   - **Sfera blu**: Posizione di partenza
   - **Sfera verde**: Posizione di arrivo
   - **Linea arancione**: Percorso dell'animazione
   - **Freccia verde**: Direzione del movimento
   - **Distanza**: Calcolata e mostrata in tempo reale

### 4. Test Animazione

**Click su "▶ Test Animazione"** per vedere l'animazione completa:
- L'oggetto si anima dalla posizione iniziale a quella finale
- Poi torna indietro (loop)
- Durata: ~2 secondi

### 5. Salvataggio

**💾 Salva Configurazione**:
- Salva i parametri in localStorage
- Persistono tra le sessioni
- Recuperabili per modifiche future

**📋 Export JSON**:
- Scarica un file JSON con tutti i parametri
- Utile per condividere configurazioni
- Può essere riutilizzato in altre scene

**Formato JSON:**
```json
{
  "objectName": "Mobile_Smart_Cucina_Anta",
  "mode": "rotation",
  "pivotX": 2.45,
  "pivotY": 0.80,
  "pivotZ": 1.20,
  "axis": "y",
  "angle": 90,
  "speed": 90,
  "timestamp": "2025-12-14T09:12:00.000Z"
}
```

## ⌨️ Scorciatoie da Tastiera

### Editor
- **`E`**: Toggle Animation Editor on/off

### Debug Modello (già esistenti)
- **`1`**: Alza modello (+0.1m)
- **`2`**: Abbassa modello (-0.1m)
- **`3`**: Reset offset modello (2.0m)
- **`7`**: Alza altezza occhi (+0.1m)
- **`8`**: Abbassa altezza occhi (-0.1m)
- **`9`**: Reset altezza occhi (1.4m)

### Animazioni Esistenti (già funzionanti)
- **`A`**: Toggle anta mobile smart cucina
- **`B`**: Sposta pentola sui fornelli
- **`N`**: Cattura posizione camera

## 🎯 Casi d'Uso Tipici

### Esempio 1: Configurare Anta Mobile

1. Premi `E` per attivare editor
2. Clicca sull'anta del mobile
3. Seleziona modalità "🔄 Rotazione"
4. Click su "◀ Sinistra" per posizionare cardine sul bordo
5. Imposta Angolo: 90°
6. Imposta Velocità: 90°/s
7. Test con "▶ Test Animazione"
8. Salva con "💾 Salva Configurazione"

### Esempio 2: Configurare Oggetto che si Sposta

1. Premi `E` per attivare editor
2. Clicca sull'oggetto (es: pentola)
3. Seleziona modalità "📍 Posizione"
4. Regola slider Target X, Y, Z per posizione finale
5. Imposta Velocità: 2.0 u/s
6. Test con "▶ Test Animazione"
7. Export con "📋 Export JSON"

## 🛠️ Architettura Tecnica

### Componenti Creati

```
src/
├── hooks/
│   └── useObjectSelection.js          # Hook per selezione oggetti con raycasting
├── components/
│   ├── UI/
│   │   ├── AnimationEditor.jsx        # Pannello UI principale
│   │   └── AnimationEditor.css        # Stili pannello
│   └── debug/
│       ├── ObjectHighlighter.jsx      # Evidenzia oggetto selezionato
│       ├── PivotHelper.jsx            # Visualizza punto cardine
│       └── PathHelper.jsx             # Visualizza percorso movimento
```

### Integrazione

Il sistema è integrato in `KitchenScene.jsx`:
- Componente `AnimationEditorScene`: Gestisce selezione e helper visivi
- State management per editor enabled/oggetto selezionato
- Toggle con tasto `E`

## 📊 Stati del Sistema

```
DISATTIVATO (default)
    ↓ [Premi E]
EDITOR ATTIVO
    ↓ [Click oggetto]
OGGETTO SELEZIONATO
    ├─→ [Modifica parametri] → PREVIEW REAL-TIME
    ├─→ [Test] → ANIMAZIONE
    ├─→ [Salva] → PERSISTENZA
    └─→ [Export] → JSON FILE
```

## 🔍 Debug e Troubleshooting

### Console Logs

Il sistema logga in console:
- `[AnimationEditor]`: Eventi editor
- `[useObjectSelection]`: Selezione/deselezione oggetti
- `[AnimationEditorScene]`: Helper visuali
- `[ObjectHighlighter]`, `[PivotHelper]`, `[PathHelper]`: Componenti 3D

### Problemi Comuni

**Oggetto non selezionabile:**
- Verifica che l'editor sia attivo (tasto `E`)
- Controlla che l'oggetto sia visibile nella scena
- Assicurati che il click sia sul canvas, non su UI

**Helper non visibili:**
- Controlla che l'oggetto sia selezionato
- Verifica che la configurazione abbia i parametri corretti
- Controlla console per errori

**Animazione non funziona:**
- Il sistema attualmente mostra solo il preview visivo
- Per implementare l'animazione vera, serve collegare la config agli hook esistenti

## 🚀 Prossimi Sviluppi

- [ ] Preview animazione real-time durante modifica slider
- [ ] Drag & drop del cardine nella scena 3D
- [ ] Supporto per curve di animazione (easing)
- [ ] Sistema di keyframe per animazioni complesse
- [ ] Import JSON per caricare configurazioni salvate

## 📝 Note Importanti

1. **Solo Cucina**: Attualmente il sistema è implementato solo in `KitchenScene`
2. **Preview Visivo**: Gli helper 3D mostrano i parametri ma l'animazione completa va collegata
3. **Persistenza**: Le configurazioni salvate sono in localStorage (specifiche per browser)
4. **Performance**: Il sistema usa raycasting throttled su mobile per ottimizzazione

---

**Creato da:** Animation Editor System v1.0  
**Data:** 14/12/2025  
**Scena:** Cucina (estendibile ad altre scene)
