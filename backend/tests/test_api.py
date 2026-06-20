import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.main import app
from app.db.base import Base
from app.db.session import get_db

TEST_DB_URL = 'sqlite:///./test_shared.db'
engine = create_engine(TEST_DB_URL, connect_args={'check_same_thread': False})
TestingSessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)

def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db
client = TestClient(app)

@pytest.fixture(autouse=True)
def setup_db():
    Base.metadata.create_all(bind=engine)
    yield
    from sqlalchemy.orm import close_all_sessions
    close_all_sessions()
    with engine.begin() as conn:
        for tbl in reversed(Base.metadata.sorted_tables):
            conn.execute(tbl.delete())

def test_healthz():
    response = client.get('/healthz')
    assert response.status_code == 200
    assert response.json()['status'] == 'ok'

def test_register_and_login():
    r = client.post('/api/v1/auth/register', json={
        'email': 'test@example.com',
        'full_name': 'Test User',
        'password': 'password123',
        'role': 'viewer'
    })
    assert r.status_code == 200
    assert r.json()['email'] == 'test@example.com'

    r = client.post('/api/v1/auth/login', json={
        'email': 'test@example.com',
        'password': 'password123'
    })
    assert r.status_code == 200
    assert 'access_token' in r.json()

def test_login_invalid():
    r = client.post('/api/v1/auth/login', json={
        'email': 'nope@example.com',
        'password': 'wrong'
    })
    assert r.status_code == 401

def test_register_duplicate_email():
    client.post('/api/v1/auth/register', json={
        'email': 'dup@example.com',
        'full_name': 'Dup',
        'password': 'password123',
        'role': 'viewer'
    })
    r = client.post('/api/v1/auth/register', json={
        'email': 'dup@example.com',
        'full_name': 'Dup2',
        'password': 'password123',
        'role': 'viewer'
    })
    assert r.status_code == 400

def test_create_project_auth_required():
    r = client.post('/api/v1/projects/', json={'name': 'Test', 'description': ''})
    assert r.status_code == 401

def test_list_projects_auth_required():
    r = client.get('/api/v1/projects/')
    assert r.status_code == 401

def test_password_too_short():
    r = client.post('/api/v1/auth/register', json={
        'email': 'short@example.com',
        'full_name': 'Short',
        'password': '123',
        'role': 'viewer'
    })
    assert r.status_code == 422

def test_health_endpoint():
    r = client.get('/api/v1/health/')
    assert r.status_code == 200
    data = r.json()
    assert 'database' in data
    assert data['status'] in ('ok', 'degraded')

def test_admin_list_users_requires_admin():
    client.post('/api/v1/auth/register', json={
        'email': 'viewer@test.com',
        'full_name': 'Viewer',
        'password': 'password123',
        'role': 'viewer'
    })
    r = client.post('/api/v1/auth/login', json={
        'email': 'viewer@test.com',
        'password': 'password123'
    })
    token = r.json()['access_token']
    r = client.get('/api/v1/admin/users', headers={'Authorization': f'Bearer {token}'})
    assert r.status_code == 403

def test_create_and_list_project():
    client.post('/api/v1/auth/register', json={
        'email': 'admin@test.com',
        'full_name': 'Admin',
        'password': 'password123',
        'role': 'admin'
    })
    r = client.post('/api/v1/auth/login', json={
        'email': 'admin@test.com',
        'password': 'password123'
    })
    token = r.json()['access_token']
    
    r = client.post('/api/v1/projects/', json={'name': 'TestProject', 'description': 'Test'}, headers={'Authorization': f'Bearer {token}'})
    assert r.status_code == 200
    assert r.json()['name'] == 'TestProject'
    
    r = client.get('/api/v1/projects/', headers={'Authorization': f'Bearer {token}'})
    assert r.status_code == 200
    assert len(r.json()) >= 1

def test_budget_status_empty():
    client.post('/api/v1/auth/register', json={
        'email': 'admin2@test.com',
        'full_name': 'Admin',
        'password': 'password123',
        'role': 'admin'
    })
    r = client.post('/api/v1/auth/login', json={
        'email': 'admin2@test.com',
        'password': 'password123'
    })
    token = r.json()['access_token']
    
    r = client.get('/api/v1/budgets/status', headers={'Authorization': f'Bearer {token}'})
    assert r.status_code == 200
    assert r.json() == []
