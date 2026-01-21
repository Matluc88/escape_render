# ⚠️ REBUILD SEMPRE DOPO OGNI MODIFICA

## 🔴 REGOLA D'ORO

**DOPO OGNI MODIFICA AL CODICE, FARE SEMPRE IL REBUILD DOCKER!**

```bash
cd escape-room-3d
docker-compose up -d --build
```

## Perché?

- Le modifiche al codice **NON sono applicate automaticamente**
- Docker usa immagini cached
- Il frontend deve essere ricompilato con Vite
- Il backend deve essere riavviato con i nuovi file

## Quando fare rebuild?

✅ **SEMPRE** dopo modifiche a:
- File `.jsx` / `.js` (componenti React, hooks, utils)
- File `.css` (stili)
- File di configurazione (vite.config.js, etc.)
- Backend Python (`.py`)
- Package changes (package.json, requirements.txt)

## Checklist Modifica Codice

1. ✏️ Fai la modifica al file
2. 💾 Salva il file
3. 🔨 **REBUILD DOCKER** (`docker-compose up -d --build`)
4. ⏳ Aspetta che finisca (2-3 minuti)
5. 🔄 Ricarica browser (Ctrl+F5 / Cmd+Shift+R)
6. ✅ Verifica che funzioni

## Tempo Rebuild

- Frontend: ~2 minuti (Vite build)
- Backend: ~30 secondi (cached)
- Database: istantaneo (già up)

## Errori Comuni

❌ **"Ma io ho modificato il file!"** → Hai fatto rebuild?
❌ **"Non vedo le modifiche!"** → Hai fatto rebuild?
❌ **"La pentola non appare!"** → Hai fatto rebuild?

## Alternative Rapide

Se serve solo il frontend (dev mode):
```bash
cd escape-room-3d
npm run dev
```

Poi visita: `http://localhost:5173` (dev server)

## Note

- **Hot reload NON funziona con Docker** (immagini statiche)
- Serve rebuild completo ogni volta
- Cache browser può nascondere cambiamenti (Ctrl+F5)
