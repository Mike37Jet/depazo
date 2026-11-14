from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

import httpx
import pytest
import respx
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from depazo.infrastructure.auth.supabase_jwt_verifier import SupabaseJwtVerifier
from depazo.infrastructure.persistence.unit_of_work import SqlAlchemyUnitOfWork
from depazo.presentation.api.app import create_app
from depazo.presentation.api.dependencies import ApiDependencies
from depazo.presentation.api.rate_limit import InMemoryRateLimiter
from tests.integration.api.api_helpers import NOW, REQUESTS_PER_WINDOW
from tests.integration.auth_tokens import AUDIENCE, ISSUER, JWKS_URL, public_jwks


@pytest.fixture
async def client(
    session_factory: async_sessionmaker[AsyncSession],
) -> AsyncIterator[httpx.AsyncClient]:
    @asynccontextmanager
    async def open_dependencies() -> AsyncIterator[ApiDependencies]:
        async with httpx.AsyncClient() as keys_client:
            yield ApiDependencies(
                open_unit_of_work=lambda: SqlAlchemyUnitOfWork(session_factory),
                token_verifier=SupabaseJwtVerifier(keys_client, JWKS_URL, ISSUER, AUDIENCE),
                rate_limiter=InMemoryRateLimiter(
                    max_requests=REQUESTS_PER_WINDOW, window_seconds=60
                ),
                clock=lambda: NOW,
            )

    app = create_app(open_dependencies)
    with respx.mock(assert_all_called=False) as router:
        router.get(JWKS_URL).mock(return_value=httpx.Response(200, json=public_jwks()))
        router.route(host="test").pass_through()
        async with app.router.lifespan_context(app):
            transport = httpx.ASGITransport(app=app)
            async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
                yield client
