# 🎯 ESP32 Soggiorno - Session ID Automatico

## ✅ STATO ATTUALE: Sistema GIÀ Predisposto!

Il codice ESP32 soggiorno **HA GIÀ** tutto necessario per essere completamente automatico!

```cpp
// Nel setup():
session_id = fetchActiveSessionId();  // ← Fetch automatico!
```

**Non serve nessuna configurazione manuale!** 🎉

---

## 🔍 Problema Attuale: HTTP Error -1

```
❌ HTTP error: -1
🎯 Uso Session ID: 999 (fallback)
```

**Significato:** L'ESP32 **non riesce a raggiungere** il backend.

---

## 🛠️ Troubleshooting Step-by-Step

### ✅ STEP 1: Verifica Backend Attivo

```bash
# Controlla container Docker backend
docker ps | grep backend

# Output atteso:
# escape-room-3d-backend-1   Up 5 minutes   0.0.0.0:8001->8000/tcp
```

**Se backend NON è UP:**
```bash
cd escape-room-3d
docker-compose up -d backend
```

---

### ✅ STEP 2: Verifica IP Backend Corretto

**Nel codice ESP32 (soggiorno + cucina):**
```cpp
const char* backend_url = "http://192.168.1.10:8001";
```

**Trova IP reale del computer dove gira backend:**

```bash
# Mac/Linux:
ifconfig | grep "inet "

# Windows:
ipconfig

# Cerca l'IP sulla rete WiFi (es. 192.168.1.X)
```

**Test connessione da PC:**
```bash
curl http://192.168.1.10:8001/api/sessions/active

# Risposta OK:
# {"id": 1018, "pin": "1234", ...}

# Risposta ERROR:
# curl: (7) Failed to connect to 192.168.1.10 port 8001
```

**Se test fallisce** → IP backend è sbagliato! Aggiorna codice ESP32.

---

### ✅ STEP 3: Verifica WiFi ESP32 Connesso

**Nel Serial Monitor (115200 baud) dovresti vedere:**

```
📡 Connessione WiFi a: Vodafone-E23524170
.....
✅ WiFi connesso!
   IP: 192.168.1.25  ← IP assegnato a ESP32
   Backend: http://192.168.1.10:8001
```

**Se vedi "❌ WiFi NON connesso!":**
- Controlla SSID e password nel codice
- ESP32 supporta SOLO WiFi 2.4GHz (non 5GHz!)
- Avvicina ESP32 al router

---

### ✅ STEP 4: Test Connessione Completo

**Dal PC sulla stessa rete WiFi:**

```bash
# 1. Trova IP ESP32 (dal Serial Monitor, es. 192.168.1.25)

# 2. Verifica ESP32 raggiungibile
ping 192.168.1.25

# 3. Verifica backend raggiungibile DA ESP32
# (testa dalla stessa subnet/VLAN)
curl http://192.168.1.10:8001/api/sessions/active
```

**Possibili problemi:**
- **Firewall:** Blocca porta 8001
- **VLAN/Subnet diverse:** ESP32 e backend non si vedono
- **Router isolation:** AP isolation blocca client-to-client communication

---

### ✅ STEP 5: Crea Sessione Attiva di Test

```bash
# Entra nel database
docker exec -it escape-room-3d-postgres-1 psql -U escape_room -d escape_room_db

# Crea/Attiva sessione test
UPDATE game_sessions SET is_active = false;  -- Disattiva tutte
UPDATE game_sessions SET is_active = true WHERE id = 999;  -- Attiva 999

# Verifica
SELECT id, pin, is_active FROM game_sessions WHERE is_active = true;

# Esci
\q
```

**Riavvia ESP32** → Dovrebbe ricevere session_id 999!

---

## 🎯 Output Corretto (Quando Funziona)

```
=================================
ESP32 SOGGIORNO - SISTEMA COMPLETO
=================================

📌 Pin configurati:
   LED PORTA: P4 (verde), P16 (rosso)
   LED PIANTA: P17 (verde), P5 (rosso)
   LED CONDIZIONATORE: P18 (verde), P19 (rosso)
   TV: P32

📡 Connessione WiFi a: Vodafone-E23524170
.....
✅ WiFi connesso!
   IP: 192.168.1.25
   Backend: http://192.168.1.10:8001

🔍 Fetch Active Session ID...
📡 Fetch active session da: http://192.168.1.10:8001/api/sessions/active
📥 Response: {"id":1018,"pin":"1234","is_active":true,...}
✅ Active session ID: 1018
🎯 Uso Session ID: 1018

✅ Sistema pronto!

📊 ===== STATO SOGGIORNO =====
   🎯 Session ID: 1018  ← DINAMICO! ✨
   📡 WiFi: Connesso ✅
   🕒 Uptime: 15 secondi
   
   🚪 LED PORTA:
      Stato: red
   ...
```

---

## 🚀 Flusso Automatico (Una Volta Fixato)

### Scenario Normale:

```
┌─────────────────────────────────────────────┐
│  PARTITA 1 (Lunedì)                         │
├─────────────────────────────────────────────┤
│  1. Lobby crea session_id 1025              │
│     (marca is_active=true)                  │
│                                             │
│  2. ESP32 boot automatico                   │
│     ↓                                       │
│     fetchActiveSessionId()                  │
│     ↓                                       │
│     GET /api/sessions/active                │
│     ↓                                       │
│     Backend: {"id": 1025}                   │
│     ↓                                       │
│     ESP32 usa session_id = 1025! ✅         │
│                                             │
│  → Partita funziona con LED corretti!      │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│  PARTITA 2 (Martedì)                        │
├─────────────────────────────────────────────┤
│  1. Lobby crea session_id 1050              │
│     (marca is_active=true)                  │
│                                             │
│  2. ESP32 riavvia/reconnette                │
│     ↓                                       │
│     fetchActiveSessionId()                  │
│     ↓                                       │
│     Backend: {"id": 1050}                   │
│     ↓                                       │
│     ESP32 usa session_id = 1050! ✅         │
│                                             │
│  → Funziona AUTOMATICAMENTE!               │
│  → ZERO configurazione manuale! 🎉          │
└─────────────────────────────────────────────┘
```

---

## 🔧 Fix IP Backend (Se Necessario)

**Se IP backend cambiato (es. da 192.168.1.10 a 192.168.1.15):**

### Opzione A: Modifica Manuale

```cpp
// Nel file esp32-soggiorno-COMPLETO.ino
const char* backend_url = "http://192.168.1.15:8001";  // ← Nuovo IP

// Ricarica su ESP32
```

### Opzione B: IP Statico Backend (Raccomandato!)

**Nel router WiFi:**
1. Trova MAC address del computer backend
2. Assegna IP statico (es. sempre 192.168.1.10)
3. ESP32 funzionerà sempre!

### Opzione C: mDNS (Avanzato)

```cpp
// Usa hostname invece di IP
const char* backend_url = "http://escape-room.local:8001";

// Richiede:
// - mDNS abilitato su router
// - ESP32 library: <ESPmDNS.h>
```

---

## 📊 Confronto con Cucina

**Cucina** e **Soggiorno** usano **STESSO sistema**:

| Feature | Cucina | Soggiorno |
|---------|--------|-----------|
| fetchActiveSessionId() | ✅ | ✅ |
| backend_url | `192.168.1.10:8001` | `192.168.1.10:8001` |
| Sistema automatico | ✅ | ✅ |
| Fallback a 999 | ✅ | ✅ |

**Se cucina funziona, soggiorno DEVE funzionare!**

---

## ❓ FAQ

### Q: Devo cambiare session_id ogni partita?
**A:** NO! Il sistema è **completamente automatico**. ESP32 fetcha automaticamente la session attiva.

### Q: Cosa succede se creo session 1025 ma ESP32 usa 999?
**A:** Significa che:
1. Backend non raggiungibile (HTTP error -1)
2. ESP32 usa fallback 999
3. LED non si aggiornano correttamente

**Fix:** Risolvi connessione HTTP (vedi troubleshooting sopra)

### Q: Posso disabilitare fallback a 999?
**A:** Sì, ma NON raccomandato. Il fallback è utile per debug.

```cpp
int fetchActiveSessionId() {
  // ...
  if (httpCode != 200) {
    Serial.println("ERRORE FATALE: Nessuna sessione attiva!");
    while(1) { delay(1000); }  // Blocca ESP32
  }
  // ...
}
```

### Q: Quanto spesso ESP32 aggiorna session_id?
**A:** Solo al **boot/riavvio**. Durante partita usa lo stesso ID.

**Per cambiare session durante partita:**
- Riavvia ESP32 (pulsante RESET)
- ESP32 fetcherà nuovo ID automaticamente

---

## ✅ Checklist Pre-Produzione

- [ ] Backend Docker UP (`docker ps`)
- [ ] IP backend corretto nel codice
- [ ] Test `curl` da PC funziona
- [ ] ESP32 WiFi connesso (vedi Serial Monitor)
- [ ] ESP32 riceve session_id attivo (non 999)
- [ ] LED si aggiornano correttamente
- [ ] Test con session ID reale (non 999)
- [ ] Documentato IP backend per produzione

---

## 📞 Debug Rapido

**Se vedi HTTP error -1:**

```bash
# 1. Backend UP?
docker ps | grep backend

# 2. Backend raggiungibile?
curl http://192.168.1.10:8001/api/sessions/active

# 3. Sessione attiva esiste?
docker exec -it escape-room-3d-postgres-1 psql -U escape_room -d escape_room_db \
  -c "SELECT id, is_active FROM game_sessions WHERE is_active = true;"

# 4. ESP32 WiFi connesso?
# → Guarda Serial Monitor (115200 baud)
```

---

## 🎉 Conclusione

Il sistema ESP32 soggiorno è **GIÀ predisposto** per essere completamente automatico!

**Una volta risolta la connessione HTTP:**
- ✅ Session ID automatico
- ✅ Zero configurazione manuale
- ✅ Funziona per tutte le partite future
- ✅ LED si aggiornano correttamente

**Il problema non è nel codice, è solo nella connessione di rete!** 🚀

---

**Fine Guida** ✅
