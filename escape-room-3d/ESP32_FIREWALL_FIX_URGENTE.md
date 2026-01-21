# 🔥 ESP32 Firewall Fix - URGENTE

## ⚠️ PROBLEMA IDENTIFICATO

**ESP32 non riesce a connettersi al bridge! Errore HTTP -11**

```
❌ HTTP error: -11
```

### 🔍 Diagnosi Completa

✅ Bridge Python: **ATTIVO** (porta 8002)
✅ ESP32 IP: **192.168.1.4**
✅ Mac IP: **192.168.1.6**
❌ Connessione: **BLOCCATA DA FIREWALL**

### 🧪 Test Conferma

```bash
# Da localhost (funziona)
curl localhost:8002/api/sessions/active  → ✅ {"detail":"Not Found"}

# Da IP di rete (TIMEOUT!)
curl 192.168.1.6:8002/api/sessions/active  → ❌ TIMEOUT
```

---

## 🛠️ SOLUZIONE: Sblocca Firewall macOS

### Metodo 1: GUI (Consigliato)

1. **Apri Impostazioni di Sistema**
2. **Rete → Firewall**
3. **Opzioni Firewall...**
4. **+ (Aggiungi Applicazione)**
5. Trova: `/usr/bin/python3`
6. **Consenti connessioni in entrata**
7. **OK**

### Metodo 2: Comando Terminale

```bash
# Aggiungi Python al firewall (richiede password admin)
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --add /usr/bin/python3
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --unblock /usr/bin/python3
```

### Metodo 3: Disabilita Firewall (Temporaneo)

⚠️ **Solo per test in rete locale sicura!**

```bash
# Disabilita firewall
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --setglobalstate off

# Testa ESP32...

# Riabilita dopo test
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --setglobalstate on
```

---

## ✅ VERIFICA FUNZIONAMENTO

### 1. Test da Terminale Mac

```bash
curl http://192.168.1.6:8002/api/sessions/active
```

**Risposta attesa:**
```json
{"detail":"Not Found"}
```

### 2. Test ESP32

Riavvia ESP32 e controlla Serial Monitor:

```
✅ WiFi connesso!
✅ Active session ID: 1021  ← FUNZIONA!
```

---

## 📋 Checklist Troubleshooting

- [x] Bridge attivo su porta 8002?
  ```bash
  lsof -i :8002 | grep LISTEN
  ```

- [x] Mac ha IP corretto?
  ```bash
  ifconfig | grep "inet " | grep -v 127.0.0.1
  ```

- [ ] **Firewall sblocca Python?**
  → **QUESTO È IL PROBLEMA!**

- [ ] Test connessione da IP rete:
  ```bash
  curl http://192.168.1.6:8002/api/sessions/active
  ```

---

## 🍓 Raspberry Pi

**NOTA:** Su Raspberry Pi (Linux) questo problema NON esiste!

Linux non ha firewall attivo di default, quindi:
- Docker espone porta 8001 direttamente
- ESP32 si connette senza bridge
- Nessuna configurazione firewall necessaria

---

## 🆘 Se Ancora Non Funziona

1. **Riavvia bridge:**
   ```bash
   cd /Users/matteo/Desktop/ESCAPE/escape-room-3d
   ./start-bridge.sh
   ```

2. **Verifica porta aperta:**
   ```bash
   nc -zv 192.168.1.6 8002
   ```

3. **Check logs bridge:**
   ```bash
   ps aux | grep ipv4-bridge
   ```

---

## 📖 Riferimenti

- `ipv4-bridge.py` - Bridge IPv4→localhost
- `start-bridge.sh` - Script avvio rapido
- `ESP32_IPV4_BRIDGE_SOLUTION.md` - Guida completa
