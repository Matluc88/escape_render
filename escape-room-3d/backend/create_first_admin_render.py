#!/usr/bin/env python3
"""
Script per creare automaticamente il primo admin su Render
Questo script crea un admin di default se non ce ne sono
"""
import os
import sys
from sqlalchemy.orm import Session

from app.database import SessionLocal, engine, Base
from app.models.admin_user import AdminUser
from app.core.security import get_password_hash


def create_default_admin():
    """
    Crea un admin di default se non esiste nessun admin
    Usa variabili ambiente per le credenziali
    """
    print("=" * 60)
    print("CREAZIONE ADMIN DI DEFAULT PER RENDER")
    print("=" * 60)
    
    # Get credentials from environment variables
    default_username = os.getenv("ADMIN_DEFAULT_USERNAME", "admin")
    default_email = os.getenv("ADMIN_DEFAULT_EMAIL", "admin@escape.local")
    default_password = os.getenv("ADMIN_DEFAULT_PASSWORD", "")
    
    if not default_password:
        print("❌ ERRORE: Variabile ADMIN_DEFAULT_PASSWORD non configurata")
        print("   Vai su Render Dashboard → Service → Environment")
        print("   Aggiungi: ADMIN_DEFAULT_PASSWORD=tua_password_forte")
        sys.exit(1)
    
    # Create tables if they don't exist
    Base.metadata.create_all(bind=engine)
    
    db: Session = SessionLocal()
    
    try:
        # Check if any admin exists
        existing_admin = db.query(AdminUser).first()
        
        if existing_admin:
            print(f"✅ Admin già esistente: {existing_admin.username}")
            print(f"   Email: {existing_admin.email}")
            print(f"   Creato: {existing_admin.created_at}")
            return
        
        # Create default admin
        print(f"\n📝 Creazione admin di default...")
        print(f"   Username: {default_username}")
        print(f"   Email: {default_email}")
        
        hashed_password = get_password_hash(default_password)
        
        admin = AdminUser(
            username=default_username,
            email=default_email,
            hashed_password=hashed_password,
            is_active=True
        )
        
        db.add(admin)
        db.commit()
        db.refresh(admin)
        
        print("\n" + "=" * 60)
        print("✅ ADMIN CREATO CON SUCCESSO!")
        print("=" * 60)
        print(f"ID: {admin.id}")
        print(f"Username: {admin.username}")
        print(f"Email: {admin.email}")
        print(f"Creato: {admin.created_at}")
        print("=" * 60)
        print("\n🔑 Credenziali per il login:")
        print(f"   Username: {admin.username}")
        print(f"   Password: (quella configurata in ADMIN_DEFAULT_PASSWORD)")
        print("\n")
        
    except Exception as e:
        db.rollback()
        print(f"\n❌ Errore durante la creazione: {e}")
        sys.exit(1)
    finally:
        db.close()


if __name__ == "__main__":
    create_default_admin()