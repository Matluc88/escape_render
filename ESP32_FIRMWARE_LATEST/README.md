# ESP32 FIRMWARE - COLLEZIONE AGGIORNATA
**Data creazione:** 24 Gennaio 2025  
**Progetto:** Escape Room Hardware Control

---

## 📋 CONTENUTO CARTELLA

Questa cartella contiene i firmware **più recenti e aggiornati** per tutti gli ESP32 dell'Escape Room:

| File | Stanza | Dimensione | Data Originale | Status |
|------|--------|------------|----------------|--------|
| `esp32-esterno-STABLE-CLOUD.ino` | ESTERNO | 17 KB | 24 Gen 2025 | ✅ **CLOUD-FIRST (FASE 1)** |
| `esp32-soggiorno-STABLE-CLOUD.ino` | SOGGIORNO | 18 KB | 24 Gen 2025 | ✅ **CLOUD-FIRST (FASE 2)** |
| `esp32-bagno-STABLE-CLOUD.ino` | BAGNO | 16 KB | 24 Gen 2025 | ✅ **CLOUD-FIRST (FASE 2)** |
| `esp32-cucina-STABLE-CLOUD.ino` | CUCINA | 22 KB | 24 Gen 2025 | ✅ **CLOUD-FIRST (FASE 2)** |
| | | | | |
| **[LEGACY - Raspberry-based]** | | | | |
| `esp32-bagno-LATEST.ino` | BAGNO | 16 KB | 18 Gen 2025 | ⚠️ Raspberry-based (OLD) |
| `esp32-soggiorno-LATEST.ino` | SOGGIORNO | 18 KB | 15 Gen 2025 | ⚠️ Raspberry-based (OLD) |
| `esp32-cucina-LATEST.ino` | CUCINA | 22 KB | 17 Gen 2025 | ⚠️ Raspberry-based (OLD) |
| `esp32-camera-LATEST.ino` | CAMERA | 1.7 KB | 3 Gen 2025 | ❌ Prototipo incompleto |

---

## 🎯 FIRMWARE CLOUD-FIRST - COMPLETATI (✅ FASE 1-2)

### `esp32-esterno-STABLE-CLOUD.ino`
**Status:** ✅ **FASE 1 COMPLETATA** (24 Gen 2025)

### `esp32-soggiorno-STABLE-CLOUD.ino`
**Status:** ✅ **FASE 2 COMPLETATA** (24 Gen 2025)

### `esp32-bagno-STABLE-CLOUD.ino`
**Status:** ✅ **FASE 2 COMPLETATA** (24 Gen 2025)

### `esp32-cucina-STABLE-CLOUD.ino`
**Status:** ✅ **FASE 2 COMPLETATA** (24 Gen 2025)

---

## 🌟 CARATTERISTICHE COMUNI (Tutti i firmware cloud-first)

**Tutti i 4 firmware cloud-first condividono:**
- ✅ **WiFiManager** - Captive portal per configurazione dinamica WiFi
- ✅ **HiveMQ Cloud MQTT** - Broker TLS su porta 8883
- ✅ **Triple Watchdog** - WiFi (120s), MQTT (180s), Hardware (120s)
- ✅ **Heartbeat System** - JSON payload ogni 30s
- ✅ **Last Will & Testament** - Status monitoring automatico
- ✅ **Remote Reset** - Via MQTT topic `device/esterno/cmd/reset`
- ✅ **NO IP hardcoded** - Nessuna dipendenza da Raspberry Pi locale

---

### Hardware Specifico per Stanza

#### ESTERNO:
- Sensore IR (cancello) - GPIO 19
- 2 LED bicolore (cancello + porta)
- RGB LED (effetto rainbow)
- 4 Servomotori (cancello + porta)

#### SOGGIORNO:
- LED PORTA bicolore (globale)
- LED TV 3-colori (verde/rosso/bianco)
- LED PIANTA e CONDIZIONATORE
- Sensore MAG1 (GPIO 33)
- Ventola (GPIO 26)
- Servo porta (GPIO 32)

#### BAGNO:
- LED PORTA bicolore (globale)
- LED SPECCHIO 3-colori (verde/rosso/bianco)
- LED PORTA-FINESTRA e VENTOLA
- Sensore MAG1 (GPIO 23)
- Servo porta bagno (GPIO 26) - con detach anti-jitter
- Servo finestra (GPIO 25) - con detach anti-jitter
- Ventola fisica (GPIO 32)

#### CUCINA:
- 4 LED bicolore (porta, fornelli, frigo, serra)
- 2 Sensori magnetici MAG1/MAG2 (GPIO 32/33)
- Servo frigo (GPIO 26)
- Strip LED serra (GPIO 23)
- Microfono con calibrazione adattiva (GPIO 34)

#### Documentazione Flash:
- **ESTERNO Flash Guide:** `/Users/matteo/Desktop/ESCAPE ESP32/RASBERRY/README_FLASH_ESTERNO.md`
- **Test Checklist FASE 1:** `/Users/matteo/Desktop/ESCAPE ESP32/RASBERRY/CHECKLIST_TEST_FASE1.md`
- **Guide FASE 2:** (da creare per SOGGIORNO, BAGNO, CUCINA)

---

## ⚠️ FIRMWARE ALTRE STANZE - RASPBERRY-BASED

### `esp32-bagno-LATEST.ino`
**Source:** `esp32_bagno_RASPBERRY_COMPLETE_FIXED.ino` (18 Gen 2025)

**Problemi noti:**
- IP hardcoded verso Raspberry Pi
- Nessun watchdog system
- Nessun heartbeat monitoring
- WiFi credentials hardcoded

**Hardware:**
- LED bianco (portafinestra)
- LED blu (porta)
- Timer vocale
- Servo (mag1)

---

### `esp32-soggiorno-LATEST.ino`
**Source:** `esp32-soggiorno-RASPBERRY-MAG1-BLINKING-FIX.ino` (15 Gen 2025)

**Fix applicati:**
- ✅ MAG1 LED blinking corretto
- ✅ Sensor debounce migliorato

**Problemi noti:**
- IP hardcoded verso Raspberry Pi
- Nessun watchdog system
- Nessun heartbeat monitoring

**Hardware:**
- Sensore magnetico MAG1
- LED porta
- Ventola (pin 26)
- Servo porta (pin 32)

---

### `esp32-cucina-LATEST.ino`
**Source:** `finito_cucina.ino` (17 Gen 2025)

**Problemi noti:**
- IP hardcoded verso Raspberry Pi
- Nessun watchdog system
- Nessun heartbeat monitoring
- Firmware più complesso (22 KB)

**Hardware:**
- LED pentola
- Sensori multipli (hot air system)
- Servo frigo
- Anta pentola

---

### `esp32-camera-LATEST.ino`
**Source:** `PROVA_CAMERA_1.ino` (3 Gen 2025)

⚠️ **ATTENZIONE:** Questo è un **prototipo molto vecchio** (1.7 KB).  
Probabilmente **incompleto** o non rappresentativo del firmware finale.

**Status:** ❌ Da verificare / ricostruire

---

## 🚀 PROSSIMI STEP - FASE 2-6 (Piano Stabilizzazione)

### FASE 2 - Conversione Firmware ✅ COMPLETATA
Applicare il template ESTERNO-STABLE-CLOUD agli altri 4 ESP32:
1. ✅ ESTERNO (completato FASE 1 - 24 Gen)
2. ✅ SOGGIORNO (completato FASE 2 - 24 Gen)
3. ✅ CUCINA (completato FASE 2 - 24 Gen)
4. ✅ BAGNO (completato FASE 2 - 24 Gen)
5. ⏳ CAMERA (necessario firmware completo - hardware non definito)

### FASE 3 - Admin Panel Web
- Dashboard monitoring devices
- Gestione sessioni remote
- Controllo LED/Servo via web
- Log heartbeat in tempo reale

### FASE 4 - Backend Session Manager
- API per assegnazione session_id dinamica
- MQTT session lifecycle
- Database sessioni attive

### FASE 5 - Test Integrazione
- Test tutti gli ESP32 cloud-first
- Verifica watchdog system
- Load testing MQTT

### FASE 6 - Deploy Produzione Render
- Deploy backend su Render.com
- Deploy admin panel
- Configurazione DNS/dominio
- Documentazione utente finale

---

## 📦 FILE ORIGINALI

I file originali si trovano in:
```
/Users/matteo/Desktop/ESCAPE ESP32/
├── RASBERRY/
│   ├── esp32-esterno-STABLE-CLOUD.ino ← NEW CLOUD-FIRST
│   ├── esp32_bagno_RASPBERRY_COMPLETE_FIXED/
│   ├── esp32-soggiorno-RASPBERRY-MAG1-BLINKING-FIX/
│   └── esp32-cucina-RASPBERRY.ino
├── CUCINA/finito_cucina/
├── BAGNO/esp32_bagno_RASPBERRY_COMPLETE/
└── CAMERA DA LETTO/PROVA_CAMERA_1/
```

---

## ⚙️ CONFIGURAZIONE HIVEMQ CLOUD

Per tutti i firmware cloud-first, configurare nel file .ino:

```cpp
const char* MQTT_SERVER = "your-cluster.hivemq.cloud";
const int   MQTT_PORT = 8883;
const char* MQTT_USER = "escape_device";
const char* MQTT_PASS = "your_password_here";
```

---

## 📝 NOTE IMPORTANTI

1. **ESTERNO è l'unico firmware cloud-ready** - Gli altri necessitano conversione
2. **CAMERA firmware è incompleto** - Serve analisi hardware e ricostruzione
3. **Tutti i firmware Raspberry-based hanno IP hardcoded** - Non funzionano senza Raspberry Pi locale
4. **WiFiManager richiede configurazione iniziale** - Captive portal al primo avvio
5. **Watchdog auto-restart funziona solo su firmware cloud** - Gli altri crashano senza recovery

---

## 🔗 RIFERIMENTI

- **Piano Completo:** Vedi documentazione FASE -1 → FASE 6
- **HiveMQ Cloud:** https://www.hivemq.com/mqtt-cloud-broker/
- **WiFiManager Lib:** https://github.com/tzapu/WiFiManager
- **PubSubClient:** https://github.com/knolleary/pubsubclient

---

**Ultimo aggiornamento:** 24 Gennaio 2025, 13:07  
**Autore:** Sistema di stabilizzazione Escape Room  
**Versione:** 2.0 - FASE 2 COMPLETATA (4/5 stanze cloud-ready)