import json
import struct
from collections.abc import Mapping
from typing import BinaryIO

LENGTH_PREFIX = struct.Struct("=I")


class InvalidNativeMessageError(ValueError):
    pass


def read_native_message(stream: BinaryIO, max_bytes: int) -> bytes:
    prefix = stream.read(LENGTH_PREFIX.size)
    if len(prefix) != LENGTH_PREFIX.size:
        raise InvalidNativeMessageError("the length prefix is truncated")
    (declared_length,) = LENGTH_PREFIX.unpack(prefix)
    if declared_length == 0 or declared_length > max_bytes:
        raise InvalidNativeMessageError(f"the message must have between 1 and {max_bytes} bytes")
    body = stream.read(declared_length)
    if len(body) != declared_length:
        raise InvalidNativeMessageError("the message is shorter than its declared length")
    return body


def write_native_message(stream: BinaryIO, message: Mapping[str, object]) -> None:
    body = json.dumps(message, separators=(",", ":")).encode("utf-8")
    stream.write(LENGTH_PREFIX.pack(len(body)) + body)
    stream.flush()
