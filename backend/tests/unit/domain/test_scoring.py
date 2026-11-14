from decimal import Decimal

from hypothesis import given
from hypothesis import strategies as st

from depazo.domain.scoring import Criterion, RejectionReason, monthly_cost_usd, score_listing
from tests.builders import a_listing, a_profile

rents = st.decimals(min_value=0, max_value=5000, places=2)
areas = st.decimals(min_value=10, max_value=600, places=2)
neighborhoods = st.sampled_from(["La Carolina", "Cumbayá", "El Batán", "Quitumbe", None])


def test_adds_condo_fee_to_the_cost_when_the_budget_includes_it() -> None:
    listing = a_listing(monthly_rent_usd=Decimal(700), condo_fee_usd=Decimal(80))

    assert monthly_cost_usd(listing, a_profile(is_condo_fee_in_budget=True)) == Decimal(780)
    assert monthly_cost_usd(listing, a_profile(is_condo_fee_in_budget=False)) == Decimal(700)


def test_rejects_listings_over_budget_once_condo_fee_is_added() -> None:
    listing = a_listing(monthly_rent_usd=Decimal(950), condo_fee_usd=Decimal(80))

    result = score_listing(listing, a_profile(max_monthly_cost_usd=Decimal(1000)))

    assert result.total == 0
    assert result.rejection_reasons == (RejectionReason.OVER_BUDGET,)


def test_rejects_listings_without_a_price() -> None:
    result = score_listing(a_listing(monthly_rent_usd=None), a_profile())

    assert result.rejection_reasons == (RejectionReason.PRICE_UNKNOWN,)


def test_reports_every_failed_hard_filter() -> None:
    listing = a_listing(bedrooms=1, bathrooms=1, area_m2=Decimal(40), neighborhood="Quitumbe")
    profile = a_profile(
        min_bedrooms=2,
        min_bathrooms=2,
        min_area_m2=Decimal(70),
        excluded_neighborhoods=frozenset({"Quitumbe"}),
    )

    result = score_listing(listing, profile)

    assert set(result.rejection_reasons) == {
        RejectionReason.TOO_FEW_BEDROOMS,
        RejectionReason.TOO_FEW_BATHROOMS,
        RejectionReason.TOO_SMALL,
        RejectionReason.EXCLUDED_NEIGHBORHOOD,
    }


def test_does_not_reject_listings_for_missing_room_data() -> None:
    result = score_listing(a_listing(bedrooms=None, area_m2=None), a_profile(min_bedrooms=3))

    assert result.passed_hard_filters


def test_gives_full_price_score_at_sixty_percent_of_the_budget() -> None:
    listing = a_listing(monthly_rent_usd=Decimal(600), condo_fee_usd=None)

    result = score_listing(listing, a_profile(max_monthly_cost_usd=Decimal(1000)))

    assert result.total == 100


def test_gives_zero_price_score_exactly_at_the_budget() -> None:
    listing = a_listing(monthly_rent_usd=Decimal(1000), condo_fee_usd=None)

    result = score_listing(listing, a_profile(max_monthly_cost_usd=Decimal(1000)))

    assert result.passed_hard_filters
    assert result.total == 0


def test_explains_the_score_with_each_criterion_and_weight() -> None:
    listing = a_listing(
        monthly_rent_usd=Decimal(800),
        condo_fee_usd=None,
        area_m2=Decimal(90),
        neighborhood="Cumbayá",
    )
    profile = a_profile(min_area_m2=Decimal(80), preferred_neighborhoods=frozenset({"Cumbaya"}))

    result = score_listing(listing, profile)

    assert {item.criterion: item.value for item in result.breakdown} == {
        Criterion.PRICE: Decimal("0.5"),
        Criterion.AREA: Decimal("0.25"),
        Criterion.NEIGHBORHOOD: Decimal(1),
    }
    assert result.total == 56


def test_ignores_criteria_the_profile_does_not_define() -> None:
    result = score_listing(a_listing(), a_profile())

    assert [item.criterion for item in result.breakdown] == [Criterion.PRICE]


def test_gives_a_neutral_value_to_unknown_neighborhoods() -> None:
    profile = a_profile(preferred_neighborhoods=frozenset({"La Carolina"}))

    result = score_listing(a_listing(neighborhood=None), profile)

    assert Decimal("0.5") in {item.value for item in result.breakdown}


@given(rent=rents, area=areas, neighborhood=neighborhoods)
def test_total_is_always_between_zero_and_one_hundred(
    rent: Decimal, area: Decimal, neighborhood: str | None
) -> None:
    profile = a_profile(min_area_m2=Decimal(60), preferred_neighborhoods=frozenset({"Cumbayá"}))

    result = score_listing(
        a_listing(monthly_rent_usd=rent, area_m2=area, neighborhood=neighborhood), profile
    )

    assert 0 <= result.total <= 100
    assert all(0 <= item.value <= 1 for item in result.breakdown)


@given(rent=rents)
def test_rejected_listings_always_score_zero(rent: Decimal) -> None:
    result = score_listing(a_listing(monthly_rent_usd=rent, condo_fee_usd=None), a_profile())

    assert result.passed_hard_filters or result.total == 0


@given(cheaper=rents, discount=st.decimals(min_value=0, max_value=500, places=2))
def test_a_cheaper_listing_never_scores_lower(cheaper: Decimal, discount: Decimal) -> None:
    profile = a_profile(max_monthly_cost_usd=Decimal(6000))
    pricier = cheaper + discount

    cheaper_total = score_listing(a_listing(monthly_rent_usd=cheaper), profile).total
    pricier_total = score_listing(a_listing(monthly_rent_usd=pricier), profile).total

    assert cheaper_total >= pricier_total


@given(rent=rents, neighborhood=neighborhoods)
def test_preferring_the_listing_neighborhood_never_lowers_its_score(
    rent: Decimal, neighborhood: str | None
) -> None:
    listing = a_listing(monthly_rent_usd=rent, neighborhood=neighborhood)
    other_preference = a_profile(preferred_neighborhoods=frozenset({"Conocoto"}))
    own_preference = a_profile(preferred_neighborhoods=frozenset({neighborhood or "Conocoto"}))
    own_total = score_listing(listing, own_preference).total
    other_total = score_listing(listing, other_preference).total

    assert own_total >= other_total


def test_is_deterministic() -> None:
    profile = a_profile(min_area_m2=Decimal(70))

    assert score_listing(a_listing(), profile) == score_listing(a_listing(), profile)
