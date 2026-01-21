# 🎯 FIX COORDINATE SPAWN RASPBERRY PI - FINALE 2026

**Data:** 16 Gennaio 2026  
**Status:** ✅ PRONTO PER DEPLOY  
**Priorità:** 🔴 CRITICA

---

## 🔍 PROBLEMA IDENTIFICATO

Dopo il deploy sul Raspberry Pi, le coordinate di spawn erano **nuovamente sbagliate**, causando il posizionamento dei personaggi fuori dalle stanze.

### Root Cause Analysis

Esistevano **TRE fonti diverse** di coordinate spawn, tutte **non sincronizzate**:

1. ❌ **Migration Database** (`002_add_spawn_data.py`) - Coordinate VECCHIE
   ```python
   kitchen: x=-0.9, z=2.07    # ❌ SBAGLIATO
   bathroom: x=1.27, z=2.62   # ❌ SBAGLIATO
   ```

2. ❌ **Fix Raspberry Precedente** (`fix-spawn-raspberry.sql`) - Coordinate DIVERSE
   ```sql
   kitchen: x=-1.5, z=1.2     # ✅ CORRETTO ma...
   bathroom: x=1.3, z=0.63    # ❌ SBAGLIATO (diverso dal fallback!)
   ```

3. ✅ **Fallback Frontend** (`cameraPositioning.js`) - Coordinate CORRETTE
   ```javascript
   kitchen: x=-1.5, z=1.2     # ✅ CORRETTO
   bathroom: x=1.18, z=2.59   # ✅ CORRETTO
   ```

### Il Problema

Il **database sul Raspberry Pi** aveva coordinate diverse da quelle nel **fallback del frontend**, che sono le uniche **testate e funzionanti** correttamente.

---

## 📊 COORDINATE CORRETTE (Fonte di Verità)

Le coordinate **corrette** sono quelle nel fallback di `cameraPositioning.js`:

| Stanza | X | Y | Z | Yaw | Note |
|--------|------|---|------|------|------|
| **kitchen** | -1.5 | 0 | 1.2 | 0.5 | Centro cucina |
| **livingroom** | 0.53 | 0 | 1.52 | 5.17 | Centro soggiorno |
| **bathroom** | 1.18 | 0 | 2.59 | 3.75 | Vista lavandino |
| **bedroom** | -0.21 | 0 | 1.46 | 0.82 | Centro camera |
| **gate** | 0.53 | 0 | 7.27 | 0 | Ingresso esterno |

---

## ✅ SOLUZIONE IMPLEMENTATA

### 1. Creato Script SQL Aggiornato

**File:** `fix-spawn-raspberry-CORRETTE-2026.sql`

Script SQL completo con le coordinate corrette sincronizzate con il frontend.

```sql
UPDATE rooms SET spawn_data = jsonb_build_object(
  'position', jsonb_build_object('x', -1.5, 'y', 0, 'z', 1.2),
  'yaw', 0.5
) WHERE name = 'kitchen';

-- ... (tutte le 5 stanze)
```

### 2. Aggiornata Migration Database

**File:** `backend/alembic/versions/002_add_spawn_data.py`

Migration sincronizzata con le coordinate corrette. Questo garantisce che:
- ✅ Database locale avrà coordinate corrette
- ✅ Nuovi deploy avranno coordinate corrette
- ✅ Reset database userà coordinate corrette

### 3. Creato Script Deploy Automatico

**File:** `deploy-spawn-fix-raspberry.sh`

Script bash che:
- ✅ Verifica connessione SSH al Raspberry Pi
- ✅ Controlla che il database sia attivo
- ✅ Applica il fix SQL automaticamente
- ✅ Verifica le coordinate finali
- ✅ Fornisce istruzioni per pulire la cache

### 4. Aggiornato Tool Pulizia Cache

**File:** `clear-spawn-cache-raspberry.html`

Tool HTML interattivo per pulire la cache del browser e forzare il reload delle coordinate aggiornate.

---

## 🚀 COME APPLICARE IL FIX

### Passo 1: Deploy sul Raspberry Pi

```bash
cd /Users/matteo/Desktop/ESCAPE/escape-room-3d
./deploy-spawn-fix-raspberry.sh
```

Lo script:
1. Verifica connessione a `192.168.8.10`
2. Controlla che il database sia attivo
3. Applica le coordinate corrette
4. Mostra il risultato finale

### Passo 2: Pulire Cache Browser

**Metodo A - Tool HTML:**
```bash
# Apri nel browser del Raspberry Pi
http://192.168.8.10/clear-spawn-cache-raspberry.html
```
Poi clicca su "🗑️ PULISCI TUTTA LA CACHE SPAWN"

**Metodo B - Hard Reload:**
- Windows/Linux: `CTRL + SHIFT + R`
- Mac: `CMD + SHIFT + R`

### Passo 3: Verificare

1. Vai su `http://192.168.8.10`
2. Crea/assegna giocatori alle stanze
3. Verifica che ogni giocatore spawni **al centro della propria stanza**

---

## 🔧 DEPLOY MANUALE (se necessario)

Se lo script automatico non funziona, puoi fare il deploy manualmente:

### 1. Connetti al Raspberry Pi
```bash
ssh pi@192.168.8.10
```

### 2. Copia il file SQL
```bash
# Dal tuo Mac (in un altro terminale)
scp escape-room-3d/fix-spawn-raspberry-CORRETTE-2026.sql pi@192.168.8.10:~/
```

### 3. Applica il fix
```bash
# Sul Raspberry Pi
cd ~
docker exec -i escape-db psql -U escape_user -d escape_db < fix-spawn-raspberry-CORRETTE-2026.sql
```

### 4. Verifica
```bash
docker exec escape-db psql -U escape_user -d escape_db -c \
  "SELECT name, spawn_data FROM rooms ORDER BY name;"
```

---

## 📋 VERIFICA COORDINATE

Dopo aver applicato il fix, verifica le coordinate:

```bash
ssh pi@192.168.8.10 "docker exec escape-db psql -U escape_user -d escape_db -c \"SELECT name, spawn_data::jsonb->'position'->>'x' as x, spawn_data::jsonb->'position'->>'z' as z FROM rooms ORDER BY name;\""
```

**Output atteso:**
```
    name    |  x   |  z   
-----------+------+------
 bathroom  | 1.18 | 2.59
 bedroom   |-0.21 | 1.46
 gate      | 0.53 | 7.27
 kitchen   | -1.5 | 1.2
 livingroom| 0.53 | 1.52
```

---

## 🎯 COSA È STATO CAMBIATO

### File Modificati

1. ✅ `fix-spawn-raspberry-CORRETTE-2026.sql` - Nuovo script SQL
2. ✅ `backend/alembic/versions/002_add_spawn_data.py` - Migration aggiornata
3. ✅ `deploy-spawn-fix-raspberry.sh` - Script deploy automatico
4. ✅ `clear-spawn-cache-raspberry.html` - Tool pulizia cache aggiornato
5. ✅ `SPAWN_FIX_RASPBERRY_2026_FINALE.md` - Questa documentazione

### Cosa NON è stato toccato

- ❌ `src/utils/cameraPositioning.js` - **GIÀ CORRETTO** (fonte di verità!)
- ❌ Frontend code - Nessuna modifica necessaria
- ❌ Docker configuration - Nessuna modifica

---

## 🔒 SINCRONIZZAZIONE GARANTITA

Ora **tutte le fonti** usano le **stesse coordinate**:

```
┌─────────────────────────────────────┐
│  FONTE DI VERITÀ                    │
│  cameraPositioning.js (Fallback)    │
└────────────┬────────────────────────┘
             │
             ├──→ 002_add_spawn_data.py (Migration)
             │
             ├──→ fix-spawn-raspberry-CORRETTE-2026.sql
             │
             └──→ Database Raspberry Pi (dopo fix)
```

---

## 📝 NOTE TECNICHE

### Perché Y = 0?

Le coordinate hanno `y: 0` perché:
- Il sistema aggiunge automaticamente l'**eye height** (1.6m default)
- Il **ground detection** posiziona il player sul pavimento corretto
- Questo evita problemi di offset manuale

### Sistema di Fallback

Il sistema carica le coordinate in questo ordine:
1. 🥇 **API Database** (produzione)
2. 🥈 **Fallback hardcoded** (dev/offline)

Entrambe le fonti sono **ora sincronizzate**.

### Cache Browser

Il browser può cachare:
- ❌ ~~localStorage spawn data~~ (ora rimosso con il tool)
- ❌ ~~File JavaScript vecchi~~ (risolto con hard reload)
- ✅ Le nuove coordinate vengono caricate dal database

---

## 🧪 TEST CHECKLIST

Dopo il deploy, verifica:

- [ ] SSH al Raspberry Pi funziona
- [ ] Container database è attivo
- [ ] Script SQL eseguito con successo
- [ ] Coordinate nel database sono corrette
- [ ] Cache browser pulita
- [ ] Spawn **Cucina**: centro stanza ✅
- [ ] Spawn **Soggiorno**: centro stanza ✅
- [ ] Spawn **Bagno**: vista lavandino ✅
- [ ] Spawn **Camera**: centro stanza ✅
- [ ] Spawn **Esterno**: ingresso cancello ✅

---

## 🚨 TROUBLESHOOTING

### Problema: Personaggi ancora fuori dalle stanze

**Soluzione:**
1. Pulire cache browser con il tool HTML
2. Hard reload (CTRL+SHIFT+R)
3. Verificare coordinate nel database
4. Riapplicare fix-spawn-raspberry-CORRETTE-2026.sql

### Problema: Script deploy fallisce

**Soluzione:**
1. Verificare connessione SSH: `ssh pi@192.168.8.10`
2. Verificare container: `docker ps`
3. Usare deploy manuale (vedi sezione sopra)

### Problema: Coordinate nel database sono sbagliate

**Soluzione:**
```bash
# Riapplica il fix
ssh pi@192.168.8.10 "docker exec -i escape-db psql -U escape_user -d escape_db" < fix-spawn-raspberry-CORRETTE-2026.sql
```

---

## 📚 RIFERIMENTI

### Documentazione Correlata
- `ASYNC_SPAWN_SYSTEM.md` - Sistema di caricamento spawn
- `ARCHITETTURA_COORDINATE_FINALE.md` - Architettura coordinate
- `SPAWN_COORDINATES_RASPBERRY_FIX.md` - Fix precedente (OBSOLETO)
- `DATABASE_SPAWN_SYSTEM.md` - Sistema database spawn

### File Coinvolti
- `src/utils/cameraPositioning.js` - Caricamento coordinate
- `backend/alembic/versions/002_add_spawn_data.py` - Migration DB
- `fix-spawn-raspberry-CORRETTE-2026.sql` - Fix SQL
- `deploy-spawn-fix-raspberry.sh` - Deploy automatico

---

## ✅ RISULTATO FINALE

Dopo l'applicazione di questo fix:

✅ **Database sincronizzato** con frontend  
✅ **Coordinate corrette** su tutte le fonti  
✅ **Spawn perfetti** in tutte le stanze  
✅ **Migration aggiornata** per deploy futuri  
✅ **Script automatico** per deploy rapido  
✅ **Tool pulizia cache** per utenti finali  
✅ **Documentazione completa** per riferimento

---

**Status:** ✅ **PRONTO PER DEPLOY**  
**Prossimo passo:** Eseguire `./deploy-spawn-fix-raspberry.sh`

---

*Fix completato il 16/01/2026 alle 07:42 AM*