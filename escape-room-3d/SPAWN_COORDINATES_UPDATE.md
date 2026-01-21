# 🎯 Aggiornamento Coordinate Spawn - 15 Dicembre 2025

## 📋 Riepilogo

Le coordinate spawn sono state aggiornate e **hardcoded** nel sistema per garantire funzionamento universale in **sviluppo, produzione e Docker** anche senza backend attivo.

## 🔒 Coordinate Definitive

| Stanza | X | Y | Z | Yaw (rad) | Yaw (°) |
|--------|---|---|---|-----------|---------|
| **🛋️ Soggiorno** | 0.54 | 0 | 1.52 | 5.21 | 299° |
| **🍳 Cucina** | -0.9 | 0 | 2.07 | 2.55 | 146° |
| **🚿 Bagno** | 1.27 | 0 | 2.62 | 3.65 | 209° |
| **🛏️ Camera** | -0.18 | 0 | 1.5 | 0.61 | 35° |

### Nota sull'asse Y
- Y è sempre 0 perché rappresenta i "piedi" del player
- Il sistema FPS controls aggiunge automaticamente l'eyeHeight (1.6m) per la camera

## 📁 File Modificati

### 1. `src/utils/cameraPositioning.js`
Aggiornato l'oggetto `FALLBACK_POSITIONS` con le nuove coordinate:

```javascript
const FALLBACK_POSITIONS = {
  soggiorno: {
    position: { x: 0.54, y: 0, z: 1.52 },
    yaw: 5.21, // 299°
  },
  cucina: {
    position: { x: -0.9, y: 0, z: 2.07 },
    yaw: 2.55, // 146°
  },
  bagno: {
    position: { x: 1.27, y: 0, z: 2.62 },
    yaw: 3.65, // 209°
  },
  camera: {
    position: { x: -0.18, y: 0, z: 1.5 },
    yaw: 0.61, // 35°
  },
};
```

### 2. `spawn-coordinates-REFERENCE.json`
File JSON di riferimento con tutte le coordinate in formato leggibile.

## 🔄 Sistema di Priorità

Il sistema utilizza questa gerarchia per caricare le coordinate:

1. **API Database** (se disponibile)
   - Richiesta a `http://localhost:8000/api/rooms/:roomId`
   - Usato quando il backend è online
   
2. **FALLBACK Hardcoded** (sempre disponibile)
   - Coordinate in `cameraPositioning.js`
   - ✅ Garantisce funzionamento anche senza backend
   - ✅ Funziona in dev, prod e Docker
   
3. **Nodi GLB** (legacy)
   - Cerca nodi tipo `INIZIO_CUCINA` nel modello 3D
   - Usato solo se le opzioni 1 e 2 falliscono

## 🧪 Test

### Verificare in Sviluppo
```bash
cd escape-room-3d
npm run dev
# Apri http://localhost:5174
# Prova ogni stanza - il player deve apparire nelle coordinate corrette
```

### Verificare in Produzione
```bash
cd escape-room-3d
npm run build
npm run preview
# Apri http://localhost:4173
# Verifica stesso comportamento
```

### Verificare in Docker
```bash
cd escape-room-3d
docker-compose up --build
# Apri http://localhost (o porta configurata)
# Verifica stesso comportamento
```

## 🎨 Come Sono State Generate

1. Usato **Spawn Editor** su http://localhost:5174/admin/spawn-editor
2. Posizionato il player nelle coordinate desiderate per ogni stanza
3. Cliccato **"📥 Esporta Tutte le Posizioni"**
4. File scaricato: `spawn-positions-2025-12-15.json`
5. Coordinate copiate in `cameraPositioning.js`

## 🚀 Prossimi Passi

Se vuoi modificare le coordinate in futuro:

1. **Usa lo Spawn Editor**: http://localhost:5174/admin/spawn-editor
2. **Posiziona** il marker sulla mappa
3. **Regola** la rotazione con lo slider
4. **Salva** ogni stanza
5. **Esporta** il JSON
6. **Aggiorna** `cameraPositioning.js` con i nuovi valori
7. **Commit** le modifiche

## ⚠️ Note Importanti

- Le coordinate sono relative al **sistema di coordinate centrato** di casa.glb
- Il modello viene scalato 10x e centrato automaticamente in `CasaModel.jsx`
- Le coordinate qui salvate sono già nel sistema centrato finale
- **NON modificare** le coordinate manualmente senza usare lo Spawn Editor
- Le coordinate sono testate e validate in game

## 📚 File di Riferimento

- `spawn-coordinates-REFERENCE.json` - JSON originale esportato
- `src/utils/cameraPositioning.js` - Implementazione codice
- `SPAWN_EDITOR_GUIDE.md` - Guida completa Spawn Editor

---

**Data Aggiornamento**: 15 Dicembre 2025  
**Metodo**: Spawn Editor con Export Automatico  
**Validato**: ✅ Dev, ✅ Prod, ✅ Docker Ready
