# 🎤 Microfono Non Rileva - Debug Rapido

## 🚨 Problema
Grido ma ESP32 non rileva nulla → serra non si attiva

---

## 🔧 Step 1: Test Hardware (OBBLIGATORIO)

### Carica sketch di test
**File**: `esp32-cucina-TEST-MICROFONO.ino`

```
1. Apri Arduino IDE
2. Carica esp32-cucina-TEST-MICROFONO.ino su ESP32
3. Apri Serial Monitor (115200 baud)
```

### Cosa aspettarsi

**Silenzio:**
```
Sound: 50   |█
Sound: 48   |█
Sound: 52   |█
```

**Parla/Grida vicino al microfono:**
```
Sound: 850  |█████████████████ << SOPRA SOGLIA!
Sound: 920  |██████████████████ << SOPRA SOGLIA!
Sound: 1100 |██████████████████ << SOPRA SOGLIA!
```

---

## 🐛 Diagnosi Problemi

### ❌ Caso 1: Sempre 0 o sempre 4095
```
Sound: 0    |
Sound: 0    |
Sound: 4095 |████████████████████████████████████████████
```

**CAUSA**: Wiring sbagliato

**SOLUZIONE**:
- VCC microfono → 3.3V ESP32 (NON 5V!)
- GND microfono → GND ESP32
- OUT microfono → GPIO 25 ESP32

### ❌ Caso 2: Valore fisso (non cambia)
```
Sound: 2048 |████████████████████████████
Sound: 2048 |████████████████████████████
```

**CAUSA**: Microfono rotto o non alimentato

**SOLUZIONE**:
- Verifica VCC microfono con multimetro (3.3V)
- Sostituisci microfono
- Prova altro pin ADC (es. GPIO 34)

### ❌ Caso 3: Valori bassi anche gridando
```
Sound: 100  |██
Sound: 150  |███  (anche gridando)
```

**CAUSA**: Gain microfono troppo basso

**SOLUZIONE**:
1. **MAX4466**: Ruota trimmer (potenziometro) per aumentare gain
2. **KY-038**: Ruota potenziometro sensibilità
3. Se non ha trimmer → abbassa soglia software

---

## ⚙️ Step 2: Calibra Soglia

### Modifica `esp32-cucina-COMPLETO.ino`

**Se valori bassi** (< 200 anche gridando):
```cpp
const int SOUND_THRESHOLD = 100;  // Ridotto da 512
```

**Se valori medi** (400-600):
```cpp
const int SOUND_THRESHOLD = 300;  // Ridotto da 512
```

**Se valori alti** (> 1000):
```cpp
const int SOUND_THRESHOLD = 800;  // Aumentato da 512
```

### Regola empiricamente:
1. Guarda valore "silenzio" nel Serial Monitor
2. Guarda valore "grido massimo"
3. Soglia = (silenzio + grido) / 2

**Esempio:**
- Silenzio: 50
- Grido: 600
- Soglia ideale: (50 + 600) / 2 = **325**

---

## 🔍 Step 3: Verifica Backend (solo se hardware OK)

### Test manuale endpoint

```bash
# 1. Verifica stato serra
curl http://192.168.1.10:8001/api/sessions/999/kitchen-puzzles/state

# Cerca:
# "serra": {"status": "active"}  ← Deve essere "active", non "locked"!

# 2. Se serra è locked, completa prima frigo:
curl -X POST http://192.168.1.10:8001/api/sessions/999/kitchen-puzzles/frigo/complete

# 3. Ora riprova serra:
curl -X POST http://192.168.1.10:8001/api/sessions/999/kitchen-puzzles/serra/complete
```

### Verifica database

```bash
docker exec -it escape-room-3d-db-1 psql -U escaperoom -d escaperoom_db

SELECT puzzle_states->'serra' FROM kitchen_puzzle_states WHERE session_id=999;

# Atteso: {"status": "active", ...}
# Se "locked" → completa frigo prima
```

---

## 🎯 Checklist Completa

- [ ] **Wiring corretto**: VCC→3.3V, GND→GND, OUT→GPIO25
- [ ] **Test sketch** caricato e Serial Monitor aperto
- [ ] **Valori ADC visibili** (non sempre 0 o 4095)
- [ ] **Valori cambiano** parlando/gridando
- [ ] **Soglia calibrata** (basata su valori reali)
- [ ] **Serra status = "active"** (non locked)
- [ ] **Frigo completato** prima (se serra è locked)

---

## 💡 Quick Fix Alternative

### Se microfono proprio non funziona:

**Usa tasto Z temporaneo** (già implementato in tasto5 handling):

1. Apri `src/components/scenes/KitchenScene.jsx`
2. Cerca `// Tasto Z - Test serra`
3. Premi Z in gioco → attiva serra
4. Poi sistema microfono con calma

---

## 📞 Se Tutto Fallisce

1. **Sostituisci microfono** (può essere difettoso)
2. **Usa altro modulo**: MAX9814 invece di MAX4466
3. **Cambia pin**: GPIO 34, 35, 36, 39 (ADC1)
4. **Test basico Arduino**:
   ```cpp
   void loop() {
     Serial.println(analogRead(25));
     delay(100);
   }
   ```
   Se anche questo non funziona → problema hardware certo

---

## ✅ Conferma Funzionante

**Serial Monitor dovrebbe mostrare:**
```
🎤 ===== PICCO SONORO RILEVATO! =====
   Sound level: 850
🌿 ===== SERRA ATTIVATA =====
📡 HTTP POST → .../serra/complete
📥 Response: 200
✅ Request OK!
```

**E in gioco:**
- Neon serra si accende 💡
- Strip LED fisica si accende
- Porta si sblocca 🚪

---

**Segui questi step in ordine e troverai il problema! 🎯**
