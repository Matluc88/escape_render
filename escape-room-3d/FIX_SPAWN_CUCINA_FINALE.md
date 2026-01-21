# 🔧 FIX SPAWN CUCINA - GUIDA COMPLETA

## ✅ DATABASE AGGIORNATO!

Il database Docker ha le coordinate corrette:
```
kitchen | {"yaw": 0.5, "position": {"x": -1.5, "y": 0, "z": 1.2}}
```

---

## 🚨 ADESSO FAI QUESTO (IMPORTANTE!)

### 1️⃣ Pulisci la Cache del Browser

1. **Apri** il file `PULISCI_CACHE_SPAWN.html` nel browser
2. **Clicca** sul pulsante verde **"🧹 Pulisci SOLO Cache Cucina"**
3. **Aspetta** il messaggio "✅ Cache Pulita!"

### 2️⃣ Ricarica il Gioco

- Premi `Ctrl+Shift+R` (Windows/Linux)
- Oppure `Cmd+Shift+R` (Mac)
- Oppure `Ctrl+F5`

### 3️⃣ Entra nella Cucina

Ora dovresti spawnare al **CENTRO della cucina**!

---

## 📊 Verifica nel Log

**PRIMA (cache vecchia):**
```
[API] ✅ Using cached spawn for cucina (age: 1981s)
[Kitchen] yaw: 2.45, pos: -0.90, 2.12
```

**DOPO (cache pulita):**
```
[API] 🌐 Fetching spawn from backend
[Kitchen] yaw: 0.5, pos: -1.5, 1.2
```

---

## 🎯 Coordinate Corrette

```
Position: x=-1.5, y=0, z=1.2
Yaw: 0.5 radianti (~29°)

✅ Centro della cucina
✅ Guardi verso il centro della stanza
✅ Non più vicino alla porta
```

---

## 🔍 Troubleshooting

### La cache non si pulisce?
Apri la console del browser (F12) e digita:
```javascript
localStorage.removeItem('spawn_cucina');
location.reload();
```

### Ancora coordinate vecchie?
Verifica il database:
```bash
docker-compose exec db psql -U escape_user -d escape_db -c "SELECT name, spawn_data FROM spawn_positions WHERE name='kitchen';"
```

Dovrebbe mostrare:
```
 kitchen | {"yaw": 0.5, "position": {"x": -1.5, "y": 0, "z": 1.2}}
```

---

## ✅ PROBLEM SOLVED!

Il bug era causato da:
1. ❌ Database con coordinate vecchie → **FIXATO**
2. ❌ Cache localStorage con coordinate vecchie → **DA PULIRE MANUALMENTE**

Dopo aver pulito la cache, tutto funzionerà correttamente!
