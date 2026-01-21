# 🎯 FIX COORDINATE SPAWN RASPBERRY PI

**Data:** 14 Gennaio 2026  
**Status:** ✅ COMPLETATO

---

## 🔍 PROBLEMA IDENTIFICATO

Le coordinate di spawn sul **Raspberry Pi** erano diverse da quelle del **Docker locale**, causando spawn errati dei giocatori nelle stanze.

### Causa
Le migrazioni Alembic sul Raspberry Pi sono partite con le coordinate **originali** (vecchie), mentre il Docker locale aveva le coordinate **aggiornate** del 10 gennaio 2026.

---

## 📊 COORDINATE CORRETTE (Sincronizzate)

| Stanza | X | Y | Z | Yaw | Status |
|--------|--------|---|---------|------|---------|
| **kitchen** | -1.5 | 0 | 1.2 | 0.5 | ✅ Aggiornato |
| **bathroom** | 1.3 | 0 | 0.63 | 3.75 | ✅ Aggiornato |
| **bedroom** | -0.47 | 0 | -1.11 | 0.82 | ✅ Aggiornato |
| **livingroom** | 0.66 | 0 | -1.15 | 5.17 | ✅ Aggiornato |
| **gate** | 0.53 | 0 | 7.27 | 0 | ✅ (invariato) |

---

## ⚡ SOLUZIONE APPLICATA

### 1. Creato Script SQL
**File:** `fix-spawn-raspberry.sql`

```sql
UPDATE rooms SET spawn_data = '{"position": {"x": -1.5, "y": 0, "z": 1.2}, "yaw": 0.5}'::json WHERE name = 'kitchen';
UPDATE rooms SET spawn_data = '{"position": {"x": 1.3, "y": 0, "z": 0.63}, "yaw": 3.75}'::json WHERE name = 'bathroom';
UPDATE rooms SET spawn_data = '{"position": {"x": -0.47, "y": 0, "z": -1.11}, "yaw": 0.82}'::json WHERE name = 'bedroom';
UPDATE rooms SET spawn_data = '{"position": {"x": 0.66, "y": 0, "z": -1.15}, "yaw": 5.17}'::json WHERE name = 'livingroom';
```

### 2. Eseguito sul Database Raspberry Pi
```bash
ssh pi@192.168.8.10 "docker exec -i escape-db psql -U escape_user -d escape_db" < fix-spawn-raspberry.sql
```

**Risultato:**
```
UPDATE 1  ✅ kitchen
UPDATE 1  ✅ bathroom  
UPDATE 1  ✅ bedroom
UPDATE 1  ✅ livingroom
```

### 3. Creato File HTML Pulizia Cache
**File:** `clear-spawn-cache-raspberry.html`

File interattivo per pulire la cache del browser e rimuovere le vecchie coordinate memorizzate in `localStorage`.

---

## 🧹 ISTRUZIONI PER L'UTENTE

### Passo 1: Pulire Cache Browser
1. Apri: `clear-spawn-cache-raspberry.html` nel browser
2. Clicca su **"🗑️ PULISCI TUTTA LA CACHE SPAWN"**
3. Verifica che le chiavi siano state rimosse

### Passo 2: Hard Reload
- Premi **CTRL + SHIFT + R** (Windows/Linux)
- Oppure **CMD + SHIFT + R** (Mac)

### Passo 3: Testare
1. Vai su **http://192.168.8.10**
2. Testa lo spawn in ogni stanza:
   - Kitchen (Cucina)
   - Bathroom (Bagno)
   - Bedroom (Camera da letto)
   - Livingroom (Soggiorno)

---

## 📋 VERIFICA COORDINATE

Per verificare le coordinate attuali sul Raspberry Pi:

```bash
ssh pi@192.168.8.10 "docker exec escape-db psql -U escape_user -d escape_db -c \"SELECT name, spawn_data FROM rooms ORDER BY name;\""
```

---

## 📁 FILES CREATI

1. **fix-spawn-raspberry.sql** - Script SQL per UPDATE coordinate
2. **clear-spawn-cache-raspberry.html** - Tool pulizia cache browser
3. **SPAWN_COORDINATES_RASPBERRY_FIX.md** - Questa documentazione

---

## ✅ RISULTATI

- ✅ **4 coordinate aggiornate** sul database Raspberry Pi
- ✅ **Database sincronizzato** con Docker locale
- ✅ **Tool pulizia cache** creato e funzionante
- ✅ **Documentazione completa** per riferimento futuro

---

## 🔄 PROSSIMI PASSI

1. **Testare ogni stanza** per verificare spawn corretti
2. **Pulire cache browser** su tutti i dispositivi
3. **Monitorare** eventuali problemi di spawn

---

## 📚 RIFERIMENTI

- `SPAWN_COORDINATES_UPDATE_2026.md` - Coordinate aggiornate 10/01/2026
- `backend/alembic/versions/002_add_spawn_data.py` - Migrazione originale
- `MACOS_DEPLOY_RASPBERRY_SUCCESS.md` - Deploy Raspberry Pi completo

---

**Fix completato con successo! 🎉**
