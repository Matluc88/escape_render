# 🌐 ESP32 Setup Router Mango - Guida Completa

## 📋 Panoramica

Quando usi il **Router Mango** per l'evento, devi aggiornare 3 parametri su tutti gli ESP32:
1. **SSID WiFi** → Nome rete Mango
2. **Password WiFi** → Password Mango  
3. **Backend URL** → IP del Mac sulla rete Mango

---

## 🎯 Procedura Pre-Evento (10 minuti)

### Step 1: Accendi Router Mango 📡

1. Collega alimentazione Router Mango
2. Attendi che si avvii (LED stabile)

### Step 2: Trova Credenziali Mango 🔑

**Guarda etichetta sul Router Mango:**
```
SSID: GL-MT1300-XXX  (esempio)
Password: goodlife   (default)
```

📝 **Annota qui:**
- SSID: `_________________________`
- Password: `_________________________`

### Step 3: Connetti Mac al Mango 💻

1. **Preferenze di Sistema** → **Rete**
2. Seleziona WiFi: `GL-MT1300-XXX`
3. Inserisci password Mango
4. Attendi connessione ✅

### Step 4: Trova IP Mac sulla Rete Mango 🔍

Apri **Terminale** e digita:
```bash
ifconfig en0 | grep "inet "
```

**Output esempio:**
```
inet 192.168.8.100 netmask 0xffffff00 broadcast 192.168.8.255
```

📝 **Annota IP:** `192.168.8.___________`

---

## 🔧 Modifica ESP32 (Tutti e 5!)

### Dove Modificare

Apri **Arduino IDE** e carica uno alla volta:
- `esp32-esterno-COMPLETO.ino`
- `esp32-cucina-COMPLETO.ino`
- (+ altri 3 ESP32)

### Cosa Modificare

Cerca queste righe **all'inizio del file**:

```cpp
// ================= WIFI =================
const char* ssid     = "Vodafone-E23524170";  // ⬅️ CAMBIA QUI
const char* password = "JtnLtfg73NXgAt9r";    // ⬅️ CAMBIA QUI

// ================= BACKEND =================
const char* backend_url = "http://192.168.1.10:8001";  // ⬅️ CAMBIA QUI
```

**SOSTITUISCI CON:**

```cpp
// ================= WIFI =================
const char* ssid     = "GL-MT1300-XXX";       // ⬅️ IL TUO SSID MANGO
const char* password = "goodlife";            // ⬅️ PASSWORD MANGO

// ================= BACKEND =================
const char* backend_url = "http://192.168.8.100:8001";  // ⬅️ IP MAC SU MANGO
```

### Upload ESP32

1. Collega ESP32 via USB
2. **Tools** → **Board** → ESP32 Dev Module
3. **Tools** → **Port** → Seleziona porta corretta
4. Click **Upload** (→)
5. Attendi "Done uploading" ✅
6. Ripeti per tutti e 5 ESP32

---

## ✅ Verifica Funzionamento

### Test Connessione ESP32

1. Apri **Serial Monitor** (lente ingrandimento)
2. Imposta baud rate: **115200**
3. Premi reset su ESP32

**Output Corretto:**
```
📡 Connessione WiFi a: GL-MT1300-XXX
....
✅ WiFi connesso!
   IP: 192.168.8.xxx
   Backend: http://192.168.8.100:8001
🔍 Fetch Active Session ID...
✅ Active session ID: 1
🎯 Uso Session ID: 1
✅ Sistema pronto!
```

### Test Backend

Apri browser e vai a:
```
http://192.168.8.100:8001/docs
```

Se vedi la documentazione API → TUTTO FUNZIONA! 🎉

---

## 🔄 Dopo l'Evento (Ritorno a Casa)

Per tornare alla rete Vodafone:

```cpp
// ================= WIFI =================
const char* ssid     = "Vodafone-E23524170";
const char* password = "JtnLtfg73NXgAt9r";

// ================= BACKEND =================
const char* backend_url = "http://192.168.1.10:8001";
```

Re-upload su tutti gli ESP32.

---

## 📝 Checklist Pre-Evento

```
□ Router Mango acceso e funzionante
□ Annotato SSID Mango: __________
□ Annotato Password Mango: __________
□ Mac connesso al Mango
□ Trovato IP Mac su Mango: 192.168.8.___
□ Modificato ESP32 #1 (Esterno)
□ Modificato ESP32 #2 (Cucina)
□ Modificato ESP32 #3
□ Modificato ESP32 #4
□ Modificato ESP32 #5
□ Upload completato su tutti ESP32
□ Testato connessione ESP32 → Serial Monitor OK
□ Testato backend → http://IP:8001/docs OK
□ Docker avviato sul Mac
□ Test gioco funzionante
```

---

## 🚨 Troubleshooting

### ESP32 non si connette

**Problema:** `❌ WiFi NON connesso!`

**Soluzioni:**
1. Verifica SSID corretto (maiuscole/minuscole!)
2. Verifica password corretta
3. Controlla che Mac sia connesso a stesso Mango
4. Prova reset ESP32

### ESP32 si connette ma backend non risponde

**Problema:** `❌ HTTP error: -1`

**Soluzioni:**
1. Verifica IP Mac corretto: `ifconfig en0 | grep inet`
2. Verifica Docker avviato: `docker ps`
3. Verifica porta 8001 aperta
4. Test manuale: `curl http://192.168.8.100:8001/docs`

### Session ID non trovato

**Problema:** `⚠️ Nessuna sessione attiva, uso fallback: 999`

**Soluzione:**
- Crea sessione da Dashboard admin
- Oppure va bene 999 (sessione test)

---

## 💡 Pro Tips

✅ **Fai una prova 1 giorno prima** → Rilevi problemi con tempo
✅ **Tieni credenziali Mango su carta** → Backup se batteria smartphone scarica  
✅ **Foto schermata Serial Monitor** → Verifica rapida che tutto OK
✅ **Backup codice pre-modifica** → Copia cartella prima di cambiare

---

## 📞 Quick Reference

| Parametro | Sviluppo (Casa) | Evento (Mango) |
|-----------|-----------------|----------------|
| SSID | Vodafone-E23524170 | GL-MT1300-XXX |
| Password | JtnLtfg73NXgAt9r | goodlife |
| IP Subnet | 192.168.1.x | 192.168.8.x |
| Backend URL | http://192.168.1.10:8001 | http://192.168.8.100:8001 |

---

## ✨ Riepilogo

**Setup attuale = PERFETTO per sviluppo!**
- ✅ Session ID dinamico (già funziona!)
- ✅ Testato su rete Vodafone
- ✅ Codice stabile e robusto

**Pre-evento = Solo 3 modifiche!**
- 🔄 SSID → Mango
- 🔄 Password → Mango  
- 🔄 IP → Mac su Mango

**Tempo totale: 10 minuti** ⏱️

🎉 **Buon evento!**
