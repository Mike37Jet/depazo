import asyncio
import time
from collections.abc import Callable
from typing import Any
from uuid import UUID

import httpx
import jwt

from depazo.application.ports.access_token_verifier import (
    AuthenticatedUser,
    InvalidAccessTokenError,
    TokenVerificationUnavailableError,
)

ALLOWED_ALGORITHMS = frozenset({"ES256", "RS256"})
AUTHENTICATED_ROLE = "authenticated"
REQUIRED_CLAIMS = ["exp", "iat", "sub", "aud", "iss"]
MAX_TOKEN_LENGTH = 8192
MIN_SECONDS_BETWEEN_KEY_REFRESHES = 300.0
CLOCK_SKEW_SECONDS = 30
FIRST_ERROR_STATUS = 400


class SupabaseJwtVerifier:
    def __init__(
        self,
        client: httpx.AsyncClient,
        jwks_url: str,
        issuer: str,
        audience: str,
        clock: Callable[[], float] = time.monotonic,
    ) -> None:
        self._client = client
        self._jwks_url = jwks_url
        self._issuer = issuer
        self._audience = audience
        self._clock = clock
        self._keys: dict[str, jwt.PyJWK] = {}
        self._last_refresh_at: float | None = None
        self._refresh_lock = asyncio.Lock()

    async def verify(self, token: str) -> AuthenticatedUser:
        if not token or len(token) > MAX_TOKEN_LENGTH:
            raise InvalidAccessTokenError("token missing or too long")
        algorithm, key_id = _signing_details(token)
        key = await self._key_for(key_id)
        if key.algorithm_name != algorithm:
            raise InvalidAccessTokenError("token algorithm does not match its key")
        claims = self._decode(token, key, algorithm)
        if claims.get("role") != AUTHENTICATED_ROLE:
            raise InvalidAccessTokenError("token is not for an authenticated user")
        try:
            return AuthenticatedUser(user_id=UUID(str(claims["sub"])))
        except ValueError as error:
            raise InvalidAccessTokenError("token subject is not a user id") from error

    def _decode(self, token: str, key: jwt.PyJWK, algorithm: str) -> dict[str, Any]:
        try:
            return jwt.decode(
                token,
                key=key,
                algorithms=[algorithm],
                audience=self._audience,
                issuer=self._issuer,
                leeway=CLOCK_SKEW_SECONDS,
                options={"require": REQUIRED_CLAIMS},
            )
        except jwt.PyJWTError as error:
            raise InvalidAccessTokenError("token rejected") from error

    async def _key_for(self, key_id: str) -> jwt.PyJWK:
        if key_id not in self._keys:
            await self._refresh_keys()
        key = self._keys.get(key_id)
        if key is None:
            raise InvalidAccessTokenError("token signed with an unknown key")
        return key

    def _can_refresh(self) -> bool:
        return (
            self._last_refresh_at is None
            or self._clock() - self._last_refresh_at >= MIN_SECONDS_BETWEEN_KEY_REFRESHES
        )

    async def _refresh_keys(self) -> None:
        async with self._refresh_lock:
            if not self._can_refresh():
                return
            self._last_refresh_at = self._clock()
            try:
                response = await self._client.get(self._jwks_url)
            except httpx.TransportError as error:
                raise TokenVerificationUnavailableError("cannot reach the signing keys") from error
            if response.status_code >= FIRST_ERROR_STATUS:
                raise TokenVerificationUnavailableError(
                    f"signing keys answered {response.status_code}"
                )
            self._keys = _usable_keys(response.json())


def _signing_details(token: str) -> tuple[str, str]:
    try:
        header = jwt.get_unverified_header(token)
    except jwt.PyJWTError as error:
        raise InvalidAccessTokenError("token is malformed") from error
    algorithm = header.get("alg")
    key_id = header.get("kid")
    if algorithm not in ALLOWED_ALGORITHMS or not isinstance(key_id, str):
        raise InvalidAccessTokenError("token algorithm or key id not accepted")
    return algorithm, key_id


def _usable_keys(document: object) -> dict[str, jwt.PyJWK]:
    if not isinstance(document, dict):
        raise TokenVerificationUnavailableError("signing keys are not a JSON object")
    try:
        key_set = jwt.PyJWKSet.from_dict(document)
    except jwt.PyJWTError as error:
        raise TokenVerificationUnavailableError("signing keys are not a valid key set") from error
    return {
        key.key_id: key
        for key in key_set.keys
        if key.key_id is not None and key.algorithm_name in ALLOWED_ALGORITHMS
    }
