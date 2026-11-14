export function parseSpanishNumber(text: string): number | null {
  const normalized = text.replaceAll(".", "").replace(",", ".");
  const value = Number.parseFloat(normalized);
  return Number.isFinite(value) ? value : null;
}

export function normalizeWhitespace(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

export function firstNumberMatching(texts: readonly string[], pattern: RegExp): number | null {
  for (const text of texts) {
    const match = pattern.exec(text);
    if (match?.[1] !== undefined) {
      return parseSpanishNumber(match[1]);
    }
  }
  return null;
}

export function httpsUrlOnHost(source: string | null | undefined, hostSuffix: string): URL | null {
  if (!source || !URL.canParse(source)) {
    return null;
  }
  const url = new URL(source);
  return url.protocol === "https:" && url.hostname.endsWith(hostSuffix) ? url : null;
}
