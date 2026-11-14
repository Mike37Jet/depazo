from collections.abc import AsyncIterator, Callable
from contextlib import AbstractAsyncContextManager, asynccontextmanager
from datetime import UTC, datetime
from pathlib import Path

import httpx
from fastapi import FastAPI
from sqlalchemy.ext.asyncio import async_sessionmaker

from depazo.application.ports.listing_source import ListingSource
from depazo.application.ports.notifier import Notifier
from depazo.application.ports.push_sender import PushSender
from depazo.application.ports.unit_of_work import UnitOfWork
from depazo.infrastructure.auth.supabase_jwt_verifier import SupabaseJwtVerifier
from depazo.infrastructure.http.polite_client import PoliteHttpClient
from depazo.infrastructure.notifications.resend_notifier import (
    EmailAlertSettings,
    NotificationsNotConfiguredError,
    ResendEmailNotifier,
    email_alert_settings_from_environment,
)
from depazo.infrastructure.notifications.web_push_sender import (
    PushNotConfiguredError,
    WebPushSender,
    WebPushSettings,
    web_push_settings_from_environment,
)
from depazo.infrastructure.persistence.database import (
    DATABASE_FAILURES,
    create_database_engine,
    database_url_from_environment,
)
from depazo.infrastructure.persistence.unit_of_work import SqlAlchemyUnitOfWork
from depazo.infrastructure.profiles.profile_file import InvalidProfileFileError, load_search_profile
from depazo.infrastructure.sources.arriendos_ec import source as arriendos_ec
from depazo.infrastructure.sources.capture.capture_file import (
    MAX_CAPTURE_MESSAGE_BYTES,
    CapturedFileListingSource,
    CapturedMessageListingSource,
    CaptureFile,
    InvalidCaptureFileError,
    read_capture_message,
)
from depazo.infrastructure.sources.icasas import source as icasas
from depazo.infrastructure.sources.marketplace import source as marketplace
from depazo.presentation.api.app import create_app
from depazo.presentation.api.dependencies import ApiDependencies
from depazo.presentation.api.rate_limit import InMemoryRateLimiter
from depazo.presentation.api.settings import ApiSettings

SECONDS_PER_MINUTE = 60.0
JWKS_TIMEOUT_SECONDS = 10.0

__all__ = [
    "DATABASE_FAILURES",
    "MAX_CAPTURE_MESSAGE_BYTES",
    "CaptureFile",
    "EmailAlertSettings",
    "InvalidCaptureFileError",
    "InvalidProfileFileError",
    "NotificationsNotConfiguredError",
    "PushNotConfiguredError",
    "UnknownSourceError",
    "create_api_app",
    "email_alert_settings_from_environment",
    "load_search_profile",
    "open_capture_file_source",
    "open_capture_message_source",
    "open_email_notifier",
    "open_listing_source",
    "open_push_sender",
    "open_unit_of_work_factory",
    "read_capture_message",
    "web_push_settings_from_environment",
]


class UnknownSourceError(ValueError):
    pass


@asynccontextmanager
async def _icasas_source() -> AsyncIterator[ListingSource]:
    async with PoliteHttpClient(icasas.ALLOWED_HOSTS, icasas.MIN_INTERVAL_SECONDS) as client:
        yield icasas.ICasasListingSource(client)


@asynccontextmanager
async def _arriendos_ec_source() -> AsyncIterator[ListingSource]:
    async with PoliteHttpClient(
        arriendos_ec.ALLOWED_HOSTS, arriendos_ec.MIN_INTERVAL_SECONDS
    ) as client:
        yield arriendos_ec.ArriendosEcListingSource(client)


@asynccontextmanager
async def _marketplace_source() -> AsyncIterator[ListingSource]:
    async with PoliteHttpClient(
        marketplace.ALLOWED_HOSTS,
        marketplace.MIN_INTERVAL_SECONDS,
        should_respect_robots=marketplace.SHOULD_RESPECT_ROBOTS,
        extra_headers=marketplace.NAVIGATION_HEADERS,
    ) as client:
        yield marketplace.MarketplaceListingSource(client)


SOURCE_FACTORIES: dict[str, Callable[[], AbstractAsyncContextManager[ListingSource]]] = {
    "icasas": _icasas_source,
    "arriendos_ec": _arriendos_ec_source,
    "marketplace": _marketplace_source,
}


def open_listing_source(name: str) -> AbstractAsyncContextManager[ListingSource]:
    factory = SOURCE_FACTORIES.get(name)
    if factory is None:
        raise UnknownSourceError(
            f"unknown source '{name}', available: {', '.join(SOURCE_FACTORIES)}"
        )
    return factory()


@asynccontextmanager
async def open_capture_file_source(path: Path) -> AsyncIterator[ListingSource]:
    yield CapturedFileListingSource(path)


@asynccontextmanager
async def open_capture_message_source(capture: CaptureFile) -> AsyncIterator[ListingSource]:
    yield CapturedMessageListingSource(capture)


@asynccontextmanager
async def open_unit_of_work_factory() -> AsyncIterator[Callable[[], UnitOfWork]]:
    engine = create_database_engine(database_url_from_environment())
    session_factory = async_sessionmaker(engine, expire_on_commit=False)
    try:
        yield lambda: SqlAlchemyUnitOfWork(session_factory)
    finally:
        await engine.dispose()


@asynccontextmanager
async def open_email_notifier(settings: EmailAlertSettings) -> AsyncIterator[Notifier]:
    async with ResendEmailNotifier(settings) as notifier:
        yield notifier


@asynccontextmanager
async def open_push_sender(settings: WebPushSettings) -> AsyncIterator[PushSender]:
    async with WebPushSender(settings) as sender:
        yield sender


def create_api_app() -> FastAPI:
    settings = ApiSettings()  # type: ignore[call-arg]
    return create_app(
        lambda: _open_api_dependencies(settings),
        cors_origins=settings.cors_origins,
        is_openapi_published=settings.is_openapi_published,
    )


@asynccontextmanager
async def _open_api_dependencies(settings: ApiSettings) -> AsyncIterator[ApiDependencies]:
    async with (
        open_unit_of_work_factory() as open_unit_of_work,
        httpx.AsyncClient(timeout=JWKS_TIMEOUT_SECONDS, follow_redirects=False) as jwks_client,
    ):
        yield ApiDependencies(
            open_unit_of_work=open_unit_of_work,
            token_verifier=SupabaseJwtVerifier(
                jwks_client,
                jwks_url=settings.jwks_url,
                issuer=settings.token_issuer,
                audience=settings.jwt_audience,
            ),
            rate_limiter=InMemoryRateLimiter(settings.requests_per_minute, SECONDS_PER_MINUTE),
            clock=lambda: datetime.now(UTC),
        )
