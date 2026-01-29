#!/usr/bin/env python3
"""
Script per creare il primo utente admin
Esegui: python create_admin.py
"""
import sys
import getpass
from sqlalchemy.orm import Session

from app.database import SessionLocal, engine, Base
from app.models.admin_user import AdminUser
from app.core.security import get_password_hash


def create_admin():
    print("=" * 60)
    print("CREAZIONE UTENTE ADMIN")
    print("=" * 60)
    
    # Create tables if they don't exist
    Base.metadata.create_all(bind=engine)
    
    db: Session = SessionLocal()
    
    try:
        # Get admin details
        print("\nInserisci i dati del nuovo admin:")
        username = input("Username: ").strip()
        
        if not username:
            print("❌ Username non può essere vuoto")
            sys.exit(1)
        
        # Check if username already exists
        existing = db.query(AdminUser).filter(AdminUser.username == username).first()
        if existing:
            print(f"❌ Username '{username}' già esistente")
            sys.exit(1)
        
        email = input("Email: ").strip()
        
        if not email:
            print("❌ Email non può essere vuota")
            sys.exit(1)
        
        # Check if email already exists
        existing = db.query(AdminUser).filter(AdminUser.email == email).first()
        if existing:
            print(f"❌ Email '{email}' già esistente")
            sys.exit(1)
        
        password = getpass.getpass("Password: ")
        password_confirm = getpass.getpass("Conferma password: ")
        
        if password != password_confirm:
            print("❌ Le password non coincidono")
            sys.exit(1)
        
        if len(password) < 8:
            print("❌ La password deve essere di almeno 8 caratteri")
            sys.exit(1)
        
        # Create admin user
        hashed_password = get_password_hash(password)
        
        admin = AdminUser(
            username=username,
            email=email,
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
        print("\n🔑 Puoi ora effettuare il login con queste credenziali")
        print(f"   URL: http://localhost/admin/login")
        print(f"   Username: {admin.username}")
        print("\n")
        
    except Exception as e:
        db.rollback()
        print(f"\n❌ Errore durante la creazione: {e}")
        sys.exit(1)
    finally:
        db.close()


if __name__ == "__main__":
    create_admin()