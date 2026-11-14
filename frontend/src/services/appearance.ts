export type ThemePreference = "system" | "light" | "dark";

export interface Appearance {
  theme: ThemePreference;
  glassTint: number;
}

export const DEFAULT_APPEARANCE: Appearance = { theme: "system", glassTint: 0 };

const STORAGE_KEY = "depazo-appearance";
const MAX_TINT = 100;
const THEMES: readonly ThemePreference[] = ["system", "light", "dark"];

export function readAppearance(storage: Pick<Storage, "getItem"> | undefined): Appearance {
  const stored = readStored(storage);
  if (!stored) {
    return DEFAULT_APPEARANCE;
  }
  return parseAppearance(stored);
}

export function saveAppearance(
  appearance: Appearance,
  storage: Pick<Storage, "setItem"> | undefined,
) {
  try {
    storage?.setItem(STORAGE_KEY, JSON.stringify(appearance));
  } catch (error) {
    console.warn("appearance could not be saved", error);
  }
}

export function applyAppearance(appearance: Appearance, root: HTMLElement) {
  if (appearance.theme === "system") {
    root.removeAttribute("data-theme");
  } else {
    root.setAttribute("data-theme", appearance.theme);
  }
  root.style.setProperty("--glass-tint", String(appearance.glassTint / MAX_TINT));
}

export function parseAppearance(text: string): Appearance {
  const value: unknown = safeParse(text);
  if (typeof value !== "object" || value === null) {
    return DEFAULT_APPEARANCE;
  }
  const theme = "theme" in value ? value.theme : undefined;
  const glassTint = "glassTint" in value ? value.glassTint : undefined;
  return {
    theme: THEMES.find((candidate) => candidate === theme) ?? DEFAULT_APPEARANCE.theme,
    glassTint:
      typeof glassTint === "number" && glassTint >= 0 && glassTint <= MAX_TINT
        ? glassTint
        : DEFAULT_APPEARANCE.glassTint,
  };
}

function readStored(storage: Pick<Storage, "getItem"> | undefined): string | null {
  try {
    return storage?.getItem(STORAGE_KEY) ?? null;
  } catch (error) {
    console.warn("appearance could not be read", error);
    return null;
  }
}

function safeParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch (error) {
    console.warn("stored appearance is not valid JSON", error);
    return null;
  }
}
