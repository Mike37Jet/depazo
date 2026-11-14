from typing import Annotated

from pydantic import Field, HttpUrl, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

SUPABASE_AUTH_PATH = "/auth/v1"
JWKS_PATH = "/.well-known/jwks.json"


class ApiSettings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="DEPAZO_", extra="ignore")

    supabase_url: HttpUrl
    jwt_audience: str = "authenticated"
    cors_origins: Annotated[list[str], Field(max_length=10)] = []
    requests_per_minute: Annotated[int, Field(ge=1, le=10_000)] = 60
    is_openapi_published: bool = False

    @field_validator("supabase_url")
    @classmethod
    def require_https_origin(cls, url: HttpUrl) -> HttpUrl:
        if url.scheme != "https" or url.path not in (None, "", "/") or url.query:
            raise ValueError("supabase url must be an https origin without path or query")
        return url

    @property
    def token_issuer(self) -> str:
        return f"{str(self.supabase_url).rstrip('/')}{SUPABASE_AUTH_PATH}"

    @property
    def jwks_url(self) -> str:
        return f"{self.token_issuer}{JWKS_PATH}"
