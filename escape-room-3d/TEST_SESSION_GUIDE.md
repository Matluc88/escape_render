# 🧪 GUIDA SESSIONE DI TEST PERMANENTE

**Data:** 29/12/2025
**Scopo:** Sessione sempre attiva per testare LED e puzzle

---

## ✅ SESSIONE ATTUALE DISPONIBILE

**Session ID:** 1  
**PIN:** 3795  
**Room ID:** 1  
**Status:** Active  
**Players:** 1 (configurato)

---

## 🔗 LINK PRONTI ALL'USO

### Cucina (LED: fornelli, frigo, serra)
```
http://localhost:5173/play/1/cucina?name=TestUser
```

### Camera (LED: materasso, poltrona, ventola)
```
http://localhost:5173/play/1/camera?name=TestUser
```

### Bagno
```
http://localhost:5173/play/1/bagno?name=TestUser
```

### Soggiorno
```
http://localhost:5173/play/1/soggiorno?name=TestUser
```

### Esterno
```
http://localhost:5173/play/1/esterno?name=TestUser
```

---

## 🎯 SESSIONE PERMANENTE (ID=999, PIN=TEST)

### Migrazione Creata

File: `backend/alembic/versions/009_create_test_session.py`

Questa migration crea automaticamente una sessione permanente con:
- **ID:** 999 (non interferisce con auto-increment)
- **PIN:** TEST (facile da ricordare)
- **Players:** 10 (test multipli contemporanei)
- **Status:** active (sempre attiva)

### Come Applicare la Migration

Quando il database è libero:

```bash
# Opzione 1: Da dentro il container backend
docker exec escape-backend-dev alembic upgrade head

# Opzione 2: Manualmente nel database
docker exec escape-db-dev psql -U escape_user -d escape_db <<EOF
INSERT INTO game_sessions (id, room_id, pin, start_time, end_time, expected_players, connected_players, status)
VALUES (999, 1, 'TEST', NOW(), NULL, 10, 0, 'active')
ON CONFLICT (id) DO NOTHING;

SELECT setval('game_sessions_id_seq', 1000, false);
EOF
```

### Link con Sessione Permanente (dopo migration)

```
Cucina: http://localhost:5173/play/999/cucina?name=Tester
Camera: http://localhost:5173/play/999/camera?name=Tester
Bagno: http://localhost:5173/play/999/bagno?name=Tester
Soggiorno: http://localhost:5173/play/999/soggiorno?name=Tester
Esterno: http://localhost:5173/play/999/esterno?name=Tester
```

---

## 🔧 WORKFLOW SVILUPPO

### 1. Avvio Sistema

```bash
# Backend Docker
cd backend
docker-compose -f docker-compose.dev.yml up -d

# Frontend Vite  
cd ..
npm run dev
```

### 2. Test LED

**Usa sessione esistente (ID=1) o futura (ID=999):**

1. Apri: `http://localhost:5173/play/1/cucina?name=Dev`
2. Testa interazioni LED
3. Gli stati vengono salvati nel database
4. Altri client vedono aggiornamenti real-time via WebSocket

### 3. Reset Stati LED

Per ricominciare da zero:

```bash
# Reset stati cucina
docker exec escape-db-dev psql -U escape_user -d escape_db \
  -c "DELETE FROM kitchen_puzzle_states WHERE session_id = 1;"

# Reset stati camera
docker exec escape-db-dev psql -U escape_user -d escape_db \
  -c "DELETE FROM bedroom_puzzle_states WHERE session_id = 1;"
```

---

## 📊 Verificare Sessioni Attive

```bash
# Lista tutte le sessioni
docker exec escape-db-dev psql -U escape_user -d escape_db \
  -c "SELECT id, pin, status, expected_players FROM game_sessions;"

# Verifica stati LED cucina
docker exec escape-db-dev psql -U escape_user -d escape_db \
  -c "SELECT session_id, puzzle_states FROM kitchen_puzzle_states;"

# Verifica stati LED camera  
docker exec escape-db-dev psql -U escape_user -d escape_db \
  -c "SELECT session_id, puzzle_states FROM bedroom_puzzle_states;"
```

---

## 🚨 Troubleshooting

### Database Bloccato

Se i comandi al database si bloccano:

```bash
# 1. Riavvia container backend (rilascia connessioni)
cd backend
docker-compose -f docker-compose.dev.yml restart web

# 2. Se persiste, riavvia tutto
docker-compose -f docker-compose.dev.yml restart
```

### Sessione Non Trovata

```bash
# Crea manualmente sessione di test
curl -X POST http://localhost:8001/sessions \
  -H "Content-Type: application/json" \
  -d '{"expected_players": 5}'

# Ti restituirà ID e PIN da usare nei link
```

### LED Non Cambiano Stato

1. ✅ Verifica backend attivo: `curl http://localhost:8001/health`
2. ✅ Verifica sessione esiste: (query sopra)
3. ✅ Apri console browser: cerca errori WebSocket
4. ✅ Controlla logs: `docker logs escape-backend-dev --tail 50`

---

## 💡 Uso in Produzione

**La sessione permanente (ID=999) NON dovrebbe essere usata in produzione!**

In produzione:
1. Admin crea sessioni dalla Dashboard
2. Studenti usano PIN per entrare
3. Sessioni hanno ciclo vita: start → active → completed

La sessione test è SOLO per sviluppo e testing! 🧪

---

## 📚 Documenti Correlati

- `SCENE_ROUTES_REFERENCE.md` - Tutti i link e route
- `DATABASE_UNIFICATION_COMPLETE.md` - Sistema database
- `KITCHEN_LED_SYSTEM_COMPLETE.md` - Sistema LED cucina
- `BEDROOM_PUZZLE_INTEGRATION_GUIDE.md` - Sistema LED camera

---

_Ultima modifica: 29/12/2025 17:43_
