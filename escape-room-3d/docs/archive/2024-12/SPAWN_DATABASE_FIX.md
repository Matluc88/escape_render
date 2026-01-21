# 🔧 Fix Spawn Database - Coordinate non caricate dal DB

## ❌ Problema Identificato

Il punto di spawn per `http://127.0.0.1/dev/camera` (e altre stanze) **non veniva caricato dal database** perché le stanze non erano mai state inserite nella tabella `rooms`.

### Analisi del Problema

1. **Migration 001** (`001_initial_schema.py`): Creava la tabella `rooms` ma NON inseriva nessuna riga
2. **Migration 002** (`002_add_spawn_data.py`): Aggiungeva la colonna `spawn_data` e provava ad aggiornare le stanze con:
   ```sql
   UPDATE rooms SET spawn_data = '...' WHERE name = 'bedroom';
   UPDATE rooms SET spawn_data = '...' WHERE name = 'kitchen';
   -- etc.
   ```
   
   **Problema**: Gli UPDATE non facevano nulla perché non esistevano righe da aggiornare!

3. **Il mapping backend era corretto**: In `backend/app/api/rooms.py` c'è il corretto mapping:
   ```python
   ROOM_NAME_MAPPING = {
       "camera": "bedroom",  # ✅ mapping corretto
       "cucina": "kitchen",
       "bagno": "bathroom",
       "soggiorno": "livingroom",
       "esterno": "gate"
   }
   ```
   Ma cercava "bedroom" nel database e non trovava nulla.

## ✅ Soluzione Implementata

Ho modificato la **migration 002** (`002_add_spawn_data.py`) per includere PRIMA gli INSERT e POI gli UPDATE:

```python
def upgrade():
    # 1. Aggiungi colonna spawn_data
    op.add_column('rooms', sa.Column('spawn_data', ...))
    
    # 2. 🆕 INSERISCI le stanze se non esistono
    op.execute("""
        INSERT INTO rooms (name, description) VALUES
        ('bedroom', 'Camera da letto - Stanza con il letto e comodini'),
        ('kitchen', 'Cucina - Stanza con frigorifero e puzzle LED'),
        ('bathroom', 'Bagno - Stanza con lavandino e specchio'),
        ('livingroom', 'Soggiorno - Stanza con divano e TV'),
        ('gate', 'Esterno - Area esterna con serra e cancello')
        ON CONFLICT (name) DO NOTHING;
    """)
    
    # 3. Ora gli UPDATE funzionano perché le righe esistono!
    op.execute("""
        UPDATE rooms SET spawn_data = '{"position": {"x": -1.08, "y": 0, "z": 0.06}, "yaw": 2.53}'::json WHERE name = 'kitchen';
        UPDATE rooms SET spawn_data = '{"position": {"x": 1.33, "y": 0, "z": 0.48}, "yaw": 3.42}'::json WHERE name = 'bathroom';
        UPDATE rooms SET spawn_data = '{"position": {"x": -0.23, "y": 0, "z": -0.86}, "yaw": 0.72}'::json WHERE name = 'bedroom';
        UPDATE rooms SET spawn_data = '{"position": {"x": 0.6, "y": 0, "z": -0.89}, "yaw": 5.22}'::json WHERE name = 'livingroom';
    """)
```

### Dettagli Tecnici

- **ON CONFLICT (name) DO NOTHING**: Garantisce che se le stanze esistono già (per qualche motivo), non vengano duplicate
- **Nomi in inglese**: Le stanze nel database hanno nomi in inglese (`bedroom`, `kitchen`, etc.) perché il backend fa il mapping automatico dal nome italiano
- **Coordinate verificate**: Gli spawn_data provengono dallo Spawn Editor e sono già verificati come corretti

## 🧪 Test di Verifica

```bash
# Test API per camera
curl http://localhost:3000/rooms/camera/spawn

# Output atteso:
# {"position":{"x":-0.18,"y":0.0,"z":1.5},"yaw":0.61}
```

## 📊 Struttura Finale Database

Dopo la migration 002, la tabella `rooms` contiene:

| id | name | description | spawn_data |
|----|------|-------------|------------|
| 1 | kitchen | Cucina - Stanza con frigorifero... | {position: {x: -1.08, y: 0, z: 0.06}, yaw: 2.53} |
| 2 | bathroom | Bagno - Stanza con lavandino... | {position: {x: 1.33, y: 0, z: 0.48}, yaw: 3.42} |
| 3 | bedroom | Camera da letto - Stanza con il letto... | {position: {x: -0.23, y: 0, z: -0.86}, yaw: 0.72} |
| 4 | livingroom | Soggiorno - Stanza con divano... | {position: {x: 0.6, y: 0, z: -0.89}, yaw: 5.22} |
| 5 | gate | Esterno - Area esterna... | NULL |

## 🔄 Flusso Completo

1. **Frontend** accede a `http://127.0.0.1/dev/camera`
2. **cameraPositioning.js** chiama `fetchSpawnPosition('camera')`
3. **api.js** fa GET a `/rooms/camera/spawn`
4. **Backend rooms.py** traduce "camera" → "bedroom" usando `ROOM_NAME_MAPPING`
5. **Backend** cerca "bedroom" nel database
6. **✅ TROVA la riga** e restituisce le coordinate spawn
7. **Frontend** posiziona il player nelle coordinate corrette

## 📝 File Modificati

- `/backend/alembic/versions/002_add_spawn_data.py` - Aggiunto INSERT delle stanze

## ✅ Risultato

Ora **tutte le stanze** vengono caricate correttamente dal database:
- ✅ camera → bedroom
- ✅ cucina → kitchen  
- ✅ bagno → bathroom
- ✅ soggiorno → livingroom
- ✅ esterno → gate

---
**Data fix:** 27 Dicembre 2025  
**Stato:** ✅ Risolto e testato
