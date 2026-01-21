# 🔧 ESP32 - FIX IP BACKEND (192.168.1.10 → 192.168.1.6)

**Data fix:** 14 Gennaio 2026, ore 9:05  
**Problema risolto:** HTTP error -1 su ESP32 (IP backend errato)

---

## 📋 PROBLEMA IDENTIFICATO

### Root Cause
```
❌ IP HARDCODED ERRATO:
   ESP32 cercava backend su: 192.168.1.10:8001

✅ IP REALE BACKEND:
   Backend Docker gira su: 192.168.1.6:8001
   (verificato con: ifconfig | grep "inet ")
```

### Conseguenze
- ESP32 non riusciva a raggiungere backend
- HTTP GET restituiva error code: -1
- Session ID rimaneva fallback 999
- LED non sincronizzati con app web

---

## ✅ FILE MODIFICATI

### 1. `esp32-soggiorno-COMPLETO.ino`
```cpp
// ❌ PRIMA:
const char* backend_url = "http://192.168.1.10:8001";

// ✅ DOPO:
const char* backend_url = "http://192.168.1.6:8001";  // ✅ IP CORRETTO (ifconfig 2026-01-14)
```

### 2. `esp32-cucina-COMPLETO.ino`
```cpp
// ❌ PRIMA:
const char* backend_url = "http://192.168.1.10:8001";

// ✅ DOPO:
const char* backend_url = "http://192.168.1.6:8001";  // ✅ IP CORRETTO (ifconfig 2026-01-14)
```

---

## 📤 COME RICARICARE IL CODICE SUGLI ESP32

### Passo 1: Apri Arduino IDE
```bash
# Assicurati di avere Arduino IDE installato
# con supporto ESP32 configurato
```

### Passo 2: Carica ESP32 Soggiorno
1. **Apri file:** `escape-room-3d/esp32-soggiorno-COMPLETO.ino`
2. **Seleziona board:** Tools → Board → ESP32 Dev Module
3. **Seleziona porta:** Tools → Port → /dev/cu.usbserial-XXXX
4. **Carica:** Sketch → Upload (o CTRL+U / CMD+U)
5. **Attendi:** "Done uploading" ✅

### Passo 3: Carica ESP32 Cucina
1. **Apri file:** `escape-room-3d/esp32-cucina-COMPLETO.ino`
2. **Seleziona board:** Tools → Board → ESP32 Dev Module
3. **Seleziona porta:** Tools → Port → /dev/cu.usbserial-XXXX
4. **Carica:** Sketch → Upload (o CTRL+U / CMD+U)
5. **Attendi:** "Done uploading" ✅

### Passo 4: Test Connessione Backend

**Apri Serial Monitor (115200 baud) e controlla:**

```
✅ OUTPUT ATTESO (SUCCESSO):

ESP32 SOGGIORNO - SISTEMA COMPLETO
=================================

📌 Pin configurati:
   LED PORTA: P4 (verde), P16 (rosso)
   ...

📡 Connessione WiFi a: Vodafone-E23524170
..........
✅ WiFi connesso!
   IP: 192.168.1.25
   Backend: http://192.168.1.6:8001  ← ✅ IP CORRETTO!

🔍 Fetch Active Session ID...
📡 Fetch active session da: http://192.168.1.6:8001/api/sessions/active
📥 Response: {"id":1021,"is_active":true, ...}
✅ Active session ID: 1021  ← ✅ FETCHATO CORRETTAMENTE!

🎯 Uso Session ID: 1021  ← ✅ NON PIÙ 999!

🔄 Fetch stati iniziali...
...
✅ Sistema pronto!
```

---

## 🎯 COMPORTAMENTO ATTESO DOPO IL FIX

### Prima (CON BUG ❌)
```
WiFi connesso ✅
Backend: http://192.168.1.10:8001  ← IP SBAGLIATO!
HTTP error: -1  ← FALLIMENTO!
⚠️ Uso session_id fallback: 999
```

### Dopo (FIX ✅)
```
WiFi connesso ✅
Backend: http://192.168.1.6:8001  ← IP CORRETTO!
HTTP 200 OK  ← SUCCESSO!
✅ Active session ID: 1021  ← FETCHATO DAL BACKEND!
```

---

## 🚀 TEST FINALE

### 1. Backend Attivo
```bash
cd /Users/matteo/Desktop/ESCAPE/escape-room-3d
docker-compose ps

# Output atteso:
# escape-backend   Up   0.0.0.0:8001->8001/tcp
# ✅ Backend in ascolto sulla porta 8001
```

### 2. Session Attiva
```bash
# Crea una nuova sessione nell'app web
# oppure verifica session esistente:

curl http://192.168.1.6:8001/api/sessions/active

# Output atteso:
# {"id":1021,"is_active":true, ...}
```

### 3. ESP32 Connessi
**Serial Monitor dovrebbe mostrare:**
```
🎯 Uso Session ID: 1021  ← Stesso ID dell'app web!
📊 Polling LED stato...
.  ← Polling OK (no errori HTTP)
```

### 4. LED Sincronizzati
**Test completo:**
1. Apri app web → Completa un puzzle in una stanza
2. LED ESP32 nella stessa stanza dovrebbe cambiare colore!
3. ✅ Se LED si aggiorna = sincronizzazione funzionante!

---

## ⚠️ NOTA IMPORTANTE: IP STATICO

### Problema Potenziale
```
L'IP 192.168.1.6 è assegnato via DHCP
→ Potrebbe CAMBIARE dopo riavvio del Mac!
→ ESP32 non riuscirebbe più a connettersi
```

### Soluzione Raccomandata
**Configura IP statico nel router:**

1. Accedi al router: `http://192.168.1.1`
2. Trova sezione: "DHCP Reservation" o "Static IP"
3. Aggiungi regola:
   - **MAC Address:** (MAC del tuo Mac - vedi `ifconfig`)
   - **IP Reserved:** 192.168.1.6
   - **Salva**

**Verifica MAC address:**
```bash
ifconfig en0 | grep ether
# Output: ether aa:bb:cc:dd:ee:ff
```

**Alternativa:** Modifica IP ESP32 ogni volta che cambia IP Mac
```cpp
// Se IP Mac diventa 192.168.1.7:
const char* backend_url = "http://192.168.1.7:8001";
```

---

## 📁 FILE BACKUP (Prima del Fix)

Se serve ripristinare versione precedente:
```bash
# Gli IP vecchi erano:
# - esp32-soggiorno-COMPLETO.ino → 192.168.1.10
# - esp32-cucina-COMPLETO.ino → 192.168.1.10
```

---

## ✅ CHECKLIST COMPLETA

- [x] Identificato IP reale backend: 192.168.1.6
- [x] Modificato `esp32-soggiorno-COMPLETO.ino`
- [x] Modificato `esp32-cucina-COMPLETO.ino`
- [ ] ⏳ Caricato codice su ESP32 Soggiorno (Arduino IDE)
- [ ] ⏳ Caricato codice su ESP32 Cucina (Arduino IDE)
- [ ] ⏳ Verificato Serial Monitor (session ID fetchato)
- [ ] ⏳ Test LED sincronizzati con app web
- [ ] 🎯 (Opzionale) Configurato IP statico nel router

---

## 🎉 RISULTATO FINALE ATTESO

```
╔════════════════════════════════════════╗
║  ESP32 SOGGIORNO & CUCINA              ║
║  ✅ Connessi a Backend: 192.168.1.6    ║
║  ✅ Session ID: 1021 (auto-fetchato)   ║
║  ✅ LED sincronizzati con app web      ║
║  🎯 Sistema PIENAMENTE OPERATIVO!     ║
╚════════════════════════════════════════╝
```

**Buon divertimento con l'Escape Room! 🎮🚪**
