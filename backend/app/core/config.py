from enum import StrEnum
from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict, PydanticBaseSettingsSource
from pydantic import model_validator

class Role(StrEnum):
    ADMIN = 'admin'
    MANAGER = 'manager'
    VIEWER = 'viewer'

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file='.env', extra='ignore')
    database_url: str = 'postgresql+psycopg://postgres:postgres@localhost:5432/sentinel'
    secret_key: str = 'change-me'
    access_token_expire_minutes: int = 120

    @classmethod
    def settings_customise_sources(
        cls,
        settings_cls,
        init_settings,
        env_settings,
        dotenv_settings,
        file_secret_settings,
    ):
        # Prefer backend/.env over stale shell env vars during local development.
        return init_settings, env_settings, file_secret_settings, dotenv_settings

    @model_validator(mode='after')
    def check_secret_key(self):
        if self.secret_key in ('change-me', 'secret', 'dev'):
            raise RuntimeError('SECRET_KEY must be changed from the default value.')
        return self

@lru_cache
def get_settings() -> Settings:
    return Settings()
