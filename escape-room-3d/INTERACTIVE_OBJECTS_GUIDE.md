# 🎯 GUIDA OPERATIVA: AGGIUNTA OGGETTI INTERATTIVI

## 📋 MODUS OPERANDI STANDARD

**IMPORTANTE:** Seguire SEMPRE questa procedura quando si aggiunge un nuovo oggetto interattivo clickabile in una scena!

---

## ⚠️ PROBLEMA COMUNE

**Bug:** Oggetto clickabile con mouse ma NON con mirino (pointer lock mode)

**Causa:** L'oggetto non è stato aggiunto alla lista `interactiveObjects` tracciata dal raycast del mirino.

**Conseguenza:** Gameplay rotto per utenti desktop che usano pointer lock.

---

## ✅ PROCEDURA CORRETTA (4 STEP)

### STEP 1: Identificare l'UUID dell'oggetto

Aprire il modello 3D nel browser e controllare i log della console:

```bash
# Avvia dev server
cd escape-room-3d && npm run dev

# Naviga alla scena
# Apri DevTools Console (F12)
# Cerca nei log i nomi degli oggetti caricati
```

**Esempio log:**
```
[CasaModel] 🚪 Porta trovata: PORTA_SOGGIORNO(B4B3C2EF-4864-43B4-B31D-E61D253C4F55)
```

**NOTA:** Gli UUID sono nel formato `NOME(UUID)`

---

### STEP 2: Aggiungere pattern di ricerca nel loop collisioni

**File:** `src/components/scenes/[NomeScena]Scene.jsx`

**Sezione:** `useEffect` che costruisce `interactiveObjects`

```javascript
// Cerca oggetti interattivi nelle collidables
cols.forEach(child => {
  const name = child.name ? child.name.toLowerCase() : '';
  
  // Interactive objects specifici per [scena]
  if (name.startsWith('test') || 
      name.includes('[keyword1]') || 
      name.includes('[keyword2]') || 
      name.includes('[nuovo_oggetto]')) {  // ✅ AGGIUNGI QUI
    interactives.push(child);
    child.userData.interactive = true;
  }
});
```

**⚠️ MA NON BASTA!** Continua con STEP 3...

---

### STEP 3: Aggiungere ricerca esplicita (CRITICAL!)

**Subito DOPO il loop precedente**, aggiungere un traverse esplicito:

```javascript
// 🎯 IMPORTANTE: [Oggetto] potrebbe NON essere nelle collidables, cercalo esplicitamente!
if (modelRef && modelRef.current) {
  modelRef.current.traverse((child) => {
    if (child.isMesh && child.name) {
      const name = child.name.toLowerCase()
      
      // Cerca [Oggetto] per UUID o nome
      if (name.includes('uuid-parte-1') || 
          name.includes('uuid-parte-2') ||
          name.includes('nome_oggetto')) {
        
        // ✅ Controlla se già presente (evita duplicati)
        const alreadyAdded = interactives.some(obj => obj.uuid === child.uuid)
        
        if (!alreadyAdded) {
          console.log('[Scene] ✅ [Oggetto] aggiunto esplicitamente agli interattivi:', child.name)
          interactives.push(child)
          child.userData.interactive = true
        }
      }
    }
  })
}
```

**Perché serve questo step?**
- Alcuni oggetti (TV, quadri, etc) NON sono nelle collision objects
- Il raycast del mirino usa SOLO `interactiveObjects`
- Senza questo step → oggetto invisibile al mirino!

---

### STEP 4: Testing completo

✅ **Test con MOUSE** (fuori pointer lock):
- Clicca sull'oggetto → Deve funzionare

✅ **Test con MIRINO** (pointer lock attivo):
- Clicca per entrare in pointer lock (ESC per uscire)
- Punta il mirino sull'oggetto
- Clicca → Deve funzionare!

✅ **Verifica nei log:**
```
[Scene] ✅ [Oggetto] aggiunto esplicitamente agli interattivi: NOME_OGGETTO(UUID)
```

---

## 📝 ESEMPIO COMPLETO: TV Soggiorno

**Implementazione corretta in `LivingRoomScene.jsx`:**

```javascript
useEffect(() => {
  // ... codice setup collision objects ...
  
  const interactives = [];
  
  // STEP 2: Pattern nel loop collisioni
  cols.forEach(child => {
    const name = child.name ? child.name.toLowerCase() : '';
    
    if (name.startsWith('test') || 
        name.includes('soggiorno') || 
        name.includes('divano') || 
        name.includes('couch') || 
        name.includes('tv')) {  // ← Pattern generico
      interactives.push(child);
      child.userData.interactive = true;
    }
  });
  
  // STEP 3: Ricerca esplicita TV (CRITICAL!)
  if (modelRef && modelRef.current) {
    modelRef.current.traverse((child) => {
      if (child.isMesh && child.name) {
        const name = child.name.toLowerCase()
        
        // ✅ Cerca tutti gli UUID possibili della TV
        if (name.includes('fb17d86e-ad44-4e91-9ad1-4923b740e36b') || 
            name.includes('3342cf3c-b2a4-4d72-8dc5-91727206c91e') ||
            name.includes('858ff8a2-8c80-42f4-8bba-c412313e2832') ||
            name.includes('tv_soggiorno')) {
          
          const alreadyAdded = interactives.some(obj => obj.uuid === child.uuid)
          
          if (!alreadyAdded) {
            console.log('[LivingRoomScene] ✅ TV aggiunta esplicitamente:', child.name)
            interactives.push(child)
            child.userData.interactive = true
          }
        }
      }
    })
  }
  
  setInteractiveObjects(interactives);
}, [modelRef, collisionObjects])
```

---

## 🔍 DEBUGGING: Oggetto non clickabile

**Problema:** Ho aggiunto l'oggetto ma non risponde al click

**Checklist diagnostica:**

1. ✅ **Verifica log console:**
   ```
   [Scene] ✅ [Oggetto] aggiunto esplicitamente agli interattivi: ...
   ```
   - Se manca questo log → STEP 3 non implementato!

2. ✅ **Verifica handler click:**
   - Esiste un handler `handle[Oggetto]Click`?
   - L'handler controlla gli UUID corretti?

3. ✅ **Verifica propagazione click:**
   ```javascript
   const handleObjectClick = (objectName) => {
     const targetObject = objectName || currentLookTarget  // ← Usa mirino se objectName è null
     
     if (!targetObject) return
     
     // Gestisci click specifici
     handle[Oggetto]Click(targetObject)  // ← Chiama handler specifico
     
     // Propaga al parent
     if (onObjectClick) {
       onObjectClick(targetObject)
     }
   }
   ```

4. ✅ **Test separato mouse vs mirino:**
   - Mouse OK, mirino NO → STEP 3 mancante
   - Entrambi NO → problema handler

---

## 🚨 ERRORI COMUNI DA EVITARE

### ❌ Errore 1: Solo pattern generico
```javascript
// ❌ SBAGLIATO - non basta!
if (name.includes('tv')) {
  interactives.push(child);
}
```

**Problema:** TV potrebbe non avere "tv" nel nome, o non essere nelle collisions.

### ❌ Errore 2: UUID case-sensitive
```javascript
// ❌ SBAGLIATO - UUID è maiuscolo!
if (name.includes('fb17d86e-ad44...')) {  // minuscolo
```

**Soluzione:** Usa `.toLowerCase()` prima del confronto!

### ❌ Errore 3: Non verificare duplicati
```javascript
// ❌ SBAGLIATO - potrebbe aggiungere 2 volte
interactives.push(child)
```

**Soluzione:** Controlla sempre con `.some()`!

### ❌ Errore 4: Handler non controlla UUID corretti
```javascript
// ❌ SBAGLIATO - UUID vecchio/sbagliato
if (name.includes('uuid-vecchio')) {
  // questo non matcha mai!
}
```

**Soluzione:** Copia UUID dai log console (STEP 1)!

---

## 📊 PATTERN PER TIPO DI OGGETTO

### 🚪 Porte / Oggetti strutturali
- **Dove:** Collision objects (già presenti)
- **Action:** Solo STEP 2 (pattern nel loop)

### 📺 Schermi / Display / Quadri
- **Dove:** NON collision objects
- **Action:** STEP 2 + STEP 3 (ricerca esplicita) ✅

### 🛋️ Mobili interattivi
- **Dove:** Collision objects o parent separato
- **Action:** STEP 2 + STEP 3 (sicurezza)

### 🔑 Oggetti piccoli (chiavi, etc)
- **Dove:** Di solito non-collidable
- **Action:** STEP 3 OBBLIGATORIO ✅

---

## 🎯 CHECKLIST FINALE

Prima di committare codice con nuovo oggetto interattivo:

- [ ] STEP 1: UUID identificato da log console
- [ ] STEP 2: Pattern aggiunto nel loop collisioni
- [ ] STEP 3: Ricerca esplicita implementata (se oggetto non-collidable)
- [ ] STEP 4: Testato con mouse (OK)
- [ ] STEP 4: Testato con mirino (OK)
- [ ] Log console conferma aggiunta: `✅ [Oggetto] aggiunto esplicitamente`
- [ ] Handler click implementato e funzionante
- [ ] Nessun errore in console

---

## 📚 RIFERIMENTI

- **Esempio completo:** `src/components/scenes/LivingRoomScene.jsx` (TV Soggiorno)
- **Pattern simile:** `src/components/scenes/KitchenScene.jsx` (Frigo)
- **Pattern simile:** `src/components/scenes/EsternoScene.jsx` (Cancello)

---

## 🆘 FAQ

**Q: Devo sempre fare STEP 3?**  
A: Se l'oggetto è NON-collidable (schermi, quadri, piccoli oggetti) → SÌ, obbligatorio!

**Q: Come faccio a sapere se è collidable?**  
A: Controlla nei log se appare in "collision objects". Se non appare → fare STEP 3!

**Q: Il mouse funziona ma il mirino no. Perché?**  
A: STEP 3 mancante! Il mouse usa un sistema diverso dal raycast.

**Q: Ho aggiunto STEP 3 ma ancora non funziona?**  
A: Verifica UUID nei log - potrebbero essere diversi da quelli nel codice!

---

**Ultima modifica:** 04/01/2026  
**Caso d'uso:** Sistema TV Soggiorno (bug fix pointer lock)
