from depazo.domain.neighborhoods import NeighborhoodSummary, summarize_neighborhoods
from tests.builders import a_listing


def test_groups_spellings_that_differ_only_in_accents_case_or_spaces() -> None:
    listings = [
        a_listing(external_id="1", neighborhood="Iñaquito"),
        a_listing(external_id="2", neighborhood="Iñaquito"),
        a_listing(external_id="3", neighborhood="  inaquito "),
    ]

    summaries = summarize_neighborhoods(listings)

    assert summaries == [NeighborhoodSummary(name="Iñaquito", listing_count=3)]


def test_orders_by_listing_count_then_alphabetically() -> None:
    listings = [
        a_listing(external_id="1", neighborhood="Cumbayá"),
        a_listing(external_id="2", neighborhood="Batán"),
        a_listing(external_id="3", neighborhood="La Carolina"),
        a_listing(external_id="4", neighborhood="La Carolina"),
    ]

    names = [summary.name for summary in summarize_neighborhoods(listings)]

    assert names == ["La Carolina", "Batán", "Cumbayá"]


def test_skips_listings_without_a_neighborhood() -> None:
    listings = [
        a_listing(external_id="1", neighborhood=None),
        a_listing(external_id="2", neighborhood="   "),
    ]

    assert summarize_neighborhoods(listings) == []
