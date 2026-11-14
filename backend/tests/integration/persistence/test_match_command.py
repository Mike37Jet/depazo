import json
from pathlib import Path

import pytest
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker
from typer.testing import CliRunner

from depazo.presentation.cli.main import app

runner = CliRunner()


def test_ranks_saved_listings_against_a_profile(
    browser_capture_path: Path,
    database_url: str,
    session_factory: async_sessionmaker[AsyncSession],
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("DEPAZO_DATABASE_URL", database_url)
    profile_path = tmp_path / "profile.json"
    profile_path.write_text(
        json.dumps({"max_monthly_cost_usd": 5000, "min_score": 0}), encoding="utf-8"
    )
    runner.invoke(app, ["import", str(browser_capture_path), "--save"])

    result = runner.invoke(app, ["match", "--profile", str(profile_path), "--output", "json"])

    assert result.exit_code == 0
    scores = [match["score"] for match in json.loads(result.stdout)]
    assert scores == sorted(scores, reverse=True)
    assert len(scores) == 3
