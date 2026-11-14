import json
import re
import unicodedata
from decimal import Decimal
from typing import Annotated
from urllib.parse import urlsplit

from pydantic import BaseModel, ConfigDict, Field, ValidationError
from selectolax.lexbor import LexborHTMLParser

from depazo.domain.listing import MIN_PLAUSIBLE_MONTHLY_RENT_USD, InvalidListingError, Listing
from depazo.infrastructure.sources.phone_numbers import without_phone_numbers

SOURCE_NAME = "marketplace"
SITE_HOST = "www.facebook.com"
CITY = "Quito"
IMAGE_HOST_SUFFIX = ".fbcdn.net"
LISTING_TITLE_KEY = "marketplace_listing_title"
LISTING_PRICE_KEY = "listing_price"
EMBEDDED_STATE_SELECTOR = 'script[type="application/json"]'
APARTMENT_WORDS = (
    "departamento",
    "depa",
    "apartamento",
    "suite",
    "suit",
    "loft",
    "estudio",
    "monoambiente",
    "minidepartamento",
)
OTHER_PROPERTY_WORDS = (
    "local",
    "locales",
    "oficina",
    "oficinas",
    "bodega",
    "bodegas",
    "galpon",
    "terreno",
    "parqueadero",
    "consultorio",
    "negocio",
)
QUITO_DISTRICT_PLACES = frozenset(
    {
        "quito",
        "cumbaya",
        "tumbaco",
        "calderon",
        "conocoto",
        "nayon",
        "puembo",
        "pifo",
        "pomasqui",
        "llano chico",
        "zambiza",
        "alangasi",
        "amaguana",
        "guangopolo",
        "la merced",
        "lloa",
        "san antonio",
        "san antonio de pichincha",
    }
)
BEDROOMS_PATTERN = re.compile(
    r"(\d+)\s*(?:habitaci[oó]n(?:es)?|dormitorios?|cuartos?)", re.IGNORECASE
)
BATHROOMS_PATTERN = re.compile(r"(\d+)(?:[.,]5)?\s*bañ(?:o|os)\b", re.IGNORECASE)
SECTOR_PATTERN = re.compile(r"\bsector\s+((?:[^\W\d_]+\s?){1,4})", re.IGNORECASE)
WHITESPACE_PATTERN = re.compile(r"\s+")
WORD_PATTERN = re.compile(r"[a-z]+")
MAX_ROOM_COUNT = 20


class UnreadablePageError(ValueError):
    pass


class _Model(BaseModel):
    model_config = ConfigDict(frozen=True, extra="ignore")


class _Price(_Model):
    amount: Annotated[Decimal, Field(ge=0, le=100_000_000)]


class _ReverseGeocode(_Model):
    city: Annotated[str, Field(max_length=120)] | None = None


class _Location(_Model):
    reverse_geocode: _ReverseGeocode | None = None


class _Image(_Model):
    uri: Annotated[str, Field(max_length=2048)]


class _Photo(_Model):
    image: _Image | None = None


class _ListingNode(_Model):
    id: Annotated[str, Field(pattern=r"^\d{5,32}$")]
    marketplace_listing_title: Annotated[str, Field(min_length=1, max_length=500)]
    custom_title: Annotated[str, Field(max_length=500)] | None = None
    listing_price: _Price | None = None
    location: _Location | None = None
    primary_listing_photo: _Photo | None = None
    is_live: bool = True
    is_sold: bool = False
    is_pending: bool = False
    is_hidden: bool = False


def parse_listing_page(html: str) -> list[Listing]:
    raw_nodes = _raw_listing_nodes(html)
    nodes = [node for node in map(_validated_node, raw_nodes) if node is not None]
    if not nodes:
        raise UnreadablePageError("the page has no readable listings")
    listings = (_to_listing(node) for node in nodes)
    return [listing for listing in listings if listing is not None]


def _raw_listing_nodes(html: str) -> list[dict[str, object]]:
    nodes: list[dict[str, object]] = []
    for script in LexborHTMLParser(html).css(EMBEDDED_STATE_SELECTOR):
        text = script.text()
        if LISTING_TITLE_KEY not in text:
            continue
        try:
            state = json.loads(text)
        except json.JSONDecodeError:
            continue
        nodes.extend(_find_listing_nodes(state))
    return nodes


def _find_listing_nodes(state: object) -> list[dict[str, object]]:
    found: list[dict[str, object]] = []
    pending: list[object] = [state]
    while pending:
        value = pending.pop()
        if isinstance(value, dict):
            if LISTING_TITLE_KEY in value and LISTING_PRICE_KEY in value:
                found.append(value)
            pending.extend(value.values())
        elif isinstance(value, list):
            pending.extend(value)
    found.reverse()
    return found


def _validated_node(raw_node: dict[str, object]) -> _ListingNode | None:
    try:
        return _ListingNode.model_validate(raw_node)
    except ValidationError:
        return None


def _to_listing(node: _ListingNode) -> Listing | None:
    title = without_phone_numbers(_clean_text(node.marketplace_listing_title))
    text = f"{title} {without_phone_numbers(_clean_text(node.custom_title))}"
    place = _place(node)
    if not _is_available(node) or not _is_apartment(text) or not _is_in_quito_district(place):
        return None
    try:
        return Listing(
            source=SOURCE_NAME,
            external_id=node.id,
            url=f"https://{SITE_HOST}/marketplace/item/{node.id}/",
            title=title,
            description="",
            monthly_rent_usd=_monthly_rent(node),
            condo_fee_usd=None,
            area_m2=None,
            bedrooms=_room_count(BEDROOMS_PATTERN, text),
            bathrooms=_room_count(BATHROOMS_PATTERN, text),
            neighborhood=_neighborhood(title, place),
            city=CITY,
            location=None,
            image_url=_image_url(node),
        )
    except InvalidListingError:
        return None


def _is_available(node: _ListingNode) -> bool:
    return node.is_live and not (node.is_sold or node.is_pending or node.is_hidden)


def _is_apartment(text: str) -> bool:
    words = set(WORD_PATTERN.findall(_normalize(text)))
    return not words.isdisjoint(APARTMENT_WORDS) and words.isdisjoint(OTHER_PROPERTY_WORDS)


def _place(node: _ListingNode) -> str:
    if node.location is None or node.location.reverse_geocode is None:
        return ""
    return _clean_text(node.location.reverse_geocode.city)


def _is_in_quito_district(place: str) -> bool:
    return _normalize(place) in QUITO_DISTRICT_PLACES


def _monthly_rent(node: _ListingNode) -> Decimal | None:
    if node.listing_price is None:
        return None
    amount = node.listing_price.amount
    return amount if amount >= MIN_PLAUSIBLE_MONTHLY_RENT_USD else None


def _room_count(pattern: re.Pattern[str], text: str) -> int | None:
    match = pattern.search(text)
    if match is None:
        return None
    count = int(match.group(1))
    return count if count <= MAX_ROOM_COUNT else None


def _neighborhood(title: str, place: str) -> str | None:
    match = SECTOR_PATTERN.search(title)
    if match:
        return match.group(1).strip()
    return place if place and _normalize(place) != _normalize(CITY) else None


def _image_url(node: _ListingNode) -> str | None:
    photo = node.primary_listing_photo
    if photo is None or photo.image is None:
        return None
    parts = urlsplit(photo.image.uri)
    is_trusted = parts.scheme == "https" and (parts.hostname or "").endswith(IMAGE_HOST_SUFFIX)
    return photo.image.uri if is_trusted else None


def _normalize(text: str) -> str:
    decomposed = unicodedata.normalize("NFKD", text)
    without_accents = "".join(
        character for character in decomposed if not unicodedata.combining(character)
    )
    return without_accents.lower()


def _clean_text(text: str | None) -> str:
    return WHITESPACE_PATTERN.sub(" ", text or "").strip()
