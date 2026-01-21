# 🎨 Animation Editor V2 - Guida Completa

## 🆕 Novità Version 2.0

Sistema completamente ridisegnato con **Modalità Guidata** e validazione intelligente.

---

## 🎯 Modalità Editor

### 🟦 Modalità Guidata (default - consigliata)

**Per chi**: 90% degli utenti, studenti, configurazioni rapide

**Caratteristiche**:
- ✅ **Auto-detection tipo oggetto** (anta, porta, cassetto, ecc.)
- ✅ **Preset intelligenti** pre-configurati per tipo
- ✅ **Asse bloccato** (Y per ante verticali, Z per cassetti)
- ✅ **Cardine con bottoni grandi** (Sinistro/Destro/Centro)
- ✅ **Vincoli realistici** attivi automaticamente
- ✅ **Zero errori strutturali** possibili

**UI Design**:
```
┌──────────────────────────────────┐
│ Modalità Editor                  │
│ [🎯 Guidata] [⚙️ Avanzata]      │
├──────────────────────────────────┤
│ Posizione Cardine                │
│ [◀ Bordo Sinistro] [Bordo Destro▶]│
│ [⊙ Centro ⚠️]                    │
├──────────────────────────────────┤
│ Asse di Rotazione                │
│ Y 🔒                             │
│ 💡 Determinato automaticamente   │
│    dal tipo di oggetto           │
├──────────────────────────────────┤
│ Angolo Apertura: 90°             │
│ [slider: 30° ───●─── 120°]      │
│ Vincoli: 30°-120° (realistico)  │
└──────────────────────────────────┘
```

### 🟥 Modalità Avanzata (expert/debug)

**Per chi**: Utenti esperti, casi speciali, debug

**Caratteristiche**:
- ⚙️ **Tutti i controlli sbloccati**
- ⚙️ **Slider numerici** X/Y/Z per cardine
- ⚙️ **Asse modificabile** manualmente
- ⚙️ **Angolo libero** (con warning se fuori range)
- ⚠️ **Warning visivi** per configurazioni strane
- ⚠️ **Badge alert** se non realistico

---

## ✅ Sistema di Validazione

### Badge Clickable

**Verde** ✓ Configurazione Realistica
```
╔══════════════════════════════╗
║ ✓ Configurazione Realistica  ║
╠══════════════════════════════╣
║ ✓ Asse corretto (Y)         ║
║   → Verticale per ante       ║
║                              ║
║ ✓ Cardine su edge valido    ║
║   → Bordo sinistro @ 2.45m  ║
║                              ║
║ ✓ Angolo entro limiti       ║
║   → 90° (30°-120°)          ║
║                              ║
║ ✓ Velocità realistica       ║
║   → 120°/s (fluido)         ║
║                              ║
║ [Chiudi]                     ║
╚══════════════════════════════╝
```

**Arancione** ⚠️ Configurazione con Warning
```
╔══════════════════════════════╗
║ ⚠️ Configurazione con Warning║
╠══════════════════════════════╣
║ ⚠️ Angolo troppo ampio       ║
║   → 135° (max: 120°)        ║
║   Soluzione: Riduci a 90°   ║
║                              ║
║ ⚠️ Cardine fuori bbox        ║
║   → X: 3.89m (max: 2.5m)    ║
║   Soluzione: Usa "Bordo"    ║
║                              ║
║ ✓ Asse corretto (Y)         ║
║ ✓ Velocità ok               ║
║                              ║
║ [🔧 Correggi Auto] [Mantieni]║
╚══════════════════════════════╝
```

### Auto-Fix Intelligente

**Click su "🔧 Correggi Automaticamente"**:
- Angolo → Clamp a 30°-120°
- Velocità → Clamp a 45°-180°/s
- Cardine → Snap al bordo più vicino
- ✅ Configurazione corretta in 1 click!

---

## 🎓 Valore Educativo

### Tooltip Educativi

**Asse Locked**:
```
💡 Asse Y (verticale)
━━━━━━━━━━━━━━━━━━━
Questo asse è corretto per:
• Porte verticali
• Ante di mobili
• Finestre a battente

Per altri movimenti,
usa modalità Avanzata ⚙️
```

**Preset Cardine**:
```
◀ Bordo Sinistro
━━━━━━━━━━━━━━
Posiziona il cardine sul bordo
sinistro dell'anta.

Tipico per:
• Porte che si aprono a destra
• Ante standard di mobili
• Finestre a battente sx
```

**Badge Validazione**:
```
Click sul badge per vedere:
• Cosa rende valida la config
• Perché un parametro è corretto
• Come correggere eventuali errori

Perfetto per imparare! 🎓
```

---

## 🚀 Flusso d'Uso Ottimale

### Scenario 1: Utente Principiante

1. **Tasto E** → Attiva editor
2. **Click oggetto** (es: anta mobile)
3. Sistema **auto-rileva**: "Anta verticale, asse Y, 90°"
4. **Click "◀ Bordo Sinistro"**
5. **Badge verde** ✓ appare automaticamente
6. **Test animazione** → Funziona perfetto!
7. **Salva** → Done in 30 secondi 🎉

### Scenario 2: Utente Esperto

1. **Tasto E** + **Toggle "⚙️ Avanzata"**
2. **Click oggetto** complesso
3. **Modifica manuale** X/Y/Z cardine
4. **Cambia asse** se necessario
5. **Badge arancione** ⚠️ → Click per dettagli
6. **Correggi manualmente** o **Auto-fix**
7. **Export JSON** per riutilizzo

### Scenario 3: Debug Problema

1. Configurazione **non funziona** bene
2. **Click badge** → Vedi tutti i check
3. Leggi **dettagli problema**:
   - "Cardine fuori bounding box"
   - "Suggerimento: X deve essere 0-2.5m"
4. **Auto-fix** o correggi manualmente
5. **Re-test** → Ora funziona! ✅

---

## 📊 Preset per Tipo Oggetto

### Porta
- **Cardine**: Bordo sinistro, base
- **Asse**: Y (verticale)
- **Angolo**: 90°
- **Velocità**: 90°/s

### Anta Mobile
- **Cardine**: Bordo sinistro, centro Y
- **Asse**: Y (verticale)
- **Angolo**: 90°
- **Velocità**: 120°/s (più veloce)

### Cassetto
- **Cardine**: Centro, fronte
- **Asse**: Z (profondità)
- **Angolo**: 45°
- **Velocità**: 60°/s (più lento)

### Finestra
- **Cardine**: Bordo sinistro, base
- **Asse**: Y (verticale)
- **Angolo**: 75°
- **Velocità**: 75°/s

### Sportello
- **Cardine**: Bordo sinistro, centro
- **Asse**: Y (verticale)
- **Angolo**: 105° (apre di più)
- **Velocità**: 105°/s

---

## 🔒 Vincoli Realistici

### Angolo Apertura
- **Min**: 30° (anta quasi chiusa)
- **Max**: 120° (anta molto aperta)
- **Tipico**: 90° (angolo retto)
- **Perché**: Oltre 120° è irrealistico per porte/ante

### Velocità Rotazione
- **Min**: 45°/s (molto lento, pesante)
- **Max**: 180°/s (veloce, motorizzato)
- **Tipico**: 90°-120°/s (naturale)
- **Perché**: Sotto 45° sembra bloccato, sopra 180° sembra innaturale

### Posizione Cardine
- **Vincolo**: Deve essere su/vicino al bounding box
- **Tolleranza**: ±0.5m dall'oggetto
- **Perché**: Cardine lontano = rotazione strana

---

## 🎯 Vantaggi del Sistema V2

### Per Studenti
- ✅ **Zero errori** con modalità guidata
- ✅ **Impara i concetti** con tooltip educativi
- ✅ **Feedback immediato** con badge validazione
- ✅ **Correzione automatica** se sbaglia

### Per Docenti
- ✅ **Sistema didattico** integrato
- ✅ **Validazione automatica** dei progetti
- ✅ **Export JSON** per valutazione
- ✅ **Preset corretti** garantiti

### Per Developer
- ✅ **Modalità avanzata** sempre disponibile
- ✅ **Debug facilitato** con validation details
- ✅ **Configurazioni complesse** possibili
- ✅ **Warning invece di blocchi** in advanced mode

---

## 📝 Export JSON V2

```json
{
  "objectName": "Mobile_Smart_Cucina_Anta",
  "mode": "rotation",
  "uiMode": "guided",
  "objectType": "anta",
  "pivotX": 2.45,
  "pivotY": 0.80,
  "pivotZ": 1.20,
  "axis": "y",
  "angle": 90,
  "speed": 120,
  "validation": {
    "isValid": true,
    "checks": {
      "axis": { "passed": true, "message": "Asse Y corretto" },
      "pivot": { "passed": true, "message": "Cardine su edge valido" },
      "angle": { "passed": true, "message": "Angolo entro limiti" },
      "speed": { "passed": true, "message": "Velocità realistica" }
    },
    "verifiedAt": "2025-12-14T10:45:00Z"
  },
  "timestamp": "2025-12-14T10:45:00.000Z"
}
```

---

## 🎮 Comandi Tastiera

| Tasto | Azione |
|-------|--------|
| **E** | Toggle Animation Editor |
| **ESC** | Chiudi editor |
| **1-3** | Debug altezza modello |
| **7-9** | Debug altezza camera |
| **A** | Test anta mobile (esistente) |
| **B** | Test pentola (esistente) |

---

## 🚧 Roadmap Future (opzionale)

### Phase 2 - Stati FSM
- [ ] Stati: Chiusa/Aperta/Bloccata
- [ ] Direzione: Apertura/Chiusura
- [ ] Integrazione ESP32

### Phase 3 - Preview 3D
- [ ] Ghost semi-trasparente anta aperta
- [ ] Arco di rotazione visibile
- [ ] Linea asse di rotazione

### Phase 4 - Interazione Avanzata
- [ ] Drag & drop cardine nella scena 3D
- [ ] Collision detection preview
- [ ] Gizmo trascinabile

---

**Creato da:** Animation Editor System v2.0  
**Data:** 14/12/2025  
**Autore:** Cline AI Assistant  
**Scena:** Cucina (estendibile ad altre scene)
