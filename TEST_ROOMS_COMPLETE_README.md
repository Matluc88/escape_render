# 🎮 Test Completamento Tutte le Stanze

## 📋 Descrizione

Questo script di test simula il completamento di **tutte e 4 le stanze** dell'escape room per verificare che i **LED RGB dell'esterno** si attivino correttamente quando tutte le stanze sono completate.

## ⚙️ Cosa Fa lo Script

Lo script esegue automaticamente questi passaggi:

1. **Recupera la sessione attiva** dal backend
2. **Completa tutti i puzzle** delle 4 stanze:
   - 🍳 **Cucina**: Serra
   - 🛏️ **Camera**: Comodino → Materasso → Poltrona → Ventola
   - 🚿 **Bagno**: Specchio → Doccia → Ventola
   - 🛋️ **Soggiorno**: TV → Pianta → Condizionatore
3. **Verifica** che `game_won = true`
4. **Controlla** lo stato dei LED RGB dell'esterno
5. **Mostra** un report dettagliato con tutti gli stati

## 🚀 Come Eseguire

### Requisiti
- Python 3.x installato
- Modulo `requests` (si installa con: `pip3 install requests`)
- Backend escape room in esecuzione su `http://192.168.8.10:8001`
- Una sessione attiva nel sistema

### Esecuzione

```bash
# Dalla directory ESCAPE
python3 test_all_rooms_complete.py

# Oppure (se reso eseguibile)
./test_all_rooms_complete.py
```

## 📊 Output Atteso

Lo script mostrerà:

```
============================================================
  🎮 TEST COMPLETAMENTO TUTTE LE STANZE
============================================================

Questo script simula il completamento di tutte le stanze
per verificare l'attivazione dei LED RGB dell'esterno.


============================================================
  STEP 1: Recupero Sessione Attiva
============================================================

✅ Sessione attiva trovata: ID = 1

============================================================
  STEP 2: Completamento Stanze
============================================================

🍳 Completamento CUCINA...
   ✅ Serra completata
🛏️  Completamento CAMERA...
   ✅ Comodino completato
   ✅ Materasso completato
   ✅ Poltrona completato
   ✅ Ventola completato
🚿 Completamento BAGNO...
   ✅ Specchio completato
   ✅ Doccia completato
   ✅ Ventola completato
🛋️  Completamento SOGGIORNO...
   ✅ Tv completato
   ✅ Pianta completato
   ✅ Condizionatore completato

📊 Risultati completamento:
   ✅ cucina: OK
   ✅ camera: OK
   ✅ bagno: OK
   ✅ soggiorno: OK

============================================================
  STEP 3: Verifica Game Completion
============================================================

🏆 Game Won: SÌ ✅
📊 Stanze completate: 4/4
⏰ Tempo vittoria: 2026-01-18T09:19:45.123456

🚪 Stati LED Porte:
   🟢 cucina: green
   🟢 camera: green
   🟢 bagno: green
   🟢 soggiorno: green

============================================================
  STEP 4: Verifica LED RGB Esterno
============================================================

🎨 RGB Strip: ON 🎉
💡 LED Status: green
✅ All Rooms Complete: SÌ

============================================================
  🎉🎉🎉 LED RGB ESTERNO ATTIVATI! 🎉🎉🎉
  I LED dovrebbero lampeggiare con colori festa!
============================================================

============================================================
  📋 RIEPILOGO FINALE
============================================================

✅ Tutte le stanze completate: SÌ
✅ Game Won: SÌ
✅ LED RGB Esterno: ATTIVI 🎉

🎊 TEST COMPLETATO CON SUCCESSO! 🎊
Il sistema funziona correttamente.
```

## 🔍 Cosa Verifica

### 1. Completamento Stanze
- Chiama gli endpoint API per completare ogni puzzle
- Segue la sequenza corretta (FSM) per ogni stanza
- Verifica che ogni chiamata API abbia successo (HTTP 200)

### 2. Game Completion
- Controlla che `game_won = true`
- Verifica che `completed_rooms_count = 4`
- Controlla gli stati dei LED porte (devono essere tutti `green`)

### 3. LED RGB Esterno
- Verifica che `rgb_strip_on = true`
- Controlla che `all_rooms_complete = true`
- **NOTA**: I LED RGB si attivano solo se:
  - ✅ `game_won = true` (tutte 4 stanze completate)
  - ✅ Fotocellula libera (HIGH)

## ⚠️ Note Importanti

### Fotocellula
I LED RGB dell'ESP32 esterno si attivano SOLO quando:
1. Tutte le stanze sono completate (`game_won = true`)
2. **E** la fotocellula è libera (stato HIGH)

Se la fotocellula è occupata (LOW), i LED rimarranno spenti anche se il gioco è vinto.

### Script di Test - Non Modifica la Logica
Questo script:
- ✅ Usa solo gli endpoint API esistenti
- ✅ Non modifica nessun file di codice
- ✅ È completamente sicuro da eseguire
- ✅ Può essere eseguito più volte

## 🔧 Risoluzione Problemi

### "Nessuna sessione attiva trovata"
**Soluzione**: Crea una nuova sessione prima di eseguire lo script:
```bash
curl -X POST http://192.168.8.10:8001/api/sessions \
  -H "Content-Type: application/json" \
  -d '{"team_name": "Test Team"}'
```

### "LED RGB Esterno NON attivati"
**Possibili cause**:
1. La fotocellula è occupata (LOW) - libera il passaggio
2. Non tutte le stanze sono completate - controlla il log
3. L'ESP32 esterno non è connesso al backend
4. Il polling dell'ESP32 non è attivo (controlla seriale)

### Errori HTTP 4xx/5xx
Controlla che:
- Il backend sia in esecuzione
- L'URL sia corretto (`http://192.168.8.10:8001`)
- Non ci siano problemi di rete

## 📝 Modifiche Backend URL

Se il backend è su un altro indirizzo, modifica la variabile all'inizio dello script:

```python
# Modifica questo se il backend è altrove
BACKEND_URL = "http://192.168.8.10:8001"
```

## 🎯 Endpoint API Utilizzati

Lo script chiama questi endpoint:

### Sessioni
- `GET /api/sessions/active` - Recupera sessione attiva

### Cucina
- `POST /api/serra/complete?session_id={id}` - Completa serra

### Camera
- `POST /api/comodino/complete?session_id={id}` - Completa comodino
- `POST /api/materasso/complete?session_id={id}` - Completa materasso
- `POST /api/poltrona/complete?session_id={id}` - Completa poltrona
- `POST /api/ventola/complete?session_id={id}` - Completa ventola

### Bagno
- `POST /api/sessions/{id}/bathroom-puzzles/complete` - Completa puzzle bagno

### Soggiorno
- `POST /api/sessions/{id}/livingroom-puzzles/tv/complete` - Completa TV
- `POST /api/sessions/{id}/livingroom-puzzles/pianta/complete` - Completa pianta
- `POST /api/sessions/{id}/livingroom-puzzles/condizionatore/complete` - Completa condizionatore

### Verifica
- `GET /api/sessions/{id}/game-completion/state` - Stato game completion
- `GET /api/sessions/{id}/gate-puzzles/esp32-state` - Stato LED RGB esterno

## 📞 Supporto

In caso di problemi, verifica:
1. Log del backend (Docker: `docker logs escape-room-backend`)
2. Log seriale dell'ESP32 esterno (Arduino Serial Monitor)
3. Stato della rete (ping 192.168.8.10)