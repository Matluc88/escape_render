# ⚡ Avvio Rapido - 3 Comandi

> **Per avviare tutto il progetto (Frontend + Backend + Database + MQTT) su Docker**

---

## 🚀 Avvio in 3 Step

```bash
# 1. Vai nella directory
cd escape-room-3d

# 2. Avvia tutto
./docker.sh start

# 3. Apri il browser dopo 5-10 minuti
open http://localhost
```

**Fatto! 🎉**

---

## 📝 Altri Comandi Utili

```bash
# Vedere i logs
./docker.sh logs

# Fermare tutto
./docker.sh stop

# Vedere lo status
./docker.sh status

# Vedere tutti i comandi
./docker.sh help
```

---

## 🔧 Se Hai Problemi

### Porta 80 occupata?

```bash
# Nel file .env cambia la porta
FRONTEND_PORT=8080

# Riavvia
./docker.sh restart

# Poi apri: http://localhost:8080
```

### Container non partono?

```bash
# Vedi cosa è successo
./docker.sh logs

# Verifica Docker
docker --version
docker compose version
```

### Vuoi ricominciare da zero?

```bash
# Pulisci tutto e riparti
./docker.sh clean
./docker.sh start
```

---

## 📚 Documentazione Completa

- **[README_DOCKER.md](README_DOCKER.md)** - Overview completa
- **[GUIDA_DOCKER.md](GUIDA_DOCKER.md)** - Guida dettagliata in italiano
- **[docker.sh](docker.sh)** - Script con tutti i comandi

---

## 🥧 Su Raspberry Pi?

```bash
# 1. Trova l'IP del Raspberry Pi
hostname -I

# 2. Modifica .env e aggiungi l'IP in CORS_ORIGINS
nano .env
# CORS_ORIGINS=http://localhost,http://192.168.1.100

# 3. Avvia
./docker.sh start

# 4. Accedi da qualsiasi dispositivo
http://192.168.1.100
```

---

**Tutto qui! 🚀**

Per domande: leggi [GUIDA_DOCKER.md](GUIDA_DOCKER.md)
