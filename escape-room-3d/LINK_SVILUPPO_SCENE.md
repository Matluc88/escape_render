# 🎮 LINK SVILUPPO SCENE - Quick Reference

**Server Vite:** `http://localhost:5173`

---

## 🔗 LINK DIRETTI ALLE SCENE (Modalità Admin)

Copia e incolla questi link nel browser per accedere direttamente alle scene con strumenti di sviluppo:

### 🏡 Esterno
```
http://localhost:5173/play/test-session/esterno?name=Admin
```

### 🍳 Cucina
```
http://localhost:5173/play/test-session/cucina?name=Admin
```

### 🛋️ Soggiorno
```
http://localhost:5173/play/test-session/soggiorno?name=Admin
```

### 🚿 Bagno
```
http://localhost:5173/play/test-session/bagno?name=Admin
```

### 🛏️ Camera
```
http://localhost:5173/play/test-session/camera?name=Admin
```

---

## 🛠️ STRUMENTI DISPONIBILI (con ?name=Admin)

- **Editor Animazioni**: Tasti K/L per salvare/caricare animazioni
- **Position Picker**: Per catturare coordinate oggetti
- **Debug Panels**: MQTT status, WebSocket info
- **Controlli Admin**: Pulsanti sviluppo e test

---

## 📝 COMANDI UTILI

### Avvia Server Sviluppo
```bash
cd escape-room-3d
npm run dev
```

### Test Mobile da Desktop
Aggiungi `&forceMobile=1` alla fine dell'URL:
```
http://localhost:5173/play/test-session/cucina?name=Admin&forceMobile=1
```

### Hot Reload
Le modifiche al codice si riflettono automaticamente senza refresh!

---

## ⚡ WORKFLOW CONSIGLIATO

1. **Avvia il server:** `npm run dev`
2. **Apri la scena** su cui vuoi lavorare
3. **Modifica il codice** in VS Code
4. **Vedi le modifiche** immediatamente nel browser
5. **Usa i tools admin** per debugging e configurazione

---

## 🔑 PARAMETRI URL

- `?name=Admin` - Modalità sviluppo con tutti gli strumenti
- `?name=NomeGiocatore` - Modalità giocatore normale (senza debug)
- `&forceMobile=1` - Forza modalità mobile
- `test-session` - ID sessione fittizio per sviluppo

---

**Ultimo aggiornamento:** 24/12/2025
