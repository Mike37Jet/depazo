export interface PlaceOption {
  name: string;
  listingCount: number;
}

const MAX_VISIBLE_OPTIONS = 6;

export function normalizePlaceName(name: string): string {
  return name
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase("es")
    .split(/\s+/)
    .filter(Boolean)
    .join(" ");
}

export function filterPlaceOptions(
  options: readonly PlaceOption[],
  query: string,
  chosen: readonly string[],
): PlaceOption[] {
  const normalizedQuery = normalizePlaceName(query);
  const chosenNames = new Set(chosen.map(normalizePlaceName));
  return options
    .filter((option) => {
      const normalizedName = normalizePlaceName(option.name);
      return !chosenNames.has(normalizedName) && normalizedName.includes(normalizedQuery);
    })
    .slice(0, MAX_VISIBLE_OPTIONS);
}

export function findPlaceOption(
  options: readonly PlaceOption[],
  text: string,
): PlaceOption | undefined {
  const normalizedText = normalizePlaceName(text);
  return options.find((option) => normalizePlaceName(option.name) === normalizedText);
}
