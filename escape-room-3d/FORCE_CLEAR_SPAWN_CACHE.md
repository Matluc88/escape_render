# 🚨 FORZA PULIZIA CACHE - CONSOLE BROWSER

## ⚠️ IL BOTTONE HTML NON HA FUNZIONATO!

Usa la **CONSOLE DEL BROWSER** invece:

### 📋 PASSO-PASSO

1. **Apri** la console del browser:
   - **Mac**: `Cmd+Option+J` (Chrome) o `Cmd+Option+C` (Safari)
   - **Windows**: `Ctrl+Shift+J` (Chrome) o `F12`

2. **Copia e incolla** questo comando:
   ```javascript
   localStorage.removeItem('spawn_cucina');
   console.log('✅ Cache cucina RIMOSSA!');
   location.reload();
   ```

3. **Premi INVIO** → Il gioco si ricarica automaticamente

---

## 🔍 Verifica Che Funzioni

Dopo il reload, cerca nel log:
```
[API] 🌐 Fetching spawn from backend  ← ✅ GOOD!
[FPS] Pos: -1.50, 1.40, 1.20  ← ✅ NUOVE COORDINATE!
```

**PRIMA (cache):** `age: 2326s`, `Pos: -0.90, 2.12`  
**DOPO (pulito):** `Fetching from backend`, `Pos: -1.50, 1.20`

---

## ❓ Perché il Bottone Non Ha Funzionato?

Probabilmente:
- File HTML aperto come `file://` invece che `http://`
- Vincoli del browser su `localStorage` locale
- Serve aprire da server web o usare console

**SOLUZIONE VELOCE = CONSOLE!** ⚡
