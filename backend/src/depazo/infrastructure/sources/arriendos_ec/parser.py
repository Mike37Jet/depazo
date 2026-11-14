import hashlib
import re
import unicodedata
from decimal import Decimal
from urllib.parse import urlsplit
from xml.etree.ElementTree import Element

from defusedxml import ElementTree
from defusedxml.common import DefusedXmlException

from depazo.domain.listing import InvalidListingError, Listing, plausible_apartment_area
from depazo.infrastructure.sources.icasas.parser import parse_spanish_decimal

SOURCE_NAME = "arriendos_ec"
SITE_HOST = "arriendos.ec"
FEED_URL = f"https://{SITE_HOST}/feed/properties"
CITY = "Quito"
MAX_EXTERNAL_ID_LENGTH = 64
HASH_SUFFIX_LENGTH = 8
APARTMENT_CATEGORY_WORDS = ("departamento", "suite")
QUITO_PLACE_WORDS = (
    "quito",
    "cumbaya",
    "tumbaco",
    "conocoto",
    "nayon",
    "puembo",
    "pifo",
    "los chillos",
)
PRICE_PATTERN = re.compile(r"\$\s*(\d[\d.,]*)")
BEDROOMS_PATTERN = re.compile(r"(\d+)\s+(?:habitacion(?:es)?|dormitorios?)", re.IGNORECASE)
BATHROOMS_PATTERN = re.compile(r"(\d+)\s+bañ(?:o|os)\b", re.IGNORECASE)
AREA_PATTERN = re.compile(r"(\d[\d.,]*)\s*m(?:²|2)\b", re.IGNORECASE)
SECTOR_PATTERN = re.compile(r"\b[Ss]ector\s+([^,()|\u2013\-]+?)(?=\s*(?:[,()|\u2013]|\bQuito\b|$))")
PARENTHESIS_PATTERN = re.compile(r"\([^)]*\)?")
WHITESPACE_PATTERN = re.compile(r"\s+")
STREET_PREFIXES = ("av.", "av ", "avenida", "calle")


class UnreadableFeedError(ValueError):
    pass


def parse_feed(xml: str) -> list[Listing]:
    items = _feed_items(xml)
    parsed = (_parse_item(item) for item in items)
    return [listing for listing in parsed if listing is not None]


def _feed_items(xml: str) -> list[Element]:
    try:
        root = ElementTree.fromstring(xml)
    except (ElementTree.ParseError, DefusedXmlException) as error:
        raise UnreadableFeedError("the feed is not valid XML") from error
    channel = root.find("channel")
    if root.tag != "rss" or channel is None:
        raise UnreadableFeedError("the feed is not an RSS channel")
    return channel.findall("item")


def _parse_item(item: Element) -> Listing | None:
    title = _clean_text(item.findtext("title"))
    description = _clean_text(item.findtext("description"))
    link = _clean_text(item.findtext("link"))
    category = _clean_text(item.findtext("category"))
    text = f"{title} {description}"
    if not _is_listing_link(link) or not _is_apartment(category) or not _is_in_quito(text):
        return None
    area = _number(AREA_PATTERN, text)
    try:
        return Listing(
            source=SOURCE_NAME,
            external_id=_external_id(link),
            url=link,
            title=title,
            description=description,
            monthly_rent_usd=_price(description) or _price(title),
            condo_fee_usd=None,
            area_m2=plausible_apartment_area(area) if area is not None else None,
            bedrooms=_integer(BEDROOMS_PATTERN, text),
            bathrooms=_integer(BATHROOMS_PATTERN, text),
            neighborhood=extract_neighborhood(title, description),
            city=CITY,
            location=None,
            image_url=_image_url(item),
        )
    except InvalidListingError:
        return None


def extract_neighborhood(title: str, description: str) -> str | None:
    for text in (title, description):
        match = SECTOR_PATTERN.search(text)
        if match:
            return match.group(1).strip()
    if "\u2013" not in title:
        return None
    place = PARENTHESIS_PATTERN.sub("", title.rsplit("\u2013", 1)[1]).strip(" .,")
    if not place or place.lower().startswith(STREET_PREFIXES):
        return None
    return place


def _is_listing_link(link: str) -> bool:
    parts = urlsplit(link)
    return parts.scheme == "https" and parts.hostname == SITE_HOST and len(parts.path) > 1


def _is_apartment(category: str) -> bool:
    normalized = _normalize(category)
    return any(word in normalized for word in APARTMENT_CATEGORY_WORDS)


def _is_in_quito(text: str) -> bool:
    normalized = _normalize(text)
    return any(re.search(rf"\b{word}\b", normalized) for word in QUITO_PLACE_WORDS)


def _external_id(link: str) -> str:
    slug = urlsplit(link).path.rstrip("/").rsplit("/", 1)[-1]
    if len(slug) <= MAX_EXTERNAL_ID_LENGTH:
        return slug
    digest = hashlib.sha256(slug.encode()).hexdigest()[:HASH_SUFFIX_LENGTH]
    prefix = slug[: MAX_EXTERNAL_ID_LENGTH - HASH_SUFFIX_LENGTH - 1].rstrip("-")
    return f"{prefix}-{digest}"


def _price(text: str) -> Decimal | None:
    match = PRICE_PATTERN.search(text)
    return parse_spanish_decimal(match.group(1)) if match else None


def _number(pattern: re.Pattern[str], text: str) -> Decimal | None:
    match = pattern.search(text)
    return parse_spanish_decimal(match.group(1)) if match else None


def _integer(pattern: re.Pattern[str], text: str) -> int | None:
    number = _number(pattern, text)
    return int(number) if number is not None else None


def _image_url(item: Element) -> str | None:
    enclosure = item.find("enclosure")
    if enclosure is None:
        return None
    url = enclosure.get("url")
    if not url or not enclosure.get("type", "").startswith("image/"):
        return None
    parts = urlsplit(url)
    if parts.hostname != SITE_HOST or parts.scheme not in {"http", "https"}:
        return None
    return parts._replace(scheme="https").geturl()


def _normalize(text: str) -> str:
    decomposed = unicodedata.normalize("NFKD", text.lower())
    return "".join(character for character in decomposed if not unicodedata.combining(character))


def _clean_text(text: str | None) -> str:
    return WHITESPACE_PATTERN.sub(" ", text or "").strip()
