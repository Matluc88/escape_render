from app.api.rooms import router as rooms_router
from app.api.sessions import router as sessions_router
from app.api.elements import router as elements_router
from app.api.events import router as events_router
from app.api.players import router as players_router
from app.api.puzzles import router as puzzles_router
from app.api.kitchen_puzzles import router as kitchen_puzzles_router
from app.api.bedroom_puzzles import router as bedroom_puzzles_router
from app.api.bathroom_puzzles import router as bathroom_puzzles_router
from app.api.livingroom_puzzles import router as livingroom_puzzles_router
from app.api.gate_puzzles import router as gate_puzzles_router
from app.api.game_completion import router as game_completion_router
from app.api.spawn import router as spawn_router

__all__ = ["rooms_router", "sessions_router", "elements_router", "events_router", "players_router", "puzzles_router", "kitchen_puzzles_router", "bedroom_puzzles_router", "bathroom_puzzles_router", "livingroom_puzzles_router", "gate_puzzles_router", "game_completion_router", "spawn_router"]
