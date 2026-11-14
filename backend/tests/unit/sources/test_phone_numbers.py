import pytest

from depazo.infrastructure.sources.phone_numbers import without_phone_numbers

KEYCAP_PHONE_NUMBER = "".join(f"{digit}️⃣" for digit in "0989028226")


@pytest.mark.parametrize(
    "text",
    [
        "Suite en La Floresta 0989028226",
        f"Suite en La Floresta {KEYCAP_PHONE_NUMBER}",
        "Suite en La Floresta +593 98 902 8226",
        "Suite en La Floresta 02-245-1234",
    ],
)
def test_removes_phone_numbers(text: str) -> None:
    assert without_phone_numbers(text) == "Suite en La Floresta"


def test_keeps_prices_areas_and_room_counts() -> None:
    text = "Suite de 65 m2 con 1 dormitorio en $ 450"

    assert without_phone_numbers(text) == text
