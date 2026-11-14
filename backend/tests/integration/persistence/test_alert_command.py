import json
from pathlib import Path

import httpx
import pytest
import respx
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker
from typer.testing import CliRunner

from depazo.infrastructure.notifications.resend_notifier import RESEND_EMAILS_URL
from depazo.presentation.cli.main import app

runner = CliRunner()


@respx.mock
def test_emails_new_matches_once_and_not_on_the_next_run(
    browser_capture_path: Path,
    database_url: str,
    session_factory: async_sessionmaker[AsyncSession],
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("DEPAZO_DATABASE_URL", database_url)
    monkeypatch.setenv("RESEND_API_KEY", "re_test_key")
    monkeypatch.setenv("DEPAZO_ALERT_EMAIL", "renter@example.test")
    profile = tmp_path / "profile.json"
    profile.write_text(json.dumps({"max_monthly_cost_usd": 5000, "min_score": 0}), "utf-8")
    resend = respx.post(RESEND_EMAILS_URL).mock(return_value=httpx.Response(200, json={}))
    command = ["import", str(browser_capture_path), "--save", "--alert-profile", str(profile)]

    first_run = runner.invoke(app, command)
    second_run = runner.invoke(app, command)

    assert "alerted: 3 listings" in first_run.stderr
    assert "alerted: 0 listings" in second_run.stderr
    assert resend.call_count == 1
