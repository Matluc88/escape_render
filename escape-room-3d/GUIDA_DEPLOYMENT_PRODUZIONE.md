# 🚀 Guida Deployment Produzione - Escape Room 3D

## 📋 Indice

1. [Prerequisiti](#prerequisiti)
2. [Configurazione Iniziale](#configurazione-iniziale)
3. [Deployment](#deployment)
4. [Gestione e Monitoraggio](#gestione-e-monitoraggio)
5. [Backup e Restore](#backup-e-restore)
6. [Troubleshooting](#troubleshooting)
7. [Best Practices](#best-practices)

---

## 🔧 Prerequisiti

### Software Richiesto

- **Docker** >= 20.10
- **Docker Compose** >= 2.0 (o docker-compose >= 1.29)
- **Git** (per clonare il repository)

### Installazione Docker

#### macOS
```bash
# Tramite Docker Desktop
# Download da: https://www.docker.com/products/docker-desktop

# Oppure via Homebrew
brew install --cask docker
```

#### Linux (Ubuntu/Debian)
```bash
# Installa Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Aggiungi utente al gruppo docker
sudo usermod -aG docker $USER
newgrp docker

# Installa Docker Compose
sudo apt-get update
sudo apt-get install docker-compose-plugin
```

#### Verifica Installazione
```bash
docker --version
docker compose version
```

### Requisiti Hardware

#### Minimo
- CPU: 2 core
- RAM: 2GB
- Disco: 10GB disponibili

#### Consigliato
- CPU: 4+ core
- RAM: 4GB+
- Disco: 20GB+ disponibili
- SSD preferibile

---

## ⚙️ Configurazione Iniziale

### 1. Clone del Repository

```bash
git clone <repository-url>
cd escape-room-3d
```

### 2. Configurazione Ambiente di Produzione

Copia il file di esempio e modificalo:

```bash
cp .env.production.example .env.production
nano .env.production
```

### 3. Configurazioni Obbligatorie

⚠️ **IMPORTANTE**: Modifica TUTTI i seguenti parametri!

#### Password Database

```bash
# Genera una password sicura
openssl rand -base64 32

# Inserisci in .env.production
POSTGRES_PASSWORD=<password-generata>
```

#### Secret Key Backend

```bash
# Genera secret key
openssl rand -base64 48

# Inserisci in .env.production
SECRET_KEY=<secret-key-generata>
```

#### CORS Origins

Sostituisci con il tuo dominio:

```env
CORS_ORIGINS=https://tuodominio.com,https://www.tuodominio.com
```

### 4. Configurazione Porte

Di default l'applicazione usa la porta 80:

```env
FRONTEND_PORT=80
```

Se necessario, cambia la porta (es. 8080):

```env
FRONTEND_PORT=8080
```

---

## 🚀 Deployment

### Deploy Automatico (Consigliato)

```bash
# Rendi eseguibile lo script
chmod +x deploy-production.sh

# Esegui il deployment
./deploy-production.sh
```

Lo script eseguirà automaticamente:
1. ✅ Verifica prerequisiti
2. ✅ Controllo configurazione
3. ✅ Backup dati esistenti (se presenti)
4. ✅ Stop container vecchi
5. ✅ Pull immagini aggiornate
6. ✅ Build applicazione
7. ✅ Avvio servizi
8. ✅ Verifica health check

### Deploy Manuale

Se preferisci controllare ogni step:

```bash
# 1. Build immagini
docker compose --env-file .env.production build

# 2. Avvia servizi
docker compose --env-file .env.production up -d

# 3. Verifica stato
docker compose --env-file .env.production ps
```

### Verifica Deployment

```bash
# Controlla i logs
docker compose --env-file .env.production logs -f

# Verifica health check
docker ps

# Test applicazione
curl http://localhost/health
```

---

## 📊 Gestione e Monitoraggio

### Comandi Utili

#### Visualizza Stato Container

```bash
docker compose --env-file .env.production ps
```

#### Visualizza Logs

```bash
# Tutti i servizi
docker compose --env-file .env.production logs -f

# Servizio specifico
docker compose --env-file .env.production logs -f frontend
docker compose --env-file .env.production logs -f backend
docker compose --env-file .env.production logs -f db
```

#### Restart Servizi

```bash
# Tutti i servizi
docker compose --env-file .env.production restart

# Servizio specifico
docker compose --env-file .env.production restart backend
```

#### Stop/Start

```bash
# Stop
docker compose --env-file .env.production stop

# Start
docker compose --env-file .env.production start

# Down (rimuove container)
docker compose --env-file .env.production down
```

### Monitoraggio Risorse

```bash
# Uso risorse container
docker stats

# Spazio disco
docker system df

# Dettagli specifici
docker inspect escape-frontend
docker inspect escape-backend
docker inspect escape-db
```

### Accesso Container

```bash
# Shell frontend (nginx)
docker exec -it escape-frontend sh

# Shell backend
docker exec -it escape-backend bash

# Shell database
docker exec -it escape-db psql -U escape_user -d escape_db

# Shell MQTT
docker exec -it escape-mqtt sh
```

---

## 💾 Backup e Restore

### Backup Automatico

```bash
# Rendi eseguibile lo script
chmod +x backup.sh

# Esegui backup
./backup.sh
```

Il backup include:
- ✅ Database PostgreSQL (dump completo)
- ✅ File .env.production
- ✅ Configurazione Nginx
- ✅ Configurazione MQTT
- ✅ docker-compose.yml

I backup vengono salvati in `./backups/` e compressi automaticamente.

### Backup Manuale Database

```bash
# Backup database
docker exec escape-db pg_dump -U escape_user -F c escape_db > backup_$(date +%Y%m%d).dump

# Backup in SQL
docker exec escape-db pg_dump -U escape_user escape_db > backup_$(date +%Y%m%d).sql
```

### Restore da Backup

```bash
# Rendi eseguibile lo script
chmod +x restore.sh

# Lista backup disponibili
./restore.sh

# Restore specifico
./restore.sh 20241218_220000
```

⚠️ **ATTENZIONE**: Il restore sovrascrive tutti i dati esistenti!

### Backup Programmati (Cron)

Per backup automatici giornalieri:

```bash
# Apri crontab
crontab -e

# Aggiungi backup giornaliero alle 2:00 AM
0 2 * * * cd /path/to/escape-room-3d && ./backup.sh >> /var/log/escape-backup.log 2>&1
```

---

## 🔍 Troubleshooting

### Container Non Si Avvia

```bash
# Verifica logs
docker compose --env-file .env.production logs

# Verifica configurazione
docker compose --env-file .env.production config

# Ricostruisci container
docker compose --env-file .env.production up -d --build --force-recreate
```

### Database Non Si Connette

```bash
# Verifica che il DB sia in esecuzione
docker ps | grep escape-db

# Verifica logs DB
docker compose --env-file .env.production logs db

# Test connessione
docker exec escape-db pg_isready -U escape_user

# Verifica password in .env.production
grep POSTGRES_PASSWORD .env.production
```

### Frontend Non Raggiungibile

```bash
# Verifica porta esposta
docker ps | grep escape-frontend

# Test health check
curl http://localhost/health

# Verifica configurazione Nginx
docker exec escape-frontend cat /etc/nginx/nginx.conf

# Reload configurazione Nginx
docker exec escape-frontend nginx -s reload
```

### Backend API Non Risponde

```bash
# Verifica logs backend
docker compose --env-file .env.production logs backend

# Test endpoint
curl http://localhost/api/health

# Verifica variabili ambiente
docker exec escape-backend env | grep DATABASE_URL
```

### Spazio Disco Esaurito

```bash
# Verifica spazio
docker system df

# Pulizia immagini non usate
docker image prune -a

# Pulizia volumi non usati
docker volume prune

# Pulizia completa
docker system prune -a --volumes
```

### Performance Lente

```bash
# Verifica risorse
docker stats

# Aumenta limiti memoria in .env.production
DB_MEMORY_LIMIT=1G
MQTT_MEMORY_LIMIT=256M

# Riavvia con nuove impostazioni
docker compose --env-file .env.production up -d
```

---

## 🛡️ Best Practices

### Sicurezza

#### 1. Password Forti
```bash
# Usa sempre password generate casualmente
openssl rand -base64 32
```

#### 2. HTTPS/SSL
```bash
# Usa un reverse proxy come Nginx o Traefik con Let's Encrypt
# Esempio Nginx con Certbot:
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d tuodominio.com
```

#### 3. Firewall
```bash
# Chiudi tutte le porte eccetto quelle necessarie
sudo ufw allow 22/tcp   # SSH
sudo ufw allow 80/tcp   # HTTP
sudo ufw allow 443/tcp  # HTTPS
sudo ufw enable
```

#### 4. Aggiornamenti Regolari
```bash
# Aggiorna immagini Docker
docker compose --env-file .env.production pull
docker compose --env-file .env.production up -d
```

### Monitoraggio

#### 1. Logs Centralizzati
Considera l'uso di:
- ELK Stack (Elasticsearch, Logstash, Kibana)
- Graylog
- Splunk

#### 2. Metriche
- Prometheus + Grafana
- DataDog
- New Relic

#### 3. Alerting
Configura alert per:
- Container down
- Uso CPU/RAM elevato
- Spazio disco basso
- Errori applicazione

### Backup

#### 1. Strategia 3-2-1
- 3 copie dei dati
- 2 media diversi
- 1 copia offsite

#### 2. Test Restore
```bash
# Testa regolarmente il restore
./restore.sh <ultimo-backup>
```

#### 3. Backup Offsite
```bash
# Sincronizza backup su storage remoto
rsync -avz ./backups/ user@remote:/path/to/backups/

# O usa cloud storage
rclone sync ./backups/ remote:backups/
```

### Performance

#### 1. Ottimizza Database
```sql
-- Esegui VACUUM periodicamente
docker exec escape-db psql -U escape_user -d escape_db -c "VACUUM ANALYZE;"
```

#### 2. Cache
- Usa CDN per asset statici
- Configura cache HTTP headers
- Considera Redis per cache backend

#### 3. Monitoring
```bash
# Installa ctop per monitoring container
sudo wget https://github.com/bcicen/ctop/releases/download/v0.7.7/ctop-0.7.7-linux-amd64 -O /usr/local/bin/ctop
sudo chmod +x /usr/local/bin/ctop
ctop
```

---

## 📚 Risorse Aggiuntive

### Documentazione
- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Reference](https://docs.docker.com/compose/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Nginx Documentation](https://nginx.org/en/docs/)

### Tool Utili
- **Portainer**: GUI per gestione Docker
- **Dozzle**: Log viewer per Docker
- **Watchtower**: Auto-update container

### Comandi Rapidi

```bash
# Status completo
docker compose --env-file .env.production ps && docker stats --no-stream

# Logs ultimi 100 righe
docker compose --env-file .env.production logs --tail=100

# Restart rapido
docker compose --env-file .env.production restart

# Update e restart
docker compose --env-file .env.production pull && \
docker compose --env-file .env.production up -d && \
docker compose --env-file .env.production ps
```

---

## 🆘 Supporto

Per problemi o domande:
1. Controlla i logs: `docker compose logs`
2. Verifica la configurazione: `docker compose config`
3. Consulta la documentazione
4. Apri una issue sul repository

---

**📅 Ultima modifica**: 18 Dicembre 2024  
**✍️ Autore**: Escape Room 3D Team  
**📝 Versione**: 1.0.0
