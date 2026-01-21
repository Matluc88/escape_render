from sqlalchemy.orm import Session
from typing import List, Optional
from app.models.player import Player
from app.models.game_session import GameSession
from datetime import datetime


class PlayerService:
    def __init__(self, db: Session):
        self.db = db

    def create_player(self, session_id: int, nickname: str, socket_id: str = None) -> Player:
        """Crea un nuovo giocatore e lo aggiunge alla sessione"""
        player = Player(
            session_id=session_id,
            nickname=nickname,
            socket_id=socket_id,
            current_room="lobby",
            status="waiting"
        )
        self.db.add(player)
        
        # Aggiorna il contatore dei giocatori connessi nella sessione
        session = self.db.query(GameSession).filter(GameSession.id == session_id).first()
        if session:
            session.connected_players = self.get_players_count(session_id)
        
        self.db.commit()
        self.db.refresh(player)
        return player

    def get_player_by_id(self, player_id: int) -> Optional[Player]:
        """Ottiene un giocatore per ID"""
        return self.db.query(Player).filter(Player.id == player_id).first()

    def get_player_by_socket(self, socket_id: str) -> Optional[Player]:
        """Ottiene un giocatore per socket ID"""
        return self.db.query(Player).filter(Player.socket_id == socket_id).first()

    def get_players_by_session(self, session_id: int) -> List[Player]:
        """Ottiene tutti i giocatori di una sessione"""
        return self.db.query(Player).filter(Player.session_id == session_id).all()

    def get_players_by_room(self, session_id: int, room: str) -> List[Player]:
        """Ottiene tutti i giocatori in una specifica stanza"""
        return self.db.query(Player).filter(
            Player.session_id == session_id,
            Player.current_room == room
        ).all()

    def get_players_count(self, session_id: int) -> int:
        """Conta i giocatori attivi in una sessione"""
        return self.db.query(Player).filter(
            Player.session_id == session_id,
            Player.status != "finished"
        ).count()

    def update_player_room(self, player_id: int, room: str) -> Optional[Player]:
        """Aggiorna la stanza corrente di un giocatore"""
        player = self.get_player_by_id(player_id)
        if player:
            player.current_room = room
            self.db.commit()
            self.db.refresh(player)
        return player

    def update_player_status(self, player_id: int, status: str) -> Optional[Player]:
        """Aggiorna lo status di un giocatore"""
        player = self.get_player_by_id(player_id)
        if player:
            player.status = status
            self.db.commit()
            self.db.refresh(player)
        return player

    def update_socket_id(self, player_id: int, socket_id: str) -> Optional[Player]:
        """Aggiorna il socket ID di un giocatore"""
        player = self.get_player_by_id(player_id)
        if player:
            player.socket_id = socket_id
            self.db.commit()
            self.db.refresh(player)
        return player

    def remove_player(self, player_id: int) -> bool:
        """Rimuove un giocatore dalla sessione"""
        player = self.get_player_by_id(player_id)
        if player:
            session_id = player.session_id
            self.db.delete(player)
            
            # Aggiorna il contatore dei giocatori connessi
            session = self.db.query(GameSession).filter(GameSession.id == session_id).first()
            if session:
                session.connected_players = self.get_players_count(session_id)
            
            self.db.commit()
            return True
        return False

    def get_all_nicknames(self, session_id: int) -> List[str]:
        """Ottiene tutti i nickname dei giocatori in una sessione"""
        players = self.get_players_by_session(session_id)
        return [player.nickname for player in players]
