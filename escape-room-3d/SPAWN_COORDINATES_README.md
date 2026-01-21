# 🎯 COORDINATE SPAWN - GUIDA DEFINITIVA

**Ultima modifica:** 16/01/2026  
**Status:** ✅ SOLUZIONE PERMANENTE IMPLEMENTATA

---

## 📋 Indice

1. [Panoramica](#panoramica)
2. [Coordinate Corrette](#coordinate-corrette)
3. [Sincronizzazione](#sincronizzazione)
4. [Comandi Makefile](#comandi-makefile)
5. [Deploy](#deploy)
6. [Troubleshooting](#troubleshooting)
7. [Prevenzione Problemi](#prevenzione-problemi)

---

## 📍 Panoramica

Le coordinate di spawn definiscono dove i giocatori appaiono quando entrano in una stanza. Queste coordinate devono essere **sincronizzate** in tre punti:

1. **Frontend Fallback** (`src/utils/cameraPositioning.js`)
2. **Database Migration** (`backend/alembic/versions/002_add_spawn_data.py`)
3. **Database Runtime** (tabella `rooms`)

### ⚠️ Problema Ricorrente

In passato, le coordinate non erano sincronizzate tra queste tre fonti, causando:
- Giocatori che spawnano fuori dalle stanze
- Comportamenti diversi tra sviluppo e produzione
- Necessità di fix manuali ad ogni deploy

### ✅ Soluzione Implementata

Ora abbiamo:
- **Unica fonte di verità**: Coordinate definite in `cameraPositioning.js`
- **Script di verifica**: `verify-spawn-sync.sh` controlla la sincronizzazione
- **Comandi Makefile**: Target dedicati per gestire le coordinate
- **Deploy automatico**: Script per Raspberry Pi

---

## 📊 Coordinate Corrette

Queste sono le **UNICHE** coordinate corrette da usare:

```javascript
{
  cucina: {
    position: { x: -1.5, y: 0, z: 1.2 },
    yaw: 0.5  // 29° - Centro cucina
  },
  soggiorno: {
    position: { x: 0.53, y: 0, z: 1.52 },
    yaw: 5.17  // 296° - Centro soggiorno
  },
  bagno: {
    position: { x: 1.18, y: 0, z: 2.59 },
    yaw: 3.75  // 215° - Vista lavandino
  },
  camera: {
    position: { x: -0.21, y: 0, z: 1.46 },
    yaw: 0.82  // 47° - Centro camera
  },
  esterno: {
    position: { x: 0.53, y: 0, z: 7.27 },
    yaw: 0  // 0° - Ingresso cancello
  }
}
```

### Note Tecniche

- **Y = 0**: L'eye height (1.6m) viene aggiunto automaticamente
- **Coordinate post-centratura**: Compensano l'offset del modello 3D
- **Testate in gioco**: Posizioni verificate manualmente e funzionanti

---

## 🔄 Sincronizzazione

### Verifica Sincronizzazione

Prima di ogni deploy, **SEMPRE** verificare:

```bash
make verify-spawn
```

Oppure:

```bash
./verify-spawn-sync.sh
```

**Output atteso:**
```
✓ Kitchen coordinates OK
✓ Livingroom coordinates OK
✓ Bathroom coordinates OK
✓ Bedroom coordinates OK
✅ TUTTO SINCRONIZZATO!
```

### Fix Database Locale

Se il database locale ha coordinate sbagliate:

```bash
make fix-spawn
```

Oppure:

```bash
docker-compose exec -T db psql -U escape_user -d escape_db < fix-spawn-raspberry-CORRETTE-2026.sql
```

---

## 🛠️ Comandi Makefile

### `make verify-spawn`
Verifica che tutte le fonti siano sincronizzate.

```bash
make verify-spawn
```

### `make fix-spawn`
Applica le coordinate corrette al database locale.

```bash
make fix-spawn
```

### `make deploy-spawn-raspberry`
Deploy delle coordinate sul Raspberry Pi.

```bash
make deploy-spawn-raspberry
```

---

## 🚀 Deploy

### Deploy Locale (Sviluppo)

1. **Verifica sincronizzazione:**
   ```bash
   make verify-spawn
   ```

2. **Se necessario, applica fix:**
   ```bash
   make fix-spawn
   ```

3. **Rebuild e restart:**
   ```bash
   make rebuild
   ```

### Deploy Raspberry Pi

1. **Verifica sincronizzazione locale:**
   ```bash
   make verify-spawn
   ```

2. **Deploy sul Raspberry:**
   ```bash
   make deploy-spawn-raspberry
   ```

3. **Sul Raspberry Pi, pulire cache browser:**
   - Apri: `http://192.168.8.10/clear-spawn-cache-raspberry.html`
   - Clicca: "🗑️ PULISCI TUTTA LA CACHE SPAWN"

### Verifica Post-Deploy

1. **Testa ogni stanza:**
   - Cucina
   - Soggiorno  
   - Bagno
   - Camera da letto
   - Esterno

2. **Check spawn centrale:**
   - Player deve essere al centro della stanza
   - Non deve attraversare muri
   - Orientamento corretto

---

## 🔧 Troubleshooting

### Problema: Player spawna fuori dalla stanza

**Causa:** Database ha coordinate vecchie

**Soluzione:**
```bash
make fix-spawn
make restart
```

Sul Raspberry:
```bash
make deploy-spawn-raspberry
```

### Problema: Verificanon passa

**Causa:** Fonti non sincronizzate

**Soluzione:**
1. Controlla quale fonte è errata dall'output di `verify-spawn`
2. Se è il database: `make fix-spawn`
3. Se è il codice: consulta `SPAWN_FIX_RASPBERRY_2026_FINALE.md`

### Problema: Cache browser

**Causa:** Browser usa coordinate vecchie dalla cache

**Soluzione:**
```bash
# Apri nel browser
http://192.168.8.10/clear-spawn-cache-raspberry.html

# Oppure hard reload
CTRL + SHIFT + R (Windows/Linux)
CMD + SHIFT + R (Mac)
```

### Problema: Dopo git pull coordinate sbagliate

**Causa:** Migration non eseguita o database vecchio

**Soluzione:**
```bash
make down
make up
make migrate
make fix-spawn
make verify-spawn
```

---

## 🛡️ Prevenzione Problemi

### ✅ Best Practices

1. **Prima di ogni deploy:**
   ```bash
   make verify-spawn
   ```

2. **Dopo ogni git pull:**
   ```bash
   make verify-spawn
   ```

3. **Dopo modifiche coordinate:**
   ```bash
   # 1. Modifica cameraPositioning.js
   # 2. Modifica 002_add_spawn_data.py
   # 3. Verifica sincronizzazione
   make verify-spawn
   # 4. Commit ENTRAMBI i file insieme
   git add src/utils/cameraPositioning.js backend/alembic/versions/002_add_spawn_data.py
   git commit -m "fix: Aggiorna coordinate spawn"
   ```

4. **Prima di chiudere un ticket spawn:**
   ```bash
   make verify-spawn
   ```

### 📝 Checklist Deploy

- [ ] `make verify-spawn` passa
- [ ] Commit e push su Git
- [ ] `make deploy-spawn-raspberry` (se deploy su Raspberry)
- [ ] Pulito cache browser
- [ ] Testato spawn in tutte le stanze
- [ ] Documentato eventuali modifiche

### 🚫 NON Fare Mai

- ❌ Modificare solo una delle tre fonti
- ❌ Committare coordinate diverse tra frontend e backend
- ❌ Modificare coordinate direttamente nel database senza aggiornare il codice
- ❌ Ignorare errori di `verify-spawn`
- ❌ Deploy senza verificare sincronizzazione

---

## 📚 Documentazione Correlata

- `SPAWN_FIX_RASPBERRY_2026_FINALE.md` - Dettagli tecnici del fix
- `ASYNC_SPAWN_SYSTEM.md` - Sistema di caricamento spawn
- `ARCHITETTURA_COORDINATE_FINALE.md` - Architettura coordinate
- `DATABASE_SPAWN_SYSTEM.md` - Sistema database spawn

---

## 🔍 File Coinvolti

### Frontend
- `src/utils/cameraPositioning.js` - Fallback coordinate (FONTE DI VERITÀ)
- `src/utils/api.js` - Caricamento da API

### Backend
- `backend/alembic/versions/002_add_spawn_data.py` - Migration database
- `backend/app/api/rooms.py` - API endpoint

### Scripts
- `verify-spawn-sync.sh` - Verifica sincronizzazione
- `fix-spawn-raspberry-CORRETTE-2026.sql` - Fix SQL
- `deploy-spawn-fix-raspberry.sh` - Deploy automatico
- `clear-spawn-cache-raspberry.html` - Tool pulizia cache

### Build
- `Makefile` - Comandi spawn management

---

## ✅ Status Attuale

**Data:** 16/01/2026  
**Stato:** ✅ SINCRONIZZATO

- ✅ Frontend fallback: Coordinate corrette
- ✅ Database migration: Coordinate corrette
- ✅ Database locale: Coordinate corrette
- ✅ Script verifica: Funzionante
- ✅ Makefile target: Implementati
- ✅ Deploy script: Pronto
- ⏳ Raspberry Pi: In attesa di deploy

---

**Ultimo aggiornamento:** 16 Gennaio 2026, 07:52 AM  
**Prossimo deploy:** Quando Raspberry Pi sarà online