import json

from typer.testing import CliRunner

from depazo.presentation.cli.main import app

runner = CliRunner()


def test_prints_the_api_description_for_client_generation() -> None:
    result = runner.invoke(app, ["openapi"])

    description = json.loads(result.stdout)
    assert result.exit_code == 0
    assert set(description["paths"]) == {
        "/health",
        "/me/search-profile",
        "/me/matches",
        "/neighborhoods",
    }
    assert "MatchesBody" in description["components"]["schemas"]
