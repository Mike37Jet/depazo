import re

KEYCAP_MARKS_PATTERN = re.compile(r"[️⃣]")
PHONE_NUMBER_PATTERN = re.compile(r"(?:\+?593|\b0)[\s.\-]?(?:\d[\s.\-]?){7,9}")
WHITESPACE_PATTERN = re.compile(r"\s+")


def without_phone_numbers(text: str) -> str:
    plain_digits = KEYCAP_MARKS_PATTERN.sub("", text)
    without_numbers = PHONE_NUMBER_PATTERN.sub(" ", plain_digits)
    return WHITESPACE_PATTERN.sub(" ", without_numbers).strip()
