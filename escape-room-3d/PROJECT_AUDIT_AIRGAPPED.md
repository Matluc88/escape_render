# 🔍 PROJECT AUDIT - Escape Room 3D (AIR-GAPPED)
**Data Audit**: 02 Gennaio 2026  
**Versione Progetto**: 1.0.0  
**Contesto**: Sistema AIR-GAPPED su Raspberry Pi 4 (isolato da Internet)

---

## 📋 EXECUTIVE SUMMARY

**Status Generale**: ⚠️ **Funzionale ma necessita hardening per stabilità long-running**

Il sistema è **completamente self-contained** e progettato per funzionare **offline** su Raspberry Pi 4. Focus su **determinismo**, **resilienza** e **performance sostenibile** nelle 8+ ore di utilizzo giornaliero.

### Punteggio Readiness AIR-GAPPED (0-100)
- **Funzionalità**: 85/100 ✅ (feature complete per MVP)
- **Determinismo**: 60/100 ⚠️ (race conditions risolte ma pattern fragili)
- **Resilienza**: 55/100 ⚠️ (DB persistence OK, memory leaks potenziali)
- **Testing**: 10/100 ❌ (assente - critico per stabilità)
- **Documentazione**: 90/100 ✅ (eccellente, ora archiviata)
- **Offline-Ready**: 95/100 ✅ (tutto self-contained, da verificare)

**PUNTEGGIO FINALE**: **67/100** - Funzionale ma non "roccioso"

---

## 🎯 CONTESTO AIR-GAPPED

### Vincoli Operativi
1. **Nessuna connessione Internet** - Sistema completamente isolato
2. **Deploy unico** - Una sola istanza su Raspberry Pi 4
3. **Long-running** - 8+ ore/giorno di utilizzo continuo
4. **Hardware fisso** - Raspberry Pi 4 (4GB RAM)
5. **Utenti locali** - Solo LAN locale (192.168.x.x)

### Implicazioni Architetturali
✅ **Non Applicabili** (archiviati in docs/archive/):
- SSL/HTTPS certificates
- JWT complex authentication
- OAuth/external auth providers
- CDN per assets
- Cloud deployment (Render, AWS, etc.)
- CORS restrictive policies
- Rate limiting esterno
- External monitoring (Sentry, LogRocket)

✅ **Priorità Massima**:
- Database persistence & integrity
- Memory management (no leaks)
- Deterministic state transitions
- Container restart resilience
- Volume data persistence
- Offline dependency bundling

---

## 🚨 GAP CRITICI RICALIBRATI

### 🔴 **GAP #1: RESILIENZA & DETERMINISMO - CRITICAL**
**Severità**: ALTA  
**Impatto**: Sistema instabile dopo ore di utilizzo  
**Effort di Fix**: ~2-3 settimane

#### 1.1 Memory Leaks in Three.js (PRIORITÀ #1)
**File**: `src/components/3D/*.jsx`

**Problema**: Creazione di geometries/materials fuori da `useMemo` causa accumulo memoria.

**Rischio**: Dopo 6-8 ore di utilizzo continuo:
- RAM esaurita su Raspberry Pi
- Browser crash
- Performance degradation progressiva

**Da Verificare**:
```javascript
// ❌ PERICOLOSO - Crea nuova geometry ogni render
function Box() {
  const geometry = new BoxGeometry(1, 1, 1);  // Memory leak!
  return <mesh geometry={geometry} />;
}

// ✅ CORRETTO - Memoized
function Box() {
  const geometry = useMemo(() => new BoxGeometry(1, 1, 1), []);
  return <mesh geometry={geometry} />;
}
```

**Action Required**: Audit completo di:
- `src/components/3D/CasaModel.jsx`
- `src/components/3D/KitchenModel.jsx`
- `src/components/3D/EsternoModel.jsx`
- `src/components/3D/RoomModel.jsx`
- Tutti i componenti 3D personalizzati

#### 1.2 Database Persistence Test
**File**: `backend/docker-compose.dev.yml`

**Problema**: Nessun test che volume PostgreSQL persiste dati dopo restart container.

**Rischio**: Perdita sessioni/puzzle state dopo restart accidentale.

**Test Mancante**:
```python
# backend/tests/test_db_persistence.py
def test_session_persists_after_container_restart(docker_compose):
    """Verifica che dati DB persistano dopo restart container"""
    # 1. Crea sessione
    # 2. Stop container backend
    # 3. Start container backend
    # 4. Verifica sessione ancora presente
```

#### 1.3 Race Conditions Pattern
**Evidenza**: 6+ file di fix per stesso problema (ora archiviati)

**Pattern Ricorrente**:
- WebSocket message ordering
- LED state synchronization
- Spawn position updates
- Puzzle state transitions

**Root Cause**: Mancanza di **Finite State Machine** formale.

**Fix Permanente**:
```javascript
// Implementare FSM per puzzle state
class PuzzleStateMachine {
  state = 'IDLE';
  allowedTransitions = {
    'IDLE': ['SOLVING'],
    'SOLVING': ['SOLVED', 'FAILED'],
    'SOLVED': ['COMPLETED']
  };
  
  transition(to) {
    if (!this.allowedTransitions[this.state]?.includes(to)) {
      throw new Error(`Invalid transition: ${this.state} -> ${to}`);
    }
    this.state = to;
    this.emit('change', to);
  }
}
```

---

### 🔴 **GAP #2: TESTING FOUNDATION - CRITICAL**
**Severità**: ALTA  
**Impatto**: Bug non rilevati, regressioni frequenti  
**Effort di Fix**: ~2-3 settimane

#### 2.1 Backend Testing (PRIORITÀ #1)
**Status**: ❌ Pytest non configurato

**Setup Richiesto**:
```bash
# backend/requirements-dev.txt
pytest==7.4.3
pytest-asyncio==0.21.1
pytest-cov==4.1.0
pytest-docker==2.0.1  # Per test con Docker
httpx==0.25.2
faker==20.1.0
```

**Test Critici**:
1. **DB Persistence** - Volume restart
2. **Session lifecycle** - Create/update/delete
3. **Puzzle state** - Transitions valide
4. **WebSocket broadcast** - Message ordering
5. **MQTT integration** - ESP32 messages

**Target Coverage**:
- Services: 80%+
- API endpoints: 70%+
- WebSocket/MQTT handlers: 90%+ (critici!)

#### 2.2 Frontend Testing
**Status**: Vitest installato ma 0 test

**Test Critici**:
1. **useWebSocket** - Connection/reconnection/message handling
2. **useKitchenPuzzle** - State transitions
3. **useBedroomPuzzle** - State transitions
4. **Collision detection** - BVH performance

**No E2E** su Raspberry Pi (troppo lento), focus su:
- Unit tests per hooks
- Integration tests per API calls

---

### 🟡 **GAP #3: OFFLINE DEPENDENCIES - MEDIUM**
**Severità**: MEDIA  
**Impatto**: Sistema non avvia se CDN esterni presenti  
**Effort di Fix**: ~1-2 giorni

#### 3.1 CDN External Dependencies
**Da Verificare**:
- `escape-room-3d/index.html` - Script tags con unpkg/cdnjs
- `escape-room-3d/Dockerfile` - npm install usa registry esterno
- Font external (Google Fonts)

**Action**:
```bash
# Scan per URL esterni
grep -r "https://" escape-room-3d/index.html
grep -r "http://" escape-room-3d/index.html
grep -r "unpkg" escape-room-3d/
grep -r "cdnjs" escape-room-3d/
grep -r "googleapis" escape-room-3d/
```

**Fix**:
- Tutte le dipendenze devono essere in `node_modules/`
- Font devono essere in `public/fonts/`
- Dockerfile deve usare layer caching per evitare re-download

#### 3.2 Docker Image Pre-built
**Raccomandazione**: Build immagini Docker su macchina con Internet, poi:
```bash
# Save images
docker save escape-frontend:latest > escape-frontend.tar
docker save escape-backend:latest > escape-backend.tar
docker save postgres:15-alpine > postgres15.tar
docker save eclipse-mosquitto:2 > mosquitto2.tar

# Load su Raspberry Pi (offline)
docker load < escape-frontend.tar
docker load < escape-backend.tar
docker load < postgres15.tar
docker load < mosquitto2.tar
```

---

## 📊 METRICHE PERFORMANCE RASPBERRY PI 4

### Target per 8+ ore utilizzo
```
CPU: < 60% medio (spike OK fino 90%)
RAM: < 2.5GB totale (su 4GB disponibili)
  - Frontend (Nginx): < 100MB
  - Backend: < 500MB
  - PostgreSQL: < 1GB
  - MQTT: < 100MB
  - Chrome/browser: < 800MB

Disk I/O: < 50 MB/s
Network: < 10 Mbps (LAN locale)

Latency:
  - WebSocket roundtrip: < 100ms
  - MQTT roundtrip: < 200ms
  - DB query: < 50ms (p95)
  - Page load (Three.js): < 4s
```

### Monitoring Necessario
```bash
# Script monitoraggio continuo
#!/bin/bash
# escape-room-3d/monitor.sh

while true; do
  echo "=== $(date) ==="
  
  # Container stats
  docker stats --no-stream --format \
    "{{.Name}}\tCPU: {{.CPUPerc}}\tRAM: {{.MemUsage}}"
  
  # DB size
  docker exec escape-db psql -U escape_user -d escape_db \
    -c "SELECT pg_size_pretty(pg_database_size('escape_db'));"
  
  # Log errors
  docker logs escape-backend --tail 10 | grep -i error || true
  
  sleep 300  # Ogni 5 minuti
done
```

---

## 🔧 PIANO REMEDIATION AIR-GAPPED

### Fase 1: Resilienza Foundation (PRIORITÀ MASSIMA) - 1 settimana
- [ ] Audit memory leaks in `src/components/3D/`
- [ ] Fix geometries/materials fuori useMemo
- [ ] Implementare monitor.sh per stats container
- [ ] Test DB persistence con restart container
- [ ] Verificare volume PostgreSQL integrity

### Fase 2: Testing Core - 2 settimane
- [ ] Setup pytest + requirements-dev.txt
- [ ] Test DB persistence con Docker restart
- [ ] Test session lifecycle (CRUD completo)
- [ ] Test puzzle state transitions
- [ ] Test WebSocket message ordering
- [ ] Test MQTT ESP32 integration

### Fase 3: Determinismo - 1-2 settimane
- [ ] Implementare Puzzle FSM (Finite State Machine)
- [ ] Refactor race condition patterns
- [ ] Consolidare event ordering WebSocket/MQTT
- [ ] Test long-running (6+ ore)

### Fase 4: Offline Hardening - 1 settimana
- [ ] Scan CDN external dependencies
- [ ] Bundle tutti font/assets localmente
- [ ] Pre-build Docker images
- [ ] Test cold start completo offline
- [ ] Documentare procedura backup/restore

**Timeline Totale**: ~5-6 settimane per sistema "roccioso"

---

## ✅ PUNTI DI FORZA (Sistema AIR-GAPPED)

1. **Completamente Self-Contained** - No dipendenze esterne
2. **Docker Stack Completo** - Frontend + Backend + DB + MQTT
3. **Volume Persistence** - Dati PostgreSQL persistenti
4. **Ottimizzato Pi 4** - Memory limits configurati
5. **Debug Tools Integrati** - Animation Editor, Particle Editor
6. **Documentazione Estesa** - Guide per ogni feature
7. **Hardware Integration** - MQTT + ESP32 per LED fisici

---

## 🚀 CHECKLIST DEPLOYMENT RASPBERRY PI

### Pre-requisiti (Macchina con Internet)
- [ ] Build Docker images
- [ ] Export images in .tar files
- [ ] Download tutte le dipendenze npm (node_modules.tar)
- [ ] Prepare .env con configurazioni corrette

### Deployment su Raspberry Pi (Offline)
- [ ] Load Docker images da .tar
- [ ] Copy progetto in `/home/pi/escape-room-3d/`
- [ ] Extract node_modules se necessario
- [ ] Configurare .env con IP Raspberry Pi
- [ ] `docker compose up -d`
- [ ] Verify health checks: `docker ps`
- [ ] Test accesso da browser LAN: `http://<PI_IP>`

### Verifica Stabilità
- [ ] Test 1 ora utilizzo continuo
- [ ] Monitorare RAM con `docker stats`
- [ ] Test restart container: `docker compose restart`
- [ ] Verificare DB persiste dati dopo restart
- [ ] Test 6+ ore utilizzo (memory leaks)

### Backup Strategy
```bash
# Backup DB ogni notte
docker exec escape-db pg_dump -U escape_user escape_db > \
  /backups/escape_db_$(date +%Y%m%d).sql

# Backup volumes
docker run --rm -v escape-room-3d_postgres_data:/data \
  -v $(pwd)/backups:/backup \
  alpine tar czf /backup/postgres_data.tar.gz /data
```

---

## 📝 NOTE ARCHITETTURALI

### Decisione: Perché Air-Gapped?
**Motivazione**: Privacy educativa, no distrazoni online, controllo totale
**Trade-off**: No auto-update, no cloud monitoring, manutenzione manuale

### Decisione: Perché Raspberry Pi 4?
**Motivazione**: Costo contenuto, affidabile, sufficiente per use case
**Trade-off**: Performance limitata, necessita ottimizzazioni aggressive

### Decisione: Perché Docker su Pi?
**Motivazione**: Consistenza ambiente, isolamento servizi, facile backup
**Trade-off**: Overhead memoria (~200MB), cold start lento

---

## 🎯 OBIETTIVI MISURABILI

### Short-term (1 mese)
- [ ] Zero memory leaks rilevati in test 8h
- [ ] 80%+ test coverage su services backend
- [ ] DB persiste dati dopo 10 restart consecutivi
- [ ] Performance stabile dopo 8h utilizzo

### Long-term (3 mesi)
- [ ] 99%+ uptime su 30 giorni
- [ ] < 2 restart necessari al mese
- [ ] 90%+ test coverage su critical paths
- [ ] FSM implementata per tutti puzzle

---

## 📞 RIFERIMENTI

### File Chiave (Aggiornati)
- `.clinerules` - Standard sviluppo
- `PROJECT_AUDIT_AIRGAPPED.md` (questo file) - Audit contestuale
- `.cline/brief.md` - Memory bank sessioni
- `docs/archive/` - Fix storici (70+ file)

### Guide Operative
- `AVVIO_RAPIDO.md` - Quick start
- `GUIDA_DOCKER.md` - Docker setup
- `KITCHEN_LED_SYSTEM_COMPLETE.md` - LED reference
- `ESP32_INTEGRATION_GUIDE.md` - Hardware IoT

---

**🔄 Aggiorna questo file** quando:
1. Nuovi gap critici identificati
2. Metriche performance cambiano
3. Deployment procedure modificate
4. Test long-running completati

**✨ Ultimo Update**: 02/01/2026 - Initial Air-Gapped Audit

---

*"In un sistema air-gapped, il determinismo non è un lusso - è una necessità."*
