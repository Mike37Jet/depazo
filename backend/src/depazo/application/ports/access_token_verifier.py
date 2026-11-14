from dataclasses import dataclass
from typing import Protocol
from uuid import UUID


class InvalidAccessTokenError(Exception):
    pass


class TokenVerificationUnavailableError(Exception):
    pass


@dataclass(frozen=True, slots=True)
class AuthenticatedUser:
    user_id: UUID


class AccessTokenVerifier(Protocol):
    async def verify(self, token: str) -> AuthenticatedUser: ...
