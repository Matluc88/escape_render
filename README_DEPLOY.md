# 🚀 Deploy Rapido su Raspberry Pi

## Comando Unico per Deploy Completo

```bash
cd /Users/matteo/Desktop/ESCAPE
./deploy-raspberry-full-update.sh
```

## Cosa Fa Automaticamente

✅ Build frontend (`npm run build`)  
✅ Pulizia file temporanei  
✅ Creazione archivio  
✅ Trasferimento su Raspberry Pi  
✅ Backup automatico versione precedente  
✅ Rebuild container Docker (senza cache)  
✅ Restart servizi  
✅ Test endpoint automatici  

## Tempo Richiesto

⏱️ **~5-8 minuti** (deploy completo end-to-end)

## Prerequisiti

Installa solo la prima volta:

```bash
brew install sshpass
```

## Dopo il Deploy

Apri browser: **http://192.168.8.10**

Se vedi problemi di cache:
- `Cmd+Shift+R` (Mac) per hard refresh
- Oppure DevTools → Click destro su Refresh → "Svuota cache e ricaricamento forzato"

## Logs e Diagnostica

```bash
# Logs in tempo reale
ssh pi@192.168.8.10 'cd escape-room-3d && docker compose logs -f'

# Status containers
ssh pi@192.168.8.10 'cd escape-room-3d && docker compose ps'

# Restart
ssh pi@192.168.8.10 'cd escape-room-3d && docker compose restart'
```

## Documentazione Completa

📖 Vedi: [DEPLOY_FULL_UPDATE_GUIDE.md](DEPLOY_FULL_UPDATE_GUIDE.md)

---

**Ultimo aggiornamento**: 17/01/2026