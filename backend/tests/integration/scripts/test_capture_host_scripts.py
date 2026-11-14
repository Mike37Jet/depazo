import json
import os
import re
import shutil
import subprocess
import sys
from pathlib import Path

import pytest

from tests.builders import a_native_message
from tests.integration.cli.test_receive_capture_command import the_only_reply

SCRIPTS_DIRECTORY = Path(__file__).parents[4] / "scripts"
CAPTURE_HOST = SCRIPTS_DIRECTORY / "capture_host.sh"
INSTALLER = SCRIPTS_DIRECTORY / "install_capture_host.sh"
HOST_PATH = "/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin"
EXTENSION_KEY = (
    "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEArJxYsS8an8BXT0qjgwEXuZWLQZ7T9UvLbykvS4Owxt2fcEIv"
    "pJv967BZdNHFLGbKQ3AAp+paQkuktkbc8cV08AZyRNDJ20ob0TLuzRY8pEgA37a6bzfZjxGkkLgpVIPnSQIhg6m6uhcS"
    "6hJlx13G3XfB7I+lsqd7xNq0raNHw5sDvapyRd1h2oDQeg0Sgk+WoKiqBWQdxahyvVdvjM6XNA52ksv34/EriXhCDkoW"
    "EhmRiLxCycIw169oaZT9k6e8NmS0fRYfjgVhu5TeYneJ0dVmsJeudri2ETWQet0byjazXbRHL16bSio2DiXmy16nKpEK"
    "ly5JknJrtgbQSWJ7TQIDAQAB"
)
EXTENSION_ID = "fabgniffhpmdifgbdlgjchjchgfjcldm"
COMMENT_PATTERN = re.compile(r"(^|\s)#")

pytestmark = pytest.mark.skipif(sys.platform != "darwin", reason="the capture host is macOS only")


def install(manifest: Path, hosts_directory: Path) -> subprocess.CompletedProcess[str]:
    environment = {
        "HOME": os.environ["HOME"],
        "DEPAZO_EXTENSION_MANIFEST": str(manifest),
        "DEPAZO_NATIVE_HOSTS_DIRECTORY": str(hosts_directory),
    }
    return subprocess.run(  # noqa: S603
        ["/bin/bash", str(INSTALLER)],
        env=environment,
        capture_output=True,
        text=True,
        check=False,
    )


def an_extension_manifest(directory: Path, **fields: str) -> Path:
    manifest = directory / "manifest.json"
    manifest.write_text(json.dumps({"manifest_version": 3, **fields}), encoding="utf-8")
    return manifest


@pytest.mark.parametrize("script", [CAPTURE_HOST, INSTALLER])
def test_scripts_are_executable_valid_bash_without_comments(script: Path) -> None:
    syntax_check = subprocess.run(["/bin/bash", "-n", str(script)], check=False)  # noqa: S603

    lines_after_the_shebang = script.read_text(encoding="utf-8").splitlines()[1:]
    assert syntax_check.returncode == 0
    assert os.access(script, os.X_OK)
    assert [line for line in lines_after_the_shebang if COMMENT_PATTERN.search(line)] == []


def test_installer_writes_the_host_manifest_for_the_extension(tmp_path: Path) -> None:
    hosts_directory = tmp_path / "Native Messaging Hosts"

    result = install(an_extension_manifest(tmp_path, key=EXTENSION_KEY), hosts_directory)

    host_manifest = json.loads((hosts_directory / "com.depazo.capture.json").read_text("utf-8"))
    assert result.returncode == 0
    assert host_manifest == {
        "name": "com.depazo.capture",
        "description": "Saves the listings captured by the depazo extension",
        "path": str(CAPTURE_HOST),
        "type": "stdio",
        "allowed_origins": [f"chrome-extension://{EXTENSION_ID}/"],
    }
    assert EXTENSION_ID in result.stdout


def test_installer_gives_the_same_manifest_when_it_runs_again(tmp_path: Path) -> None:
    hosts_directory = tmp_path / "hosts"
    manifest = an_extension_manifest(tmp_path, key=EXTENSION_KEY)
    install(manifest, hosts_directory)
    first_manifest = (hosts_directory / "com.depazo.capture.json").read_bytes()

    result = install(manifest, hosts_directory)

    assert result.returncode == 0
    assert (hosts_directory / "com.depazo.capture.json").read_bytes() == first_manifest
    assert [path.name for path in hosts_directory.iterdir()] == ["com.depazo.capture.json"]


def test_installer_fails_without_writing_when_the_extension_has_no_key(tmp_path: Path) -> None:
    hosts_directory = tmp_path / "hosts"

    result = install(an_extension_manifest(tmp_path), hosts_directory)

    assert result.returncode == 1
    assert "key" in result.stderr
    assert not hosts_directory.exists()


@pytest.mark.skipif(
    shutil.which("uv", path=HOST_PATH) is None, reason="uv is not on the capture host PATH"
)
def test_capture_host_replies_with_one_message_and_logs_to_a_file(tmp_path: Path) -> None:
    config_directory = tmp_path / "config"
    config_directory.mkdir()
    (config_directory / "env").write_text("", encoding="utf-8")
    environment = {
        "HOME": os.environ["HOME"],
        "DEPAZO_CONFIG_DIRECTORY": str(config_directory),
        "DEPAZO_LOG_DIRECTORY": str(tmp_path / "logs"),
    }

    result = subprocess.run(  # noqa: S603
        ["/bin/bash", str(CAPTURE_HOST), f"chrome-extension://{EXTENSION_ID}/"],
        input=a_native_message(b"not a capture"),
        env=environment,
        capture_output=True,
        check=False,
    )

    assert result.returncode == 0
    assert the_only_reply(result.stdout) == {"ok": False, "error": "invalid_capture"}
    assert result.stderr == b""
    assert "capture not saved" in (tmp_path / "logs" / "capture-host.log").read_text("utf-8")


@pytest.mark.skipif(
    shutil.which("uv", path=HOST_PATH) is None, reason="uv is not on the capture host PATH"
)
def test_capture_host_keeps_the_configuration_output_out_of_the_reply(tmp_path: Path) -> None:
    config_directory = tmp_path / "config"
    config_directory.mkdir()
    (config_directory / "env").write_text("echo configuration-noise\n", encoding="utf-8")
    environment = {
        "HOME": os.environ["HOME"],
        "DEPAZO_CONFIG_DIRECTORY": str(config_directory),
        "DEPAZO_LOG_DIRECTORY": str(tmp_path / "logs"),
    }

    result = subprocess.run(  # noqa: S603
        ["/bin/bash", str(CAPTURE_HOST)],
        input=a_native_message(b"not a capture"),
        env=environment,
        capture_output=True,
        check=False,
    )

    log = (tmp_path / "logs" / "capture-host.log").read_text("utf-8")
    assert the_only_reply(result.stdout) == {"ok": False, "error": "invalid_capture"}
    assert "configuration-noise" in log
    assert re.match(r"\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{4} capture host started", log)


@pytest.mark.skipif(
    shutil.which("uv", path=HOST_PATH) is None, reason="uv is not on the capture host PATH"
)
def test_capture_host_still_replies_when_the_configuration_file_is_missing(
    tmp_path: Path,
) -> None:
    config_directory = tmp_path / "config"
    config_directory.mkdir()
    environment = {
        "HOME": os.environ["HOME"],
        "DEPAZO_CONFIG_DIRECTORY": str(config_directory),
        "DEPAZO_LOG_DIRECTORY": str(tmp_path / "logs"),
    }

    result = subprocess.run(  # noqa: S603
        ["/bin/bash", str(CAPTURE_HOST)],
        input=a_native_message(b"not a capture"),
        env=environment,
        capture_output=True,
        check=False,
    )

    assert result.returncode == 0
    assert the_only_reply(result.stdout) == {"ok": False, "error": "invalid_capture"}
