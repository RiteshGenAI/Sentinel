import os
import sys

# Ensure app is importable
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Set test environment variables BEFORE importing app modules
os.environ['SECRET_KEY'] = 'test-secret-key-for-testing-only-do-not-use-in-production'
os.environ['DATABASE_URL'] = 'sqlite:///:memory:'
