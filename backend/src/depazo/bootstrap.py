from collections.abc import AsyncIterator, Callable
from contextlib import AbstractAsyncContextManager, asynccontextmanager
from pathlib import Path

from sqlalchemy.ext.asyncio import async_sessionmaker

from depazo.application.ports.listing_repository import UnitOfWork
from depazo.application.ports.listing_source import ListingSource
from depazo.application.ports.notifier import Notifier
from depazo.infrastructure.http.polite_client import PoliteHttpClient
from depazo.infrastructure.notifications.resend_notifier import (
    EmailAlertSettings,
    NotificationsNotConfiguredError,
    ResendEmailNotifier,
    email_alert_settings_from_environment,
)
from depazo.infrastructure.persistence.database import (
    create_database_engine,
    database_url_from_environment,
)
from depazo.infrastructure.persistence.unit_of_work import SqlAlchemyUnitOfWork
from depazo.infrastructure.profiles.profile_file import InvalidProfileFileError, load_search_profile
from depazo.infrastructure.sources.capture.capture_file import CapturedFileListingSource
from depazo.infrastructure.sources.icasas import source as icasas

__all__ = [
    "EmailAlertSettings",
    "InvalidProfileFileError",
    "NotificationsNotConfiguredError",
    "UnknownSourceError",
    "email_alert_settings_from_environment",
    "load_search_profile",
    "open_capture_file_source",
    "open_email_notifier",
    "open_listing_source",
    "open_unit_of_work_factory",
]


class UnknownSourceError(ValueError):
    pass


@asynccontextmanager
async def _icasas_source() -> AsyncIterator[ListingSource]:
    async with PoliteHttpClient(icasas.ALLOWED_HOSTS, icasas.MIN_INTERVAL_SECONDS) as client:
        yield icasas.ICasasListingSource(client)


SOURCE_FACTORIES: dict[str, Callable[[], AbstractAsyncContextManager[ListingSource]]] = {
    "icasas": _icasas_source,
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
