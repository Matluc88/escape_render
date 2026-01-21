# 🔧 ESP32 - FIX CONNESSIONE RETE LOCALE (SOLUZIONE FINALE)

**Data:** 14 Gennaio 2026, ore 9:18  
**Problema:** ESP32 non raggiunge backend Docker su 192.168.1.6:8001

---

## 🚨 ROOT CAUSE - PROBLEMA IDENTIFICATO

```
Docker backend risponde su: localhost:8001 ✅
Docker backend NON risponde su: 192.168.1.6:8001 ❌

CAUSA: macOS Firewall blocca connessioni in ingresso sulla rete locale!
```

### Test Effettuati
```bash
# ✅ FUNZIONA (localhost):
curl http://localhost:8001/api/sessions/active
→ HTTP 404 (endpoint esiste, backend raggiungibile)

# ❌ TIMEOUT (rete locale):
curl http://192.168.1.6:8001/api/sessions/active
→ Timeout dopo 30 secondi (firewall blocca!)
```

---

## ✅ SOLUZIONE 1: Disabilita Firewall macOS (TEMPORANEO)

### Passo 1: Apri Impostazioni Sistema
```
System Settings → Network → Firewall
```

### Passo 2: Disattiva Temporaneamente
- Click su "Turn Off"  
- ⚠️ **ATTENZIONE:** Riattivalo dopo i test!

### Passo 3: Test Backend
```bash
curl http://192.168.1.6:8001/api/sessions/active
```

Se funziona → ESP32 dovrebbe connettersi! ✅

---

## ✅ SOLUZIONE 2: Aggiungi Eccezione Firewall (PERMANENTE)

### Passo 1: Apri Preferenze Firewall
```
System Settings → Network → Firewall → Options
```

### Passo 2: Aggiungi Docker come Eccezione
1. Click su "+"
2. Cerca: `/Applications/Docker.app`
3. Seleziona: "Allow incoming connections"
4. Click "OK"

### Passo 3: Aggiungi Porta 8001
Se Docker non appare, usa terminale:
```bash
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --add /Applications/Docker.app
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --unblockapp /Applications/Docker.app
```

### Passo 4: Verifica
```bash
curl http://192.168.1.6:8001/api/sessions/active
```

---

## ✅ SOLUZIONE 3: Port Forwarding via socat (ALTERNATIVA)

Se le soluzioni precedenti non funzionano, usa socat per creare un bridge:

```bash
# Install socat (se non installato):
brew install socat

# Forward porta 8001 da localhost a tutte le interfacce:
socat TCP4-LISTEN:8002,bind=0.0.0.0,fork TCP4:localhost:8001
```

Poi modifica ESP32 per usare porta 8002:
```cpp
const char* backend_url = "http://192.168.1.6:8002";
```

---

## 🎯 TEST FINALE ESP32

Dopo aver applicato una delle soluzioni, **riavvia l'ESP32** e controlla il Serial Monitor:

### Output Atteso (SUCCESSO):
```
📡 Connessione WiFi a: Vodafone-E23524170
✅ WiFi connesso!
   IP: 192.168.1.25
   Backend: http://192.168.1.6:8001

🔍 Fetch Active Session ID...
📡 Fetch active session da: http://192.168.1.6:8001/api/sessions/active
📥 Response: {"id":1021,...}
✅ Active session ID: 1021  ← ✅ FUNZIONA!

🎯 Uso Session ID: 1021
```

---

## 📋 CHECKLIST COMPLETA

- [x] Identificato problema: Firewall macOS blocca rete locale
- [x] Modificato docker-compose.yml (0.0.0.0:8001)
- [x] Riavviato container backend
- [ ] ⏳ PROSSIMO PASSO: Disabilita Firewall o aggiungi eccezione
- [ ] ⏳ Riavvia ESP32
- [ ] ⏳ Verifica Serial Monitor (session ID fetchato)
- [ ] ⏳ Test LED sincronizzati

---

## 🔥 QUICK FIX (FASTEST)

**Disabilita temporaneamente il Firewall per test rapidi:**

1. System Settings → Network → Firewall → **Turn Off**
2. Riavvia ESP32
3. Verifica Serial Monitor
4. **RICORDA** di riattivare il Firewall dopo i test!

---

## 🎉 RISULTATO ATTESO

```
╔════════════════════════════════════════╗
║  ESP32 → Backend Network OK!           ║
║  ✅ Firewall configurato correttamente ║
║  ✅ ESP32 raggiunge 192.168.1.6:8001  ║
║  ✅ Session ID auto-fetchato           ║
║  ✅ LED sincronizzati!                 ║
╚════════════════════════════════════════╝
```

**Problema risolto! 🚀**
