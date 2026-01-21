# 🔍 Particle Editor - Guida Debug

## Problema Attuale

1. **Le particelle non si vedono** → `config.enabled` probabilmente è `false`
2. **Il target non si imposta** → `usePositionPicker` non funziona o `handleTargetSelected` non viene chiamato

## 🔍 Checklist Debug

### Step 1: Verifica Editor Aperto
```
1. Premi X
2. Controlla console per: "[useParticleEditor] Editor aperto"
```

### Step 2: Verifica Selezione Sorgente
```
1. Click su "📍 Seleziona Sorgente"
2. Controlla console per: "[useParticleEditor] 📍 Modalità selezione sorgente attivata"
3. Click sulla griglia ventilazione
4. Controlla console per: "[BedroomScene] 🎯 Selezione sorgente: <nome>"
5. Controlla console per: "[useParticleEditor] ✅ Sorgente selezionata: <nome>"
```

### Step 3: Verifica Config.enabled
```
1. Dopo selezione sorgente, controlla console per logs di HotAirEffectLive
2. Dovrebbe mostrare: "enabled: true"
3. Se mostra "enabled: false", il problema è in useParticleEditor.handleObjectSelected
```

### Step 4: Verifica Toggle Preview
```
1. Click sul bottone "👁️ Preview ON/OFF"
2. Controlla console per cambio di stato
3. Il bottone dovrebbe cambiare colore (verde=ON, grigio=OFF)
```

### Step 5: Verifica Selezione Target
```
1. Click su "🎯 Imposta Target"
2. Controlla console per: "[useParticleEditor] 🎯 Modalità selezione target attivata"
3. Click su un punto nella scena
4. Controlla console per:
   - "[ParticleTargetPicker] 🎯 Target particelle picked: <coords>"
   - "[useParticleEditor] ✅ Target selezionato: <coords>"
```

### Step 6: Verifica Rendering Particelle
```
1. Controlla console per logs di HotAirEffectLive
2. Dovrebbe mostrare:
   - "enabled: true"
   - "hasSource: true"
   - "hasTarget: true" (se target impostato)
```

## 🐛 Log Attesi

### Log quando tutto funziona:
```
[useParticleEditor] Editor aperto
[useParticleEditor] 📍 Modalità selezione sorgente attivata
[BedroomScene] 🖱️ handleObjectClickInternal chiamato!
[BedroomScene] 🎯 Selezione sorgente: griglia_ventilazione
[useParticleEditor] ✅ Sorgente selezionata: griglia_ventilazione
[HotAirEffectLive] 🔍 RENDER: {enabled: true, hasSource: true, ...}
[useParticleEditor] 🎯 Modalità selezione target attivata
[ParticleTargetPicker] 🎯 Target particelle picked: Vector3 {x: ..., y: ..., z: ...}
[useParticleEditor] ✅ Target selezionato: {x: ..., y: ..., z: ...}
[HotAirEffectLive] 🎯 Direzione aggiornata: [x, y, z]
```

## 🛠️ Fix Possibili

### Fix 1: Config.enabled non si imposta
**Problema**: In `useParticleEditor.handleObjectSelected`, `enabled` non viene impostato a `true`

**Soluzione**: Verificare che questo codice esista:
```javascript
setParticleConfig(prev => ({
  ...prev,
  enabled: true  // ← CRITICO!
}))
```

### Fix 2: Target non si cattura
**Problema**: `ParticleTargetPicker` non è montato o `selectingMode` non è 'target'

**Soluzione**: Verificare che:
1. `<ParticleTargetPicker>` sia dentro `<Canvas>`
2. `particleEditor.selectingMode === 'target'` quando clicchi

### Fix 3: Particelle non visibili nonostante enabled=true
**Problema**: Griglia non trovata da HotAirEffect

**Soluzione**: Verificare che `grigliaUUID` corrisponda a un oggetto nella scena

## 📋 Test Completo

Esegui questi passi in ordine e segna i risultati:

- [ ] Editor si apre con X
- [ ] Click su "Seleziona Sorgente" attiva modalità
- [ ] Click su griglia seleziona oggetto
- [ ] Config.enabled diventa true
- [ ] Particelle appaiono (se Preview ON)
- [ ] Click su "Imposta Target" attiva modalità
- [ ] Click sulla scena cattura coordinate
- [ ] Target viene impostato nello state
- [ ] Particelle si dirigono verso target

Se tutti i passaggi funzionano, il sistema è OK! 🎉
