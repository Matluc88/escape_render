#!/usr/bin/env python3
"""
Script per eliminare l'admin user esistente dal database Render.
Questo risolve il problema dell'email invalida (admin@escape.local).
"""

from app.database import SessionLocal
from app.models.admin_user import AdminUser

def delete_admin():
    db = SessionLocal()
    try:
        # Conta quanti admin ci sono
        admin_count = db.query(AdminUser).count()
        print(f"📊 Admin users trovati nel database: {admin_count}")
        
        if admin_count == 0:
            print("✅ Nessun admin da eliminare")
            return
        
        # Mostra gli admin esistenti
        admins = db.query(AdminUser).all()
        for admin in admins:
            print(f"  - Username: {admin.username}, Email: {admin.email}")
        
        # Elimina tutti gli admin
        deleted = db.query(AdminUser).delete()
        db.commit()
        
        print(f"\n✅ Eliminati {deleted} admin users dal database")
        print("ℹ️  Al prossimo deploy, verrà creato un nuovo admin con l'email corretta")
        
    except Exception as e:
        print(f"❌ Errore: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    delete_admin()