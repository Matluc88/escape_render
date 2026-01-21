# 🔍 VERIFICA ALLINEAMENTO MODELLI 3D - Docker Locale vs Raspberry Pi

**Data:** 17 Gennaio 2026, 09:49  
**Scopo:** Verificare che i file .glb siano identici tra ambiente locale e Raspberry Pi

---

## 📊 FILE LOCALI (macOS Docker)

**Directory:** `/Users/matteo/Desktop/ESCAPE/escape-room-3d/public/models/`

| File | Dimensione | MD5 Hash | Note |
|------|-----------|----------|------|
| **casa.glb** | 88 MB | `187a92df7448a5d9b60c0a352e7996c7` | 🎯 MODELLO ATTUALE |
| **casa_old_funzionante.glb** | 205 MB | `9a694e81a84db7c370613811fc6504cb` | 📦 BACKUP VECCHIO |

---

## 🔐 CONNESSIONE RASPBERRY PI FALLITA

```
❌ Permission denied (publickey,password)
   Host: pi@192.168.8.10
   Errore: SSH non configurato con chiave pubblica
```

---

## 📋 COMANDI PER VERIFICA MANUALE SU RASPBERRY

### 1️⃣ Connettiti al Raspberry Pi

```bash
ssh pi@192.168.8.10
# (inserisci password manualmente)
```

### 2️⃣ Verifica file presenti

```bash
cd /home/pi/escape-room-3d/public/models
ls -lh *.glb
```

**Output atteso:**
```
88M casa.glb
205M casa_old_funzionante.glb
```

### 3️⃣ Calcola MD5 Hash sul Raspberry

```bash
md5sum *.glb
```

**Output da confrontare con locale:**
```
187a92df7448a5d9b60c0a352e7996c7  casa.glb
9a694e81a84db7c370613811fc6504cb  casa_old_funzionante.glb
```

### 4️⃣ Verifica Hash in Container Docker

```bash
# Sul Raspberry Pi
docker exec escape-room-frontend ls -lh /app/public/models/*.glb
docker exec escape-room-frontend md5sum /app/public/models/*.glb
```

---

## ✅ VERIFICA ALLINEAMENTO

### Se gli hash MD5 COINCIDONO:
✅ **I file sono IDENTICI** - Docker locale e Raspberry sono allineati!

### Se gli hash MD5 SONO DIVERSI:
❌ **I file sono DIVERSI** - Necessario sincronizzare!

---

## 🚀 PROCEDURA DI SINCRONIZZAZIONE (se necessario)

### Opzione 1: Copia da locale a Raspberry

```bash
# Dal tuo Mac
scp escape-room-3d/public/models/casa.glb pi@192.168.8.10:/home/pi/escape-room-3d/public/models/
```

### Opzione 2: Rebuild Docker con nuovo modello

```bash
# Sul Raspberry Pi
cd /home/pi/escape-room-3d
docker-compose down
docker-compose up -d --build
```

---

## 📦 INFO TECNICHE

### File `casa.glb` (88 MB)
- **Compressione:** Draco (attiva)
- **Formato:** glTF Binary (.glb)
- **Textures:** Embedded
- **Ottimizzato:** ✅ Sì (da 205MB → 88MB)

### File `casa_old_funzionante.glb` (205 MB)
- **Compressione:** Nessuna
- **Formato:** glTF Binary (.glb)
- **Textures:** Embedded
- **Stato:** 📦 Backup (NON usato in produzione)

---

## 🔧 TROUBLESHOOTING

### Problema: SSH Permission Denied

**Soluzione 1 - Setup SSH Key:**
```bash
# Sul tuo Mac
ssh-keygen -t rsa -b 4096 -C "matteo@macbook"
ssh-copy-id pi@192.168.8.10
```

**Soluzione 2 - Password SSH:**
```bash
# Usa -o per forzare password auth
ssh -o PreferredAuthentications=password pi@192.168.8.10
```

### Problema: File diversi dopo rebuild

**Causa:** Docker usa cache vecchia  
**Soluzione:**
```bash
docker-compose build --no-cache
docker-compose up -d
```

---

## 📊 CONFRONTO DIMENSIONI

| Versione | Dimensione | Riduzione |
|----------|-----------|-----------|
| Originale (`casa_old_funzionante.glb`) | 205 MB | - |
| Ottimizzata (`casa.glb`) | 88 MB | **-57%** 🎉 |

**Tempo di caricamento stimato (4G LTE - 10 Mbps):**
- Originale: ~164 secondi
- Ottimizzata: ~70 secondi
- **Risparmio:** ~94 secondi! ⚡

---

## 🎯 NEXT STEPS

1. ✅ **Connettiti al Raspberry Pi** manualmente
2. ✅ **Esegui i comandi di verifica** sopra
3. ✅ **Confronta gli hash MD5**
4. ✅ **Se diversi:** Sincronizza i file
5. ✅ **Se uguali:** Tutto OK! 🎉

---

## 📝 CHECKLIST VERIFICA

```
[ ] Connesso a Raspberry Pi via SSH
[ ] Verificato presenza file casa.glb (88MB)
[ ] Calcolato MD5 su Raspberry: 187a92df7448a5d9b60c0a352e7996c7
[ ] Verificato file in Docker container
[ ] Confrontato hash locale vs Raspberry
[ ] Allineamento confermato ✅ / Sincronizzazione necessaria ❌
```

---

## 🔗 RIFERIMENTI

- **Deploy Guide:** `DEPLOY_RASPBERRY_MANGO_COMPLETO.md`
- **Docker Guide:** `DOCKER_DEPLOYMENT_GUIDE.md`
- **Modelli 3D:** `escape-room-3d/public/models/`

---

**Timestamp:** 17/01/2026 09:49:22  
**Sistema:** macOS → Raspberry Pi  
**Stato:** ⏳ Verifica manuale richiesta