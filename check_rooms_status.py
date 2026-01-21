#!/usr/bin/env python3
"""
Script per verificare lo stato delle stanze senza modificare nulla.
Controlla se tutte le stanze sono completate e se i LED RGB dell'esterno sono attivi.
"""

import requests
import json
import sys
from typing import Optional

# Configurazione
BACKEND_URL = "http://192.168.8.10:8001"
HEADERS = {"Content-Type": "application/json"}


def print_section(title: str):
    """Stampa una sezione con formattazione"""
    print(f"\n{'=' * 60}")
    print(f"  {title}")
    print(f"{'=' * 60}\n")


def get_active_session() -> Optional[int]:
    """Ottieni l'ID della sessione attiva"""
    try:
        url = f"{BACKEND_URL}/api/sessions/active"
        response = requests.get(url, timeout=5)
        
        if response.status_code == 200:
            data = response.json()
            session_id = data.get("id")
            print(f"✅ Sessione attiva trovata: ID = {session_id}")
            return session_id
        else:
            print(f"❌ Nessuna sessione attiva (HTTP {response.status_code})")
            return None
    except Exception as e:
        print(f"❌ Errore nel recupero sessione attiva: {e}")
        return None


def check_game_completion(session_id: int) -> dict:
    """Verifica lo stato di completamento del gioco"""
    try:
        url = f"{BACKEND_URL}/api/sessions/{session_id}/game-completion/state"
        response = requests.get(url, timeout=5)
        
        if response.status_code == 200:
            return response.json()
        else:
            print(f"⚠️ Errore nel controllo stato (HTTP {response.status_code})")
            return {}
    except Exception as e:
        print(f"❌ Errore: {e}")
        return {}


def check_esterno_rgb(session_id: int) -> dict:
    """Verifica lo stato dei LED RGB dell'esterno"""
    try:
        url = f"{BACKEND_URL}/api/sessions/{session_id}/gate-puzzles/esp32-state"
        response = requests.get(url, timeout=5)
        
        if response.status_code == 200:
            return response.json()
        else:
            print(f"⚠️ Errore nel controllo RGB esterno (HTTP {response.status_code})")
            return {}
    except Exception as e:
        print(f"❌ Errore: {e}")
        return {}


def main():
    print_section("🔍 VERIFICA STATO STANZE")
    print("Questo script verifica lo stato attuale senza modificare nulla.\n")
    
    # Step 1: Ottieni sessione attiva
    print_section("STEP 1: Recupero Sessione Attiva")
    session_id = get_active_session()
    
    if not session_id:
        print("\n❌ ERRORE: Nessuna sessione attiva trovata!")
        sys.exit(1)
    
    # Step 2: Verifica game_won
    print_section("STEP 2: Stato Game Completion")
    
    game_state = check_game_completion(session_id)
    
    if game_state:
        game_won = game_state.get("game_won", False)
        completed_rooms = game_state.get("completed_rooms_count", 0)
        victory_time = game_state.get("victory_time")
        door_leds = game_state.get("door_led_states", {})
        rooms_status = game_state.get("rooms_status", {})
        
        print(f"🏆 Game Won: {'SÌ ✅' if game_won else 'NO ❌'}")
        print(f"📊 Stanze completate: {completed_rooms}/4")
        
        if victory_time:
            print(f"⏰ Tempo vittoria: {victory_time}")
        
        print(f"\n🏠 Dettaglio Stanze:")
        for room_name, room_data in rooms_status.items():
            completed = room_data.get("completed", False)
            completion_time = room_data.get("completion_time")
            emoji = "✅" if completed else "❌"
            print(f"   {emoji} {room_name.capitalize()}: {'COMPLETATA' if completed else 'NON COMPLETATA'}")
            if completion_time:
                print(f"      ⏰ Tempo completamento: {completion_time}")
        
        print(f"\n🚪 Stati LED Porte:")
        for room, led_state in door_leds.items():
            emoji = "🟢" if led_state == "green" else "🟡" if led_state == "blinking" else "🔴"
            print(f"   {emoji} {room.capitalize()}: {led_state}")
    
    # Step 3: Verifica LED RGB Esterno
    print_section("STEP 3: Stato LED RGB Esterno")
    
    esterno_state = check_esterno_rgb(session_id)
    
    if esterno_state:
        rgb_on = esterno_state.get("rgb_strip_on", False)
        led_status = esterno_state.get("led_status", "unknown")
        all_rooms = esterno_state.get("all_rooms_complete", False)
        
        print(f"🎨 RGB Strip: {'ON 🎉' if rgb_on else 'OFF'}")
        print(f"💡 LED Status: {led_status}")
        print(f"✅ All Rooms Complete: {'SÌ' if all_rooms else 'NO'}")
        
        if rgb_on:
            print("\n" + "=" * 60)
            print("  🎉🎉🎉 LED RGB ESTERNO ATTIVATI! 🎉🎉🎉")
            print("  I LED dovrebbero lampeggiare con colori festa!")
            print("=" * 60)
        else:
            print("\n⚠️ LED RGB Esterno NON attivati")
            if not all_rooms:
                print("   Motivo: Non tutte le stanze sono completate")
            else:
                print("   Motivo: Fotocellula potrebbe essere occupata (LOW)")
                print("   Soluzione: Libera il passaggio della fotocellula")
    
    # Riepilogo finale
    print_section("📋 RIEPILOGO FINALE")
    
    game_won = game_state.get("game_won", False) if game_state else False
    completed_rooms = game_state.get("completed_rooms_count", 0) if game_state else 0
    rgb_on = esterno_state.get("rgb_strip_on", False) if esterno_state else False
    
    print(f"🏆 Game Won: {'SÌ ✅' if game_won else 'NO ❌'}")
    print(f"📊 Stanze completate: {completed_rooms}/4")
    print(f"🎨 LED RGB Esterno: {'ATTIVI 🎉' if rgb_on else 'INATTIVI'}")
    
    if game_won and rgb_on:
        print("\n" + "=" * 60)
        print("  🎊🎊🎊 GIOCO COMPLETATO! 🎊🎊🎊")
        print("  Tutte le stanze sono completate e i LED RGB sono attivi!")
        print("=" * 60)
        sys.exit(0)
    elif game_won and not rgb_on:
        print("\n✅ Tutte le stanze sono completate!")
        print("⚠️ LED RGB non attivi - verifica la fotocellula")
        sys.exit(0)
    else:
        stanze_mancanti = 4 - completed_rooms
        print(f"\n📝 Mancano ancora {stanze_mancanti} stanza/e da completare")
        sys.exit(0)


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n⚠️ Verifica interrotta dall'utente")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ ERRORE: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)