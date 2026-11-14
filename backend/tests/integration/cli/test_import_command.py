from pathlib import Path

import pytest
from typer.testing import CliRunner

from depazo.presentation.cli.main import app

runner = CliRunner()


def test_prints_imported_listings(browser_capture_path: Path) -> None:
    result = runner.invoke(app, ["import", str(browser_capture_path)])

    assert result.exit_code == 0
    assert "3 listings from capture" in result.stdout
    assert "La Carolina" in result.stdout


def test_fails_with_readable_message_for_invalid_file(tmp_path: Path) -> None:
    path = tmp_path / "capture.json"
    path.write_text("not json", encoding="utf-8")

    result = runner.invoke(app, ["import", str(path)])

    assert result.exit_code == 1
    assert "not a valid depazo capture" in result.stderr


def test_asks_for_a_database_url_before_saving(
    browser_capture_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.delenv("DEPAZO_DATABASE_URL", raising=False)

    result = runner.invoke(app, ["import", str(browser_capture_path), "--save"])

    assert result.exit_code == 1
    assert "DEPAZO_DATABASE_URL" in result.stderr


def test_requires_save_to_send_alerts(browser_capture_path: Path, tmp_path: Path) -> None:
    profile = tmp_path / "profile.json"
    profile.write_text('{"max_monthly_cost_usd": 900}', encoding="utf-8")

    result = runner.invoke(
        app, ["import", str(browser_capture_path), "--alert-profile", str(profile)]
    )

    assert result.exit_code == 1
    assert "--save" in result.stderr


def test_checks_email_settings_before_collecting(
    browser_capture_path: Path, tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.delenv("RESEND_API_KEY", raising=False)
    monkeypatch.delenv("DEPAZO_DATABASE_URL", raising=False)
    profile = tmp_path / "profile.json"
    profile.write_text('{"max_monthly_cost_usd": 900}', encoding="utf-8")

    result = runner.invoke(
        app, ["import", str(browser_capture_path), "--save", "--alert-profile", str(profile)]
    )

    assert result.exit_code == 1
    assert "RESEND_API_KEY" in result.stderr
