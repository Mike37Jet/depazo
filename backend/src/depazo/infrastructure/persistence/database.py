from pydantic import SecretStr, ValidationError
from pydantic_settings import BaseSettings, SettingsConfigDict
from sqlalchemy.ext.asyncio import AsyncEngine, create_async_engine

ASYNC_DRIVER_PREFIX = "postgresql+asyncpg://"
PLAIN_POSTGRES_PREFIXES = ("postgresql://", "postgres://")


class DatabaseNotConfiguredError(ValueError):
    pass


class DatabaseSettings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="DEPAZO_", extra="ignore")

    database_url: SecretStr


def database_url_from_environment() -> str:
    try:
        settings = DatabaseSettings()  # type: ignore[call-arg]
    except ValidationError as error:
        raise DatabaseNotConfiguredError("set DEPAZO_DATABASE_URL to save listings") from error
    return with_async_driver(settings.database_url.get_secret_value())


def with_async_driver(url: str) -> str:
    for prefix in PLAIN_POSTGRES_PREFIXES:
        if url.startswith(prefix):
            return ASYNC_DRIVER_PREFIX + url.removeprefix(prefix)
    return url


def create_database_engine(url: str) -> AsyncEngine:
    return create_async_engine(url, pool_pre_ping=True, connect_args={"statement_cache_size": 0})
