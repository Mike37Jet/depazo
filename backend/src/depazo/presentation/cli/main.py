import asyncio
import json
import sys
from collections.abc import Callable
from contextlib import AbstractAsyncContextManager
from dataclasses import asdict, dataclass
from datetime import UTC, datetime
from decimal import Decimal
from enum import StrEnum
from pathlib import Path
from typing import Annotated, BinaryIO

import typer

from depazo.application.dto.listing_alert import ListingAlert
from depazo.application.ports.listing_source import (
    ListingSource,
    SourceLayoutChangedError,
    SourceUnavailableError,
)
from depazo.application.ports.notifier import NotificationFailedError
from depazo.application.use_cases.alert_matching_listings import AlertMatchingListings
from depazo.application.use_cases.collect_listings import CollectionReport, CollectListings
from depazo.application.use_cases.push_new_matches import PushNewMatches, PushReport
from depazo.application.use_cases.rank_listings import RankedListing, RankingReport, RankListings
from depazo.application.use_cases.record_listings import RecordingSummary, RecordListings
from depazo.bootstrap import (
    DATABASE_FAILURES,
    MAX_CAPTURE_MESSAGE_BYTES,
    EmailAlertSettings,
    InvalidCaptureFileError,
    InvalidProfileFileError,
    NotificationsNotConfiguredError,
    PushNotConfiguredError,
    UnknownSourceError,
    email_alert_settings_from_environment,
    load_search_profile,
    open_capture_file_source,
    open_capture_message_source,
    open_email_notifier,
    open_listing_source,
    open_push_sender,
    open_unit_of_work_factory,
    read_capture_message,
    web_push_settings_from_environment,
)
from depazo.domain.listing import Listing
from depazo.domain.scoring import monthly_cost_usd
from depazo.domain.search_profile import SearchProfile
from depazo.infrastructure.notifications.web_push_sender import WebPushSettings
from depazo.infrastructure.persistence.database import DatabaseNotConfiguredError
from depazo.presentation.api.app import describe_api
from depazo.presentation.cli.native_messaging import (
    InvalidNativeMessageError,
    read_native_message,
    write_native_message,
)

MAX_PAGES_PER_RUN = 20
MAX_MATCHES_SHOWN = 200
SOURCE_STOPPED_EXIT_CODE = 3
INVALID_CAPTURE_REPLY: dict[str, object] = {"ok": False, "error": "invalid_capture"}
UNAVAILABLE_REPLY: dict[str, object] = {"ok": False, "error": "unavailable"}

app = typer.Typer(no_args_is_help=True, help="depazo: rental apartment finder for Quito.")


class OutputFormat(StrEnum):
    TABLE = "table"
    JSON = "json"


@app.callback()
def depazo() -> None:
    return None


SourceOpener = Callable[[], AbstractAsyncContextManager[ListingSource]]
SaveOption = Annotated[
    bool, typer.Option("--save", help="Store listings in the database (DEPAZO_DATABASE_URL).")
]
AlertProfileOption = Annotated[
    Path | None,
    typer.Option(
        "--alert-profile",
        help="Email new or repriced listings that match this profile (needs --save).",
    ),
]

NotifyUsersOption = Annotated[
    bool,
    typer.Option(
        "--notify-users",
        help="Send a push notification to every user with new matches (needs --save).",
    ),
]


@dataclass(frozen=True, slots=True)
class DeliveryRequest:
    should_save: bool
    alert_profile_file: Path | None
    should_notify_users: bool


@dataclass(frozen=True, slots=True)
class AlertPlan:
    profile: SearchProfile
    settings: EmailAlertSettings


@dataclass(frozen=True, slots=True)
class CollectionOutcome:
    report: CollectionReport
    summary: RecordingSummary | None
    alerts: tuple[ListingAlert, ...]
    push_report: PushReport | None = None


@app.command(help="Collect listings from a source and print them.")
def ingest(  # noqa: PLR0913, PLR0917
    source: Annotated[str, typer.Option(help="Source name, e.g. icasas.")] = "icasas",
    pages: Annotated[int, typer.Option(min=1, max=MAX_PAGES_PER_RUN)] = 1,
    output: Annotated[OutputFormat, typer.Option()] = OutputFormat.TABLE,
    save: SaveOption = False,
    alert_profile: AlertProfileOption = None,
    notify_users: NotifyUsersOption = False,
) -> None:
    _collect_and_print(
        lambda: open_listing_source(source),
        pages,
        output,
        DeliveryRequest(save, alert_profile, notify_users),
    )


@app.command(name="import", help="Import listings captured with the browser extension.")
def import_capture(
    capture_file: Annotated[Path, typer.Argument(help="JSON file exported by the extension.")],
    output: Annotated[OutputFormat, typer.Option()] = OutputFormat.TABLE,
    save: SaveOption = False,
    alert_profile: AlertProfileOption = None,
    notify_users: NotifyUsersOption = False,
) -> None:
    _collect_and_print(
        lambda: open_capture_file_source(capture_file),
        1,
        output,
        DeliveryRequest(save, alert_profile, notify_users),
    )


@app.command(help="Save one capture sent by the browser extension over native messaging.")
def receive_capture(
    notify_users: Annotated[
        bool,
        typer.Option(
            "--notify-users", help="Send a push notification to every user with new matches."
        ),
    ] = False,
) -> None:
    reply = _reply_to_capture_message(sys.stdin.buffer, notify_users)
    write_native_message(sys.stdout.buffer, reply)


def _reply_to_capture_message(stream: BinaryIO, should_notify_users: bool) -> dict[str, object]:
    try:
        capture = read_capture_message(read_native_message(stream, MAX_CAPTURE_MESSAGE_BYTES))
    except (InvalidNativeMessageError, InvalidCaptureFileError) as error:
        _report_rejected_capture(error)
        return INVALID_CAPTURE_REPLY
    try:
        push_settings = _push_settings(should_notify_users, should_save=True)
        outcome = asyncio.run(
            _collect(lambda: open_capture_message_source(capture), 1, True, None, push_settings)
        )
    except (PushNotConfiguredError, SourceUnavailableError) as error:
        _report_rejected_capture(error)
        return UNAVAILABLE_REPLY
    except DATABASE_FAILURES as error:
        _report_rejected_capture(error)
        return UNAVAILABLE_REPLY
    except Exception as error:
        _report_rejected_capture(error)
        return UNAVAILABLE_REPLY
    if outcome.summary is None:
        return UNAVAILABLE_REPLY
    _print_summary(outcome.summary)
    if outcome.push_report is not None:
        _print_push_report(outcome.push_report)
    return {
        "ok": True,
        "new": len(outcome.summary.new_listings),
        "repriced": len(outcome.summary.repriced_listings),
        "unchanged": outcome.summary.unchanged_count,
    }


def _report_rejected_capture(error: Exception) -> None:
    typer.secho(f"capture not saved: {type(error).__name__}", fg=typer.colors.RED, err=True)


@app.command(help="Rank saved listings against a search profile.")
def match(
    profile_file: Annotated[Path, typer.Option("--profile", help="Search profile JSON file.")],
    limit: Annotated[int, typer.Option(min=1, max=MAX_MATCHES_SHOWN)] = 20,
    output: Annotated[OutputFormat, typer.Option()] = OutputFormat.TABLE,
) -> None:
    try:
        profile = load_search_profile(profile_file)
        report = asyncio.run(_rank(profile))
    except (InvalidProfileFileError, DatabaseNotConfiguredError) as error:
        typer.secho(str(error), fg=typer.colors.RED, err=True)
        raise typer.Exit(code=1) from error
    shown = report.matches[:limit]
    if output is OutputFormat.JSON:
        typer.echo(json.dumps([_match_as_dict(match) for match in shown], default=str))
    else:
        _print_ranking(report, shown, profile)


async def _rank(profile: SearchProfile) -> RankingReport:
    async with open_unit_of_work_factory() as open_unit_of_work:
        return await RankListings(open_unit_of_work).execute(profile)


@app.command(help="Print the API description (OpenAPI) as JSON.")
def openapi() -> None:
    typer.echo(json.dumps(describe_api(), indent=2, sort_keys=True))


def _match_as_dict(match: RankedListing) -> dict[str, object]:
    return {
        "score": match.result.total,
        "breakdown": {item.criterion.value: item.value for item in match.result.breakdown},
        "listing": asdict(match.listing),
    }


def _print_ranking(
    report: RankingReport, shown: tuple[RankedListing, ...], profile: SearchProfile
) -> None:
    typer.echo(
        f"{len(report.matches)} matches out of {report.evaluated_count} listings "
        f"({report.rejected_count} failed the hard filters)"
    )
    for match in shown:
        cost = _format_amount(monthly_cost_usd(match.listing, profile), prefix="$")
        breakdown = " · ".join(
            f"{item.criterion.value} {item.value:.2f}" for item in match.result.breakdown
        )
        typer.echo(f"{match.result.total:>3}  {cost:>8}  {_describe(match.listing)}")
        typer.echo(f"     {breakdown}")


def _collect_and_print(
    open_source: SourceOpener, pages: int, output: OutputFormat, delivery: DeliveryRequest
) -> None:
    try:
        alert_plan = _alert_plan(delivery.alert_profile_file, delivery.should_save)
        push_settings = _push_settings(delivery.should_notify_users, delivery.should_save)
        outcome = asyncio.run(
            _collect(open_source, pages, delivery.should_save, alert_plan, push_settings)
        )
    except NotificationFailedError as error:
        typer.secho(
            f"listings were saved but the alert email failed: {error}",
            fg=typer.colors.RED,
            err=True,
        )
        raise typer.Exit(code=1) from error
    except SourceLayoutChangedError as error:
        typer.secho(str(error), fg=typer.colors.RED, err=True)
        raise typer.Exit(code=SOURCE_STOPPED_EXIT_CODE) from error
    except (
        UnknownSourceError,
        SourceUnavailableError,
        DatabaseNotConfiguredError,
        InvalidProfileFileError,
        NotificationsNotConfiguredError,
        PushNotConfiguredError,
    ) as error:
        typer.secho(str(error), fg=typer.colors.RED, err=True)
        raise typer.Exit(code=1) from error
    report = outcome.report
    if output is OutputFormat.JSON:
        typer.echo(json.dumps([asdict(listing) for listing in report.listings], default=str))
    else:
        _print_table(report)
    if outcome.summary is not None:
        _print_summary(outcome.summary)
    if alert_plan is not None:
        typer.secho(f"alerted: {len(outcome.alerts)} listings", fg=typer.colors.GREEN, err=True)
    if outcome.push_report is not None:
        _print_push_report(outcome.push_report)
    if report.was_blocked:
        typer.secho(
            f"{report.source} blocked the collector; stopped.", fg=typer.colors.YELLOW, err=True
        )
        raise typer.Exit(code=SOURCE_STOPPED_EXIT_CODE)


def _alert_plan(alert_profile_file: Path | None, should_save: bool) -> AlertPlan | None:
    if alert_profile_file is None:
        return None
    if not should_save:
        raise InvalidProfileFileError("--alert-profile needs --save to know which listings are new")
    return AlertPlan(
        profile=load_search_profile(alert_profile_file),
        settings=email_alert_settings_from_environment(),
    )


def _push_settings(should_notify_users: bool, should_save: bool) -> WebPushSettings | None:
    if not should_notify_users:
        return None
    if not should_save:
        raise PushNotConfiguredError("--notify-users needs --save to know which listings are new")
    return web_push_settings_from_environment()


async def _collect(
    open_source: SourceOpener,
    pages: int,
    should_save: bool,
    alert_plan: AlertPlan | None,
    push_settings: WebPushSettings | None = None,
) -> CollectionOutcome:
    if not should_save:
        return CollectionOutcome(await _collect_only(open_source, pages), None, ())
    async with open_unit_of_work_factory() as open_unit_of_work:
        report = await _collect_only(open_source, pages)
        summary = await RecordListings(open_unit_of_work, lambda: datetime.now(UTC)).execute(
            report.listings
        )
        push_report = None
        if push_settings is not None:
            async with open_push_sender(push_settings) as sender:
                push_report = await PushNewMatches(open_unit_of_work, sender).execute(summary)
    alerts: tuple[ListingAlert, ...] = ()
    if alert_plan is not None:
        async with open_email_notifier(alert_plan.settings) as notifier:
            alerts = await AlertMatchingListings(notifier).execute(summary, alert_plan.profile)
    return CollectionOutcome(report, summary, alerts, push_report)


def _print_push_report(push_report: PushReport) -> None:
    typer.secho(
        f"pushed: {push_report.notified_users} users, "
        f"{push_report.delivered_count} devices, "
        f"{push_report.removed_count} expired devices removed",
        fg=typer.colors.GREEN,
        err=True,
    )


async def _collect_only(open_source: SourceOpener, pages: int) -> CollectionReport:
    async with open_source() as source:
        return await CollectListings(source).execute(max_pages=pages)


def _print_summary(summary: RecordingSummary) -> None:
    typer.secho(
        f"saved: {len(summary.new_listings)} new, "
        f"{len(summary.repriced_listings)} with a new price, "
        f"{summary.unchanged_count} unchanged",
        fg=typer.colors.GREEN,
        err=True,
    )


def _print_table(report: CollectionReport) -> None:
    discarded = f" ({report.discarded_count} discarded)" if report.discarded_count else ""
    typer.echo(f"{len(report.listings)} listings from {report.source}{discarded}")
    for listing in report.listings:
        typer.echo(_format_row(listing))


def _format_row(listing: Listing) -> str:
    rent = _format_amount(listing.monthly_rent_usd, prefix="$")
    return f"{rent:>8}  {_describe(listing)}"


def _describe(listing: Listing) -> str:
    area = _format_amount(listing.area_m2, suffix=" m²")
    rooms = f"{listing.bedrooms if listing.bedrooms is not None else '?'} hab"
    place = listing.neighborhood or listing.city or "?"
    return f"{area:>9}  {rooms:>6}  {place:<22.22}  {listing.url}"


def _format_amount(amount: Decimal | None, prefix: str = "", suffix: str = "") -> str:
    return f"{prefix}{amount:,.0f}{suffix}" if amount is not None else "?"
