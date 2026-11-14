import json
from decimal import Decimal
from pathlib import Path

import pytest

from depazo.infrastructure.profiles.profile_file import (
    InvalidProfileFileError,
    load_search_profile,
)

EXAMPLE_PROFILE_PATH = Path(__file__).parents[4] / "docs" / "examples" / "search_profile.json"


def write_profile(tmp_path: Path, content: object) -> Path:
    path = tmp_path / "profile.json"
    path.write_text(json.dumps(content), encoding="utf-8")
    return path


def test_loads_the_documented_example_profile() -> None:
    profile = load_search_profile(EXAMPLE_PROFILE_PATH)

    assert profile.max_monthly_cost_usd == Decimal(900)
    assert profile.prefers("Gonzalez Suarez")


def test_applies_defaults_for_optional_fields(tmp_path: Path) -> None:
    profile = load_search_profile(write_profile(tmp_path, {"max_monthly_cost_usd": 800}))

    assert profile.is_condo_fee_in_budget
    assert profile.min_score == 60


@pytest.mark.parametrize(
    "content",
    [
        {"max_monthly_cost_usd": 800, "unexpected": True},
        {"max_monthly_cost_usd": -5},
        {"max_monthly_cost_usd": 800, "min_monthly_cost_usd": 900},
        {"max_monthly_cost_usd": 800, "weights": {"price": 0, "area": 0, "neighborhood": 0}},
        "not an object",
    ],
)
def test_rejects_invalid_profiles_with_a_readable_error(tmp_path: Path, content: object) -> None:
    with pytest.raises(InvalidProfileFileError, match="not a valid search profile"):
        load_search_profile(write_profile(tmp_path, content))


def test_rejects_missing_files(tmp_path: Path) -> None:
    with pytest.raises(InvalidProfileFileError, match="cannot read"):
        load_search_profile(tmp_path / "missing.json")
