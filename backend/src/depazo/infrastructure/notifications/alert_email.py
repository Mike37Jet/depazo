import hashlib
from collections.abc import Sequence
from dataclasses import dataclass
from decimal import Decimal

from depazo.application.dto.listing_alert import AlertKind, ListingAlert

MAX_TITLE_LENGTH = 120
KIND_LABELS = {AlertKind.NEW: "Nuevo", AlertKind.NEW_PRICE: "Precio nuevo"}


@dataclass(frozen=True, slots=True)
class AlertEmail:
    subject: str
    text: str
    idempotency_key: str


def compose_alert_email(alerts: Sequence[ListingAlert]) -> AlertEmail:
    count = len(alerts)
    noun = "departamento" if count == 1 else "departamentos"
    subject = f"depazo: {count} {noun} para ti"
    sections = [_describe(alert) for alert in alerts]
    text = "\n\n".join([f"{count} {noun} superan tu puntaje mínimo.", *sections])
    return AlertEmail(subject=subject, text=text, idempotency_key=_idempotency_key(alerts))


def _describe(alert: ListingAlert) -> str:
    listing = alert.listing
    details = " · ".join(
        part
        for part in (
            _amount(listing.monthly_rent_usd, "USD/mes"),
            _amount(listing.condo_fee_usd, "alícuota") if listing.condo_fee_usd else None,
            _amount(listing.area_m2, "m²"),
            f"{listing.bedrooms} hab" if listing.bedrooms is not None else None,
            _plain(listing.neighborhood) if listing.neighborhood else None,
        )
        if part
    )
    return "\n".join(
        [
            f"[{alert.result.total}/100] {KIND_LABELS[alert.kind]}: {_plain(listing.title)}",
            details,
            listing.url,
        ]
    )


def _amount(value: Decimal | None, unit: str) -> str | None:
    return f"{value:,.0f} {unit}" if value is not None else None


def _plain(text: str) -> str:
    printable = "".join(char if char.isprintable() else " " for char in text)
    return " ".join(printable.split())[:MAX_TITLE_LENGTH]


def _idempotency_key(alerts: Sequence[ListingAlert]) -> str:
    fingerprint = "|".join(
        sorted(
            f"{alert.listing.source}:{alert.listing.external_id}:{alert.listing.monthly_rent_usd}:"
            f"{alert.listing.condo_fee_usd}"
            for alert in alerts
        )
    )
    return f"depazo-alerts-{hashlib.sha256(fingerprint.encode()).hexdigest()[:48]}"
