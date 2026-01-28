import asyncio
import logging
from typing import Dict, Any, Set
from datetime import datetime
import socketio

logger = logging.getLogger(__name__)

sio = socketio.AsyncServer(
    async_mode='asgi',
    cors_allowed_origins='*',
    logger=False,
    engineio_logger=False
)

socket_app = socketio.ASGIApp(sio)

active_sessions: Dict[str, Set[str]] = {}
player_info: Dict[str, Dict[str, Any]] = {}
session_players: Dict[int, Dict[str, Any]] = {}  # session_id -> {nickname: socket_id}

# 🔒 Interaction Lock System - prevents concurrent interactions
# Format: {f"{session_id}:{room}": {"locked": bool, "by": player_name, "timeout_task": Task}}
interaction_locks: Dict[str, Dict[str, Any]] = {}


@sio.event
async def connect(sid, environ):
    logger.info(f"Socket.IO client connected: {sid}")


@sio.event
async def disconnect(sid):
    logger.info(f"Socket.IO client disconnected: {sid}")
    if sid in player_info:
        info = player_info[sid]
        session_id = info.get('sessionId')
        room = info.get('room')
        player_name = info.get('playerName')
        
        if session_id and session_id in active_sessions:
            active_sessions[session_id].discard(sid)
            
            await sio.emit('playerLeft', {
                'playerName': player_name,
                'room': room
            }, room=session_id)
        
        del player_info[sid]


@sio.event
async def joinSession(sid, data):
    session_id = data.get('sessionId')
    room = data.get('room')
    player_name = data.get('playerName', 'Guest')
    
    logger.info(f"Player {player_name} joining session {session_id} in room {room}")
    
    # 🧪 BYPASS per test-session (sviluppo)
    if session_id != "test-session":
        # 🆕 VERIFICA che la sessione non sia terminata (stesso check di registerPlayer)
        import psycopg2
        import os
        
        db_url = os.getenv('DATABASE_URL', 'postgresql://postgres:postgres@db:5432/escape_room')
        
        try:
            conn = psycopg2.connect(db_url)
            conn.set_session(autocommit=True)
            cursor = conn.cursor()
            
            cursor.execute("SELECT id, status, end_time FROM game_sessions WHERE id = %s", (session_id,))
            result = cursor.fetchone()
            
            if not result:
                cursor.close()
                conn.close()
                logger.warning(f"❌ Player {player_name} tried to join non-existent session {session_id}")
                # Disconnetti il socket - sessione non esiste
                await sio.disconnect(sid)
                return
            
            session_status = result[1]
            session_end_time = result[2]
            
            # 🆕 BLOCCA se la sessione è stata terminata (ECCETTO sessione 999 = dev)
            if session_end_time is not None:
                # 🔄 SESSIONE 999 IMMORTALE: Auto-riattivazione
                if session_id == 999:
                    logger.info(f"🔄 Session 999 TERMINATED - Auto-reactivating for development...")
                    cursor.execute(
                        "UPDATE game_sessions SET status = %s, end_time = NULL, start_time = NOW() WHERE id = %s",
                        ('active', session_id)
                    )
                    logger.info(f"✅ Session 999 auto-reactivated! Player {player_name} can join.")
                else:
                    logger.warning(f"❌ Player {player_name} BLOCKED from joinSession - Session {session_id} is TERMINATED (end_time={session_end_time})")
                    # Disconnetti il socket - sessione terminata
                    cursor.close()
                    conn.close()
                    await sio.disconnect(sid)
                    return
            
            # Chiudi connessione solo alla fine
            cursor.close()
            conn.close()
                
        except Exception as e:
            logger.error(f"❌ Error checking session status in joinSession: {e}", exc_info=True)
            await sio.disconnect(sid)
            return
    else:
        logger.info(f"🧪 TEST-SESSION bypass - allowing {player_name} to join without validation")
    
    player_info[sid] = {
        'sessionId': session_id,
        'room': room,
        'playerName': player_name
    }
    
    # 🆕 OPZIONE A: Sincronizza DB quando giocatore entra in Esterno
    # Aggiorna status="playing" e current_room nel database
    if session_id != "test-session":
        from app.database import SessionLocal
        from app.services.player_service import PlayerService
        
        db = SessionLocal()
        try:
            service = PlayerService(db)
            # Ottieni tutti i giocatori e filtra per nickname
            players = service.get_players_by_session(session_id)
            player = next((p for p in players if p.nickname == player_name), None)
            
            if player:
                player.status = "playing"
                player.current_room = room
                db.commit()
                logger.info(f"✅ DB sync: Player {player_name} status updated to 'playing' in room '{room}'")
            else:
                logger.warning(f"⚠️ Player {player_name} not found in DB for session {session_id}")
        except Exception as e:
            logger.error(f"❌ Error syncing player to DB: {e}", exc_info=True)
            db.rollback()
        finally:
            db.close()
    
    if session_id not in active_sessions:
        active_sessions[session_id] = set()
    active_sessions[session_id].add(sid)

    # Use consistent room naming: "session_{id}" for all broadcasts
    await sio.enter_room(sid, f"session_{session_id}")
    await sio.enter_room(sid, f"{session_id}:{room}")
    
    await sio.emit('playerJoined', {
        'playerName': player_name,
        'room': room
    }, room=session_id, skip_sid=sid)
    
    initial_state = {
        'objectStates': {
            'forno': 'off',
            'frigo': 'off',
            'cassetto': 'chiuso',
            'valvola_gas': 'chiusa',
            'finestra': 'chiusa'
        },
        'completed': [],
        'currentPuzzle': None
    }
    
    await sio.emit('sessionState', initial_state, to=sid)


@sio.event
async def playerAction(sid, data):
    session_id = data.get('sessionId')
    room = data.get('room')
    player_name = data.get('playerName', 'Guest')
    action = data.get('action')
    target = data.get('target')
    
    logger.info(f"Player {player_name} action: {action} on {target} in {room}")
    
    new_state = 'on' if action == 'on' else ('aperto' if action == 'open' else ('off' if action == 'off' else 'chiuso'))
    
    await sio.emit('actionSuccess', {
        'message': f'{target} {action}',
        'sessionState': {
            'objectStates': {
                target: new_state
            }
        }
    }, to=sid)
    
    await sio.emit('globalStateUpdate', {
        'objectStates': {
            target: new_state
        },
        'updatedBy': player_name,
        'room': room
    }, room=session_id, skip_sid=sid)


# NUOVI EVENTI PER LOBBY E GIOCO

@sio.event
async def registerPlayer(sid, data):
    """Registra un giocatore nella lobby"""
    session_id = data.get('sessionId')
    nickname = data.get('nickname')
    
    logger.info(f"🎮 [registerPlayer] Player {nickname} attempting to join session {session_id}, socket_id={sid}")
    
    # BLOCCO: Verifica che la sessione non sia già iniziata con connessione RAW
    import psycopg2
    import os
    
    # Get DB connection string from environment
    db_url = os.getenv('DATABASE_URL', 'postgresql://postgres:postgres@db:5432/escape_room')
    
    try:
        # RAW connection - NO SQLAlchemy, NO cache, NO transaction isolation
        conn = psycopg2.connect(db_url)
        conn.set_session(autocommit=True)  # Every read sees latest data
        cursor = conn.cursor()
        
        cursor.execute("SELECT id, status, end_time FROM game_sessions WHERE id = %s", (session_id,))
        result = cursor.fetchone()
        
        cursor.close()
        conn.close()
        
        if not result:
            logger.warning(f"❌ Player {nickname} tried to join non-existent session {session_id}")
            await sio.emit('registrationFailed', {
                'error': 'Sessione non trovata'
            }, to=sid)
            return
        
        session_status = result[1]  # status column
        session_end_time = result[2]  # end_time column
        logger.info(f"🔍 DEBUG - Session {session_id} found: True, Status: {session_status}, End Time: {session_end_time} (RAW psycopg2)")
        
        # 🆕 BLOCCA se la sessione è stata terminata (end_time non NULL)
        if session_end_time is not None:
            logger.warning(f"❌ Player {nickname} BLOCKED - Session {session_id} is TERMINATED (end_time={session_end_time})")
            await sio.emit('registrationFailed', {
                'error': 'Sessione terminata - PIN non più valido'
            }, to=sid)
            return
        
        if session_status != "waiting":
            logger.warning(f"❌ Player {nickname} BLOCKED - Session {session_id} status={session_status} (not waiting)")
            await sio.emit('registrationFailed', {
                'error': 'Gioco già iniziato, troppo tardi!',
                'status': session_status
            }, to=sid)
            return
        
        logger.info(f"✅ Player {nickname} allowed to join - Session {session_id} status={session_status}")
            
    except Exception as e:
        logger.error(f"❌ Error checking session status: {e}", exc_info=True)
        await sio.emit('registrationFailed', {
            'error': 'Errore interno del server'
        }, to=sid)
        return
    
    # ✅ STEP 1: Enter nella room PRIMA di salvare (per garantire che riceva tutti gli eventi)
    await sio.enter_room(sid, f"session_{session_id}")
    logger.info(f"✅ [registerPlayer] Player {nickname} entered room session_{session_id}")
    
    # 🆕 STEP 1.5: Crea giocatore nel DATABASE (non solo in memoria)
    from app.database import SessionLocal
    from app.services.player_service import PlayerService
    
    db = SessionLocal()
    try:
        service = PlayerService(db)
        player = service.create_player(
            session_id=session_id,
            nickname=nickname,
            socket_id=sid
        )
        logger.info(f"✅ [registerPlayer] Player {nickname} created in DATABASE with id={player.id}")
    except Exception as e:
        logger.error(f"❌ Error creating player in DB: {e}", exc_info=True)
        db.rollback()
    finally:
        db.close()
    
    # ✅ STEP 2: Salva info giocatore IN MEMORIA
    if session_id not in session_players:
        session_players[session_id] = {}
        logger.info(f"🆕 [registerPlayer] Created new session_players entry for session {session_id}")
    
    session_players[session_id][nickname] = sid
    
    player_info[sid] = {
        'sessionId': session_id,
        'nickname': nickname,
        'status': 'waiting'
    }
    
    logger.info(f"💾 [registerPlayer] Saved player {nickname} (sid={sid}) to session {session_id} memory")
    
    # ✅ STEP 3: Prepara lista aggiornata
    players_list = list(session_players[session_id].keys())
    logger.info(f"📋 [registerPlayer] Current players in session {session_id}: {players_list} (count={len(players_list)})")
    
    # ✅ STEP 4: Conferma registrazione al giocatore (PRIMA di broadcast)
    await sio.emit('registrationSuccess', {
        'nickname': nickname,
        'sessionId': session_id,
        'players': players_list,
        'count': len(players_list)
    }, to=sid)
    logger.info(f"✉️ [registerPlayer] Sent registrationSuccess to player {nickname}")
    
    # ✅ STEP 5: Broadcast a TUTTI nella room (incluso admin)
    await sio.emit('playerConnected', {
        'nickname': nickname,
        'players': players_list,
        'count': len(players_list)
    }, room=f"session_{session_id}")
    logger.info(f"📢 [registerPlayer] Broadcasted playerConnected to room session_{session_id}")
    
    await sio.emit('updatePlayersList', {
        'players': players_list,
        'count': len(players_list)
    }, room=f"session_{session_id}")
    logger.info(f"📢 [registerPlayer] Broadcasted updatePlayersList to room session_{session_id}")
    
    logger.info(f"🎉 [registerPlayer] Registration complete for {nickname} in session {session_id}!")


@sio.event
async def joinLobby(sid, data):
    """Admin si connette alla lobby"""
    session_id = data.get('sessionId')
    
    logger.info(f"Admin joining lobby for session {session_id}")
    
    await sio.enter_room(sid, f"session_{session_id}")
    
    # Invia lista giocatori correnti
    players_list = list(session_players.get(session_id, {}).keys())
    await sio.emit('updatePlayersList', {
        'players': players_list,
        'count': len(players_list)
    }, to=sid)


@sio.event
async def startCountdown(sid, data):
    """Admin avvia il countdown (5 secondi)"""
    session_id = data.get('sessionId')
    
    logger.info(f"Starting countdown for session {session_id}")
    
    # IMPORTANTE: Update con psycopg2 RAW per commit IMMEDIATO
    import psycopg2
    import os
    
    db_url = os.getenv('DATABASE_URL', 'postgresql://postgres:postgres@db:5432/escape_room')
    
    try:
        conn = psycopg2.connect(db_url)
        conn.set_session(autocommit=True)
        cursor = conn.cursor()
        
        cursor.execute(
            "UPDATE game_sessions SET status = %s WHERE id = %s",
            ("countdown", session_id)
        )
        
        cursor.close()
        conn.close()
        logger.info(f"✅ Session {session_id} status updated to 'countdown' (RAW psycopg2) - new players blocked")
    except Exception as e:
        logger.error(f"❌ Error updating session status: {e}")
    
    # Notifica tutti i giocatori di iniziare il countdown
    await sio.emit('gameStarting', {
        'countdown': 5,
        'message': 'Il gioco sta per iniziare!'
    }, room=f"session_{session_id}")
    
    # Dopo 5 secondi, naviga tutti alla scena esterno e aggiorna a "playing"
    await asyncio.sleep(5)
    
    # Aggiorna status a "playing" con psycopg2 RAW
    try:
        conn = psycopg2.connect(db_url)
        conn.set_session(autocommit=True)
        cursor = conn.cursor()
        
        cursor.execute(
            "UPDATE game_sessions SET status = %s WHERE id = %s",
            ("playing", session_id)
        )
        
        cursor.close()
        conn.close()
        logger.info(f"✅ Session {session_id} status updated to 'playing' (RAW psycopg2)")
    except Exception as e:
        logger.error(f"❌ Error updating session status to playing: {e}")
    
    await sio.emit('navigateToGame', {
        'room': 'esterno',
        'message': 'Via!'
    }, room=f"session_{session_id}")


@sio.event
async def puzzleSolved(sid, data):
    """Un giocatore ha risolto un enigma"""
    session_id = data.get('sessionId')
    room = data.get('room')
    puzzle_number = data.get('puzzleNumber')
    solved_by = data.get('solvedBy')
    
    logger.info(f"Puzzle {puzzle_number} in {room} solved by {solved_by}")
    
    # Notifica tutti
    await sio.emit('puzzleResolved', {
        'room': room,
        'puzzleNumber': puzzle_number,
        'solvedBy': solved_by,
        'message': f'{solved_by} ha risolto l\'enigma {puzzle_number}!'
    }, room=f"session_{session_id}")
    
    # Sblocca prossimo enigma se c'è
    await sio.emit('puzzleUnlocked', {
        'room': room,
        'puzzleNumber': puzzle_number + 1
    }, room=f"session_{session_id}")


@sio.event
async def distributeRooms(sid, data):
    """Distribuisce i giocatori nelle stanze quando entrano nella porta d'ingresso"""
    session_id = data.get('sessionId')
    triggered_by = data.get('triggeredBy', 'Unknown')
    
    logger.info(f"🚪 Room distribution triggered by {triggered_by} for session {session_id}")
    
    # Chiama il servizio per distribuire i giocatori
    import psycopg2
    import os
    from app.services.room_distribution_service import RoomDistributionService
    from app.database import SessionLocal
    
    db = SessionLocal()
    try:
        service = RoomDistributionService(db)
        distribution = service.distribute_players(session_id)
        
        logger.info(f"✅ Players distributed: {distribution}")
        
        # Broadcast a tutti i giocatori della sessione
        # Ogni giocatore riceve la sua stanza assegnata
        for room, nicknames in distribution.items():
            for nickname in nicknames:
                # 🔧 FIX: Cerca il socket ID in player_info invece di session_players
                # perché i giocatori nelle scene (esterno) usano joinSession, non registerPlayer
                player_sid = None
                
                # 🔧 FIX FINALE: sessionId in player_info è STRING, quindi confronta con STRING!
                session_id_str = str(session_id)  # Converti a STRING per matching
                
                logger.info(f"🔍 Searching for {nickname} in session {session_id_str}")
                
                for sock_id, info in player_info.items():
                    # Match sessionId (STRING) E nickname (prova sia playerName che nickname)
                    sid_match = str(info.get('sessionId')) == session_id_str
                    name_match = (info.get('playerName') == nickname or info.get('nickname') == nickname)
                    
                    if sid_match and name_match:
                        player_sid = sock_id
                        logger.info(f"✅ Found socket ID {sock_id} for player {nickname}")
                        break
                
                # Fallback: prova anche in session_players (per compatibilità con lobby)
                if not player_sid:
                    player_sid = session_players.get(session_id, {}).get(nickname)
                
                if player_sid:
                    await sio.emit('roomAssigned', {
                        'assignedRoom': room,
                        'nickname': nickname,
                        'distribution': distribution,
                        'message': f'Sei stato assegnato alla stanza: {room.upper()}!'
                    }, to=player_sid)
                    logger.info(f"📨 Sent room assignment to {nickname} (sid={player_sid}): {room}")
                else:
                    logger.warning(f"⚠️ Could not find socket ID for player {nickname} in session {session_id}")
        
        # Broadcast generale con tutta la distribuzione
        await sio.emit('roomDistribution', {
            'distribution': distribution,
            'message': 'Distribuzione completata! Preparati ad entrare nella tua stanza...'
        }, room=f"session_{session_id}")
        
        db.close()
        
    except Exception as e:
        logger.error(f"❌ Error distributing players: {e}", exc_info=True)
        db.rollback()
        db.close()
        
        await sio.emit('distributionFailed', {
            'error': 'Errore durante la distribuzione dei giocatori'
        }, room=f"session_{session_id}")


@sio.event
async def gameVictory(sid, data):
    """Tutti gli enigmi sono stati risolti"""
    session_id = data.get('sessionId')
    
    logger.info(f"Game victory for session {session_id}")
    
    await sio.emit('gameComplete', {
        'message': '🎉 Congratulazioni! Avete completato tutti gli enigmi!',
        'victory': True
    }, room=f"session_{session_id}")


@sio.event
async def requestPlayersList(sid, data):
    """Richiesta lista giocatori (per sincronizzazione)"""
    session_id = data.get('sessionId')
    
    players_list = list(session_players.get(session_id, {}).keys())
    await sio.emit('updatePlayersList', {
        'players': players_list,
        'count': len(players_list)
    }, to=sid)


@sio.event
async def toggleTestBypass(sid, data):
    """Sincronizza il test bypass (tasto K) tra tutti i giocatori della stessa stanza"""
    session_id = data.get('sessionId')
    room = data.get('room')
    state = data.get('state')
    player_name = data.get('playerName', 'Unknown')
    
    logger.info(f"🧪 Test bypass toggled by {player_name} in session {session_id}, room {room}: {state}")
    
    # Broadcast a tutti i giocatori della stessa sessione e stanza
    await sio.emit('testBypassChanged', {
        'state': state,
        'room': room,
        'toggledBy': player_name
    }, room=f"{session_id}:{room}")


@sio.event
async def toggleDoorState(sid, data):
    """Sincronizza lo stato della porta ingresso (tasto L) tra tutti i giocatori della stessa stanza"""
    session_id = data.get('sessionId')
    room = data.get('room')
    state = data.get('state')
    player_name = data.get('playerName', 'Unknown')
    
    logger.info(f"🚪 Door state toggled by {player_name} in session {session_id}, room {room}: {'OPEN' if state else 'CLOSED'}")
    
    # Broadcast a tutti i giocatori della stessa sessione e stanza
    await sio.emit('doorStateChanged', {
        'state': state,
        'room': room,
        'toggledBy': player_name
    }, room=f"{session_id}:{room}")


@sio.event
async def toggleGateState(sid, data):
    """Sincronizza lo stato del cancello tra tutti i giocatori della stessa stanza"""
    session_id = data.get('sessionId')
    room = data.get('room')
    state = data.get('state')
    player_name = data.get('playerName', 'Unknown')
    
    logger.info(f"🚪 Gate state toggled by {player_name} in session {session_id}, room {room}: {'OPEN' if state else 'CLOSED'}")
    
    # Broadcast a tutti i giocatori della stessa sessione e stanza
    await sio.emit('gateStateChanged', {
        'state': state,
        'room': room,
        'toggledBy': player_name
    }, room=f"{session_id}:{room}")


@sio.event
async def syncAnimation(sid, data):
    """
    🎬 NUOVO: Sincronizza animazioni oggetti tra tutti i giocatori
    Usato per TV, divano, pianta, comodino, pentola, anta, ecc.
    """
    session_id = data.get('sessionId')
    room = data.get('room')
    object_name = data.get('objectName')
    animation_state = data.get('animationState')
    player_name = data.get('playerName', 'Unknown')
    additional_data = data.get('additionalData', {})  # Dati extra opzionali
    
    logger.info(f"🎬 Animation sync: {object_name} in {room} → {animation_state} (by {player_name})")
    
    # Broadcast a tutti nella sessione (usa session_id per broadcast globale nella stanza)
    await sio.emit('animationStateChanged', {
        'room': room,
        'objectName': object_name,
        'animationState': animation_state,
        'triggeredBy': player_name,
        'additionalData': additional_data
    }, room=f"session_{session_id}")


@sio.event
async def requestInteractionLock(sid, data):
    """Richiesta di lock per interazione (es. cancello) - previene concorrenza"""
    session_id = data.get('sessionId')
    room = data.get('room')
    player_name = data.get('playerName', 'Unknown')
    object_name = data.get('objectName', 'oggetto')
    
    lock_key = f"{session_id}:{room}"
    
    logger.info(f"🔒 Lock request from {player_name} in {lock_key} for {object_name}")
    
    # Controlla se già locked
    if lock_key in interaction_locks and interaction_locks[lock_key].get('locked'):
        locked_by = interaction_locks[lock_key].get('by', 'Unknown')
        logger.info(f"❌ Lock DENIED - already locked by {locked_by}")
        
        # Notifica che è già locked
        await sio.emit('interactionLockDenied', {
            'lockedBy': locked_by,
            'objectName': object_name,
            'message': f'{locked_by} sta già interagendo con {object_name}'
        }, to=sid)
        return
    
    # GRANT lock
    logger.info(f"✅ Lock GRANTED to {player_name}")
    
    # Crea timeout task per auto-unlock dopo 30 secondi (safety)
    async def auto_unlock():
        await asyncio.sleep(30)
        if lock_key in interaction_locks and interaction_locks[lock_key].get('by') == player_name:
            logger.warning(f"⏰ Auto-unlock timeout for {lock_key} (locked by {player_name})")
            del interaction_locks[lock_key]
            
            # Broadcast unlock
            await sio.emit('interactionUnlocked', {
                'unlockedBy': player_name,
                'reason': 'timeout',
                'message': f'Interazione sbloccata (timeout)'
            }, room=lock_key)
    
    timeout_task = asyncio.create_task(auto_unlock())
    
    interaction_locks[lock_key] = {
        'locked': True,
        'by': player_name,
        'timeout_task': timeout_task,
        'object': object_name
    }
    
    # Notifica il richiedente che ha ottenuto il lock
    await sio.emit('interactionLockGranted', {
        'objectName': object_name,
        'message': 'Hai il controllo dell\'interazione'
    }, to=sid)
    
    # Broadcast agli altri che l'oggetto è locked
    await sio.emit('interactionLocked', {
        'lockedBy': player_name,
        'objectName': object_name,
        'message': f'{player_name} sta interagendo con {object_name}'
    }, room=lock_key, skip_sid=sid)


@sio.event
async def releaseInteractionLock(sid, data):
    """Rilascia il lock dopo l'interazione"""
    session_id = data.get('sessionId')
    room = data.get('room')
    player_name = data.get('playerName', 'Unknown')
    
    lock_key = f"{session_id}:{room}"
    
    logger.info(f"🔓 Lock release request from {player_name} in {lock_key}")
    
    # Controlla se il lock esiste e appartiene a questo giocatore
    if lock_key not in interaction_locks:
        logger.warning(f"⚠️ No lock found for {lock_key}")
        return
    
    lock_owner = interaction_locks[lock_key].get('by')
    if lock_owner != player_name:
        logger.warning(f"⚠️ {player_name} tried to release lock owned by {lock_owner}")
        return
    
    # Cancella timeout task
    timeout_task = interaction_locks[lock_key].get('timeout_task')
    if timeout_task:
        timeout_task.cancel()
    
    # Rimuovi lock
    object_name = interaction_locks[lock_key].get('object', 'oggetto')
    del interaction_locks[lock_key]
    
    logger.info(f"✅ Lock released by {player_name}")
    
    # Broadcast unlock a tutti
    await sio.emit('interactionUnlocked', {
        'unlockedBy': player_name,
        'objectName': object_name,
        'message': f'Interazione con {object_name} disponibile'
    }, room=lock_key)


@sio.event
async def adminResetGame(sid, data):
    """Admin resetta TUTTE le sessioni ed espelle TUTTI i giocatori"""
    session_id = data.get('sessionId')
    
    logger.info(f"🔴 ADMIN RESET ALL SESSIONS - Triggered from session {session_id}")
    
    # BROADCAST GLOBALE a TUTTI i socket connessi (inclusi quelli che hanno URL diretti)
    logger.info(f"Broadcasting gameReset to ALL connected sockets")
    await sio.emit('gameReset', {
        'message': '🔴 TUTTE le sessioni sono state chiuse dall\'admin. Torna alla pagina di inserimento PIN.',
        'reason': 'admin_reset_all'
    })  # Nessun parametro room = broadcast a tutti
    
    # Ottieni tutte le session_id attive
    all_sessions = list(session_players.keys())
    
    logger.info(f"Found {len(all_sessions)} active sessions to reset: {all_sessions}")
    
    # Resetta TUTTE le sessioni
    for sid_to_reset in all_sessions:
        logger.info(f"Resetting session {sid_to_reset}")
        
        # Rimuovi tutti i giocatori dalla sessione
        if sid_to_reset in session_players:
            for nickname, player_sid in session_players[sid_to_reset].items():
                if player_sid in player_info:
                    del player_info[player_sid]
            
            # Svuota la sessione
            session_players[sid_to_reset] = {}
        
        # Aggiorna la lista giocatori (ora vuota)
        await sio.emit('updatePlayersList', {
            'players': [],
            'count': 0
        }, room=f"session_{sid_to_reset}")
    
    # Svuota anche active_sessions
    active_sessions.clear()
    
    # Pulisci anche player_info (tutti i socket)
    player_info.clear()
    
    logger.info(f"✅ All {len(all_sessions)} sessions reset - ALL sockets expelled - player_info cleared")


async def broadcast_element_update(room_name: str, element: str, action: str, value: Any):
    message = {
        'type': 'element_update',
        'room': room_name,
        'element': element,
        'action': action,
        'value': value,
        'timestamp': datetime.utcnow().isoformat() + 'Z'
    }
    await sio.emit('globalNotification', {
        'message': f'{element} in {room_name}: {action}'
    })
    await sio.emit('globalStateUpdate', message)


async def broadcast_to_session(session_id: str, event: str, data: Dict[str, Any]):
    await sio.emit(event, data, room=f"session_{session_id}")


async def send_notification(session_id: str, message: str):
    await sio.emit('globalNotification', {'message': message}, room=f"session_{session_id}")


async def broadcast_puzzle_update(session_id: int, puzzle_state):
    """
    Broadcast kitchen puzzle state update to all clients in a session.
    
    Args:
        session_id: Game session ID
        puzzle_state: KitchenPuzzleStateResponse instance
    """
    message = {
        'type': 'puzzle_state_update',
        'session_id': session_id,
        'room': 'cucina',
        'states': {
            'fornelli': {
                'status': puzzle_state.states.fornelli.status,
                'completed_at': puzzle_state.states.fornelli.completed_at.isoformat() if puzzle_state.states.fornelli.completed_at else None
            },
            'frigo': {
                'status': puzzle_state.states.frigo.status,
                'completed_at': puzzle_state.states.frigo.completed_at.isoformat() if puzzle_state.states.frigo.completed_at else None
            },
            'serra': {
                'status': puzzle_state.states.serra.status,
                'completed_at': puzzle_state.states.serra.completed_at.isoformat() if puzzle_state.states.serra.completed_at else None
            },
            'porta': {
                'status': puzzle_state.states.porta.status
            }
        },
        'led_states': {
            'fornelli': puzzle_state.led_states.fornelli,
            'frigo': puzzle_state.led_states.frigo,
            'serra': puzzle_state.led_states.serra,
            'porta': puzzle_state.led_states.porta
        }
    }
    
    logger.info(f"Broadcasting puzzle update for session {session_id}: {message}")
    
    # Broadcast to all players in the session
    await sio.emit('puzzle_state_update', message, room=f"session_{session_id}")


async def broadcast_bedroom_puzzle_update(session_id: int, puzzle_state):
    """
    Broadcast bedroom puzzle state update to all clients in a session.
    
    Args:
        session_id: Game session ID
        puzzle_state: BedroomPuzzleStateResponse instance
    """
    message = {
        'type': 'puzzle_state_update',
        'session_id': session_id,
        'room': 'camera',
        'states': {
            'comodino': {
                'status': puzzle_state.states.comodino.status,
                'completed_at': puzzle_state.states.comodino.completed_at.isoformat() if puzzle_state.states.comodino.completed_at else None
            },
            'materasso': {
                'status': puzzle_state.states.materasso.status,
                'completed_at': puzzle_state.states.materasso.completed_at.isoformat() if puzzle_state.states.materasso.completed_at else None
            },
            'poltrona': {
                'status': puzzle_state.states.poltrona.status,
                'completed_at': puzzle_state.states.poltrona.completed_at.isoformat() if puzzle_state.states.poltrona.completed_at else None
            },
            'ventola': {
                'status': puzzle_state.states.ventola.status,
                'completed_at': puzzle_state.states.ventola.completed_at.isoformat() if puzzle_state.states.ventola.completed_at else None
            },
            'porta': {
                'status': puzzle_state.states.porta.status
            }
        },
        'led_states': {
            'materasso': puzzle_state.led_states.materasso,
            'poltrona': puzzle_state.led_states.poltrona,
            'ventola': puzzle_state.led_states.ventola,
            'porta': puzzle_state.led_states.porta
        }
    }
    
    logger.info(f"Broadcasting bedroom puzzle update for session {session_id}: {message}")
    
    # Broadcast to all players in the session
    await sio.emit('puzzle_state_update', message, room=f"session_{session_id}")


async def broadcast_game_completion_update(session_id: int, completion_state):
    """
    Broadcast game completion state update to all clients in a session.
    
    This notifies all players about room completions and door LED states.
    
    Args:
        session_id: Game session ID
        completion_state: Dict with completion data
    """
    logger.info(f"Broadcasting game completion update for session {session_id}")
    
    # 🏆 MQTT: Pubblica stato vittoria agli ESP32 (NON-BLOCKING)
    # Se MQTT fallisce, il broadcast WebSocket deve comunque continuare
    game_won = completion_state.get('game_won', False)
    try:
        from app.mqtt_client import MQTTClient
        await MQTTClient.publish_game_won(game_won)
        logger.info(f"✅ MQTT publish successful: game_won={game_won}")
    except Exception as e:
        logger.error(f"⚠️ MQTT publish failed (non-blocking): {e}")
        # Continue even if MQTT fails - don't block WebSocket broadcast
    
    # Broadcast to all players in the session - USE CONSISTENT ROOM NAMING!
    await sio.emit('game_completion_update', completion_state, room=f"session_{session_id}")


async def broadcast_bathroom_update(session_id: int, puzzle_state):
    """
    Broadcast bathroom puzzle state update to all clients in a session.
    
    Args:
        session_id: Game session ID
        puzzle_state: Dict with bathroom puzzle data
    """
    message = {
        'type': 'puzzle_state_update',
        'session_id': session_id,
        'room': 'bagno',
        'states': puzzle_state.get('states', {}),
        'led_states': puzzle_state.get('led_states', {})
    }
    
    logger.info(f"Broadcasting bathroom puzzle update for session {session_id}: {message}")
    
    # Broadcast to all players in the session
    await sio.emit('puzzle_state_update', message, room=f"session_{session_id}")


class WebSocketHandler:
    def __init__(self):
        self.sio = sio
        self.socket_app = socket_app

    async def broadcast_element_update(self, room_name: str, element: str, action: str, value: Any):
        await broadcast_element_update(room_name, element, action, value)

    async def broadcast_to_session(self, session_id: str, event: str, data: Dict[str, Any]):
        await broadcast_to_session(session_id, event, data)

    async def send_notification(self, session_id: str, message: str):
        await send_notification(session_id, message)

    @property
    def connection_count(self) -> int:
        return len(player_info)


ws_handler = WebSocketHandler()