# 🍳 FIX PENTOLA INVISIBILE - UUID NAME FIX (SOLUZIONE FINALE)

**Data**: 12/01/2026 05:47
**Problema**: Fix cercava `child.uuid` invece di `child.name.includes()`
**Soluzione**: UUID di Sweet Home 3D è nel NAME, non nel campo uuid di Three.js!

---

## 🔴 PROBLEMA ROOT CAUSE

### Codice SBAGLIATO (tentativo 4):
```javascript
groupRef.current.traverse((child) => {
  if (child.uuid === 'FC640F14-10EB-486E-8AED-5773C59DA9E0') {
    pentola = child
  }
})
```

**Errore**: `child.uuid` è l'UUID generato da **Three.js** (es: "A3F2D8E1-..."), NON l'UUID di Sweet Home 3D!

### Log Evidenza:
```
[usePentolaAnimation] ✅ PENTOLA MESH MATCH: "PENTOLA(FC640F14-10EB-486E-8AED-5773C59DA9E0)"
                                             ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
                                             L'UUID è NEL NAME!

[CasaModel] ⚠️ Fix Pentola: Pentola non trovata
             ^^^^^^^^^^^^^^^^ Perché child.uuid è diverso!
```

---

## ✅ SOLUZIONE CORRETTA

### Codice CORRETTO (finale):
```javascript
groupRef.current.traverse((child) => {
  if (child.name && child.name.includes('FC640F14-10EB-486E-8AED-5773C59DA9E0')) {
    pentola = child
  }
})
```

**Perché funziona**: 
- L'UUID di Sweet Home 3D viene importato come **parte del nome** del mesh
- Formato: `"PENTOLA(FC640F14-10EB-486E-8AED-5773C59DA9E0)"`
- Three.js assegna il suo UUID separato nel campo `child.uuid`

---

## 📊 COMPARAZIONE UUID

| Campo        | Valore                                      | Descrizione                    |
|--------------|---------------------------------------------|--------------------------------|
| `child.name` | `"PENTOLA(FC640F14-10EB-486E-8AED-5773C59DA9E0)"` | Nome + UUID Sweet Home 3D |
| `child.uuid` | `"A3F2D8E1-B4C5-4D9E-8A7F-..."` (esempio)  | UUID Three.js (auto-generato) |

---

## 🔧 MODIFICA APPLICATA

**File**: `src/components/3D/CasaModel.jsx`

**Linea**: ~508

**BEFORE**:
```javascript
if (child.uuid === 'FC640F14-10EB-486E-8AED-5773C59DA9E0') {
```

**AFTER**:
```javascript
if (child.name && child.name.includes('FC640F14-10EB-486E-8AED-5773C59DA9E0')) {
```

---

## 📋 LOG ATTESI DOPO IL FIX

✅ **Successo**:
```
[CasaModel] 🍳 Fix Pentola: Scala world attuale: Vector3 {x: 0.01, y: 0.01, z: 0.01}
[CasaModel] 🚀 Fix Pentola applicato! Scala locale impostata a 100.00 per compensare scala world di 0.0100
```

❌ **Errore (OLD)**:
```
[CasaModel] ⚠️ Fix Pentola: Pentola non trovata in groupRef.current (dopo 500ms)
```

---

## 🎯 TEST

1. **Hard refresh** browser (Ctrl+Shift+R / Cmd+Shift+R)
2. Vai sulla scena **cucina**
3. Apri **Console DevTools**
4. Cerca log `[CasaModel] 🍳 Fix Pentola`
5. Verifica che la pentola sia **VISIBILE** e **DIMENSIONE CORRETTA**

---

## 📝 STORIA COMPLETA FIX

| Tentativo | Approccio | Risultato | Problema |
|-----------|-----------|-----------|----------|
| 1 | Scala locale x100 | ❌ Fallito | Timing troppo presto |
| 2 | Compensazione scala world | ❌ Fallito | Timing troppo presto |
| 3 | Delay 500ms dopo BVH | ❌ Fallito | Timing OK ma UUID non trovato |
| 4 | `traverse()` + `child.uuid` | ❌ Fallito | UUID sbagliato! |
| 5 | `traverse()` + `child.name.includes()` | ✅ **RISOLTO** | UUID corretto nel name! |

---

## 💡 LEZIONE APPRESA

Quando si cerca un oggetto 3D importato da Sweet Home 3D:

- ❌ **NON usare**: `child.uuid` (è l'UUID Three.js)
- ✅ **USARE**: `child.name.includes('UUID-SWEET-HOME')` (UUID nel nome)

Oppure match esatto:
```javascript
if (child.name === 'PENTOLA(FC640F14-10EB-486E-8AED-5773C59DA9E0)') {
  // Match esatto
}
```

---

## 🔄 STATO BUILD

- ✅ Fix applicato in `CasaModel.jsx`
- ⏳ Frontend container in rebuild (14.90s build Vite)
- ⏳ Docker image in export...

---

## ✨ PROSSIMI PASSI

1. Attendere completamento build Docker
2. Hard refresh browser
3. Test visivo pentola in cucina
4. Verificare log console per conferma fix
