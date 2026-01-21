# 🎨 ESP32 ESTERNO - FIX RGB STRIP

## 📋 Problema
La strip RGB non si accende quando `gameWon=true` durante la vittoria del gioco.

## ✅ Soluzioni Create

### 1. **esp32-esterno-RASPBERRY-DEBUG.ino**
Versione con debug completo per diagnosticare il problema.

**Features:**
- 🐛 Stampe dettagliate MQTT (topic + payload)
- 🐛 Contatore chiamate callback
- 🐛 Stato `gameWon` ogni 3 secondi
- 🐛 Valori RGB quando vengono scritti
- ✅ Pin corretto: SERVO_TETTO su P14
- ✅ Velocità RGB: 300ms per vedere meglio i cambi

**Quando usarla:**
- Per verificare se il messaggio MQTT arriva
- Per debuggare problemi di connessione
- Per vedere esattamente cosa riceve l'ESP32

---

### 2. **esp32-esterno-RASPBERRY-FIXED.ino**
Versione finale pulita e ottimizzata.

**Features:**
- ✅ Pin corretto: SERVO_TETTO su P14
- ✅ Velocità RGB: 250ms (visibile ma non troppo veloce)
- ✅ Logica if-else corretta
- ✅ Stampe seriali essenziali
- ✅ Codice pulito e commentato

**Quando usarla:**
- Versione finale per produzione
- Dopo aver verificato con la versione DEBUG

---

## 🧪 Procedura di Test

### **Step 1: Test con Versione DEBUG**

1. **Upload del codice DEBUG:**
   ```bash
   # Apri Arduino IDE
   # Carica: esp32-esterno-RASPBERRY-DEBUG.ino
   # Upload su ESP32
   ```

2. **Apri Serial Monitor (115200 baud):**
   - Dovresti vedere:
   ```
   ╔════════════════════════════════════╗
   ║  ESP32 ESTERNO - DEBUG VERSION    ║
   ╚════════════════════════════════════╝
   📡 WiFi: escape
   ✅ WiFi connesso
   IP: 192.168.8.xxx
   🔍 Fetch session...
   ✅ Session ID fetched: 1
   🎯 Session ID: 1
   🔌 MQTT... OK
   📢 Subscribed to: escape/game-completion/won
   ✅ ESP32 ESTERNO DEBUG PRONTO
   🐛 Waiting for MQTT messages...
   ```

3. **Verifica status periodico:**
   - Ogni 3 secondi vedrai:
   ```
   📊 Status: gameWon=FALSE ❌ | MQTT calls=0 | gameWon activations=0 | IR=LIBERO
   ```

4. **Vinci il gioco:**
   - Completa tutte le stanze
   - Sul Serial Monitor dovresti vedere:
   ```
   ════════════════════════════════
   🐛 MQTT [#1]
      Topic: escape/game-completion/won
      Payload: [true]
      Length: 4
   🏆🎊 GAME WON ATTIVATO! 🎊🏆
      gameWon: TRUE ✅
   ════════════════════════════════
   ```

5. **Verifica RGB:**
   - Se `gameWon=TRUE`, vedrai:
   ```
   🎨 RGB Step 6: R=255 G=0 B=0
   🎨 RGB Step 12: R=255 G=0 B=0
   ...
   ```
   - La strip dovrebbe ciclare: ROSSO → VERDE → BLU → GIALLO → MAGENTA → CIANO

---

### **Step 2: Interpretazione Risultati**

#### ✅ **Caso A: Messaggio MQTT arriva e RGB funziona**
```
🏆🎊 GAME WON ATTIVATO! 🎊🏆
🎨 RGB Step 6: R=255 G=0 B=0
```
→ **Tutto OK!** Passa alla versione FIXED.

---

#### ❌ **Caso B: Messaggio MQTT NON arriva**
```
📊 Status: gameWon=FALSE ❌ | MQTT calls=0 | gameWon activations=0
```
→ **Problema: Backend non pubblica MQTT**

**Fix:**
1. Verifica che il backend pubblichi su `escape/game-completion/won`
2. Testa manualmente con:
   ```bash
   mosquitto_pub -h 192.168.8.10 -t "escape/game-completion/won" -m "true"
   ```
3. Dovresti vedere l'ESP32 ricevere il messaggio

---

#### ❌ **Caso C: MQTT arriva ma RGB non funziona**
```
🏆🎊 GAME WON ATTIVATO! 🎊🏆
   gameWon: TRUE ✅
📊 Status: gameWon=TRUE ✅ | MQTT calls=1 | gameWon activations=1
(ma RGB rimane spento)
```
→ **Problema: Hardware RGB o cablaggio**

**Fix:**
1. Testa la strip con codice base:
   ```cpp
   void setup() {
     pinMode(21, OUTPUT);
     pinMode(22, OUTPUT);
     pinMode(23, OUTPUT);
     analogWrite(21, 255); // ROSSO acceso
     analogWrite(22, 0);
     analogWrite(23, 0);
   }
   void loop() {}
   ```
2. Verifica:
   - Pin 21, 22, 23 collegati correttamente
   - Alimentazione strip RGB
   - Ground comune

---

### **Step 3: Deploy Versione FIXED**

Una volta verificato che tutto funziona con la versione DEBUG:

1. **Upload versione FIXED:**
   ```bash
   # Apri Arduino IDE
   # Carica: esp32-esterno-RASPBERRY-FIXED.ino
   # Upload su ESP32
   ```

2. **Test finale:**
   - Vinci il gioco
   - Verifica che la strip RGB cicla i colori
   - Dovresti vedere sul Serial Monitor:
   ```
   🏆 GAME WON: SI
   ```

---

## 🔧 Test Manuale MQTT

Se vuoi testare senza vincere il gioco:

```bash
# Connettiti al Raspberry Pi
ssh ubuntu@192.168.8.10

# Pubblica manualmente il messaggio
mosquitto_pub -h 192.168.8.10 -t "escape/game-completion/won" -m "true"

# Per resettare
mosquitto_pub -h 192.168.8.10 -t "escape/game-completion/won" -m "false"
```

---

## 📝 Differenze Tra Versioni

| Feature | DEBUG | FIXED | ORIGINALE |
|---------|-------|-------|-----------|
| SERVO_TETTO Pin | ✅ P14 | ✅ P14 | ❌ P32 |
| MQTT Debug | ✅ Completo | ⚠️ Base | ⚠️ Base |
| RGB Timing | 300ms | 250ms | 120ms |
| Status periodico | ✅ Ogni 3s | ❌ No | ❌ No |
| Contatori MQTT | ✅ Sì | ❌ No | ❌ No |
| Stampe RGB | ✅ Dettagliate | ❌ No | ❌ No |

---

## 🚀 Quick Start

**Per DEBUG rapido:**
```bash
1. Upload: esp32-esterno-RASPBERRY-DEBUG.ino
2. Serial Monitor (115200 baud)
3. Vinci il gioco
4. Controlla se vedi: 🏆🎊 GAME WON ATTIVATO! 🎊🏆
```

**Per Produzione:**
```bash
1. Upload: esp32-esterno-RASPBERRY-FIXED.ino
2. Test vittoria
3. Verifica RGB funziona
```

---

## 🐛 Troubleshooting

### RGB non si accende mai
1. Testa hardware con codice base (vedi sopra)
2. Verifica alimentazione strip
3. Controlla cablaggio pin 21, 22, 23

### MQTT non arriva
1. Verifica backend pubblica su topic corretto
2. Testa con `mosquitto_pub` manualmente
3. Controlla firewall Raspberry Pi

### RGB troppo veloce/lento
Modifica nel codice:
```cpp
if (now - tRGB >= 250) {  // <-- Cambia questo valore
  // 100ms = molto veloce
  // 500ms = lento
  // 250ms = default
}
```

---

## ✅ Checklist Finale

- [ ] Upload versione DEBUG
- [ ] Serial Monitor aperto (115200)
- [ ] Vinto il gioco
- [ ] Visto messaggio `🏆🎊 GAME WON ATTIVATO!`
- [ ] RGB cicla i colori
- [ ] Upload versione FIXED
- [ ] Test finale produzione
- [ ] RGB funziona correttamente

---

**Creato:** 17/01/2026  
**Versione:** 1.0  
**Fix:** RGB strip non parte quando gameWon=true