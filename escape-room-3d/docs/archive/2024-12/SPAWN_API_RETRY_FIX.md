# 🔄 Fix Race Condition - Sistema Retry API Spawn

## ❌ Problema Risolto

All'avvio dell'applicazione, la chiamata API per caricare le coordinate spawn falliva con **Network Error** a causa di una race condition: il frontend cercava di caricare i dati prima che il backend fosse completamente pronto.

### Log Errore Originale
```
[API] ❌ Error fetching spawn for camera: Network Error
[CameraPositioning] ⚠️ No spawn data in database for camera, using fallback
```

## ✅ Soluzione Implementata

Ho implementato un **doppio sistema di resilienza** in `src/utils/api.js`:

### 🎯 Opzione A: Retry Automatico con Exponential Backoff

La funzione `fetchSpawnPosition` ora riprova automaticamente in caso di errore:

```javascript
const MAX_RETRIES = 3
const RETRY_DELAYS = [500, 1000, 2000] // ms - 0.5s, 1s, 2s
```

**Sequenza di retry:**
1. Tentativo iniziale → FAIL
2. Retry dopo 500ms → FAIL
3. Retry dopo 1000ms → FAIL  
4. Retry dopo 2000ms → FAIL
5. Usa fallback

### ⏱️ Opzione B: Delay Iniziale

Prima del primo tentativo, aspetta 100ms per dare tempo al backend di inizializzarsi:

```javascript
const INITIAL_DELAY = 100 // ms
if (retryCount === 0) {
  await new Promise(resolve => setTimeout(resolve, INITIAL_DELAY))
}
```

## 📊 Comportamento Nuovo

### Caso 1: Backend Pronto
```
[API] 🌐 Fetching spawn from backend: /rooms/camera/spawn
[API] ✅ Fetched and cached spawn for camera: {position: {...}, yaw: 0.63}
```
✅ Caricamento immediato (con delay di 100ms)

### Caso 2: Backend Lento
```
[API] 🌐 Fetching spawn from backend: /rooms/camera/spawn
[API] ⚠️ Error fetching spawn for camera: Network Error
[API] 🔄 Retrying in 500ms... (attempt 1/3)
[API] 🌐 Fetching spawn from backend: /rooms/camera/spawn (retry 1/3)
[API] ✅ Fetched and cached spawn for camera: {position: {...}, yaw: 0.63}
```
✅ Riprova automaticamente fino al successo

### Caso 3: Backend Offline
```
[API] 🌐 Fetching spawn from backend: /rooms/camera/spawn
[API] ⚠️ Error fetching spawn for camera: Network Error
[API] 🔄 Retrying in 500ms... (attempt 1/3)
[API] 🌐 Fetching spawn from backend: /rooms/camera/spawn (retry 1/3)
[API] ⚠️ Error fetching spawn for camera: Network Error
[API] 🔄 Retrying in 1000ms... (attempt 2/3)
[API] 🌐 Fetching spawn from backend: /rooms/camera/spawn (retry 2/3)
[API] ⚠️ Error fetching spawn for camera: Network Error
[API] 🔄 Retrying in 2000ms... (attempt 3/3)
[API] 🌐 Fetching spawn from backend: /rooms/camera/spawn (retry 3/3)
[API] ❌ Failed to fetch spawn for camera after 3 retries: Network Error
[CameraPositioning] ⚠️ No spawn data in database for camera, using fallback
```
✅ Usa fallback dopo tutti i tentativi

## 🎯 Vantaggi

1. **Resilienza**: Sistema più robusto contro problemi di rete temporanei
2. **User Experience**: Caricamento invisibile all'utente (retry automatici)
3. **Debugging**: Log chiari per capire cosa sta succedendo
4. **Fallback Garantito**: Il gioco funziona sempre grazie alle coordinate hardcoded

## ⚙️ Parametri Configurabili

```javascript
const MAX_RETRIES = 3              // Numero massimo di retry
const INITIAL_DELAY = 100          // Delay iniziale (ms)
const RETRY_DELAYS = [500, 1000, 2000]  // Exponential backoff (ms)
const CACHE_TTL = 60 * 60 * 1000   // Cache duration (1 ora)
```

## 📝 File Modificato

- `/src/utils/api.js` - Funzione `fetchSpawnPosition()` con retry logic

## 🧪 Test

Per testare il sistema di retry:

```bash
# 1. Ferma il backend
docker-compose stop backend

# 2. Apri l'app - vedrai i retry
# 3. Durante i retry, riavvia il backend
docker-compose start backend

# 4. Il sistema dovrebbe recuperare automaticamente
```

## ✅ Risultato

- ✅ Nessun più "Network Error" all'avvio normale
- ✅ Caricamento affidabile anche con backend lento
- ✅ Fallback automatico se backend offline
- ✅ Log chiari per debugging

---
**Data fix:** 27 Dicembre 2025  
**Problema:** Race condition Network Error all'avvio  
**Soluzione:** Retry automatico + Delay iniziale  
**Stato:** ✅ Implementato e testato
