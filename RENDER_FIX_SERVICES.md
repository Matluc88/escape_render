# 🔧 Fix Servizi Render Esistenti

## Problema

I servizi sono stati creati manualmente PRIMA del `render.yaml`, quindi hanno la configurazione sbagliata dei percorsi.

## ✅ Soluzione 1: Usa Blueprint (Consigliato - Più Veloce)

### 1. Elimina i servizi esistenti

**Nel Dashboard Render:**
1. Vai su **escape-room-backend** → Settings → "Delete Web Service"
2. Vai su **escape-room-frontend** → Settings → "Delete Static Site"
3. (Mantieni il database `escape-room-db`)

### 2. Crea nuovo Blueprint

1. Click **"New"** → **"Blueprint"**
2. Connetti repository: `Matluc88/escape_render`
3. Render rileverà automaticamente `render.yaml`
4. **IMPORTANTE**: Nella configurazione Blueprint:
   - Assicurati che il database esistente sia selezionato
   - O lascia che ne crei uno nuovo
5. Click **"Apply"**

✅ Done! Render creerà tutto automaticamente con i percorsi corretti.

---

## ✅ Soluzione 2: Aggiorna Manualmente i Servizi Esistenti

Se preferisci NON eliminare i servizi:

### Backend (escape-room-backend)

1. Vai su **escape-room-backend** → Settings
2. **Root Directory**: Cambia da `backend` a → `escape-room-3d/backend`
3. **Dockerfile Path**: Assicurati sia `./Dockerfile`
4. Click **"Save Changes"**
5. Vai su "Manual Deploy" → "Deploy latest commit"

### Frontend (escape-room-frontend)

1. Vai su **escape-room-frontend** → Settings
2. **Root Directory**: Cambia a → `escape-room-3d`
3. **Build Command**: 
   ```bash
   npm install && npm run build
   ```
4. **Publish Directory**: `dist`
5. Click **"Save Changes"**
6. Vai su "Manual Deploy" → "Deploy latest commit"

---

## ⚡ Quick Fix (Se hai accesso SSH)

Puoi anche aggiornare solo i percorsi:

### Backend
```
Root Directory: escape-room-3d/backend
```

### Frontend  
```
Root Directory: escape-room-3d
Build Command: npm install && npm run build
Publish Directory: dist
```

---

## 🔍 Verifica Configurazione Corretta

### Backend dovrebbe avere:
- ✅ Root Directory: `escape-room-3d/backend`
- ✅ Runtime: Docker
- ✅ Dockerfile Path: `./Dockerfile`
- ✅ Docker Context: `.`
- ✅ Health Check Path: `/health`

### Frontend dovrebbe avere:
- ✅ Root Directory: `escape-room-3d`
- ✅ Build Command: `npm install && npm run build`
- ✅ Publish Directory: `dist`

---

## 🎯 Raccomandazione

**Usa Soluzione 1** (Blueprint) perché:
- ✅ Configurazione automatica garantita
- ✅ Nessun errore di percorsi
- ✅ Variabili d'ambiente configurate automaticamente
- ✅ Più veloce e affidabile

Il database esistente verrà preservato anche se elimini i servizi web.