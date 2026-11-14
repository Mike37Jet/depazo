import io
import json
import struct

import pytest

from depazo.presentation.cli.native_messaging import (
    InvalidNativeMessageError,
    read_native_message,
    write_native_message,
)
from tests.builders import a_native_message

MAX_BYTES = 1024


class UnreadableBodyStream(io.BytesIO):
    def read(self, size: int | None = -1) -> bytes:
        if self.tell() >= struct.calcsize("=I"):
            raise AssertionError("the body was read")
        return super().read(size)


def test_reads_back_a_message_it_wrote() -> None:
    stream = io.BytesIO()
    message = {"ok": True, "new": 2, "repriced": 0, "unchanged": 1}

    write_native_message(stream, message)
    stream.seek(0)
    body = read_native_message(stream, MAX_BYTES)

    assert json.loads(body) == message
    assert stream.read() == b""


def test_writes_the_length_in_native_byte_order_before_utf8_json() -> None:
    stream = io.BytesIO()

    write_native_message(stream, {"error": "ñ"})

    written = stream.getvalue()
    (declared_length,) = struct.unpack("=I", written[:4])
    assert declared_length == len(written) - 4
    assert json.loads(written[4:].decode("utf-8")) == {"error": "ñ"}


def test_reads_only_the_first_message() -> None:
    stream = io.BytesIO(a_native_message(b'{"first":1}') + a_native_message(b'{"second":2}'))

    body = read_native_message(stream, MAX_BYTES)

    assert body == b'{"first":1}'


@pytest.mark.parametrize("prefix", [b"", b"\x01", b"\x01\x00\x00"])
def test_rejects_a_truncated_length_prefix(prefix: bytes) -> None:
    with pytest.raises(InvalidNativeMessageError):
        read_native_message(io.BytesIO(prefix), MAX_BYTES)


def test_rejects_a_message_shorter_than_its_declared_length() -> None:
    truncated = a_native_message(b'{"ok":true}')[:-3]

    with pytest.raises(InvalidNativeMessageError):
        read_native_message(io.BytesIO(truncated), MAX_BYTES)


def test_rejects_an_empty_message() -> None:
    with pytest.raises(InvalidNativeMessageError):
        read_native_message(io.BytesIO(a_native_message(b"")), MAX_BYTES)


def test_rejects_an_oversized_declared_length_before_reading_the_body() -> None:
    stream = UnreadableBodyStream(a_native_message(b" " * (MAX_BYTES + 1)))

    with pytest.raises(InvalidNativeMessageError):
        read_native_message(stream, MAX_BYTES)


def test_accepts_a_message_of_exactly_the_maximum_size() -> None:
    body = b" " * MAX_BYTES

    assert read_native_message(io.BytesIO(a_native_message(body)), MAX_BYTES) == body
