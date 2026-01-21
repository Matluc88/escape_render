from sqlalchemy.orm import Session
from typing import List, Dict
from app.models.player import Player
from app.services.player_service import PlayerService
import random


class RoomDistributionService:
    def __init__(self, db: Session):
        self.db = db
        self.player_service = PlayerService(db)
        # Le 4 stanze dove distribuire i giocatori dopo l'esterno
        self.available_rooms = ["cucina", "soggiorno", "bagno", "camera"]

    def distribute_players(self, session_id: int) -> Dict[str, List[str]]:
        """
        Distribuisce i giocatori nelle stanze dopo che l'enigma dell'esterno è stato risolto
        
        Regole:
        - Almeno 1 giocatore per stanza (se ci sono abbastanza giocatori)
        - Se ci sono più di 4 giocatori, gli extra vengono distribuiti random
        
        Returns:
            Dict con room -> [nicknames]
        """
        # Ottieni tutti i giocatori nella lobby o esterno
        players = self.player_service.get_players_by_session(session_id)
        active_players = [p for p in players if p.status == "playing"]
        
        if not active_players:
            return {}
        
        # Shuffle per randomizzare
        random.shuffle(active_players)
        
        distribution = {room: [] for room in self.available_rooms}
        
        # Assegna almeno 1 giocatore per stanza
        for i, room in enumerate(self.available_rooms):
            if i < len(active_players):
                player = active_players[i]
                player.current_room = room
                distribution[room].append(player.nickname)
        
        # Se ci sono giocatori extra (più di 4), distribuiscili random
        if len(active_players) > 4:
            extra_players = active_players[4:]
            for player in extra_players:
                random_room = random.choice(self.available_rooms)
                player.current_room = random_room
                distribution[random_room].append(player.nickname)
        
        self.db.commit()
        
        # Rimuovi stanze vuote dal risultato
        distribution = {room: nicknames for room, nicknames in distribution.items() if nicknames}
        
        return distribution

    def get_current_distribution(self, session_id: int) -> Dict[str, List[str]]:
        """Ottiene la distribuzione corrente dei giocatori nelle stanze"""
        distribution = {room: [] for room in self.available_rooms}
        distribution["esterno"] = []
        distribution["lobby"] = []
        
        players = self.player_service.get_players_by_session(session_id)
        
        for player in players:
            if player.current_room in distribution:
                distribution[player.current_room].append(player.nickname)
            else:
                distribution[player.current_room] = [player.nickname]
        
        # Rimuovi stanze vuote
        return {room: nicknames for room, nicknames in distribution.items() if nicknames}

    def move_all_to_esterno(self, session_id: int) -> None:
        """Sposta tutti i giocatori nella stanza esterno (all'inizio del gioco)"""
        players = self.player_service.get_players_by_session(session_id)
        
        for player in players:
            player.current_room = "esterno"
            player.status = "playing"
        
        self.db.commit()

    def get_room_player_count(self, session_id: int, room: str) -> int:
        """Conta quanti giocatori ci sono in una stanza"""
        players = self.player_service.get_players_by_room(session_id, room)
        return len(players)
