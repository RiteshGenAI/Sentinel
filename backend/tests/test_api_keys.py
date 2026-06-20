import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.main import app
from app.db.base import Base
from app.db.session import get_db

# Use a temp file db that both test files can share if needed
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

class TestApiKeys:
    def _get_admin_token(self):
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
        return r.json()['access_token']

    def test_generate_api_key(self):
        token = self._get_admin_token()
        r = client.post('/api/v1/api-keys/', json={
            'name': 'Test Key',
            'cost_limit_usd': 50.0
        }, headers={'Authorization': f'Bearer {token}'})
        assert r.status_code == 200
        data = r.json()
        assert data['name'] == 'Test Key'
        assert data['cost_limit_usd'] == 50.0
        assert 'secret_key' in data
        assert data['secret_key'].startswith('sk_sentinel_')
        assert data['is_active'] is True

    def test_list_api_keys(self):
        token = self._get_admin_token()
        client.post('/api/v1/api-keys/', json={'name': 'Key1', 'cost_limit_usd': 10}, headers={'Authorization': f'Bearer {token}'})
        client.post('/api/v1/api-keys/', json={'name': 'Key2', 'cost_limit_usd': 20}, headers={'Authorization': f'Bearer {token}'})
        r = client.get('/api/v1/api-keys/', headers={'Authorization': f'Bearer {token}'})
        assert r.status_code == 200
        assert len(r.json()) == 2

    def test_revoke_api_key(self):
        token = self._get_admin_token()
        r = client.post('/api/v1/api-keys/', json={'name': 'ToRevoke', 'cost_limit_usd': 10}, headers={'Authorization': f'Bearer {token}'})
        key_id = r.json()['id']
        r = client.delete(f'/api/v1/api-keys/{key_id}', headers={'Authorization': f'Bearer {token}'})
        assert r.status_code == 200
        assert r.json()['ok'] is True

    def test_ingest_with_api_key(self):
        token = self._get_admin_token()
        r = client.post('/api/v1/api-keys/', json={'name': 'IngestKey', 'cost_limit_usd': 100}, headers={'Authorization': f'Bearer {token}'})
        data = r.json()
        secret = data['secret_key']
        key_id = data['id']

        # Ingest LLM call with API key
        r = client.post('/api/v1/ingest/llm-call', json={
            'provider': 'openai',
            'model': 'gpt-4.1',
            'prompt_tokens': 1000,
            'completion_tokens': 500,
            'project_name': 'api-key-test'
        }, headers={'X-API-Key': secret})
        assert r.status_code == 200
        assert 'cost_usd' in r.json()

        # Check summary
        r = client.get(f'/api/v1/api-keys/{key_id}/summary', headers={'Authorization': f'Bearer {token}'})
        assert r.status_code == 200
        summary = r.json()
        assert summary['total_cost_usd'] > 0
        assert summary['usage_count'] == 1
        assert summary['remaining_usd'] < 100

    def test_api_key_limit_enforced(self):
        token = self._get_admin_token()
        r = client.post('/api/v1/api-keys/', json={'name': 'TinyLimit', 'cost_limit_usd': 0.001}, headers={'Authorization': f'Bearer {token}'})
        data = r.json()
        secret = data['secret_key']

        # This call should exceed the tiny limit
        r = client.post('/api/v1/ingest/llm-call', json={
            'provider': 'openai',
            'model': 'gpt-4.1',
            'prompt_tokens': 100000,
            'completion_tokens': 50000,
            'project_name': 'limit-test'
        }, headers={'X-API-Key': secret})
        assert r.status_code == 429
        assert 'limit exceeded' in r.json()['detail'].lower()

    def test_invalid_api_key_rejected(self):
        r = client.post('/api/v1/ingest/llm-call', json={
            'provider': 'openai',
            'model': 'gpt-4.1',
            'prompt_tokens': 1000,
            'completion_tokens': 500
        }, headers={'X-API-Key': 'sk_sentinel_invalid_key'})
        assert r.status_code == 401

    def test_revoked_key_rejected(self):
        token = self._get_admin_token()
        r = client.post('/api/v1/api-keys/', json={'name': 'RevokeTest', 'cost_limit_usd': 10}, headers={'Authorization': f'Bearer {token}'})
        data = r.json()
        secret = data['secret_key']
        key_id = data['id']

        # Revoke it
        client.delete(f'/api/v1/api-keys/{key_id}', headers={'Authorization': f'Bearer {token}'})

        # Try to use it
        r = client.post('/api/v1/ingest/llm-call', json={
            'provider': 'openai',
            'model': 'gpt-4.1',
            'prompt_tokens': 1000,
            'completion_tokens': 500
        }, headers={'X-API-Key': secret})
        assert r.status_code == 401

    def test_ci_run_with_api_key(self):
        token = self._get_admin_token()
        r = client.post('/api/v1/api-keys/', json={'name': 'CIKey', 'cost_limit_usd': 100}, headers={'Authorization': f'Bearer {token}'})
        secret = r.json()['secret_key']

        r = client.post('/api/v1/ingest/ci-run', json={
            'pipeline': 'test-pipeline',
            'job': 'test-job',
            'runner_type': 'github-standard',
            'duration_seconds': 3600,
            'project_name': 'ci-test'
        }, headers={'X-API-Key': secret})
        assert r.status_code == 200
        assert 'infra_cost_usd' in r.json()

    def test_viewer_cannot_create_api_key(self):
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
        r = client.post('/api/v1/api-keys/', json={'name': 'Bad', 'cost_limit_usd': 10}, headers={'Authorization': f'Bearer {token}'})
        assert r.status_code == 403
