const SOURCE_NAMES: Record<string, string> = {
  icasas: "iCasas",
  arriendos_ec: "arriendos.ec",
  plusvalia: "Plusvalía",
  marketplace: "Facebook Marketplace",
  mercadolibre: "Mercado Libre",
};

export interface ListingFacts {
  bedrooms: number | null;
  bathrooms: number | null;
  area_m2: number | null;
}

export function sourceName(source: string): string {
  return SOURCE_NAMES[source] ?? source;
}

export function isSafeHttpsUrl(url: string | null): url is string {
  return url !== null && URL.canParse(url) && new URL(url).protocol === "https:";
}

export function describeFacts(listing: ListingFacts): string[] {
  return [
    listing.bedrooms !== null && `${listing.bedrooms} hab`,
    listing.bathrooms !== null &&
      `${listing.bathrooms} ${listing.bathrooms === 1 ? "baño" : "baños"}`,
    listing.area_m2 !== null && `${Math.round(listing.area_m2)} m²`,
  ].filter((fact): fact is string => typeof fact === "string");
}
