# 🧪 Test LED Fornelli - Procedura

## 📋 Passi da Seguire

### 1. Apri terminale per monitoraggio log
```bash
cd /Users/matteo/Desktop/ESCAPE/escape-room-3d
docker-compose logs -f backend | grep -i "fornelli\|reset\|complete"
```

### 2. In un altro tab/finestra, apri il gioco
```
http://localhost:5173/play/999/cucina?name=Tester
```

### 3. Premi R per resettare

### 4. Osserva i log nel terminale

## 🔍 Cosa Cercare

Se vedi questo pattern:
```
🔥 [API] /fornelli/complete called for session 999
🔥 [API] Call stack:
  File "..."
  ...
```

**Copia TUTTO** lo stack trace e inviamelo!

## ✅ Risultato Atteso

- ✅ **CORRETTO**: Solo log di reset, nessuna chiamata a `/fornelli/complete`
- ❌ **BUG**: Log di `/fornelli/complete` subito dopo il reset

## 🐛 Se Non Funziona

Se i log sono troppo veloci o non vedi niente:
```bash
cd /Users/matteo/Desktop/ESCAPE/escape-room-3d
docker-compose logs backend > /tmp/backend_logs.txt
cat /tmp/backend_logs.txt | grep -A 20 "fornelli"
```

Poi inviami l'output!
