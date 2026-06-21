"""
Migration: Add missing columns to existing tables.
Safe to run multiple times (uses IF NOT EXISTS).
Run: python migrate.py
"""
from app.db.session import engine
from sqlalchemy import text

def migrate():
    with engine.connect() as conn:
        # Add cost_usd to api_key_usage if missing
        conn.execute(text("""
            ALTER TABLE api_key_usage 
            ADD COLUMN IF NOT EXISTS cost_usd FLOAT DEFAULT 0.0
        """))
        
        # Add cost_usd to child_key_usage if missing  
        conn.execute(text("""
            ALTER TABLE child_key_usage 
            ADD COLUMN IF NOT EXISTS cost_usd FLOAT DEFAULT 0.0
        """))
        
        conn.commit()
        print("✅ Migration complete: all columns verified")

if __name__ == '__main__':
    migrate()
