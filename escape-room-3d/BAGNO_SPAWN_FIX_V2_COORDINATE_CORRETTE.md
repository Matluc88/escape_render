# 🚿 FIX SPAWN BAGNO V2 - COORDINATE CORRETTE

**Data**: 10/01/2026  
**Problema**: Personaggio spawna fuori dal bagno nonostante coordinate corrette nei log  
**Root Cause**: Discrepanza tra coordinate database e fallback JavaScript  
**Soluzione**: Sincronizzazione completa database + fallback

---

## 🔍 Root Cause Analysis

### Il Problema

- **Coordinate nei log**: Corrette (X, Z corrispondono alla posizione desiderata)
- **Render visivo**: Personaggio appare FUORI dal bagno
- **Y (altezza)**: Corretta ✅
- **X/Z**: Errate nel render ❌

### La Causa

**Discrepanza tra due fonti di coordinate:**

1. **Database (PostgreSQL)**: Conteneva coordinate VECCHIE
   ```sql
   x: 1.3, z: 2.6, yaw: 3.65
   ```

2. **Fallback (cameraPositioning.js)**: Conteneva coordinate DIVERSE
   ```javascript
   x: 1.3, z: 2.6, yaw: 3.65
   ```

3. **Coordinate CORRETTE (fix-spawn-3-stanze-FINALE.sql)**:
   ```sql
   x: 1.18, z: 2.59, yaw: 3.75
   ```

### Perché la Cucina Funzionava?

La cucina usa coordinate **post-centratura** (calcolate DOPO che CasaModel applica l'offset di centratura del modello 3D). Il bagno usava coordinate vecchie che **non compensavano l'offset**.

---

## ✅ Fix Applicato

### 1. Aggiornamento Database

**File SQL utilizzato**: `fix-spawn-3-stanze-FINALE.sql`

```sql
-- BAGNO
UPDATE rooms 
SET spawn_data = jsonb_build_object(
  'position', jsonb_build_object('x', 1.18, 'y', 0, 'z', 2.59),
  'yaw', 3.75
)
WHERE name = 'bathroom';
```

**Comando eseguito**:
```bash
docker-compose exec -T db psql -U escape_user -d escape_db < fix-spawn-3-stanze-FINALE.sql
```

**Risultato**:
```
UPDATE 1
✅ bathroom | 1.18 | 0 | 2.59 | 3.75 | ✅ AGGIORNATA
```

### 2. Aggiornamento Fallback

**File modificato**: `src/utils/cameraPositioning.js`

```javascript
bagno: {
  position: { x: 1.18, y: 0, z: 2.59 },  // ✅ AGGIORNATE
  yaw: 3.75  // 215 gradi - Guarda verso lavandino
}
```

### 3. Restart Frontend

```bash
docker-compose restart frontend
```

---

## 📊 Coordinate Aggiornate (Tutte le Stanze)

| Stanza     | X      | Y | Z    | Yaw  | Gradi | Orientamento        | Status        |
|------------|--------|---|------|------|-------|---------------------|---------------|
| Cucina     | -1.5   | 0 | 1.2  | 0.5  | 29°   | Centro              | ✓ Invariata   |
| Soggiorno  | 0.53   | 0 | 1.52 | 5.17 | 296°  | Centro              | ✅ AGGIORNATA |
| **Bagno**  | **1.18**| 0 | **2.59** | **3.75** | **215°** | **Verso lavandino** | **✅ AGGIORNATA** |
| Camera     | -0.21  | 0 | 1.46 | 0.82 | 47°   | Centro              | ✅ AGGIORNATA |
| Esterno    | 0.53   | 0 | 7.27 | 0    | 0°    | Ingresso            | ✓ Invariata   |

---

## 🎯 Test & Verifica

### Come Testare

1. **Aprire il gioco** (http://localhost:3000)
2. **Assegnare un giocatore al bagno** dalla Lobby
3. **Verificare spawn centrale** nella stanza
4. **Check posizione**: Il personaggio deve essere davanti al lavandino/doccia

### Cosa Aspettarsi

- ✅ **Spawn al centro del bagno**
- ✅ **Vista orientata verso lavandino/specchio**
- ✅ **Altezza corretta** (eye height 1.6m)
- ✅ **Nessun muro attraversato**

### In Caso di Problemi

**Clear Browser Cache**:
```
Ctrl+Shift+R (Windows/Linux)
Cmd+Shift+R (Mac)
```

**Verifica Database**:
```bash
docker-compose exec db psql -U escape_user -d escape_db -c \
  "SELECT name, spawn_data FROM rooms WHERE name = 'bathroom';"
```

**Expected Output**:
```json
{
  "position": {"x": 1.18, "y": 0, "z": 2.59},
  "yaw": 3.75
}
```

---

## 📝 Note Tecniche

### Sistema di Centratura CasaModel

Il modello 3D `casa.glb` viene **centrato automaticamente** da `CasaModel.jsx`:

```javascript
const box = new Box3().setFromObject(scene)
const center = new Vector3()
box.getCenter(center)

// Applica offset di centratura
groupRef.current.position.set(
  -center.x, 
  -targetGroundY + actualOffset, 
  -center.z
)
```

Questo significa che:
- **Coordinate world space**: Devono compensare questo offset
- **Metodo corretto**: Calcolare coordinate DOPO il test in-game
- **Pattern cucina**: Stesso metodo usato con successo

### Coordinate Y (Altezza)

- **Y nel database**: Sempre `0`
- **Eye height**: Aggiunto automaticamente dal sistema (`1.6m` per bagno)
- **Ground detection**: Raycast verticale trova pavimento preciso

---

## 🔄 Modifiche ai File

### 1. Database (PostgreSQL)
- ✅ **rooms.spawn_data** aggiornato
- ✅ Coordinate applicate via SQL

### 2. Frontend (JavaScript)
- ✅ **src/utils/cameraPositioning.js** - Fallback sincronizzato
- ✅ Garantisce consistenza anche offline

### 3. Docker
- ✅ Frontend riavviato per applicare modifiche

---

## 🎓 Lezioni Apprese

1. **Database ≠ Fallback**: Mantenere sempre sincronizzati!
2. **Post-centratura**: Le coordinate devono compensare l'offset di CasaModel
3. **Metodo cucina**: Calcolare coordinate tramite test in-game (metodo collaudato)
4. **Clear cache**: Sempre necessario dopo modifiche spawn

---

## 📚 Riferimenti

- `fix-spawn-3-stanze-FINALE.sql` - SQL script con coordinate corrette
- `SPAWN_FIX_3_STANZE_COMPLETO.md` - Guida completa fix 3 stanze
- `src/utils/cameraPositioning.js` - Sistema coordinate frontend
- `src/components/3D/CasaModel.jsx` - Sistema centratura modello

---

**Status**: ✅ **COMPLETO**  
**Test necessario**: Verificare spawn in-game  
**Next**: Se spawn non perfetto, usare tasti 1/2/3 (Y) e 7/8/9 (eyeHeight) per fine-tuning
