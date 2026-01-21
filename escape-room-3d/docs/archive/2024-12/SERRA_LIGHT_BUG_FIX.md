# 🐛 Fix Bug Sistema Illuminazione Serra

**Data:** 19 Dicembre 2025  
**Componente:** `src/components/3D/SerraLight.jsx`  
**Severità:** 🔴 CRITICA (crash loop infinito)

---

## 📋 Problema

Quando la serra veniva accesa (toggle tasto `G`), l'applicazione crashava con un loop infinito di errori:

```
SerraLight.jsx:134 Uncaught TypeError: Cannot read properties of undefined (reading 'secondary')
    at Object.current (SerraLight.jsx:134:39)
```

### Sintomi
- ✅ La serra si spegneva correttamente
- ❌ All'accensione: crash immediato
- 🔄 Loop infinito di errori nella console
- 🚫 L'applicazione diventava inutilizzabile

---

## 🔍 Root Cause Analysis

**Variable Shadowing alla riga 118**

```javascript
// ❌ PRIMA (BUG)
useFrame((state, delta) => {
    // ...
    const palette = colorPalettes[state]  // 💥 BUG!
```

### Perché crashava?

1. **Conflitto di nomi:** Il parametro `state` della callback `useFrame` si riferisce allo **state object di Three.js** (contiene `scene`, `camera`, `clock`, etc.)
2. **Errore di logica:** Il codice cercava di usarlo come **prop del componente** (`'active'`, `'locked'`, `'solved'`)
3. **Undefined access:** `colorPalettes[threeJsObject]` → `undefined`
4. **Crash:** `undefined.secondary` → **TypeError**

### Schema del Bug
```
useFrame callback parameter → state (Three.js object)
                                 ↓
                         colorPalettes[state]
                                 ↓
                            undefined
                                 ↓
                        undefined.secondary
                                 ↓
                          💥 CRASH! 💥
```

---

## ✅ Soluzione Applicata

**Rinominato il parametro per eliminare il conflitto:**

```javascript
// ✅ DOPO (FIXED)
useFrame((_, delta) => {
    // ...
    const palette = colorPalettes[state]  // ✅ OK! state = prop del componente
```

### Perché funziona ora?

- `_` indica che il parametro **non viene usato** (convenzione comune)
- Ora `state` si riferisce **sempre al prop del componente**
- `colorPalettes['active']` → `{ primary, secondary, tertiary }` ✅
- `palette.secondary` → `THREE.Color(0x00d966)` ✅

---

## 🧪 Testing

### Test Manuale
1. ✅ Avviare l'applicazione
2. ✅ Navigare alla scena cucina
3. ✅ Premere `Z` per accendere la serra
4. ✅ Verificare assenza di errori nella console
5. ✅ Premere `X` per spegnere la serra
6. ✅ Ciclo on/off multiplo (5 volte)

### Risultati Attesi
- ✅ Nessun errore nella console
- ✅ Luce verde pulsante quando accesa
- ✅ Luce spenta quando disattivata
- ✅ Transizioni smooth
- ✅ Effetti di respirazione e flicker attivi

---

## 📝 Lezioni Apprese

### Best Practices

1. **Evitare variable shadowing** - Usare nomi univoci per i parametri
2. **Convenzione underscore** - Usare `_` per parametri non utilizzati
3. **Naming convention** - Per Three.js callbacks, preferire nomi come `threeState`, `frameState`

### Pattern Consigliato

```javascript
// ✅ BUONO
useFrame((threeState, delta) => {
    // threeState = oggetto Three.js
    // state = prop del componente
})

// ✅ BUONO ALTERNATIVO
useFrame((_, delta) => {
    // Non uso il first parameter
    // state = prop del componente
})

// ❌ CATTIVO
useFrame((state, delta) => {
    // Ambiguo! state potrebbe riferirsi a entrambi
})
```

---

## 🔧 File Modificati

- `src/components/3D/SerraLight.jsx` (riga 118)

## 📦 Commit Message Suggerito

```
fix(serra): risolto crash loop in SerraLight da variable shadowing

- Rinominato parametro useFrame da 'state' a '_'
- Eliminato conflitto tra prop componente e Three.js state
- Fix crash "Cannot read properties of undefined"
```

---

## ⚠️ Note per il Futuro

- Questo tipo di bug è **comune con Three.js hooks**
- Sempre fare attenzione ai nomi dei parametri in `useFrame`, `useThree`, etc.
- Se si verificano errori `undefined` in callbacks Three.js, **controllare variable shadowing**
- Usare ESLint rule `no-shadow` per prevenzione automatica

---

## ✨ Status Finale

**🟢 BUG RISOLTO** - Sistema serra completamente funzionante

### Features Operative
✅ Toggle accensione/spegnimento  
✅ Respirazione organica della luce  
✅ Flicker naturale con Perlin noise  
✅ Sfumature multiple di verde  
✅ Supporto stati (locked/active/solved)  
✅ Bloom volumetrico  
✅ Shadow mapping
