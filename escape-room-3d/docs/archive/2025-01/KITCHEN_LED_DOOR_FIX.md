# 🚪 Fix LED Porta Cucina - Lampeggiamento dopo Completamento Room

**Data fix:** 30 Dicembre 2025  
**Problema:** LED porta cucina NON lampeggia dopo completamento tutti enigmi

## 🐛 Problema Identificato

Dopo aver completato tutti e 3 gli enigmi della cucina (fornelli, frigo, serra), il LED della porta rimaneva **rosso fisso** invece di **lampeggiare verde**.

### Causa Root
Il metodo `_get_led_states()` in `kitchen_puzzle_service.py` consultava SOLO lo stato locale `puzzle_states["porta"]` e NON il sistema `game_completion` che gestisce la logica del lampeggiamento.

```python
# ❌ PRIMA (SBAGLIATO)
porta="green" if puzzle_states["porta"]["status"] == "unlocked" else "red"
```

## ✅ Soluzione Applicata

Modificato `_get_led_states()` per consultare `GameCompletionService.get_door_led_states()`:

```python
# ✅ DOPO (CORRETTO)
@staticmethod
def _get_led_states(puzzle_states: Dict[str, Any], db: Session, session_id: int) -> LEDStates:
    """
    Convert puzzle states to LED colors.
    
    Rules:
    - locked → off
    - active → red
    - done → green
    - porta: consulta game_completion per logica blinking
    """
    # Consulta game_completion per stato LED porta
    from app.services.game_completion_service import GameCompletionService
    door_led_states = GameCompletionService.get_door_led_states(db, session_id)
    
    return LEDStates(
        fornelli="green" if puzzle_states["fornelli"]["status"] == "done" else 
                "red" if puzzle_states["fornelli"]["status"] == "active" else "off",
        frigo="green" if puzzle_states["frigo"]["status"] == "done" else 
             "red" if puzzle_states["frigo"]["status"] == "active" else "off",
        serra="green" if puzzle_states["serra"]["status"] == "done" else 
             "red" if puzzle_states["serra"]["status"] == "active" else "off",
        porta=door_led_states.get("cucina", "red")  # 🆕 Usa logica game_completion
    )
```

## 🔄 Logica Lampeggiamento (da game_completion_service)

```python
def get_door_led_states(db: Session, session_id: int) -> Dict[str, str]:
    """
    Logica PER-ROOM con vittoria GLOBALE:
    - Room non completata → "red"
    - Room completata, game non vinto → "blinking" 🟢⚡
    - Game vinto (tutte 4) → "green" 🟢
    """
```

## 📝 Modifiche File

**File modificato:** `backend/app/services/kitchen_puzzle_service.py`

### 1. Firma metodo _get_led_states
```python
# PRIMA
def _get_led_states(puzzle_states: Dict[str, Any]) -> LEDStates:

# DOPO
def _get_led_states(puzzle_states: Dict[str, Any], db: Session, session_id: int) -> LEDStates:
```

### 2. Chiamata in get_state_response
```python
# PRIMA
led_states=KitchenPuzzleService._get_led_states(state.puzzle_states),

# DOPO
led_states=KitchenPuzzleService._get_led_states(state.puzzle_states, db, session_id),
```

## ✅ Comportamento Atteso

### Scenario 1: Cucina Non Completata
- **Fornelli**: 🔴 rosso (se active) o ⚫ off (se locked) o 🟢 verde (se done)
- **Frigo**: 🔴 rosso (se active) o ⚫ off (se locked) o 🟢 verde (se done)
- **Serra**: 🔴 rosso (se active) o ⚫ off (se locked) o 🟢 verde (se done)
- **Porta**: 🔴 rosso

### Scenario 2: Cucina Completata, Game Non Vinto
- **Fornelli**: 🟢 verde
- **Frigo**: 🟢 verde
- **Serra**: 🟢 verde
- **Porta**: 🟢⚡ **LAMPEGGIA** (blinking)

### Scenario 3: Tutte 4 Room Completate (Game Vinto)
- **Fornelli**: 🟢 verde
- **Frigo**: 🟢 verde
- **Serra**: 🟢 verde
- **Porta**: 🟢 verde fisso

## 🧪 Test Verificati

1. ✅ Reset cucina → LED tutti rossi/off
2. ✅ Completa fornelli → LED fornelli verde, frigo rosso attivo
3. ✅ Completa frigo → LED frigo verde, serra rossa attiva
4. ✅ Completa serra → LED serra verde, **porta lampeggia 🟢⚡**

---

**Fix completo e testato! 🚀**
