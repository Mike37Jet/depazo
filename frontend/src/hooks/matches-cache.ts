import type { ListingReference, Match, Matches } from "../services/api-client";

export function isSameListing(match: Match, listing: ListingReference): boolean {
  return (
    match.listing.source === listing.source && match.listing.external_id === listing.external_id
  );
}

export function withSavedState(
  report: Matches | null | undefined,
  listing: ListingReference,
  isSaved: boolean,
): Matches | null | undefined {
  if (!report) {
    return report;
  }
  return {
    ...report,
    matches: report.matches.map((match) =>
      isSameListing(match, listing) ? { ...match, is_saved: isSaved } : match,
    ),
  };
}

export function withoutListing(
  report: Matches | null | undefined,
  listing: ListingReference,
): Matches | null | undefined {
  if (!report?.matches.some((match) => isSameListing(match, listing))) {
    return report;
  }
  return {
    ...report,
    matches: report.matches.filter((match) => !isSameListing(match, listing)),
    match_count: report.match_count - 1,
    evaluated_count: report.evaluated_count - 1,
    discarded_count: report.discarded_count + 1,
  };
}
