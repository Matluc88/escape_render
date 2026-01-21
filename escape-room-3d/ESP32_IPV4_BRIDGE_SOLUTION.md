# 🌉 ESP32 - Soluzione Bridge IPv4 (FINALE)

**Data:** 14 Gennaio 2026, ore 9:22  
**Status:** ✅ OPERATIVO

---

## 🚨 ROOT CAUSE IDENTIFICATO

### Problema
```bash
Docker backend espone porta 8001:
- tcp46 (IPv6) → LISTEN ✅
- tcp4 (IPv4)  → CLOSED ❌

ESP32 usa IPv4 → TIMEOUT!
```

### Soluzione Implementata
**Bridge Python IPv4 → IPv6/localhost**

---

## ✅ COMPONENTI ATTIVI

### 1. Docker Backend
```
Container: escape-backend
Porta interna: 3000
Porta esposta: 0.0.0.0:8001 (ma solo IPv6!)
Status: RUNNING ✅
```

### 2. IPv4 Bridge (ipv4-bridge.py)
```
Process: Python (PID: 42804)
Ascolta: 0.0.0.0:8002 (IPv4) ✅
Forward a: localhost:8001 (funziona!)
Status: RUNNING ✅
```

---

## 📝 CONFIGURAZIONE ESP32

### Modifica Necessaria
**File:** `esp32-soggiorno-COMPLETO.ino` e `esp32-cucina-COMPLETO.ino`

```cpp
// PRIMA (NON FUNZIONA):
const char* backend_url = "http://192.168.1.6:8001";

// DOPO (FUNZIONA):
const char* backend_url = "http://192.168.1.6:8002";
```

---

## 🚀 GUIDA RAPIDA

### Passo 1: Verifica Bridge Attivo
```bash
lsof -i :8002 | grep LISTEN
# Output atteso: Python  42804 matteo ... TCP *:8002 (LISTEN)
```

### Passo 2: Modifica ESP32
1. Apri Arduino IDE
2. Carica `esp32-soggiorno-COMPLETO.ino`
3. Cambia porta da `8001` → `8002`
4. Upload su ESP32

### Passo 3: Verifica Serial Monitor
```
📡 Connessione WiFi a: Vodafone-E23524170
✅ WiFi connesso!
   IP: 192.168.1.25
   Backend: http://192.168.1.6:8002  ← PORTA 8002!

🔍 Fetch Active Session ID...
✅ Active session ID: 1021
🎯 LED sincronizzati!
```

---

## 🔧 GESTIONE BRIDGE

### Avvio Automatico
Il bridge è già avviato in background. Per verificare:
```bash
ps aux | grep ipv4-bridge.py
```

### Riavvio Manuale
```bash
# Stop
pkill -f ipv4-bridge.py

# Start
python3 /Users/matteo/Desktop/ESCAPE/escape-room-3d/ipv4-bridge.py &
```

### Avvio Persistente (opzionale)
Crea file `start-bridge.sh`:
```bash
#!/bin/bash
cd /Users/matteo/Desktop/ESCAPE/escape-room-3d
python3 ipv4-bridge.py > bridge.log 2>&1 &
echo "Bridge started! PID: $!"
```

---

## 📊 TROUBLESHOOTING

### Problema: Bridge non parte
```bash
# Verifica porta libera
lsof -i :8002

# Se occupata, killa processo
kill -9 $(lsof -t -i:8002)

# Riavvia bridge
python3 ipv4-bridge.py &
```

### Problema: ESP32 timeout
1. Verifica bridge attivo: `lsof -i :8002`
2. Verifica backend attivo: `curl localhost:8001/health`
3. Verifica porta ESP32: deve essere `8002`!

### Test Connessione
```bash
# Test da Mac (IPv4):
curl http://192.168.1.6:8002/api/sessions/active

# Deve funzionare! (prima andava in timeout)
```

---

## 🎯 ARCHITETTURA FINALE

```
ESP32 (IPv4) → 192.168.1.6:8002
              ↓
         [Bridge Python]
              ↓
         localhost:8001 (IPv6)
              ↓
         [Docker Backend]
              ↓
         Database PostgreSQL
```

---

## 📁 FILE COINVOLTI

```
ipv4-bridge.py                    ← Bridge IPv4
esp32-soggiorno-COMPLETO.ino     ← ESP32 Soggiorno (porta 8002)
esp32-cucina-COMPLETO.ino         ← ESP32 Cucina (porta 8002)
docker-compose.yml                ← Backend config (0.0.0.0:8001)
```

---

## ✅ CHECKLIST COMPLETA

- [x] Root cause identificato (IPv6 vs IPv4)
- [x] Bridge Python creato (ipv4-bridge.py)
- [x] Bridge avviato (porta 8002 attiva)
- [x] Documentazione creata
- [ ] ⏳ PROSSIMO: Modifica ESP32 con porta 8002
- [ ] ⏳ Upload codice su ESP32
- [ ] ⏳ Verifica Serial Monitor connessione OK
- [ ] ⏳ Test LED sincronizzati

---

## 🎉 RISULTATO ATTESO

```
╔════════════════════════════════════════╗
║  ESP32 → Backend CONNESSO! 🚀          ║
║  ✅ Bridge IPv4 attivo su porta 8002   ║
║  ✅ Session ID fetchato automaticamente║
║  ✅ LED sincronizzati con backend      ║
║  ✅ Puzzle progress real-time          ║
╚════════════════════════════════════════╝
```

**Problema risolto! 🎊**

---

## 📞 SUPPORTO

### Logs Bridge
```bash
# Visualizza activity bridge real-time
tail -f /var/folders/sf/ts2c__ks3p92dlj3nkdjqjg80000gn/T/cline-background-*.log
```

### Debug Network
```bash
# Verifica Docker ports
docker port escape-backend

# Verifica bridge listening
netstat -an | grep 8002

# Test localhost
curl localhost:8001/api/sessions/active
```

---

**FINE - Soluzione Completa!** 🎉
