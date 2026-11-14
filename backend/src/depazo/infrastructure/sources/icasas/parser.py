import re
from decimal import Decimal, InvalidOperation
from urllib.parse import urljoin

from selectolax.lexbor import LexborHTMLParser, LexborNode

from depazo.domain.listing import GeoPoint, InvalidListingError, Listing, plausible_apartment_area

SOURCE_NAME = "icasas"
BASE_URL = "https://www.icasas.ec"
CARD_SELECTOR = "ul.listAds > li.serp-snippet"
NUMBER_PATTERN = re.compile(r"\d[\d.,]*")
WHITESPACE_PATTERN = re.compile(r"\s+")


def parse_listing_page(html: str) -> list[Listing]:
    tree = LexborHTMLParser(html)
    parsed_cards = (_parse_card(card) for card in tree.css(CARD_SELECTOR))
    return [listing for listing in parsed_cards if listing is not None]


def parse_total_results(html: str) -> int | None:
    heading = LexborHTMLParser(html).css_first("h1")
    if heading is None:
        return None
    total = parse_spanish_decimal(heading.text())
    return int(total) if total is not None else None


def parse_spanish_decimal(text: str) -> Decimal | None:
    match = NUMBER_PATTERN.search(text)
    if match is None:
        return None
    normalized = match.group().rstrip(".,").replace(".", "").replace(",", ".")
    try:
        return Decimal(normalized)
    except InvalidOperation:
        return None


def _parse_card(card: LexborNode) -> Listing | None:
    external_id = card.attributes.get("id")
    link = card.css_first("a.detail-redirection")
    href = link.attributes.get("href") if link is not None else None
    if not external_id or link is None or not href:
        return None
    neighborhood, city = _split_locality(_meta_content(card, "addressLocality"))
    area = _number_in(card, ".areaBuilt")
    try:
        return Listing(
            source=SOURCE_NAME,
            external_id=external_id,
            url=urljoin(BASE_URL, href),
            title=_clean_text(link.text()),
            description=_clean_text(_text_in(card, "p.description") or ""),
            monthly_rent_usd=_number_in(card, ".price"),
            area_m2=plausible_apartment_area(area) if area is not None else None,
            bedrooms=_integer_in(card, ".rooms"),
            bathrooms=_integer_in(card, ".bathrooms"),
            neighborhood=neighborhood,
            city=city,
            location=_location(card),
            image_url=_image_url(card),
        )
    except InvalidListingError:
        return None


def _split_locality(locality: str | None) -> tuple[str | None, str | None]:
    if not locality:
        return None, None
    parts = [part.strip() for part in locality.split(",") if part.strip()]
    if len(parts) == 1:
        return None, parts[0]
    return parts[0], parts[-1]


def _location(card: LexborNode) -> GeoPoint | None:
    latitude = _meta_content(card, "latitude")
    longitude = _meta_content(card, "longitude")
    if latitude is None or longitude is None:
        return None
    try:
        return GeoPoint(latitude=float(latitude), longitude=float(longitude))
    except (ValueError, InvalidListingError):
        return None


def _image_url(card: LexborNode) -> str | None:
    image = card.css_first('section[itemprop="photo"] meta[itemprop="url"]')
    url = image.attributes.get("content") if image is not None else None
    return url if url and url.startswith("https://") else None


def _meta_content(card: LexborNode, item_property: str) -> str | None:
    meta = card.css_first(f'meta[itemprop="{item_property}"]')
    return meta.attributes.get("content") if meta is not None else None


def _text_in(card: LexborNode, selector: str) -> str | None:
    node = card.css_first(selector)
    return node.text(strip=True) if node is not None else None


def _number_in(card: LexborNode, selector: str) -> Decimal | None:
    text = _text_in(card, selector)
    return parse_spanish_decimal(text) if text else None


def _integer_in(card: LexborNode, selector: str) -> int | None:
    number = _number_in(card, selector)
    return int(number) if number is not None else None


def _clean_text(text: str) -> str:
    return WHITESPACE_PATTERN.sub(" ", text).strip()
