#!/usr/bin/env python3
"""
IPv4 Bridge per ESP32
Crea un bridge IPv4 → localhost:8001 (IPv6)
Soluzione al problema Docker che ascolta solo su IPv6
"""

import socket
import threading
import time

LISTEN_HOST = '0.0.0.0'  # IPv4: ascolta su tutte le interfacce
LISTEN_PORT = 8002        # Porta alternativa per ESP32
TARGET_HOST = '127.0.0.1' # localhost funziona!
TARGET_PORT = 8001        # Porta Docker

def handle_client(client_socket, client_addr):
    """Gestisce singola connessione ESP32"""
    print(f"[{time.strftime('%H:%M:%S')}] 🔗 Connessione da {client_addr}")
    
    try:
        # Connetti a Docker backend
        backend = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        backend.connect((TARGET_HOST, TARGET_PORT))
        print(f"[{time.strftime('%H:%M:%S')}] ✅ Connesso a backend {TARGET_HOST}:{TARGET_PORT}")
        
        def forward(source, dest, direction):
            """Forwarda dati tra socket"""
            try:
                while True:
                    data = source.recv(4096)
                    if not data:
                        break
                    dest.sendall(data)
                    if direction == "→":
                        print(f"[{time.strftime('%H:%M:%S')}] ESP32 → Backend: {len(data)} bytes")
                    else:
                        print(f"[{time.strftime('%H:%M:%S')}] Backend → ESP32: {len(data)} bytes")
            except:
                pass
        
        # Thread per forwarding bidirezionale
        t1 = threading.Thread(target=forward, args=(client_socket, backend, "→"))
        t2 = threading.Thread(target=forward, args=(backend, client_socket, "←"))
        t1.daemon = True
        t2.daemon = True
        t1.start()
        t2.start()
        
        # Aspetta che finiscano
        t1.join()
        t2.join()
        
    except Exception as e:
        print(f"[{time.strftime('%H:%M:%S')}] ❌ Errore: {e}")
    finally:
        client_socket.close()
        try:
            backend.close()
        except:
            pass
        print(f"[{time.strftime('%H:%M:%S')}] 🔌 Connessione chiusa {client_addr}")

def main():
    """Server bridge IPv4"""
    server = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    server.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    server.bind((LISTEN_HOST, LISTEN_PORT))
    server.listen(5)
    
    print("=" * 60)
    print("🌉 IPv4 Bridge per ESP32")
    print("=" * 60)
    print(f"📡 Ascolta su: {LISTEN_HOST}:{LISTEN_PORT} (IPv4)")
    print(f"🎯 Forward a: {TARGET_HOST}:{TARGET_PORT} (Docker)")
    print("=" * 60)
    print(f"[{time.strftime('%H:%M:%S')}] ✅ Bridge attivo - In attesa ESP32...")
    print("")
    print("💡 Configura ESP32 con:")
    print(f"   const char* backend_url = \"http://192.168.1.6:{LISTEN_PORT}\";")
    print("=" * 60)
    print("")
    
    try:
        while True:
            client, addr = server.accept()
            thread = threading.Thread(target=handle_client, args=(client, addr))
            thread.daemon = True
            thread.start()
    except KeyboardInterrupt:
        print("\n\n🛑 Bridge fermato dall'utente")
    finally:
        server.close()

if __name__ == "__main__":
    main()
