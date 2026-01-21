# Guida ai Log di Spawn su Render

## 📋 Panoramica

Questa guida spiega come visualizzare i log dettagliati del sistema di spawn su Render.com per il debug in produzione.

## 🔍 Log Aggiunti

I log sono stati aggiunti al file `backend/app/api/spawn.py` e tracciano:

### 1. **Richieste Singole di Spawn Point** (`GET /spawn/{room_name}`)

Quando viene richiesto uno spawn point specifico, vedrai:

```
================================================================================
🎯 RICHIESTA SPAWN POINT
   Room richiesta: 'cucina'
   Room mappata: 'cucina' → 'kitchen'
   Esecuzione query SQL per room: 'kitchen'
   ✅ Dati spawn recuperati dal database:
      Raw spawn_data: {'position': {'x': -2.5, 'y': 0, 'z': 3.0}, 'yaw': 0}
   📍 COORDINATE FINALI RESTITUITE:
      Position: x=-2.5, y=0, z=3.0
      Yaw: 0
================================================================================
```

### 2. **Richieste di Tutti gli Spawn Points** (`GET /spawn/`)

```
================================================================================
🗂️  RICHIESTA TUTTI GLI SPAWN POINTS
   Esecuzione query per ottenere tutti gli spawn points...
   ✅ Trovati 5 spawn points nel database
      - bathroom: x=1.2, y=0.0, z=-2.5, yaw=90
      - bedroom: x=-3.0, y=0.0, z=-4.0, yaw=0
      - gate: x=5.0, y=0.0, z=8.0, yaw=180
      - kitchen: x=-2.5, y=0.0, z=3.0, yaw=0
      - livingroom: x=2.0, y=0.0, z=1.5, yaw=270
   📦 TOTALE SPAWN POINTS RESTITUITI: 5
================================================================================
```

### 3. **Messaggi di Errore**

In caso di errori:

```
================================================================================
🎯 RICHIESTA SPAWN POINT
   Room richiesta: 'sala'
   Room mappata: 'sala' → 'sala'
   Esecuzione query SQL per room: 'sala'
   ❌ ERRORE: Spawn point NON trovato per room: 'sala' (db: 'sala')
================================================================================
```

## 🌐 Come Accedere ai Log su Render

### Metodo 1: Dashboard Web (Consigliato)

1. **Accedi a Render.com**
   - Vai su https://dashboard.render.com
   - Effettua il login con le tue credenziali

2. **Seleziona il Servizio Backend**
   - Nella dashboard, clicca sul servizio backend dell'escape room
   - Normalmente si chiama qualcosa come `escape-room-backend` o `escape-room-3d-backend`

3. **Visualizza i Log**
   - Nel menu di sinistra, clicca su **"Logs"**
   - Vedrai i log in tempo reale

4. **Filtra i Log di Spawn**
   - Usa la barra di ricerca in alto per filtrare:
     - Cerca `🎯 RICHIESTA SPAWN` per vedere le richieste singole
     - Cerca `🗂️ RICHIESTA TUTTI` per vedere le richieste di tutti gli spawn
     - Cerca `❌ ERRORE` per vedere solo gli errori
     - Cerca il nome di una stanza specifica (es. `cucina`, `camera`)

5. **Opzioni di Visualizzazione**
   - **Auto-scroll**: Attiva per vedere i log in tempo reale
   - **Time range**: Puoi selezionare un intervallo temporale specifico
   - **Download**: Puoi scaricare i log per analisi offline

### Metodo 2: Render CLI

Se preferisci usare il terminale:

```bash
# Installa Render CLI (se non l'hai già)
npm install -g @render-com/render-cli

# Login
render login

# Visualizza i log in tempo reale
render logs -s <service-id> --follow

# Filtra per spawn
render logs -s <service-id> --follow | grep "SPAWN"
```

### Metodo 3: API di Render

Puoi anche usare l'API di Render per ottenere i log programmaticamente:

```bash
curl -H "Authorization: Bearer YOUR_API_KEY" \
  "https://api.render.com/v1/services/YOUR_SERVICE_ID/logs"
```

## 🧪 Come Testare i Log

### Test Locale (Prima di Deploy)

1. **Avvia il backend localmente**:
   ```bash
   cd escape-room-3d
   docker-compose up backend
   ```

2. **Fai una richiesta di test**:
   ```bash
   # Test singolo spawn point
   curl http://localhost:8000/api/spawn/cucina
   
   # Test tutti gli spawn points
   curl http://localhost:8000/api/spawn/
   ```

3. **Guarda i log nel terminale** - vedrai immediatamente i log dettagliati

### Test su Render (Dopo Deploy)

1. **Deploy del codice**:
   ```bash
   git add escape-room-3d/backend/app/api/spawn.py
   git commit -m "Add detailed spawn logging for Render debug"
   git push origin main
   ```

2. **Render farà automaticamente il deploy** - attendi qualche minuto

3. **Accedi all'applicazione** e naviga tra le stanze

4. **Vai sui log di Render** come descritto sopra

5. **Osserva i log** mentre navighi - ogni cambio stanza genererà log dettagliati

## 📊 Cosa Cercare nei Log

### ✅ Comportamento Normale

- Ogni richiesta deve mostrare la separazione con `====...====`
- Deve esserci il mapping corretto del nome stanza
- Le coordinate devono essere mostrate chiaramente
- Il formato JSON deve essere valido

### 🚨 Problemi Comuni

1. **Spawn Point Non Trovato**
   ```
   ❌ ERRORE: Spawn point NON trovato per room: 'X' (db: 'Y')
   ```
   - **Causa**: La stanza non esiste nel database
   - **Soluzione**: Verifica i dati nel database con le migration

2. **Errore di Tipo**
   ```
   ❌ ERRORE CRITICO nel fetch spawn point:
      Tipo: KeyError
   ```
   - **Causa**: Il formato JSON nel database è errato
   - **Soluzione**: Controlla la struttura del campo `spawn_data`

3. **Errore di Connessione Database**
   ```
   ❌ ERRORE CRITICO nel fetch spawn point:
      Tipo: OperationalError
   ```
   - **Causa**: Problemi di connessione al database PostgreSQL
   - **Soluzione**: Verifica la configurazione DATABASE_URL su Render

## 🔧 Debug Avanzato

### Aumentare il Livello di Log

Se hai bisogno di ancora più dettagli, puoi modificare il livello di logging nel file `backend/app/main.py`:

```python
import logging

# Configura logging più dettagliato
logging.basicConfig(
    level=logging.DEBUG,  # Cambia da INFO a DEBUG
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
```

### Aggiungere Log Temporanei

Per debug specifici, puoi aggiungere log temporanei direttamente nel codice:

```python
logger.debug(f"Debug specifico: {variabile}")
logger.info(f"Info importante: {valore}")
logger.warning(f"Attenzione: {condizione}")
logger.error(f"Errore: {problema}")
```

## 📱 Monitoraggio in Tempo Reale

### Durante il Testing

1. Apri i log di Render in una finestra
2. Apri l'applicazione in un'altra finestra
3. Naviga tra le stanze
4. Osserva i log apparire in tempo reale

### Esempio di Sequenza Log

Quando un utente entra nella cucina:

```
14:32:15 - INFO - ================================================================================
14:32:15 - INFO - 🎯 RICHIESTA SPAWN POINT
14:32:15 - INFO -    Room richiesta: 'cucina'
14:32:15 - INFO -    Room mappata: 'cucina' → 'kitchen'
14:32:15 - INFO -    Esecuzione query SQL per room: 'kitchen'
14:32:15 - INFO -    ✅ Dati spawn recuperati dal database:
14:32:15 - INFO -       Raw spawn_data: {'position': {'x': -2.5, 'y': 0, 'z': 3.0}, 'yaw': 0}
14:32:15 - INFO -    📍 COORDINATE FINALI RESTITUITE:
14:32:15 - INFO -       Position: x=-2.5, y=0, z=3.0
14:32:15 - INFO -       Yaw: 0
14:32:15 - INFO - ================================================================================
```

## 🎯 Conclusione

Con questi log dettagliati, puoi:

- ✅ Vedere esattamente quali coordinate vengono restituite
- ✅ Verificare che il mapping delle stanze funzioni correttamente
- ✅ Identificare rapidamente problemi nel database
- ✅ Monitorare il comportamento in produzione
- ✅ Debug efficace senza dover ricreare l'ambiente localmente

## 📚 Link Utili

- [Dashboard Render](https://dashboard.render.com)
- [Documentazione Log Render](https://render.com/docs/logs)
- [Render CLI](https://render.com/docs/cli)
