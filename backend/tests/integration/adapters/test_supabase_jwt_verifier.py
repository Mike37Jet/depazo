import time
from uuid import uuid4

import httpx
import jwt
import pytest
import respx

from depazo.application.ports.access_token_verifier import (
    InvalidAccessTokenError,
    TokenVerificationUnavailableError,
)
from depazo.infrastructure.auth.supabase_jwt_verifier import SupabaseJwtVerifier
from tests.integration.auth_tokens import AUDIENCE, ISSUER, JWKS_URL, issue_token, public_jwks


class FakeClock:
    def __init__(self) -> None:
        self.now = 1000.0

    def __call__(self) -> float:
        return self.now


async def verify(token: str, clock: FakeClock | None = None) -> object:
    async with httpx.AsyncClient() as client:
        verifier = SupabaseJwtVerifier(client, JWKS_URL, ISSUER, AUDIENCE, clock or FakeClock())
        return await verifier.verify(token)


@respx.mock
async def test_accepts_a_valid_supabase_token() -> None:
    respx.get(JWKS_URL).mock(return_value=httpx.Response(200, json=public_jwks()))
    user_id = uuid4()

    user = await verify(issue_token(user_id))

    assert getattr(user, "user_id", None) == user_id


@pytest.mark.parametrize(
    "claims",
    [
        {"exp": int(time.time()) - 3600},
        {"aud": "anon"},
        {"iss": "https://evil.test/auth/v1"},
        {"role": "anon"},
        {"sub": "not-a-uuid"},
        {"sub": None},
        {"exp": None},
    ],
    ids=["expired", "audience", "issuer", "role", "subject", "no-subject", "no-expiry"],
)
@respx.mock
async def test_rejects_tokens_with_invalid_claims(claims: dict[str, object]) -> None:
    respx.get(JWKS_URL).mock(return_value=httpx.Response(200, json=public_jwks()))

    with pytest.raises(InvalidAccessTokenError):
        await verify(issue_token(uuid4(), claim_overrides=claims))


@respx.mock
async def test_rejects_symmetric_tokens_to_prevent_algorithm_confusion() -> None:
    respx.get(JWKS_URL).mock(return_value=httpx.Response(200, json=public_jwks()))
    forged = jwt.encode(
        {"sub": str(uuid4()), "aud": AUDIENCE, "iss": ISSUER, "role": "authenticated"},
        "a-guessed-secret-of-at-least-thirty-two-bytes",
        algorithm="HS256",
        headers={"kid": "test-key-1"},
    )

    with pytest.raises(InvalidAccessTokenError):
        await verify(forged)


@pytest.mark.parametrize("token", ["", "not.a.jwt", "x" * 9000])
async def test_rejects_malformed_tokens_without_fetching_keys(token: str) -> None:
    with pytest.raises(InvalidAccessTokenError):
        await verify(token)


@respx.mock
async def test_rejects_tokens_signed_by_another_key() -> None:
    respx.get(JWKS_URL).mock(return_value=httpx.Response(200, json=public_jwks()))

    with pytest.raises(InvalidAccessTokenError):
        await verify(issue_token(uuid4(), key_id="rotated-away"))


@respx.mock
async def test_refreshes_keys_at_most_once_per_interval_for_unknown_key_ids() -> None:
    route = respx.get(JWKS_URL).mock(return_value=httpx.Response(200, json=public_jwks()))
    clock = FakeClock()

    async with httpx.AsyncClient() as client:
        verifier = SupabaseJwtVerifier(client, JWKS_URL, ISSUER, AUDIENCE, clock)
        for _ in range(5):
            with pytest.raises(InvalidAccessTokenError):
                await verifier.verify(issue_token(uuid4(), key_id="unknown"))
        clock.now += 301
        with pytest.raises(InvalidAccessTokenError):
            await verifier.verify(issue_token(uuid4(), key_id="unknown"))

    assert route.call_count == 2


@respx.mock
async def test_picks_up_rotated_keys_after_the_refresh_interval() -> None:
    respx.get(JWKS_URL).mock(
        side_effect=[
            httpx.Response(200, json=public_jwks(key_id="old")),
            httpx.Response(200, json=public_jwks(key_id="new")),
        ]
    )
    clock = FakeClock()

    async with httpx.AsyncClient() as client:
        verifier = SupabaseJwtVerifier(client, JWKS_URL, ISSUER, AUDIENCE, clock)
        await verifier.verify(issue_token(uuid4(), key_id="old"))
        clock.now += 301
        user = await verifier.verify(issue_token(uuid4(), key_id="new"))

    assert user.user_id is not None


@pytest.mark.parametrize(
    "response",
    [httpx.Response(503), httpx.Response(200, json=[]), httpx.Response(200, json={"keys": []})],
)
@respx.mock
async def test_reports_unusable_signing_keys_as_unavailable(response: httpx.Response) -> None:
    respx.get(JWKS_URL).mock(return_value=response)

    with pytest.raises(TokenVerificationUnavailableError):
        await verify(issue_token(uuid4()))
