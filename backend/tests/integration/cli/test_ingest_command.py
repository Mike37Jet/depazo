import httpx
import pytest
import respx
from typer.testing import CliRunner

from depazo.presentation.cli.main import SOURCE_STOPPED_EXIT_CODE, app

SEARCH_URL = "https://www.facebook.com/marketplace/quito/search"

runner = CliRunner()


@respx.mock
def test_prints_collected_listings(marketplace_search_html: str) -> None:
    respx.get(SEARCH_URL).mock(return_value=httpx.Response(200, text=marketplace_search_html))

    result = runner.invoke(app, ["ingest", "--source", "marketplace", "--pages", "1"])

    assert result.exit_code == 0
    assert "8 listings from marketplace" in result.stdout


@respx.mock
@pytest.mark.parametrize("status_code", [401, 403, 429])
def test_reports_a_block_with_its_own_exit_code(status_code: int) -> None:
    respx.get(SEARCH_URL).mock(return_value=httpx.Response(status_code))

    result = runner.invoke(app, ["ingest", "--source", "marketplace", "--pages", "1"])

    assert result.exit_code == SOURCE_STOPPED_EXIT_CODE
    assert "blocked the collector" in result.stderr


@respx.mock
def test_reports_a_login_wall_with_the_same_exit_code() -> None:
    respx.get(SEARCH_URL).mock(
        return_value=httpx.Response(200, text="<html>Inicia sesión en Facebook</html>")
    )

    result = runner.invoke(app, ["ingest", "--source", "marketplace", "--pages", "1"])

    assert result.exit_code == SOURCE_STOPPED_EXIT_CODE
    assert "asks to log in" in result.stderr


@respx.mock
def test_keeps_the_general_exit_code_for_server_errors() -> None:
    respx.get(SEARCH_URL).mock(return_value=httpx.Response(503))

    result = runner.invoke(app, ["ingest", "--source", "marketplace", "--pages", "1"])

    assert result.exit_code == 1
