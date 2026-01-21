# 🚿 FIX SPAWN BAGNO - RISOLUZIONE COMPLETA

## ✅ Problema Identificato

**Coordinate database SBAGLIATE!**

```
❌ ATTUALE (database):
X: 1.18, Y: 0, Z: 2.59  → FUORI dal bagno (2m oltre!)

✅ CORRETTE:
X: 1.3, Y: 0, Z: 0.63   → DENTRO il bagno
```

---

## 🔧 Modifiche Applicate

### 1. Script SQL Creato
**File:** `fix-spawn-bagno-COORDINATE-CORRETTE.sql`
- Aggiorna coordinate nel database
- Mantiene yaw corretta (214.9°)

### 2. Codice Ripristinato
**File:** `BathroomScene.jsx`
- Rimosso test diagnostico
- Ripristinate collisioni normali

---

## 🚀 Come Applicare il Fix

### STEP 1: Applica SQL al Database

```bash
# Entra nel container Docker del database
docker exec -it escape-room-3d-db-1 psql -U escape_user -d escape_db

# Esegui l'UPDATE (copia/incolla direttamente in psql)
UPDATE spawn_positions 
SET 
    x = 1.3,
    y = 0.0,
    z = 0.63,
    yaw = 3.75,
    updated_at = NOW()
WHERE room_name = 'bagno';

# Verifica il risultato
SELECT room_name, x, y, z, yaw, (yaw * 180 / PI()) as yaw_degrees 
FROM spawn_positions 
WHERE room_name = 'bagno';

# Esci
\q
```

**Output atteso:**
```
 room_name | x   | y   | z    | yaw  | yaw_degrees
-----------+-----+-----+------+------+-------------
 bagno     | 1.3 | 0.0 | 0.63 | 3.75 | 214.9
```

---

### STEP 2: Clear Cache Browser

Apri questo file nel browser:
```
escape-room-3d/clear-spawn-cache-docker.html
```

Oppure manualmente:
1. Apri DevTools (F12)
2. Console tab
3. Esegui:
```javascript
localStorage.removeItem('spawnCache_bagno')
location.reload()
```

---

### STEP 3: Testa

1. Apri bagno:
```
http://localhost/room/bagno?sessionId=999
```

2. Premi **CTRL+SHIFT+R** (hard refresh)

3. Verifica log console (F12):
```
[BathroomScene] 🎯 PlayerRoot WORLD: (1.30, 0.00, 0.63)
```

✅ Se vedi queste coordinate → **RISOLTO!**

---

## 📊 Diagnostica Post-Fix

Se il problema persiste, controlla:

1. **Log PlayerRoot WORLD** nei primi 5 secondi
   - X dovrebbe essere **≈1.3** (non 1.18)
   - Z dovrebbe essere **≈0.63** (non 2.59)

2. **Database aggiornato?**
   ```sql
   SELECT x, z FROM spawn_positions WHERE room_name = 'bagno';
   ```

3. **Cache svuotata?**
   ```javascript
   console.log(localStorage.getItem('spawnCache_bagno'))
   // Dovrebbe essere null o mostrare nuove coordinate
   ```

---

## 🎯 Coordinate Finali

| Parametro | Valore Corretto |
|-----------|----------------|
| **X**     | 1.3            |
| **Y**     | 0.0            |
| **Z**     | 0.63           |
| **Yaw**   | 3.75 rad (214.9°) |

---

## 📝 Note Tecniche

- **Problema:** Coordinate spawn salvate in database erano sbagliate di quasi 2 metri su asse Z
- **Causa:** Probabilmente coordinate catturate con tasto N in posizione sbagliata
- **Fix:** UPDATE diretto nel database + clear cache
- **Test eseguito:** Disabilitazione collisioni per verificare che non fosse push-out orizzontale

---

**Data Fix:** 2026-01-10
**Stato:** ✅ READY TO APPLY
