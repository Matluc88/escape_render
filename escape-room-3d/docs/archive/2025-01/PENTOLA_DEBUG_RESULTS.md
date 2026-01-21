# 🔍 Risultati Debug Oggetti PENTOLA

**Data:** 18/12/2025, 18:07  
**Richiesta:** Tracciare gli oggetti PENTOLA durante l'animazione usando `window.__DEBUG.scene.traverse()`

## 📋 Modifiche Apportate

### File: `src/hooks/usePentolaAnimation.js`

Aggiunto comando di debug nel loop useFrame che esegue automaticamente la scansione degli oggetti PENTOLA ogni ~0.5 secondi durante l'animazione:

```javascript
// 🔍 DEBUG: Traccia tutti gli oggetti PENTOLA nella scena durante l'animazione
if (window.__DEBUG?.scene) {
  console.log(`[usePentolaAnimation] 🔍 SCANSIONE oggetti PENTOLA:`)
  window.__DEBUG.scene.traverse(o => {
    if (o.name?.includes('PENTOLA')) {
      console.log(`   📦 ${o.name} | UUID: ${o.uuid}`)
    }
  })
}
```

## ✅ Risultati della Scansione

Durante l'inizializzazione della scena Cucina, sono stati identificati **6 oggetti** che contengono "PENTOLA" nel nome:

### 1. **PENTOLA** (Object3D)
- **Tipo:** Object3D (contenitore/gruppo)
- **Funzione:** Nodo contenitore principale

### 2. **PENTOLA(FC640F14-10EB-486E-8AED-5773C59DA9E0)** ⭐
- **Tipo:** Mesh
- **UUID:** `FC640F14-10EB-486E-8AED-5773C59DA9E0`
- **Funzione:** Mesh 3D principale della pentola (oggetto visibile)
- **Note:** Questo è l'oggetto principale che viene animato

### 3. **POSIZIONE_I_PENTOLA** (Object3D)
- **Tipo:** Object3D (contenitore/gruppo)
- **Funzione:** Marker posizione iniziale

### 4. **POSIZIONE_I_PENTOLA(D21F80A0-7284-4C64-8BC9-89E2A40F2763)**
- **Tipo:** Mesh
- **UUID:** `D21F80A0-7284-4C64-8BC9-89E2A40F2763`
- **Funzione:** Mesh del marker posizione iniziale

### 5. **POSIZIONE_F_PENTOLA** (Object3D)
- **Tipo:** Object3D (contenitore/gruppo)
- **Funzione:** Marker posizione finale

### 6. **POSIZIONE_F_PENTOLA(4FDEA480-2F23-4B39-BC9D-C3925307B0FB)**
- **Tipo:** Mesh
- **UUID:** `4FDEA480-2F23-4B39-BC9D-C3925307B0FB`
- **Funzione:** Mesh del marker posizione finale

## 🎯 Oggetto Principale Identificato

L'oggetto PENTOLA principale che viene effettivamente animato è:

```
Nome: PENTOLA(FC640F14-10EB-486E-8AED-5773C59DA9E0)
UUID: FC640F14-10EB-486E-8AED-5773C59DA9E0
Tipo: Mesh
```

## 📊 Struttura Gerarchia

```
Scene
  └─ PENTOLA (Object3D)
       └─ PENTOLA(FC640F14-...) (Mesh) ← Oggetto animato
       
  └─ POSIZIONE_I_PENTOLA (Object3D)
       └─ POSIZIONE_I_PENTOLA(D21F80A0-...) (Mesh)
       
  └─ POSIZIONE_F_PENTOLA (Object3D)
       └─ POSIZIONE_F_PENTOLA(4FDEA480-...) (Mesh)
```

## 🔴 Problema Identificato

Durante l'inizializzazione, il sistema non riesce a trovare i fornelli con il pattern `"Feu_1_460"`:

```
[error] [usePentolaAnimation] ❌ FORNELLI NON TROVATI per pattern: "Feu_1_460"
```

### Fornelli trovati nella scena:
- `Feu_32_447(09CF0101-9EE6-47A2-80C3-DB14E2A6D226)` (Mesh)
- `Feu_1_32_461(08FB2A6E-D032-4A4A-A261-E6A176B1F5FC)` (Mesh)

⚠️ **Il pattern corretto potrebbe essere:** `"Feu_1_32_461"` o `"461"` invece di `"460"`

## 💡 Come Usare il Debug

### Durante l'animazione:
Il log verrà stampato automaticamente ogni ~0.5 secondi quando la pentola è in movimento.

### Manualmente in console:
```javascript
window.__DEBUG.scene.traverse(o => {
  if (o.name?.includes('PENTOLA')) {
    console.log(o.name, o.uuid)
  }
})
```

## 📝 Note Tecniche

1. **Pattern ROOT:** Il sistema crea un nodo `PENTOLA_ROOT` come ancora matematica per l'animazione
2. **Gerarchia stabile:** `parent → root → pentola` per evitare problemi di trasformazione
3. **Debug attivo:** Il logging è integrato nel loop di animazione e si attiva automaticamente

## ✅ Conclusioni

- ✅ Comando di debug integrato correttamente
- ✅ 6 oggetti PENTOLA identificati con UUID
- ✅ Oggetto principale identificato: `FC640F14-10EB-486E-8AED-5773C59DA9E0`
- ⚠️ Pattern fornelli da correggere per abilitare l'animazione
