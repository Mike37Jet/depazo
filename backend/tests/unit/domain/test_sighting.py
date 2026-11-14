from decimal import Decimal

from depazo.domain.sighting import SightingOutcome, classify_sighting
from tests.builders import a_listing


def test_classifies_unknown_listing_as_new() -> None:
    assert classify_sighting(None, a_listing()) is SightingOutcome.NEW


def test_detects_a_new_monthly_rent() -> None:
    previous = a_listing(monthly_rent_usd=Decimal(720))

    outcome = classify_sighting(previous, a_listing(monthly_rent_usd=Decimal(690)))

    assert outcome is SightingOutcome.PRICE_CHANGED


def test_detects_a_new_condo_fee() -> None:
    previous = a_listing(condo_fee_usd=None)

    outcome = classify_sighting(previous, a_listing(condo_fee_usd=Decimal(80)))

    assert outcome is SightingOutcome.PRICE_CHANGED


def test_ignores_changes_that_do_not_affect_the_price() -> None:
    previous = a_listing(title="Departamento", image_url=None)

    outcome = classify_sighting(previous, a_listing(title="Depa amplio", image_url=None))

    assert outcome is SightingOutcome.UNCHANGED
