from pathlib import Path

import pytest
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker
from typer.testing import CliRunner

from depazo.presentation.cli.main import app

runner = CliRunner()


def test_reports_new_then_unchanged_listings_when_saving_twice(
    browser_capture_path: Path,
    database_url: str,
    session_factory: async_sessionmaker[AsyncSession],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("DEPAZO_DATABASE_URL", database_url)

    first_run = runner.invoke(app, ["import", str(browser_capture_path), "--save"])
    second_run = runner.invoke(app, ["import", str(browser_capture_path), "--save"])

    assert first_run.exit_code == 0
    assert "saved: 3 new, 0 with a new price, 0 unchanged" in first_run.stderr
    assert "saved: 0 new, 0 with a new price, 3 unchanged" in second_run.stderr
