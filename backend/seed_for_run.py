import hashlib
from app.db.session import SessionLocal
from app.models.user import User
from app.models.project import Project
from app.models.extra import Provider, MasterKey, ChildKey
from app.services.auth_service import hash_password
from app.core.crypto import encrypt_key

def seed():
    db = SessionLocal()
    try:
        # 1. Create default admin user
        user = db.query(User).filter(User.email == 'admin@sentinel.com').first()
        if not user:
            user = User(
                email='admin@sentinel.com',
                full_name='Ritesh Admin',
                hashed_password=hash_password('admin1234'),
                role='admin'
            )
            db.add(user)
            db.commit()
            db.refresh(user)
            print("Seeded User: admin@sentinel.com / admin1234")

        # 2. Create default project
        project = db.query(Project).filter(Project.name == 'FIFA 2026').first()
        if not project:
            project = Project(
                name='FIFA 2026',
                description='FIFA 2026 cost tracking and metrics'
            )
            db.add(project)
            db.commit()
            db.refresh(project)
            print("Seeded Project: FIFA 2026")

        # 3. Seed providers first
        from app.services.provider_service import seed_providers
        seed_providers(db)
        
        # 4. Fetch Gemini provider
        provider = db.query(Provider).filter(Provider.name == 'gemini').first()
        if not provider:
            print("Gemini provider not found after seeding.")
            return

        # 5. Add Master Key for Gemini
        master_key_val = "AQ.Ab8RN6I9-B0sACg0Q7PBXV_kch1x5E2gk0fL2bGidRaXEaXKMg"
        master_hash = hashlib.sha256(master_key_val.encode()).hexdigest()
        master = db.query(MasterKey).filter(MasterKey.key_hash == master_hash).first()
        if not master:
            master = MasterKey(
                provider_id=provider.id,
                key_hash=master_hash,
                key_prefix=master_key_val[:20],
                key_encrypted=encrypt_key(master_key_val),
                name='Google Gemini Master Key'
            )
            db.add(master)
            db.commit()
            db.refresh(master)
            print("Seeded Gemini Master Key")

        # 5. Add Child Key
        child_key_val = "sk_child_so8pjgNAnLgIBD2igIiIGMUglswJjt0wVKMsi23hJJc"
        child_hash = hashlib.sha256(child_key_val.encode()).hexdigest()
        child = db.query(ChildKey).filter(ChildKey.key_hash == child_hash).first()
        if not child:
            child = ChildKey(
                key_hash=child_hash,
                key_prefix=child_key_val[:20],
                name='Client Test Child Key',
                user_id=user.id,
                provider_id=provider.id,
                project_id=project.id,
                cost_limit_usd=100.0
            )
            db.add(child)
            db.commit()
            db.refresh(child)
            print("Seeded Child Key successfully")

    finally:
        db.close()

if __name__ == '__main__':
    seed()
