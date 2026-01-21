# 📍 Riferimento Coordinate Spawn - Sistema Posizionamento Camera

## ⚠️ REGOLA FONDAMENTALE

**SEMPRE usare Y = 0 nelle coordinate spawn!**

Il sistema aggiunge automaticamente l'**eye height** (1.6m) alla coordinata Y.
- ❌ NON impostare Y = 1.6 manualmente
- ✅ SEMPRE impostare Y = 0 
- Il FPS controller si occupa automaticamente dell'altezza occhi

## 🏠 Coordinate Spawn per Stanza

### 🍳 Cucina
```json
{
  "room": "cucina",
  "position": { "x": -0.9, "y": 0, "z": 2.07 },
  "yaw": 2.55,
  "yaw_degrees": 146
}
```

### 🛋️ Soggiorno
```json
{
  "room": "soggiorno",
  "position": { "x": 0.54, "y": 0, "z": 1.52 },
  "yaw": 5.21,
  "yaw_degrees": 299
}
```

### 🚿 Bagno
```json
{
  "room": "bagno",
  "position": { "x": 1.27, "y": 0, "z": 2.62 },
  "yaw": 3.65,
  "yaw_degrees": 209
}
```

### 🛏️ Camera
```json
{
  "room": "camera",
  "position": { "x": -0.18, "y": 0, "z": 1.5 },
  "yaw": 0.61,
  "yaw_degrees": 35
}
```

### 🏡 Esterno
```json
{
  "room": "esterno",
  "position": { "x": 0, "y": 0, "z": 0 },
  "yaw": 0,
  "yaw_degrees": 0
}
```

## 🔧 Sistema di Caricamento

### Ordine di Priorità
1. **Database PostgreSQL** (produzione)
   - API: `/api/spawn-coordinates/{room}`
   - Fonte principale in produzione

2. **Fallback locale** (dev mode)
   - File: `src/utils/cameraPositioning.js`
   - Funzione: `getDefaultSpawnPosition()`
   - Usa coordinate hardcoded se database non disponibile

### Eye Height
- Valore: **1.6 metri**
- Gestito automaticamente da: `useFPSControls` hook
- **NON** includere nell'Y delle coordinate spawn

## 📝 Come Aggiornare le Coordinate

### 1. In Modalità Dev (Fallback)
Modifica `src/utils/cameraPositioning.js`:
```javascript
function getDefaultSpawnPosition(sceneType) {
  const defaults = {
    cucina: {
      position: { x: -0.9, y: 0, z: 2.07 },  // ← Y sempre 0!
      yaw: 2.55
    },
    // ...
  };
  return defaults[sceneType] || defaults.cucina;
}
```

### 2. In Produzione (Database)
Usa API o backend per aggiornare il database PostgreSQL.

## 🐛 Troubleshooting

### Problema: "Mi trovo sospeso in aria"
**Causa:** Y impostato a 1.6 invece di 0
**Soluzione:** Cambia Y = 0, il sistema aggiunge automaticamente eye height

### Problema: "Non vedo il modello 3D"
**Causa:** Coordinate fuori dal modello o API non risponde
**Soluzione:** Verifica coordinate XZ, controlla console browser per errori API

### Problema: "Posizione sbagliata dopo reload"
**Causa:** Cache browser o coordinate non salvate
**Soluzione:** Hard refresh (Ctrl+Shift+R / Cmd+Shift+R)

## 🎯 Testing Rapido

Route di sviluppo rapido:
- **http://localhost:5173/dev** → Carica cucina direttamente
- **http://localhost:5173/dev/soggiorno** → Carica soggiorno
- **http://localhost:5173/dev/bagno** → Carica bagno
- **http://localhost:5173/dev/camera** → Carica camera

## 📊 File Correlati

- `src/utils/cameraPositioning.js` - Sistema caricamento coordinate
- `src/hooks/useFPSControls.js` - Gestione eye height e movimento
- `spawn-coordinates-REFERENCE.json` - Coordinate originali
- `backend/app/api/spawn_coordinates.py` - API per database (se esiste)

---
**Ultima modifica:** 26 Dicembre 2024
**Autore:** Sistema Escape Room 3D
