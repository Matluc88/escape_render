"""Gate Puzzle Service - Esterno"""
from sqlalchemy.orm import Session
from datetime import datetime
import asyncio
import json
from app.models.gate_puzzle import GatePuzzle
from app.services.game_completion_service import GameCompletionService
from app.mqtt_client import MQTTClient


class GatePuzzleService:
    """Service for Gate/Esterno puzzle logic"""
    
    @staticmethod
    async def _publish_mqtt_state(puzzle: GatePuzzle):
        """
        Publish gate puzzle state to MQTT for frontend animation sync.
        
        Topics:
        - escape/esterno/ir-sensor/stato
        - escape/esterno/cancello1/posizione
        - escape/esterno/cancello2/posizione
        - escape/esterno/porta/posizione
        - escape/esterno/tetto/posizione
        """
        try:
            # IR Sensor state
            ir_payload = json.dumps({
                "libero": puzzle.photocell_clear,
                "raw_value": 1 if puzzle.photocell_clear else 0
            })
            await MQTTClient.publish("escape/esterno/ir-sensor/stato", ir_payload)
            
            # Servo positions (0-90 for gates/door, 0-180 for roof)
            target_gates = 90 if puzzle.gates_open else 0
            target_door = 90 if puzzle.door_open else 0
            target_roof = 180 if puzzle.roof_open else 0
            
            # Cancello 1
            cancello1_payload = json.dumps({"position": target_gates, "target": 90})
            await MQTTClient.publish("escape/esterno/cancello1/posizione", cancello1_payload)
            
            # Cancello 2
            cancello2_payload = json.dumps({"position": target_gates, "target": 90})
            await MQTTClient.publish("escape/esterno/cancello2/posizione", cancello2_payload)
            
            # Porta
            porta_payload = json.dumps({"position": target_door, "target": 90})
            await MQTTClient.publish("escape/esterno/porta/posizione", porta_payload)
            
            # Tetto
            tetto_payload = json.dumps({"position": target_roof, "target": 180})
            await MQTTClient.publish("escape/esterno/tetto/posizione", tetto_payload)
            
            print(f"✅ [MQTT] Published gate state: gates={target_gates}, door={target_door}, roof={target_roof}")
            
        except Exception as e:
            print(f"⚠️ [MQTT] Error publishing gate state: {e}")
    
    @staticmethod
    def get_or_create(db: Session, session_id: int) -> GatePuzzle:
        """Get existing gate puzzle or create new one"""
        puzzle = db.query(GatePuzzle).filter(
            GatePuzzle.session_id == session_id
        ).first()
        
        if not puzzle:
            puzzle = GatePuzzle(session_id=session_id)
            db.add(puzzle)
            db.commit()
            db.refresh(puzzle)
        
        return puzzle
    
    @staticmethod
    def update_photocell_state(
        db: Session,
        session_id: int,
        is_clear: bool
    ) -> GatePuzzle:
        """
        Update photocell state (chiamato da ESP32) - SYNC VERSION.
        
        Args:
            is_clear: True se fotocellula LIBERA (HIGH), False se OCCUPATA (LOW)
        
        Returns:
            Updated puzzle state
        """
        puzzle = GatePuzzleService.get_or_create(db, session_id)
        
        # Update photocell state
        puzzle.photocell_clear = is_clear
        
        # Update animations state
        puzzle.gates_open = is_clear
        puzzle.door_open = is_clear
        puzzle.roof_open = is_clear
        
        # Update LED status
        puzzle.led_status = "green" if is_clear else "red"
        
        # Se fotocellula diventa libera per prima volta, marca completed_at
        if is_clear and puzzle.completed_at is None:
            puzzle.completed_at = datetime.utcnow()
            print(f"🚪 Gate puzzle completato! session_id={session_id}")
        
        # Check game completion per RGB strip
        game_state = GameCompletionService.get_or_create_state(db, session_id)
        puzzle.rgb_strip_on = is_clear and game_state.game_won
        
        db.commit()
        db.refresh(puzzle)
        
        return puzzle
    
    @staticmethod
    async def update_photocell_state_async(
        db: Session,
        session_id: int,
        is_clear: bool
    ) -> GatePuzzle:
        """
        Update photocell state (chiamato da ESP32) - ASYNC VERSION with MQTT publish.
        
        Args:
            is_clear: True se fotocellula LIBERA (HIGH), False se OCCUPATA (LOW)
        
        Returns:
            Updated puzzle state
        """
        # Use sync version for DB operations
        puzzle = GatePuzzleService.update_photocell_state(db, session_id, is_clear)
        
        # Publish state to MQTT for frontend sync
        await GatePuzzleService._publish_mqtt_state(puzzle)
        
        return puzzle
    
    @staticmethod
    def get_state(db: Session, session_id: int) -> GatePuzzle:
        """Get current gate puzzle state"""
        return GatePuzzleService.get_or_create(db, session_id)
    
    @staticmethod
    def get_esp32_state(db: Session, session_id: int) -> dict:
        """
        Get minimal state for ESP32 polling.
        
        Returns:
            {
                "rgb_strip_on": bool,
                "led_status": "red"|"green",
                "all_rooms_complete": bool
            }
        """
        puzzle = GatePuzzleService.get_or_create(db, session_id)
        game_state = GameCompletionService.get_or_create_state(db, session_id)
        
        # RGB strip ON solo se fotocellula libera AND tutte 4 stanze completate
        rgb_on = puzzle.photocell_clear and game_state.game_won
        
        return {
            "rgb_strip_on": rgb_on,
            "led_status": puzzle.led_status,
            "all_rooms_complete": game_state.game_won
        }
    
    @staticmethod
    def reset(db: Session, session_id: int) -> GatePuzzle:
        """Reset gate puzzle to initial state"""
        puzzle = GatePuzzleService.get_or_create(db, session_id)
        
        puzzle.photocell_clear = False
        puzzle.gates_open = False
        puzzle.door_open = False
        puzzle.roof_open = False
        puzzle.led_status = "red"
        puzzle.rgb_strip_on = False
        puzzle.completed_at = None
        
        db.commit()
        db.refresh(puzzle)
        
        return puzzle
    
    @staticmethod
    def is_completed(db: Session, session_id: int) -> bool:
        """Check if gate puzzle is completed (fotocellula è stata libera almeno una volta)"""
        puzzle = GatePuzzleService.get_or_create(db, session_id)
        return puzzle.completed_at is not None