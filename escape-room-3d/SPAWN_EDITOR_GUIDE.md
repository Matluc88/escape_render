# 🎯 Spawn Point Editor - Guida Completa

## Accesso all'Editor

**URL:** `http://localhost:5173/admin/spawn-editor`

L'editor permette di configurare con precisione i punti di spawn per ogni stanza usando una vista dall'alto del modello 3D completo.

---

## 🎨 Interfaccia

### Sidebar (Sinistra)
- **Lista Stanze**: Seleziona la stanza da configurare
- **Posizione Selezionata**: Coordinate X, Y, Z del click
- **Posizione Salvata**: Coordinate attualmente salvate nel database
- **Azioni**: Pulsanti Salva/Annulla
- **Istruzioni**: Guida rapida

### Canvas 3D (Destra)
- **Vista dall'Alto**: Modello completo della casa visto dall'alto
- **Marker Colorati**: Indicano le posizioni spawn salvate
- **Leggenda**: Colori assegnati a ogni stanza

---

## 📋 Come Usare l'Editor

### 1. Seleziona una Stanza
- Click su uno dei pulsanti nella sidebar:
  - 🛋️ Soggiorno (verde)
  - 🍳 Cucina (arancione)
  - 🚿 Bagno (azzurro)
  - 🛏️ Camera (magenta)
  - 🌳 Esterno (giallo)

### 2. Naviga nella Vista 3D
- **Ruota**: Trascina con mouse
- **Pan**: Shift + Trascina
- **Zoom**: Rotella mouse

### 3. Posiziona lo Spawn Point
- Click sul punto esatto del pavimento dove vuoi lo spawn
- Apparirà un **cilindro colorato** nel punto selezionato
- Le coordinate X, Z verranno mostrate nella sidebar

### 4. Salva la Posizione
- Verifica le coordinate nella sezione "Posizione Selezionata"
- Click su **"💾 Salva Posizione"**
- Messaggio di conferma: "✅ Posizione salvata!"

---

## 🎨 Sistema dei Marker

### Marker Temporaneo (Durante Selezione)
- **Colore**: Colore della stanza selezionata
- **Forma**: Cilindro + sfera
- **Visibilità**: Solo durante la selezione

### Marker Salvati
- **Sempre Visibili**: Tutti gli spawn point già salvati
- **Colore Unico**: Ogni stanza ha il suo colore
- **Badge ✓**: Indica stanze già configurate

---

## 💾 Sistema di Salvataggio

### Priorità dei Dati (dal più importante)
1. **Database Backend** (se disponibile)
2. **localStorage Cache** (1 ora TTL)
3. **Fallback Hardcoded** (in `cameraPositioning.js`)

### Dove Vengono Salvati i Dati

#### 1. Backend Database
```
POST /api/rooms/{roomName}/spawn
{
  "position": { "x": 0.74, "y": 0, "z": -0.87 },
  "yaw": -1.3464
}
```

#### 2. localStorage (Cache)
```javascript
localStorage.setItem('spawn_cucina', {
  data: {
    position: { x, y, z },
    yaw: number
  },
  timestamp: Date.now()
})
```

---

## ⚙️ Configurazione Avanzata

### Y Position (Altezza)
- **Sempre impostata a 0** nell'editor
- L'altezza occhi (eyeHeight) è gestita separatamente nelle scene
- Default: 1.4m per scene interne, 1.6m per esterno

### Yaw (Rotazione)
- **Attualmente impostato a 0** nell'editor
- Mantenuto da configurazioni esistenti
- Per modificare yaw: usa il sistema "Position Capture" (tasto N) nelle scene

---

## 🔧 Risoluzione Problemi

### Il backend non è disponibile
✅ **Soluzione**: L'editor salva comunque in localStorage. Le posizioni saranno usate come fallback.

### Non riesco a cliccare sul modello
- Assicurati di cliccare su una superficie visibile del pavimento
- Ruota la vista per vedere meglio la stanza
- Usa zoom per precisione maggiore

### I marker non sono visibili
- Controlla di aver salvato almeno una posizione
- Ruota/zoom per vedere meglio
- Verifica la leggenda per i colori

### Posizioni non si caricano nelle scene
1. Pulisci cache localStorage: usa `clear-spawn-cache.html`
2. Verifica che il backend sia attivo
3. Controlla la console browser per errori

---

## 🎯 Best Practices

### Posizionamento Spawn Point

1. **Centro Stanza**: Posiziona al centro della stanza per sicurezza
2. **Evita Ostacoli**: Non posizionare dentro mobili/muri
3. **Test in Game**: Dopo il salvataggio, testa nella scena reale
4. **Verifica Collisioni**: Assicurati che non ci siano muri vicini

### Workflow Consigliato

```
1. Apri Spawn Editor
2. Seleziona stanza
3. Ruota vista dall'alto per orientarti
4. Click sul punto centrale della stanza
5. Verifica coordinate
6. Salva
7. Test in-game (carica la stanza)
8. Se necessario, ripeti
```

---

## 📊 Mappa Coordinate Consigliate

### Soggiorno
- Range X: da -2 a 3
- Range Z: da -3 a 2
- Consigliato: centro del divano

### Cucina
- Range X: da -7 a -3
- Range Z: da -3 a 2
- Consigliato: centro cucina (evita fornelli)

### Bagno
- Range X: da 3 a 7
- Range Z: da -3 a 0
- Consigliato: entrata bagno

### Camera
- Range X: da -7 a -3
- Range Z: da 2 a 6
- Consigliato: piedi del letto

### Esterno
- Range X: da -10 a 10
- Range Z: da -10 a 10
- Consigliato: davanti al cancello

---

## 🔒 Permanenza dei Dati

### Backend Database (PERMANENTE)
- Salvati nel database PostgreSQL
- Persistono tra restart server
- Condivisi tra tutti i client
- **PRIORITÀ MASSIMA**: Sovrascrivono localStorage e fallback

### localStorage (TEMPORANEO - 1 ora)
- Cache locale del browser
- TTL: 1 ora
- Si cancella con clear cache browser
- Fallback se backend offline

### Hardcoded Fallback (PERMANENTE)
- File: `src/utils/cameraPositioning.js`
- Ultima risorsa se tutto il resto fallisce
- Modificabili solo editando codice

---

## 🚀 Comandi Rapidi

| Azione | Comando |
|--------|---------|
| Apri Editor | `http://localhost:5173/admin/spawn-editor` |
| Pulisci Cache | Apri `clear-spawn-cache.html` |
| Backend API | `POST /api/rooms/{room}/spawn` |
| Test Stanza | `http://localhost:5173/play/test/{room}` |

---

## 🎓 Tips & Tricks

### Per Precisione Massima
1. Zoom molto vicino al pavimento
2. Usa la griglia come riferimento
3. Annotati le coordinate prima di salvare

### Per Workflow Veloce
1. Configura tutte le stanze in una sessione
2. Badge verde ✓ indica stanze complete
3. Legenda mostra tutti i marker attivi

### Per Testing
1. Salva posizione
2. Apri nuova tab: `/play/test/soggiorno`
3. Verifica spawn point
4. Torna all'editor se serve aggiustare

---

## 📝 Note Tecniche

### Coordinate System
- **X**: Destra/Sinistra (+ = destra)
- **Y**: Altezza (sempre 0 in editor)
- **Z**: Avanti/Indietro (+ = avanti)

### Camera Ortografica
- Vista perfettamente dall'alto
- No prospettiva
- Scale 1:1 accurate

### Raycasting
- Rileva primo oggetto intersecato
- Precisione sub-unità
- Ignora oggetti trasparenti

---

## 🆘 Support

**Problemi?** Controlla:
1. Console browser (F12)
2. Log backend
3. `SPAWN_EDITOR_GUIDE.md` (questo file)

**Bug Report**: Includi sempre:
- Stanza configurata
- Coordinate salvate
- Screenshot posizione
- Log console

---

**Creato**: Dicembre 2025  
**Versione**: 1.0  
**Autore**: Sistema Spawn Point Editor
