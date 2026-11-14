import { describe, expect, it } from "vitest";
import { applyAppearance, DEFAULT_APPEARANCE, parseAppearance } from "./appearance";

describe("parseAppearance", () => {
  it("keeps a valid stored appearance", () => {
    expect(parseAppearance('{"theme":"dark","glassTint":40}')).toEqual({
      theme: "dark",
      glassTint: 40,
    });
  });

  it.each(["not json", "null", '{"theme":"neon","glassTint":400}'])(
    "falls back to the defaults for %s",
    (stored) => {
      expect(parseAppearance(stored)).toEqual(DEFAULT_APPEARANCE);
    },
  );
});

describe("applyAppearance", () => {
  it("sets the theme and glass tint on the root element", () => {
    const root = document.createElement("html");

    applyAppearance({ theme: "light", glassTint: 50 }, root);

    expect(root.dataset.theme).toBe("light");
    expect(root.style.getPropertyValue("--glass-tint")).toBe("0.5");
  });

  it("follows the system theme by removing the override", () => {
    const root = document.createElement("html");
    root.setAttribute("data-theme", "dark");

    applyAppearance(DEFAULT_APPEARANCE, root);

    expect(root.hasAttribute("data-theme")).toBe(false);
  });
});
