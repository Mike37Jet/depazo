from pathlib import Path

import pytest

FIXTURES_DIR = Path(__file__).parent / "fixtures"


@pytest.fixture
def icasas_page_html() -> str:
    return (FIXTURES_DIR / "icasas" / "quito_page.html").read_text(encoding="utf-8")
