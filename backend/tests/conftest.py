from pathlib import Path

import pytest

FIXTURES_DIRECTORY = Path(__file__).parent / "fixtures"


@pytest.fixture
def icasas_page_html() -> str:
    return (FIXTURES_DIRECTORY / "icasas" / "quito_page.html").read_text(encoding="utf-8")


@pytest.fixture
def browser_capture_path() -> Path:
    return FIXTURES_DIRECTORY / "capture" / "browser_capture.json"


@pytest.fixture
def arriendos_ec_feed_xml() -> str:
    return (FIXTURES_DIRECTORY / "arriendos_ec" / "feed.xml").read_text(encoding="utf-8")


@pytest.fixture
def marketplace_category_html() -> str:
    return (FIXTURES_DIRECTORY / "marketplace" / "category_page.html").read_text(encoding="utf-8")


@pytest.fixture
def marketplace_search_html() -> str:
    return (FIXTURES_DIRECTORY / "marketplace" / "search_page.html").read_text(encoding="utf-8")
