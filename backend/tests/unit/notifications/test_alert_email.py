from decimal import Decimal

from depazo.application.dto.listing_alert import AlertKind, ListingAlert
from depazo.domain.scoring import score_listing
from depazo.infrastructure.notifications.alert_email import compose_alert_email
from tests.builders import a_listing, a_profile


def an_alert(**listing_overrides: object) -> ListingAlert:
    listing = a_listing(**listing_overrides)
    return ListingAlert(listing, score_listing(listing, a_profile()), AlertKind.NEW)


def test_builds_the_subject_only_from_the_number_of_listings() -> None:
    email = compose_alert_email([an_alert(title="Ofertón\r\nBcc: evil@example.test")])

    assert email.subject == "depazo: 1 departamento para ti"


def test_lists_score_price_and_link_for_each_listing() -> None:
    email = compose_alert_email(
        [an_alert(monthly_rent_usd=Decimal(720), url="https://example.test/depa-1")]
    )

    assert "720 USD/mes" in email.text
    assert "https://example.test/depa-1" in email.text
    assert "/100] Nuevo:" in email.text


def test_flattens_control_characters_from_portal_titles() -> None:
    email = compose_alert_email([an_alert(title="Depa\x00 lindo\n\tcon vista")])

    assert "Depa lindo con vista" in email.text


def test_uses_the_same_idempotency_key_for_the_same_alerts_in_any_order() -> None:
    first, second = an_alert(external_id="a"), an_alert(external_id="b")

    assert (
        compose_alert_email([first, second]).idempotency_key
        == compose_alert_email([second, first]).idempotency_key
    )


def test_changes_the_idempotency_key_when_a_price_changes() -> None:
    before = compose_alert_email([an_alert(monthly_rent_usd=Decimal(800))])
    after = compose_alert_email([an_alert(monthly_rent_usd=Decimal(750))])

    assert before.idempotency_key != after.idempotency_key
