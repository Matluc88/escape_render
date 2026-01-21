# 🚪 Test Rapido Porta Cucina - Guida Step-by-Step

## ⚡ Setup Veloce (2 minuti)

### Terminale 1 - Log Filtrati
```bash
cd /Users/matteo/Desktop/ESCAPE/escape-room-3d
docker logs -f escape-backend-dev 2>&1 | grep -E "🔍|LED|door_led|blinking|porta|serra|cucina|game_completion"
```
**Lascia questo terminale aperto!**

### Terminale 2 - Reset Sessione
```bash
cd /Users/matteo/Desktop/ESCAPE/escape-room-3d
docker exec -it escape-room-3d-db-1 psql -U escape_user -d escape_db -c "DELETE FROM kitchen_puzzles WHERE session_id = 999; DELETE FROM game_completion WHERE session_id = 999;"
```

## 🎮 Test (30 secondi)

1. **Apri browser:** http://localhost:5173/room/cucina?session=999

2. **Premi tasto 5** (completa serra)

3. **Guarda Terminale 1** - dovresti vedere:

### ✅ Sequenza CORRETTA:
```
🌿 [KitchenPuzzle] Serra completato
🔍 [get_door_led_states] Calculating for session 999
🔍 [get_door_led_states] cucina: room_completed=True
🔍 [get_door_led_states] cucina: LED = blinking
🚀 [API] Broadcasted game_completion_update for session 999
```

### ❌ Se vedi invece:
```
🌿 [KitchenPuzzle] Serra completato
# ... nessun log di get_door_led_states
```
**PROBLEMA:** Il completamento serra non trigghera il calcolo LED

### ❌ Oppure:
```
🔍 [get_door_led_states] cucina: room_completed=False
🔍 [get_door_led_states] cucina: LED = red
```
**PROBLEMA:** Il backend non riconosce la cucina come completata

## 🔍 Diagnostica Immediata

Se il LED NON lampeggia, verifica database:

```bash
# Stato puzzle cucina
docker exec -it escape-room-3d-db-1 psql -U escape_user -d escape_db -c "SELECT puzzle_states FROM kitchen_puzzles WHERE session_id = 999;"
```

**Cerca:** `"serra": {"status": "done"}`

Se `serra.status` è `"done"` ma LED è rosso → **BUG nel backend**

Se `serra.status` NON è `"done"` → **BUG nel completamento puzzle**

## 💡 Next Steps

### Se hai trovato il bug:
1. Copia i log dal Terminale 1
2. Incollali nel canale di supporto
3. Specifica cosa hai visto vs cosa ti aspettavi

### Se funziona correttamente:
🎉 Non c'è bug! Il sistema funziona come atteso.

---

**Tempo totale test:** ~3 minuti
