# 🚀 Deploy su Raspberry Pi con Rebuild Frontend

## ✅ PROBLEMA RISOLTO

**Problema**: Il deploy precedente non includeva il rebuild del frontend (`npm run build`)
**Soluzione**: Modificato `prepare-deploy.sh` per includere automaticamente `npm run build`

## 📋 Cosa è stato fatto

### 1. Modifica a `prepare-deploy.sh`

Aggiunto step di build frontend:
```bash
# Build frontend
echo "🔨 Build frontend (npm run build)..."
cd "$PROJECT_DIR"
if [ -f "package.json" ]; then
    echo "   - Installazione dipendenze..."
    npm install
    echo "   - Building frontend..."
    npm run build
    echo "✅ Frontend buildato!"
fi
```

### 2. Nuovo tar.gz creato

- **File**: `/Users/matteo/Desktop/ESCAPE/escape-room-deploy.tar.gz`
- **Dimensione**: 272M
- **Contenuto**: Frontend buildato + Backend completo

## 🚀 Deploy sul Raspberry

### Opzione A: Deploy Automatico

```bash
cd /Users/matteo/Desktop/ESCAPE/escape-room-3d
bash deploy-404fix.sh
```

**NOTA**: Modifica `deploy-404fix.sh` per usare il tar corretto:
```bash
TAR_FILE="../escape-room-deploy.tar.gz"  # invece di escape-room-deploy-404fix.tar.gz
```

### Opzione B: Deploy Manuale

1. **Trasferisci il tar.gz**:
```bash
scp /Users/matteo/Desktop/ESCAPE/escape-room-deploy.tar.gz pi@192.168.8.10:/home/pi/
```

2. **Connettiti al Raspberry**:
```bash
ssh pi@192.168.8.10
```

3. **Estrai e rebuild**:
```bash
# Backup vecchio progetto
[ -d escape-room-3d ] && mv escape-room-3d escape-room-3d.backup.$(date +%Y%m%d-%H%M%S)

# Estrai nuovo progetto
mkdir -p escape-room-3d
cd escape-room-3d
tar -xzf ~/escape-room-deploy.tar.gz

# Rebuild container Docker
docker-compose down
docker-compose build --no-cache
docker-compose up -d

# Attendi avvio
sleep 15

# Verifica
docker-compose ps
curl http://localhost:8001/api/sessions/active
```

4. **Test frontend**:
- Apri browser: `http://192.168.8.10`
- Verifica che vedi le modifiche più recenti

## ✅ Verifica Deploy

### Backend
```bash
curl http://192.168.8.10:8001/api/sessions/active
curl http://192.168.8.10:8001/docs
```

### Frontend
- URL: `http://192.168.8.10`
- Controlla timestamp build nella console del browser
- Verifica che le modifiche recenti siano presenti

## 📝 Note Importanti

1. **Sempre fare rebuild locale**: Da ora in poi, `prepare-deploy.sh` farà automaticamente `npm run build`
2. **Cache browser**: Dopo il deploy, fare hard refresh (`Ctrl+Shift+R` o `Cmd+Shift+R`)
3. **Docker build**: Sul Raspberry, `docker-compose build` ricompila i container con i nuovi file

## 🔄 Workflow futuro

Ogni volta che modifichi il frontend:

```bash
# 1. Prepara deploy (include npm run build automaticamente)
cd /Users/matteo/Desktop/ESCAPE/escape-room-3d
bash prepare-deploy.sh

# 2. Trasferisci e deploya
bash deploy-404fix.sh
# (o manualmente come sopra)
```

## 🎯 Checklist Deploy

- [x] Frontend buildato con `npm run build`
- [x] Tar.gz creato con frontend compilato
- [ ] Tar.gz trasferito su Raspberry
- [ ] Docker containers rebuilded sul Raspberry
- [ ] Frontend testato e funzionante
- [ ] Backend testato e funzionante

---

**Data fix**: 14/01/2026 19:19
**Problema**: Mancava npm run build nel workflow di deploy
**Soluzione**: Integrato build automatico in prepare-deploy.sh
