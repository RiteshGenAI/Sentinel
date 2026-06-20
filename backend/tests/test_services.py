import pytest
from app.services.auth_service import hash_password, verify_password, create_access_token
from app.services.pricing_service import compute_llm_cost, compute_ci_cost
from app.models.user import User
from datetime import datetime, timezone

class TestAuthService:
    def test_hash_password(self):
        hashed = hash_password('password123')
        assert hashed != 'password123'
        assert hashed.startswith('$2')

    def test_verify_password(self):
        hashed = hash_password('password123')
        assert verify_password('password123', hashed) is True
        assert verify_password('wrong', hashed) is False

    def test_create_access_token(self):
        user = User(id=1, email='test@example.com', full_name='Test', hashed_password='hash', role='viewer')
        token = create_access_token(user)
        assert isinstance(token, str)
        assert len(token) > 0

class TestPricingService:
    def test_compute_llm_cost_openai_gpt41(self):
        cost = compute_llm_cost('openai', 'gpt-4.1', 1000, 1000)
        expected = (1000 / 1000 * 0.002) + (1000 / 1000 * 0.008)
        assert cost == pytest.approx(expected)

    def test_compute_llm_cost_unknown(self):
        cost = compute_llm_cost('unknown', 'model', 1000, 1000)
        assert cost == 0.0

    def test_compute_ci_cost_github_standard(self):
        cost = compute_ci_cost('github-standard', 3600)
        expected = (0.008 / 60) * 3600
        assert cost == pytest.approx(expected)

    def test_compute_ci_cost_unknown(self):
        cost = compute_ci_cost('unknown', 3600)
        assert cost == 0.0
