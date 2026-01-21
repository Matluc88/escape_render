# 🔧 GUIDA RESET PENTOLA - RISOLUZIONE PROBLEMA COORDINATE

## ❌ **PROBLEMA IDENTIFICATO**

```
Punto A configurato:  (-1.015, -0.109, 0.857)  ← NEL MOBILE (corretto)
Posizione reale ORA:  (-2.997,  0.947, 3.291)  ← FUORI POSTO! (sbagliato)
Punto B configurato:  (-2.997,  0.947, 3.291)  ← Dove sta ORA, non sui fornelli!

Discrepanza: 3.31 metri!
```

**CAUSA:** La pentola è stata spostata DOPO aver configurato il Punto A, ma PRIMA di configurare il Punto B.

---

## ✅ **SOLUZIONE RAPIDA**

### **METODO 1: Reset tramite Console Browser**

1. Apri browser su `http://localhost:5174`
2. Vai nella scena **Cucina**
3. Apri **Console DevTools** (F12)
4. Incolla questo script:

```javascript
// SCRIPT RESET PENTOLA
(function() {
  console.log('🔧 RESET PENTOLA - INIZIO');
  
  const PENTOLA_UUID = 'FC640F14-10EB-486E-8AED-5773C59DA9E0';
  const POSIZIONE_ORIGINALE = {
    x: -1.0153120000000009,
    y: -0.10899887084960827,
    z: 0.8566409999999999
  };
  
  if (!window.__DEBUG || !window.__DEBUG.scene) {
    console.error('❌ window.__DEBUG.scene non trovato!');
    return;
  }
  
  const scene = window.__DEBUG.scene;
  let pentola = null;
  
  // Trova pentola
  scene.traverse((obj) => {
    if (obj.uuid === PENTOLA_UUID || obj.name.includes('PENTOLA')) {
      pentola = obj;
    }
  });
  
  if (!pentola) {
    console.error('❌ Pentola non trovata!');
    return;
  }
  
  console.log('📍 Posizione PRIMA:', pentola.position);
  
  // Reset posizione
  pentola.position.set(
    POSIZIONE_ORIGINALE.x,
    POSIZIONE_ORIGINALE.y,
    POSIZIONE_ORIGINALE.z
  );
  
  console.log('✅ Posizione DOPO:', pentola.position);
  console.log('✅ PENTOLA RESETTATA! Ora puoi riconfigurare l\'animazione.');
})();
```

5. Premi Enter
6. La pentola tornerà nel mobile! ✅

---

### **METODO 2: Ricarica Pagina**

1. Premi **Ctrl+Shift+R** (o Cmd+Shift+R su Mac) per hard reload
2. La scena si ricaricherà con le coordinate originali
3. La pentola tornerà nel mobile automaticamente

---

## 🎯 **RICONFIGURARE ANIMAZIONE (PASSO-PASSO)**

Dopo aver resettato la pentola:

### **STEP 1: Verifica Posizione Iniziale**
```
✅ La pentola DEVE essere nel mobile cucina
✅ Coordinate attese: X ≈ -1.0, Y ≈ -0.1, Z ≈ 0.9
```

### **STEP 2: Apri Animation Editor**
1. Premi tasto **E**
2. Click sulla **PENTOLA** (oggetto 3D)
3. Verifica **Punto A** nel pannello:
   ```
   📍 Punto A (Origine)
   X: -1.015m | Y: -0.109m | Z: 0.857m  ← DEVE ESSERE QUESTO!
   ```

### **STEP 3: Pick Destination SUI FORNELLI**
1. Click pulsante **"📍 Scegli Destinazione con Click"**
2. **IMPORTANTE:** Clicca DIRETTAMENTE sui **FORNELLI** (superficie grigia)
   - NON cliccare sulla pentola stessa!
   - NON cliccare sul piano cucina!
   - Clicca sul **fuoco/fornello** vero e proprio
3. Controlla **Console** - DEVE dire:
   ```
   ✅ Posizione selezionata: Corps_32_449
   ```
4. Verifica **Punto B** nel pannello:
   ```
   🎯 Punto B (Destinazione)
   X: ≈ -3.0m | Y: ≈ 0.95m | Z: ≈ 3.3m
   
   ⚠️ IMPORTANTE: Y DEVE ESSERE ~0.95!
   Se Y è negativo o vicino a 0, hai cliccato nel posto sbagliato!
   ```

### **STEP 4: Verifica Visivamente**
- Dovresti vedere una **SFERA ROSSA BRILLANTE** sopra i fornelli
- Se la sfera è in basso o fuori posto → ricomincia da Step 3

### **STEP 5: Test Animazione**
1. Click **"▶ Test Animazione"**
2. Osserva il movimento:
   - ✅ CORRETTO: Pentola sale dal mobile e va sui fornelli
   - ❌ SBAGLIATO: Pentola si teletrasporta o va fuori stanza
3. Controlla **Console** per log movimento:
   ```
   🚀 PENTOLA - MOVIMENTO INIZIATO
   🛑 PENTOLA - MOVIMENTO FERMATO
   📊 MOVIMENTO REALE COMPLETATO
   ```

### **STEP 6: Scarica Coordinate Finali**
1. Click **"📊 Scarica Analisi Coordinate"**
2. Apri file JSON scaricato
3. Verifica sezioni:
   ```json
   {
     "animation": {
       "start": { "y": -0.109 },  ← Nel mobile
       "end": { "y": 0.947 }       ← Sui fornelli
     },
     "real_movement": {
       "start": { "y": -0.109 },   ← Corrisponde!
       "end": { "y": 0.947 }       ← Corrisponde!
     }
   }
   ```

---

## 🔍 **CHECKLIST VERIFICA FINALE**

- [ ] Pentola resettata nel mobile (Y ≈ -0.1)
- [ ] Punto A mostra coordinate mobile
- [ ] Punto B selezionato SUI FORNELLI (non sulla pentola)
- [ ] Punto B Y ≈ **0.95** (NON negativo!)
- [ ] Sfera rossa visibile sui fornelli
- [ ] Test animazione: movimento fluido mobile → fornelli
- [ ] `real_movement` nel JSON NON è `null`
- [ ] Discrepanza `end_discrepancy.distance < 0.01m`

---

## 🚨 **TROUBLESHOOTING**

### **"La pentola si teletrasporta ancora!"**
→ Il Punto A è sbagliato. Ricarica pagina e riprova.

### **"Clicco sui fornelli ma prende coordinate sbagliate"**
→ Prova a zoomare più vicino ai fornelli e cliccare esattamente al centro.

### **"Sfera rossa non appare"**
→ Il Punto B non è stato impostato. Clicca "Pick Destination" e riprova.

### **"Y del Punto B è negativo"**
→ Hai cliccato sulla pentola o dentro il mobile. Clicca SUI FORNELLI.

---

## 📝 **COORDINATE DI RIFERIMENTO**

```javascript
// POSIZIONI CORRETTE
const PENTOLA_NEL_MOBILE = {
  x: -1.015,
  y: -0.109,  // ← NEGATIVO = dentro mobile
  z: 0.857
};

const PENTOLA_SUI_FORNELLI = {
  x: -3.0,    // circa
  y: 0.95,    // ← POSITIVO = sopra superficie
  z: 3.3      // circa
};

// FORNELLI (Corps_32_449)
const FORNELLI_TOP_SURFACE = {
  y: 0.948    // ← Altezza superficie fornelli
};
```

---

**Creato:** 18/12/2025 12:54
**Problema:** Pentola fuori posizione + Punto B sbagliato
**Soluzione:** Reset + Riconfigura con click corretto sui fornelli
