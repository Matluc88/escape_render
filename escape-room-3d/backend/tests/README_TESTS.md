# 🧪 Test Suite - Escape Room 3D Backend

## 📦 Struttura Test Creata

```
backend/
├── tests/
│   ├── __init__.py              # Inizializzazione package
│   ├── test_db_persistence.py   # ✅ Suite test persistenza DB
│   └── README_TESTS.md          # Questa guida
├── requirements-dev.txt         # ✅ Dipendenze testing
└── requirements.txt             # Dipendenze produzione
```

## 🎯 Test Implementati

### 1️⃣ `test_session_persists_after_container_restart` ⚠️ CRITICAL

**Scopo**: Verifica che sessioni persistano dopo restart container backend

**Scenario**:
1. Crea sessione via API REST
2. Restart container backend (simula crash/reboot Raspberry Pi)
3. Verifica sessione ancora presente in database

**Perché è CRITICO**:
- Sistema air-gapped su Raspberry Pi
- Nessuna recovery cloud/backup esterno
- Fallimento = PERDITA DATI PERMANENTE

**Output atteso**:
```
✅ Created session: ID=123, PIN=TEST-456
🔄 Restarting backend container...
✅ Session PERSISTED after restart: {...}
```

---

### 2️⃣ `test_multiple_restarts_preserve_data` 🔥 STRESS TEST

**Scopo**: Verifica robustezza con 3 restart consecutivi

**Scenario**:
- Simula "giornata difficile" su Raspberry Pi
- Power loss multipli, memory pressure, etc.
- Ogni restart verifica integrità dati

**Perché è importante**:
- Ambiente scolastico imprevedibile
- Possibili interruzioni energia multiple
- Stress test realistico

**Output atteso**:
```
✅ Created stress test session: ID=789
🔄 Restart #1/3...
✅ Data intact after restart #1
🔄 Restart #2/3...
✅ Data intact after restart #2
🔄 Restart #3/3...
✅ Data intact after restart #3
✅ STRESS TEST PASSED: Data survived 3 restarts
```

---

### 3️⃣ `test_volume_integrity_check` 🔧 INFRASTRUTTURA

**Scopo**: Verifica corretta configurazione Docker volume

**Cosa controlla**:
- Volume PostgreSQL esiste (`postgres_data`)
- Volume è montato correttamente in container
- Path `/var/lib/postgresql/data` è persistente

**Perché è importante**:
- Previene misconfigurazioni Docker
- Catching errors PRIMA del deploy produzione
- Evita "lavoro perso" da studenti

**Output atteso**:
```
✅ Volume configuration is correct
```

---

### 4️⃣ `test_db_size_remains_stable` 📊 PERFORMANCE

**Scopo**: Monitora crescita database

**Cosa controlla**:
- Database size attuale
- Crescita dopo inserimento 10 sessioni
- Alert se supera soglie critiche (> 50MB per test data)

**Perché è importante**:
- Raspberry Pi con storage limitato (32GB SD card)
- Previene "disk full" dopo mesi di utilizzo
- Identifica memory leaks early

**Output atteso**:
```
📊 Current DB size: 8192 kB
📊 After 10 sessions: 8256 kB
```

---

## 🚀 Come Eseguire i Test

### Prerequisiti

```bash
# Installa dipendenze testing
cd escape-room-3d/backend
pip install -r requirements-dev.txt
```

### Run Tutti i Test

```bash
# Con output verbose
pytest tests/test_db_persistence.py -v -s

# Output esempio:
# tests/test_db_persistence.py::test_session_persists_after_container_restart PASSED
# tests/test_db_persistence.py::test_multiple_restarts_preserve_data PASSED
# tests/test_db_persistence.py::test_volume_integrity_check PASSED
# tests/test_db_persistence.py::test_db_size_remains_stable PASSED
```

### Run Singolo Test

```bash
# Solo test critico persistenza
pytest tests/test_db_persistence.py::test_session_persists_after_container_restart -v -s
```

### Skip Test Lenti

```bash
# Skip test marcati con @pytest.mark.slow
pytest tests/test_db_persistence.py -v -m "not slow"
```

---

## 📋 Dipendenze Testing (`requirements-dev.txt`)

```
pytest==7.4.3         # Framework testing
requests==2.31.0      # HTTP client per API calls
Faker==20.1.0         # Genera dati test realistici
```

---

## 🔧 Architettura Test

### Fixture `docker_stack`

```python
@pytest.fixture(scope="module")
def docker_stack():
    """Setup/teardown Docker stack completo."""
    # 1. Start containers
    subprocess.run(["docker", "compose", "-f", COMPOSE_FILE, "up", "-d"])
    
    # 2. Wait for health checks
    time.sleep(15)
    
    yield  # Esegui test
    
    # 3. Cleanup
    subprocess.run(["docker", "compose", "-f", COMPOSE_FILE, "down"])
```

**Scope: module** = setup UNA VOLTA per tutti i test nel file

---

## ⚠️ Troubleshooting

### Test Fails: "Session NOT found after restart"

**Causa**: Volume PostgreSQL non configurato correttamente

**Fix**:
1. Verifica `docker-compose.dev.yml`:
   ```yaml
   services:
     db:
       volumes:
         - postgres_data:/var/lib/postgresql/data
   
   volumes:
     postgres_data:
   ```

2. Reset volume:
   ```bash
   docker-compose -f backend/docker-compose.dev.yml down -v
   docker-compose -f backend/docker-compose.dev.yml up -d
   ```

### Test Fails: "Connection refused"

**Causa**: Backend non pronto dopo restart

**Fix**: Aumenta wait time in test:
```python
time.sleep(10)  # Aumenta a 15-20 se Raspberry Pi lento
```

### Test Timeout

**Causa**: Container non si avvia correttamente

**Debug**:
```bash
docker-compose -f backend/docker-compose.dev.yml logs backend
docker-compose -f backend/docker-compose.dev.yml ps
```

---

## 🎓 Best Practices

### ✅ DO

- Run test PRIMA di ogni deploy su Raspberry Pi
- Run test dopo modifiche a models/schemas/migrations
- Monitora output per memory leaks
- Integra test in CI/CD pipeline (quando disponibile)

### ❌ DON'T

- Non modificare database manualmente durante test
- Non fare assumere test su timing fissi (usa retry logic)
- Non ignorare test failures ("funziona sul mio PC")

---

## 📈 Roadmap Test Future

### Priorità Alta
- [ ] Test WebSocket persistence dopo restart
- [ ] Test Puzzle state recovery
- [ ] Test MQTT ESP32 message queue

### Priorità Media
- [ ] Load testing (100+ concurrent users)
- [ ] Memory leak detection automatica
- [ ] Backup/restore testing

### Priorità Bassa
- [ ] End-to-end testing con Selenium
- [ ] Performance benchmarking
- [ ] Chaos engineering (kill random containers)

---

## 📞 Support

Per problemi con i test, verificare:

1. **Logs backend**: `docker-compose -f backend/docker-compose.dev.yml logs -f`
2. **Database state**: `docker exec -it escape-db psql -U escape_user -d escape_db`
3. **Volume list**: `docker volume ls | grep escape`

**File di riferimento**:
- Test suite: `backend/tests/test_db_persistence.py`
- Docker config: `backend/docker-compose.dev.yml`
- Audit report: `PROJECT_AUDIT_AIRGAPPED.md`
