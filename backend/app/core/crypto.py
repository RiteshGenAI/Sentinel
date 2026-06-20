import hashlib
import base64
from cryptography.fernet import Fernet
from app.core.config import get_settings

_settings = None
_fernet = None

def _get_fernet() -> Fernet:
    global _settings, _fernet
    if _fernet is not None:
        return _fernet
    _settings = get_settings()
    # Derive a 32-byte key from SECRET_KEY using SHA-256, then base64-encode for Fernet
    key = hashlib.sha256(_settings.secret_key.encode()).digest()
    _fernet = Fernet(base64.urlsafe_b64encode(key))
    return _fernet

def encrypt_key(raw_key: str) -> str:
    f = _get_fernet()
    return f.encrypt(raw_key.encode()).decode()

def decrypt_key(encrypted: str) -> str:
    f = _get_fernet()
    return f.decrypt(encrypted.encode()).decode()
