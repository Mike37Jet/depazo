from decimal import Decimal

import pytest

from depazo.domain.search_profile import (
    InvalidSearchProfileError,
    ScoreWeights,
    normalize_place_name,
)
from tests.builders import a_profile


def test_matches_neighborhoods_ignoring_accents_case_and_spacing() -> None:
    profile = a_profile(preferred_neighborhoods=frozenset({"González Suárez"}))

    assert profile.prefers("gonzalez  suarez")


def test_normalizes_place_names_for_comparison() -> None:
    assert normalize_place_name(" Cumbayá ") == "cumbaya"


@pytest.mark.parametrize(
    "overrides",
    [
        {"max_monthly_cost_usd": Decimal(0)},
        {"min_monthly_cost_usd": Decimal(1500)},
        {"min_area_m2": Decimal(0)},
        {"min_bedrooms": -1},
        {"min_score": 101},
        {
            "preferred_neighborhoods": frozenset({"Cumbayá"}),
            "excluded_neighborhoods": frozenset({"cumbaya"}),
        },
    ],
)
def test_rejects_inconsistent_profiles(overrides: dict[str, object]) -> None:
    with pytest.raises(InvalidSearchProfileError):
        a_profile(**overrides)


def test_rejects_weights_that_are_all_zero() -> None:
    with pytest.raises(InvalidSearchProfileError):
        ScoreWeights(price=Decimal(0), area=Decimal(0), neighborhood=Decimal(0))
