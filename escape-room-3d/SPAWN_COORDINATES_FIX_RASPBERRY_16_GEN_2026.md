# 🎯 FIX COORDINATE SPAWN RASPBERRY PI - 16 Gennaio 2026

## ✅ PROBLEMA RISOLTO

Le coordinate di spawn erano errate sul Raspberry Pi dopo il deploy. Tutte le coordinate sono state aggiornate alle coordinate **DEFINITIVE** dal file `definitive.json`.

---

## 📍 COORDINATE APPLICATE

### **Soggiorno (livingroom)**
- **Posizione**: X: 0.54, Y: 0, Z: 1.51
- **Rotazione**: 5.39 rad (309°)
- **Cambiamento**: z: 1.52→1.51, yaw: 5.21→5.39

### **Bagno (bathroom)**
- **Posizione**: X: 1.31, Y: 0, Z: 2.77
- **Rotazione**: 3.53 rad (202°)
- **Cambiamento**: x: 1.27→1.31, z: 2.62→2.77, yaw: 3.65→3.53

### **Camera (bedroom)**
- **Posizione**: X: -0.56, Y: 0, Z: 1.31
- **Rotazione**: 0.46 rad (26°)
- **Cambiamento**: x: -0.18→-0.56, z: 1.5→1.31, yaw: 0.61→0.46

### **Cucina (kitchen)** ✅ Già corretta
- **Posizione**: X: -0.94, Y: 0, Z: 2.14
- **Rotazione**: 2.48 rad (142°)
- **Cambiamento**: x: -1.5→-0.94, z: 1.2→2.14, yaw: 0.5→2.48

---

## 🔧 PROCEDURA APPLICATA

### 1. **Aggiornamento File di Sistema**
Tutti i file sono stati aggiornati con le coordinate definitive:

- ✅ `backend/alembic/versions/002_add_spawn_data.py` - migrazione database
- ✅ `src/utils/cameraPositioning.js` - fallback frontend

### 2. **Aggiornamento Database Locale**
```bash
docker compose exec -T db psql -U escape_user -d escape_db < fix-spawn-DEFINITIVE-16-GEN-2026.sql
```

### 3. **Aggiornamento Database Raspberry Pi**
```bash
# Copia script SQL
sshpass -p 'escape' scp fix-spawn-DEFINITIVE-16-GEN-2026.sql pi@192.168.8.10:/tmp/

# Applica aggiornamento
sshpass -p 'escape' ssh pi@192.168.8.10 "cat /tmp/fix-spawn-DEFINITIVE-16-GEN-2026.sql | docker exec -i escape-db psql -U escape_user -d escape_db"
```

### 4. **Verifica Raspberry Pi**
```bash
sshpass -p 'escape' ssh pi@192.168.8.10 "docker exec escape-db psql -U escape_user -d escape_db -c \"SELECT name, spawn_data FROM rooms WHERE name IN ('livingroom', 'bathroom', 'bedroom', 'kitchen') ORDER BY name;\""
```

**Output verificato**:
```
    name    |                         spawn_data                         
------------+------------------------------------------------------------
 bathroom   | {"position": {"x": 1.31, "y": 0, "z": 2.77}, "yaw": 3.53}
 bedroom    | {"position": {"x": -0.56, "y": 0, "z": 1.31}, "yaw": 0.46}
 kitchen    | {"position": {"x": -0.94, "y": 0, "z": 2.14}, "yaw": 2.48}
 livingroom | {"position": {"x": 0.54, "y": 0, "z": 1.51}, "yaw": 5.39}
```

---

## 🎯 RISULTATO

✅ **Tutte le coordinate sono ora corrette sia in locale che sul Raspberry Pi**

- **Locale**: Database aggiornato e testato
- **Raspberry Pi**: Database aggiornato e verificato
- **Migrazione**: File di migrazione aggiornato per futuri deploy
- **Frontend**: Fallback aggiornato per sviluppo

---

## 📝 NOTE IMPORTANTI

### Credenziali SSH Raspberry Pi
- **IP**: 192.168.8.10
- **Utente**: pi
- **Password**: escape
- **Database Container**: escape-db

### File Modificati
1. `backend/alembic/versions/002_add_spawn_data.py`
2. `src/utils/cameraPositioning.js`
3. `fix-spawn-DEFINITIVE-16-GEN-2026.sql` (creato per aggiornamento)

### Prossimi Deploy
Quando si fa un nuovo deploy pulito (rebuild completo), le coordinate definitive saranno automaticamente applicate dalla migrazione `002_add_spawn_data.py`.

Per aggiornare solo il database esistente su un sistema già in produzione, usare lo script SQL:
```bash
cat fix-spawn-DEFINITIVE-16-GEN-2026.sql | docker exec -i escape-db psql -U escape_user -d escape_db
```

---

## ✨ FONTE COORDINATE

Tutte le coordinate provengono dal file **`definitive.json`** fornito dall'utente il 16/01/2026 ore 08:42.

Queste coordinate sono considerate **DEFINITIVE** e non devono essere più modificate.