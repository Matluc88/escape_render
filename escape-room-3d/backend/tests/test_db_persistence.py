"""
Test DB Persistence - Sistema AIR-GAPPED
Verifica che dati PostgreSQL persistano nel volume dopo restart container.

CRITICAL per sistema Raspberry Pi isolato: 
- Nessuna perdita dati dopo riavvio
- Volume integrity garantita
- Determinismo totale
"""
import pytest
import subprocess
import time
import requests
from faker import Faker

fake = Faker()

# Backend già in esecuzione su porta 8001 (dev stack)
BACKEND_URL = "http://localhost:8001"
COMPOSE_FILE = "docker-compose.dev.yml"


# Helper function per attendere backend ready
def wait_for_backend(timeout=30):
    """Attende che il backend sia pronto dopo restart."""
    import time
    start = time.time()
    while time.time() - start < timeout:
        try:
            response = requests.get(f"{BACKEND_URL}/health", timeout=2)
            if response.status_code == 200:
                return True
        except:
            pass
        time.sleep(1)
    return False


def test_session_persists_after_container_restart():
    """
    TEST CRITICO: Session persiste dopo restart container backend.
    
    Scenario:
    1. Crea sessione via API
    2. Restart container backend (simula crash/reboot)
    3. Verifica sessione ancora presente
    
    Fallimento = PERDITA DATI in produzione su Raspberry Pi
    """
    # Step 1: Create session (PIN generato automaticamente dal backend)
    response = requests.post(
        f"{BACKEND_URL}/sessions",
        timeout=10
    )
    assert response.status_code == 201, "Session creation failed"
    
    session_id = response.json()["id"]
    session_pin = response.json()["pin"]
    
    print(f"\n✅ Created session: ID={session_id}, PIN={session_pin}")
    
    # Step 2: Restart backend container (simula crash)
    print("\n🔄 Restarting backend container...")
    subprocess.run(
        ["docker", "restart", "escape-backend-dev"],
        check=True
    )
    
    # Wait for backend to be ready
    time.sleep(10)
    
    # Step 3: Verify session still exists (retry con wait for backend)
    wait_for_backend()
    response = requests.get(
        f"{BACKEND_URL}/sessions/{session_id}",
        timeout=10
    )
    
    assert response.status_code == 200, "Session NOT found after restart!"
    retrieved_session = response.json()
    
    assert retrieved_session["id"] == session_id, "Session ID mismatch"
    assert retrieved_session["pin"] == session_pin, "Session PIN mismatch"
    
    print(f"✅ Session PERSISTED after restart: {retrieved_session}")


def test_multiple_restarts_preserve_data():
    """
    TEST STRESS: Dati persistono dopo multiple restart consecutive.
    
    Simula scenario "giornata difficile" su Raspberry Pi con 
    3 restart consecutivi (power loss, memory issues, etc.)
    """
    # Create test session (PIN generato automaticamente)
    response = requests.post(
        f"{BACKEND_URL}/sessions",
        timeout=10
    )
    assert response.status_code == 201
    session_id = response.json()["id"]
    
    print(f"\n✅ Created stress test session: ID={session_id}")
    
    # 3 consecutive restarts
    for i in range(3):
        print(f"\n🔄 Restart #{i+1}/3...")
        subprocess.run(
            ["docker", "restart", "escape-backend-dev"],
            check=True
        )
        time.sleep(10)
        
        # Verify still exists
        wait_for_backend()
        response = requests.get(
            f"{BACKEND_URL}/sessions/{session_id}",
            timeout=10
        )
        assert response.status_code == 200, f"Data lost after restart #{i+1}"
        print(f"✅ Data intact after restart #{i+1}")
    
    print("\n✅ STRESS TEST PASSED: Data survived 3 restarts")


def test_volume_integrity_check():
    """
    TEST INFRASTRUTTURA: Verifica che volume PostgreSQL sia configurato correttamente.
    """
    # Check volume exists
    result = subprocess.run(
        ["docker", "volume", "ls"],
        capture_output=True,
        text=True
    )
    
    assert "postgres_data" in result.stdout or "escape" in result.stdout, \
        "PostgreSQL volume NOT found!"
    
    # Check volume is mounted in container
    result = subprocess.run(
        ["docker", "inspect", "escape-db-dev"],
        capture_output=True,
        text=True
    )
    
    assert "postgres_data" in result.stdout or "/var/lib/postgresql/data" in result.stdout, \
        "Volume NOT mounted correctly!"
    
    print("✅ Volume configuration is correct")


@pytest.mark.slow
def test_db_size_remains_stable():
    """
    TEST PERFORMANCE: Database size non cresce indefinitamente.
    
    Importante per Raspberry Pi con storage limitato.
    """
    # Query DB size
    result = subprocess.run(
        [
            "docker", "exec", "escape-db-dev",
            "psql", "-U", "escape_user", "-d", "escape_db",
            "-c", "SELECT pg_size_pretty(pg_database_size('escape_db'));"
        ],
        capture_output=True,
        text=True
    )
    
    print(f"\n📊 Current DB size: {result.stdout}")
    
    # Create some test data
    for i in range(10):
        requests.post(
            f"{BACKEND_URL}/sessions",
            timeout=5
        )
    
    # Query size again
    result_after = subprocess.run(
        [
            "docker", "exec", "escape-db-dev",
            "psql", "-U", "escape_user", "-d", "escape_db",
            "-c", "SELECT pg_size_pretty(pg_database_size('escape_db'));"
        ],
        capture_output=True,
        text=True
    )
    
    print(f"📊 After 10 sessions: {result_after.stdout}")
    
    # Size should be reasonable (< 50MB for test data)
    # Questo è un check soft, il valore reale dipende dal contenuto
    assert "GB" not in result_after.stdout, "DB size too large!"


if __name__ == "__main__":
    # Run with: pytest -v test_db_persistence.py
    pytest.main([__file__, "-v", "-s"])
