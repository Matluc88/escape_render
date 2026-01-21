# 🎮 Guida Test Animazione Cancello ESP32 + Frontend

## 📋 Problema

L'animazione del cancello nella scena esterno **non parte** quando liberi la fotocellula ESP32, anche se:
- ✅ ESP32 funziona e pubblica su MQTT
- ✅ L'animazione funziona con tasto K (bypass)

**Causa probabile:** Frontend non riceve messaggi MQTT dall'ESP32 (WebSocket non configurato)

---

## 🚀 Soluzione Rapida

### Step 1: Copia Script sul Raspberry

```bash
# Sul tuo Mac, copia gli script sul Raspberry
scp check_mosquitto_esterno.sh pi@192.168.8.10:~/
scp fix_mosquitto_config.sh pi@192.168.8.10:~/
```

### Step 2: Connettiti al Raspberry

```bash
ssh pi@192.168.8.10
```

### Step 3: Esegui Verifica

```bash
# Rendi eseguibile
chmod +x check_mosquitto_esterno.sh

# Esegui verifica
bash check_mosquitto_esterno.sh
```

**Output atteso:**

Se tutto è OK:
```
🎉 TUTTO OK! Sistema funzionante
```

Se ci sono problemi:
```
❌ X errori trovati!

🔧 SOLUZIONI:
2. Configura WebSocket su porta 9001:
   Vedi file: fix_mosquitto_config.sh
```

### Step 4: Applica Fix (se necessario)

```bash
# Rendi eseguibile
chmod +x fix_mosquitto_config.sh

# Esegui fix
bash fix_mosquitto_config.sh
```

Questo script:
1. ✅ Fa backup configurazione attuale
2. ✅ Crea nuova config con WebSocket
3. ✅ Riavvia Mosquitto
4. ✅ Verifica che funzioni

### Step 5: Test Finale

1. **Ricarica pagina browser** (Ctrl+F5)
2. **Libera fotocellula ESP32**
3. **L'animazione dovrebbe partire!** 🎉

---

## 🔍 Cosa Controllano gli Script

### `check_mosquitto_esterno.sh`

Verifica:
- ✅ Docker containers (Mosquitto, Backend, Frontend)
- ✅ Porte aperte (1883 MQTT, 9001 WebSocket)
- ✅ Configurazione Mosquitto (listener, protocol)
- ✅ Messaggi ESP32 (ascolto per 5 secondi)
- ✅ Info sistema (IP Raspberry, ESP32)

### `fix_mosquitto_config.sh`

Corregge:
- 🔧 Crea configurazione corretta con WebSocket
- 🔧 Riavvia Mosquitto con nuova config
- 🔧 Verifica che porte siano aperte
- 🔧 Mostra log per debug

---

## 📊 Diagnosi Dettagliata

### Se WebSocket NON è configurato

**Sintomi:**
```
❌ Porta 9001 (WebSocket): CHIUSA
❌ Listener 9001 NON configurato
❌ Protocol WebSocket NON configurato
```

**Soluzione:**
```bash
bash fix_mosquitto_config.sh
```

### Se ESP32 NON pubblica

**Sintomi:**
```
⚠️ Nessun messaggio ricevuto da ESP32
```

**Possibili cause:**
1. ESP32 non connesso al WiFi
2. IP backend errato in ESP32
3. Mosquitto non in ascolto su porta 1883

**Verifica ESP32:**
- Apri Serial Monitor (115200 baud)
- Cerca: `✅ WiFi connesso!`
- Cerca: `📤 POST photocell: LIBERA`

---

## 🎯 Test Manuale WebSocket

Se vuoi testare manualmente la connessione WebSocket dal browser:

```javascript
// Apri Console Browser (F12)
const ws = new WebSocket('ws://localhost:9001');

ws.onopen = () => console.log('✅ WebSocket connesso!');
ws.onerror = (err) => console.error('❌ WebSocket errore:', err);

// Dovrebbe stampare: ✅ WebSocket connesso!
```

---

## 📁 Struttura File

```
ESCAPE/
├── check_mosquitto_esterno.sh    # Script verifica
├── fix_mosquitto_config.sh       # Script fix
└── README_MQTT_ESTERNO.md        # Questa guida
```

---

## 🐛 Troubleshooting

### Problema: Script non si avvia

**Errore:**
```
bash: check_mosquitto_esterno.sh: Permission denied
```

**Soluzione:**
```bash
chmod +x check_mosquitto_esterno.sh
chmod +x fix_mosquitto_config.sh
```

---

### Problema: "Directory escape-room-3d non trovata"

**Causa:** Script eseguito dalla directory sbagliata

**Soluzione:**
```bash
# Vai nella directory giusta
cd ~/escape-room-3d/..

# Oppure specifica path
cd /home/pi/progetti/escape-room/

# Poi esegui script
bash check_mosquitto_esterno.sh
```

---

### Problema: Porta 9001 ancora chiusa dopo fix

**Causa:** Mosquitto non è ripartito correttamente

**Soluzione:**
```bash
# Riavvia manualmente
docker-compose restart mosquitto

# Attendi 5 secondi
sleep 5

# Verifica
docker logs mosquitto
```

Dovresti vedere:
```
Opening ipv4 listen socket on port 1883
Opening websockets listen socket on port 9001
```

---

## ✅ Checklist Completa

Segui questa checklist per verificare tutto:

- [ ] Script copiati sul Raspberry
- [ ] `check_mosquitto_esterno.sh` eseguito
- [ ] Eventuali errori risolti con `fix_mosquitto_config.sh`
- [ ] Porta 1883 aperta (ESP32)
- [ ] Porta 9001 aperta (Frontend WebSocket)
- [ ] ESP32 pubblica messaggi (visible in check script)
- [ ] Frontend connesso a MQTT (console browser)
- [ ] Fotocellula libera
- [ ] Animazione cancello parte! 🎉

---

## 📞 Supporto

Se dopo aver eseguito tutti gli step l'animazione ancora non parte:

1. **Copia output di `check_mosquitto_esterno.sh`**
2. **Copia console browser** (F12 → Console → filtra "mqtt")
3. **Copia Serial Monitor ESP32**

Con queste 3 informazioni posso identificare il problema esatto!

---

**Fine Guida** 🎉