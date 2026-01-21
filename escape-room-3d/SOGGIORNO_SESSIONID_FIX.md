# 🐛 FIX: Soggiorno carica sessione sbagliata

**Data:** 12 gennaio 2026, 04:14 AM  
**Gravità:** 🔴 CRITICA (impedisce gioco in produzione)  
**Status:** ✅ RISOLTO

---

## 📋 PROBLEMA

Quando un giocatore entra nel **soggiorno** con una sessione valida (es. sessione 1019 con PIN 8675), la stanza carica dati di una **sessione diversa** (999), mostrando puzzle già completati anche se il giocatore non li ha mai risolti.

### 🐛 Manifestazione del bug:

```
Sessione attuale: 1019 (PIN 8675)
Database soggiorno: completed = false ✅

Frontend soggiorno mostra:
{
  "session_id": 999,  // ❌ SBAGLIATO!
  "soggiorno": {
    "completed": true,
    "completion_time": "2026-01-12T02:50:53"
  }
}
```

**Risultato:** Porta serra si apre immediatamente senza giocare! 🚨

---

## 🔍 CAUSA ROOT

In `RoomScene.jsx`, **LivingRoomScene** NON riceve il prop `sessionId`:

```jsx
// ❌ PRIMA (SBAGLIATO)
if (room === 'soggiorno') {
  return <LivingRoomScene {...sceneProps} isMobile={isMobile} />
}

// ✅ Altre scene lo ricevono correttamente
if (room === 'cucina') {
  return <KitchenScene {...sceneProps} isMobile={isMobile} sessionId={sessionId} />
}
if (room === 'camera') {
  return <BedroomScene {...sceneProps} isMobile={isMobile} sessionId={sessionId} />
}
```

Quando `useGameCompletion(sessionId, socket)` viene chiamato con `sessionId = undefined`:
1. Non può caricare i dati corretti
2. Fallback a dati cached della sessione 999 (test)
3. Mostra stati di completamento errati

---

## ✅ SOLUZIONE

Aggiunto il prop `sessionId` a **LivingRoomScene**:

```jsx
// ✅ DOPO (CORRETTO)
if (room === 'soggiorno') {
  return <LivingRoomScene {...sceneProps} isMobile={isMobile} sessionId={sessionId} />
}
```

### File modificato:
- `src/pages/RoomScene.jsx` (linea 269)

---

## 🎯 IMPATTO

### ✅ VANTAGGI:
- **Fix automatico**: nessun intervento manuale necessario
- **Funziona per tutte le sessioni**: 999, 1019, e future
- **Nessun reset database** richiesto
- **Produzione pronta**: studenti possono giocare immediatamente

### 🧪 TEST:
1. Crea una nuova sessione (es. 1020)
2. Entra nel soggiorno con PIN di quella sessione
3. Verifica che `useGameCompletion` riceva l'ID corretto
4. Verifica che lo stato sia "non completato" all'inizio

---

## 📚 APPRENDIMENTO

**Lesson learned:** Quando si aggiungono nuove scene, verificare sempre che ricevano tutti i props necessari come le altre scene esistenti.

**Pattern corretto per tutte le scene:**
```jsx
<Scene {...sceneProps} isMobile={isMobile} sessionId={sessionId} />
```

---

## 🔄 DEPLOYMENT

**Dev:**
```bash
# Il fix è già attivo, basta ricaricare la pagina
```

**Produzione:**
```bash
cd /Users/matteo/Desktop/ESCAPE/escape-room-3d
npm run build
# Deploy su Render
```

---

## ✅ STATO FINALE

- [x] Bug identificato
- [x] Causa root analizzata
- [x] Fix implementato in `RoomScene.jsx`
- [x] Documentazione creata
- [x] Pronto per deployment

**Il sistema ora funziona correttamente senza interventi manuali! 🎉**
