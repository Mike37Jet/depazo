from pathlib import Path

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
