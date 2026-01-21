from sqlalchemy.orm import Session
from typing import List, Optional
from app.models.puzzle import Puzzle
from app.models.game_session import GameSession
from datetime import datetime


class PuzzleService:
    def __init__(self, db: Session):
        self.db = db

    def initialize_puzzles_for_session(self, session_id: int) -> List[Puzzle]:
        """Inizializza tutti gli enigmi per una sessione
        - Esterno: 1 enigma
        - Cucina, Soggiorno, Bagno, Camera: 3 enigmi ciascuna
        - Totale: 13 enigmi
        """
        puzzles = []
        
        # Esterno: 1 enigma
        puzzles.append(Puzzle(
            session_id=session_id,
            room="esterno",
            puzzle_number=1,
            puzzle_name="Cancello principale"
        ))
        
        # Altre stanze: 3 enigmi ciascuna
        rooms = ["cucina", "soggiorno", "bagno", "camera"]
        for room in rooms:
            for puzzle_num in range(1, 4):
                puzzles.append(Puzzle(
                    session_id=session_id,
                    room=room,
                    puzzle_number=puzzle_num,
                    puzzle_name=f"{room.capitalize()} - Enigma {puzzle_num}"
                ))
        
        self.db.add_all(puzzles)
        self.db.commit()
        
        for puzzle in puzzles:
            self.db.refresh(puzzle)
        
        return puzzles

    def get_puzzle(self, session_id: int, room: str, puzzle_number: int) -> Optional[Puzzle]:
        """Ottiene un enigma specifico"""
        return self.db.query(Puzzle).filter(
            Puzzle.session_id == session_id,
            Puzzle.room == room,
            Puzzle.puzzle_number == puzzle_number
        ).first()

    def get_puzzles_by_session(self, session_id: int) -> List[Puzzle]:
        """Ottiene tutti gli enigmi di una sessione"""
        return self.db.query(Puzzle).filter(Puzzle.session_id == session_id).order_by(
            Puzzle.room, Puzzle.puzzle_number
        ).all()

    def get_puzzles_by_room(self, session_id: int, room: str) -> List[Puzzle]:
        """Ottiene tutti gli enigmi di una stanza"""
        return self.db.query(Puzzle).filter(
            Puzzle.session_id == session_id,
            Puzzle.room == room
        ).order_by(Puzzle.puzzle_number).all()

    def solve_puzzle(self, session_id: int, room: str, puzzle_number: int, solved_by: str) -> Optional[Puzzle]:
        """Segna un enigma come risolto"""
        puzzle = self.get_puzzle(session_id, room, puzzle_number)
        if puzzle and not puzzle.solved:
            puzzle.solved = True
            puzzle.solved_by = solved_by
            puzzle.solved_at = datetime.utcnow()
            self.db.commit()
            self.db.refresh(puzzle)
        return puzzle

    def is_puzzle_solved(self, session_id: int, room: str, puzzle_number: int) -> bool:
        """Verifica se un enigma è stato risolto"""
        puzzle = self.get_puzzle(session_id, room, puzzle_number)
        return puzzle.solved if puzzle else False

    def get_room_progress(self, session_id: int, room: str) -> dict:
        """Ottiene il progresso degli enigmi in una stanza"""
        puzzles = self.get_puzzles_by_room(session_id, room)
        total = len(puzzles)
        solved = sum(1 for p in puzzles if p.solved)
        
        return {
            "room": room,
            "total": total,
            "solved": solved,
            "percentage": (solved / total * 100) if total > 0 else 0,
            "puzzles": [p.to_dict() for p in puzzles]
        }

    def get_session_progress(self, session_id: int) -> dict:
        """Ottiene il progresso totale della sessione"""
        puzzles = self.get_puzzles_by_session(session_id)
        total = len(puzzles)
        solved = sum(1 for p in puzzles if p.solved)
        
        return {
            "total_puzzles": total,
            "solved_puzzles": solved,
            "percentage": (solved / total * 100) if total > 0 else 0,
            "all_solved": solved == total
        }

    def check_victory_condition(self, session_id: int) -> bool:
        """Verifica se tutti gli enigmi sono stati risolti (condizione di vittoria)"""
        progress = self.get_session_progress(session_id)
        return progress["all_solved"]

    def get_next_puzzle(self, session_id: int, room: str) -> Optional[Puzzle]:
        """Ottiene il prossimo enigma non risolto in una stanza"""
        puzzles = self.get_puzzles_by_room(session_id, room)
        for puzzle in puzzles:
            if not puzzle.solved:
                return puzzle
        return None

    def is_room_completed(self, session_id: int, room: str) -> bool:
        """Verifica se tutti gli enigmi di una stanza sono stati risolti"""
        puzzles = self.get_puzzles_by_room(session_id, room)
        return all(p.solved for p in puzzles)

    def reset_puzzles_for_session(self, session_id: int) -> int:
        """Resetta tutti gli enigmi di una sessione (soft reset)
        Imposta solved=False, solved_by=None, solved_at=None per tutti gli enigmi.
        Ritorna il numero di enigmi resettati.
        """
        puzzles = self.get_puzzles_by_session(session_id)
        reset_count = 0
        
        for puzzle in puzzles:
            if puzzle.solved:  # Solo se era risolto
                puzzle.solved = False
                puzzle.solved_by = None
                puzzle.solved_at = None
                reset_count += 1
        
        self.db.commit()
        
        # Refresh tutti i puzzle
        for puzzle in puzzles:
            self.db.refresh(puzzle)
        
        return reset_count