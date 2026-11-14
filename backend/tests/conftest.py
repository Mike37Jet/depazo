from pathlib import Path

import pytest

FIXTURES_DIRECTORY = Path(__file__).parent / "fixtures"


@pytest.fixture
def icasas_page_html() -> str:
    return (FIXTURES_DIRECTORY / "icasas" / "quito_page.html").read_text(encoding="utf-8")


@pytest.fixture
def browser_capture_path() -> Path:
    return FIXTURES_DIRECTORY / "capture" / "browser_capture.json"
