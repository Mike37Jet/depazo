import json
import struct
from dataclasses import replace
from decimal import Decimal
from typing import Any

from depazo.domain.listing import GeoPoint, Listing
from depazo.domain.search_profile import SearchProfile

DEFAULT_LISTING = Listing(
    source="test-source",
    external_id="listing-1",
    url="https://example.test/listing-1",
    title="Departamento en La Carolina, Quito",
    description="Departamento luminoso",
    monthly_rent_usd=Decimal(720),
    condo_fee_usd=Decimal(80),
    area_m2=Decimal(95),
    bedrooms=2,
    bathrooms=2,
    neighborhood="La Carolina",
    city="Quito",
    location=GeoPoint(latitude=-0.18, longitude=-78.48),
    image_url=None,
)


def a_listing(**overrides: Any) -> Listing:
    return replace(DEFAULT_LISTING, **overrides)


DEFAULT_PROFILE = SearchProfile(max_monthly_cost_usd=Decimal(1000))


def a_profile(**overrides: Any) -> SearchProfile:
    return replace(DEFAULT_PROFILE, **overrides)


def a_captured_listing(**overrides: Any) -> dict[str, Any]:
    return {
        "source": "plusvalia",
        "externalId": "151448881",
        "url": "https://www.plusvalia.com/propiedades/clasificado/departamento-151448881.html",
        "title": "Departamento amoblado en La Carolina",
        "monthlyRentUsd": 1100,
        "condoFeeUsd": 90,
        "areaM2": 102,
        "bedrooms": 2,
        "bathrooms": 2,
        "neighborhood": "La Carolina",
        "city": "Quito",
        "imageUrl": "https://img10.naventcdn.com/avisos/9/01/51/44/88/81/360x266/1.jpg",
        "capturedAt": "2026-11-13T12:00:00.000Z",
        **overrides,
    }


def a_capture(*listings: dict[str, Any]) -> bytes:
    capture = {
        "format": "depazo.capture",
        "version": 1,
        "exportedAt": "2026-11-13T12:05:00.000Z",
        "listings": list(listings),
    }
    return json.dumps(capture).encode("utf-8")


def a_native_message(body: bytes) -> bytes:
    return struct.pack("=I", len(body)) + body
