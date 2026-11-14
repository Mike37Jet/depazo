import asyncio
import json
from collections.abc import Callable
from contextlib import AbstractAsyncContextManager
from dataclasses import asdict
from decimal import Decimal
from enum import StrEnum
from pathlib import Path
from typing import Annotated

import typer

from depazo.application.ports.listing_source import ListingSource, SourceUnavailableError
from depazo.application.use_cases.collect_listings import CollectionReport, CollectListings
from depazo.bootstrap import UnknownSourceError, open_capture_file_source, open_listing_source
from depazo.domain.listing import Listing

MAX_PAGES_PER_RUN = 20

app = typer.Typer(no_args_is_help=True, help="depazo: rental apartment finder for Quito.")


class OutputFormat(StrEnum):
    TABLE = "table"
    JSON = "json"


@app.callback()
def depazo() -> None:
    return None


SourceOpener = Callable[[], AbstractAsyncContextManager[ListingSource]]


@app.command(help="Collect listings from a source and print them.")
def ingest(
    source: Annotated[str, typer.Option(help="Source name, e.g. icasas.")] = "icasas",
    pages: Annotated[int, typer.Option(min=1, max=MAX_PAGES_PER_RUN)] = 1,
    output: Annotated[OutputFormat, typer.Option()] = OutputFormat.TABLE,
) -> None:
    _collect_and_print(lambda: open_listing_source(source), pages, output)


@app.command(name="import", help="Import listings captured with the browser extension.")
def import_capture(
    capture_file: Annotated[Path, typer.Argument(help="JSON file exported by the extension.")],
    output: Annotated[OutputFormat, typer.Option()] = OutputFormat.TABLE,
) -> None:
    _collect_and_print(lambda: open_capture_file_source(capture_file), 1, output)


def _collect_and_print(open_source: SourceOpener, pages: int, output: OutputFormat) -> None:
    try:
        report = asyncio.run(_collect(open_source, pages))
    except (UnknownSourceError, SourceUnavailableError) as error:
        typer.secho(str(error), fg=typer.colors.RED, err=True)
        raise typer.Exit(code=1) from error
    if output is OutputFormat.JSON:
        typer.echo(json.dumps([asdict(listing) for listing in report.listings], default=str))
    else:
        _print_table(report)
    if report.was_blocked:
        typer.secho(f"{report.source} blocked the collector; stopped.", fg=typer.colors.YELLOW)


async def _collect(open_source: SourceOpener, pages: int) -> CollectionReport:
    async with open_source() as source:
        return await CollectListings(source).execute(max_pages=pages)


def _print_table(report: CollectionReport) -> None:
    discarded = f" ({report.discarded_count} discarded)" if report.discarded_count else ""
    typer.echo(f"{len(report.listings)} listings from {report.source}{discarded}")
    for listing in report.listings:
        typer.echo(_format_row(listing))


def _format_row(listing: Listing) -> str:
    rent = _format_amount(listing.monthly_rent_usd, prefix="$")
    area = _format_amount(listing.area_m2, suffix=" m²")
    rooms = f"{listing.bedrooms if listing.bedrooms is not None else '?'} hab"
    place = listing.neighborhood or listing.city or "?"
    return f"{rent:>8}  {area:>9}  {rooms:>6}  {place:<22.22}  {listing.url}"


def _format_amount(amount: Decimal | None, prefix: str = "", suffix: str = "") -> str:
    return f"{prefix}{amount:,.0f}{suffix}" if amount is not None else "?"
