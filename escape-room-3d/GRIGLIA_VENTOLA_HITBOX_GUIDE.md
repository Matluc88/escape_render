# 🫧 Guida: Hitbox Invisibile Griglia Ventola

## 📋 Panoramica

La griglia ventola nella camera da letto era difficile da clickare a causa delle sue piccole dimensioni (~10cm x 10cm). Per risolvere questo problema, è stata implementata una **sfera invisibile 3x più grande** che circonda la griglia, facilitando l'interazione dell'utente.

## 🎯 Implementazione

### 1. CasaModel.jsx - Creazione Hitbox

**Posizione:** Nel `useLayoutEffect`, durante il traverse del modello

```jsx
// 🫧 HITBOX INVISIBILE per GRIGLIA VENTOLA (UUID: 04B1AD94-22FD-4C99-BDBE-DF1BA5FC33EA)
// Crea una sfera invisibile 3x più grande per facilitare il click
if (child.name.includes('04B1AD94-22FD-4C99-BDBE-DF1BA5FC33EA')) {
  console.log('[CasaModel] 🫧 Trovata griglia ventola - creo hitbox invisibile:', child.name)
  
  // Calcola posizione world della griglia
  const worldPos = new THREE.Vector3()
  child.getWorldPosition(worldPos)
  
  // Crea sfera invisibile (raggio 0.25m = ~50cm diametro, 5x più grande della griglia)
  const hitboxGeometry = new THREE.SphereGeometry(0.25, 16, 16)
  const hitboxMaterial = new THREE.MeshBasicMaterial({
    transparent: true,
    opacity: 0,
    side: THREE.DoubleSide,
    depthWrite: false
  })
  
  const hitboxMesh = new THREE.Mesh(hitboxGeometry, hitboxMaterial)
  hitboxMesh.name = `HITBOX_${child.name}` // Mantieni riferimento al nome originale
  hitboxMesh.userData.originalTarget = child.name // Riferimento all'oggetto originale
  hitboxMesh.userData.isHitbox = true
  hitboxMesh.userData.collidable = false // Non interferisce con le collisioni fisiche
  
  // Posiziona hitbox al centro della griglia (in coordinate locali del parent)
  if (child.parent) {
    const localPos = child.parent.worldToLocal(worldPos.clone())
    hitboxMesh.position.copy(localPos)
    child.parent.add(hitboxMesh)
    console.log('[CasaModel] ✅ Hitbox sfera invisibile creata per griglia ventola (raggio: 25cm)')
  }
}
```

### 2. BedroomScene.jsx - Rilevamento Click

**Posizione:** Nella funzione `handleObjectClickInternal`

```jsx
// TRIGGER 1: GRIGLIA VENTOLA (04B1AD94...) → Messaggio iniziale + obiettivo SOLO
// 🫧 FIX: Gestisci anche click sull'hitbox invisibile (prefisso HITBOX_)
const isGrigliaVentola = name.includes('04b1ad94-22fd-4c99-bdbe-df1ba5fc33ea') || 
                         name.includes('hitbox_') && name.includes('04b1ad94-22fd-4c99-bdbe-df1ba5fc33ea')

if (isGrigliaVentola) {
  console.log('[BedroomScene] 🌬️ Click su GRIGLIA VENTOLA (o hitbox):', objectName)
  // ... resto della logica enigma
}
```

## 🔧 Caratteristiche Tecniche

### Dimensioni
- **Griglia originale:** ~10cm x 10cm (difficile da cliccare)
- **Hitbox sfera:** Raggio 25cm = Diametro 50cm (5x più grande)

### Proprietà Hitbox
- **Geometria:** `SphereGeometry` (sfera)
- **Materiale:** `MeshBasicMaterial` trasparente
  - `opacity: 0` - Completamente invisibile
  - `transparent: true` - Rendering trasparente attivo
  - `side: THREE.DoubleSide` - Rilevabile da entrambi i lati
  - `depthWrite: false` - Non scrive nel depth buffer

### Comportamento
- **Raycasting:** ✅ Attivo - il raycaster rileva la sfera
- **Collisioni fisiche:** ❌ Disabilitato (`userData.collidable = false`)
- **Visibilità:** ❌ Invisibile all'utente
- **Parent:** Stesso parent della griglia originale

## 🎮 Utilizzo

1. **Automatico:** L'hitbox viene creata automaticamente al caricamento della scena camera
2. **Click:** L'utente può clickare in un'area 3x più grande intorno alla griglia
3. **Feedback:** Il sistema rileva il click e attiva l'enigma normalmente

## 🔍 Debug

### Log Console
Quando la scena si carica, cerca questi log:

```
[CasaModel] 🫧 Trovata griglia ventola - creo hitbox invisibile: GRIGLIA_VENTOLA_LETTO(04B1AD94-...)
[CasaModel] ✅ Hitbox sfera invisibile creata per griglia ventola (raggio: 25cm)
```

Quando l'utente clicca:

```
[BedroomScene] 🌬️ Click su GRIGLIA VENTOLA (o hitbox): HITBOX_GRIGLIA_VENTOLA_LETTO(...)
```

### Verifica Visiva
Per vedere l'hitbox durante il debug, modifica temporaneamente `opacity: 0` in `opacity: 0.3` nel codice di CasaModel.jsx:

```jsx
const hitboxMaterial = new THREE.MeshBasicMaterial({
  transparent: true,
  opacity: 0.3, // ← Cambia da 0 a 0.3 per debug
  side: THREE.DoubleSide,
  depthWrite: false
})
```

## 📊 Vantaggi

✅ **Maggiore usabilità:** Area cliccabile 25x più grande (π × 25² ≈ 1963cm² vs ~100cm²)
✅ **Invisibile:** L'utente non vede la "bolla" (UX pulita)
✅ **Non invasivo:** Non interferisce con fisica/collisioni
✅ **Manutenibile:** Codice centralizzato in CasaModel.jsx
✅ **Scalabile:** Pattern riutilizzabile per altri oggetti piccoli

## 🔄 Pattern Riutilizzabile

Questo pattern può essere applicato ad altri oggetti piccoli difficili da cliccare:

```jsx
// Template generico per altri oggetti
if (child.name.includes('UUID-OGGETTO-PICCOLO')) {
  const worldPos = new THREE.Vector3()
  child.getWorldPosition(worldPos)
  
  const hitboxMesh = new THREE.Mesh(
    new THREE.SphereGeometry(RAGGIO_DESIDERATO, 16, 16),
    new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      depthWrite: false
    })
  )
  
  hitboxMesh.name = `HITBOX_${child.name}`
  hitboxMesh.userData.originalTarget = child.name
  hitboxMesh.userData.isHitbox = true
  hitboxMesh.userData.collidable = false
  
  if (child.parent) {
    const localPos = child.parent.worldToLocal(worldPos.clone())
    hitboxMesh.position.copy(localPos)
    child.parent.add(hitboxMesh)
  }
}
```

## 📝 Note

- La sfera è centrata esattamente sulla posizione world della griglia originale
- Il nome dell'hitbox include il prefisso `HITBOX_` per facilitare il rilevamento
- L'hitbox viene aggiunta come child dello stesso parent della griglia (mantiene gerarchia)
- `depthWrite: false` garantisce che l'hitbox non interferisca con il rendering di altri oggetti

---

**Data Implementazione:** 05/01/2026
**Versione:** 1.0.0
**Autore:** Escape Room 3D Team
