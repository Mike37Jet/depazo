import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { aMatch } from "../../test/api-fixtures";
import { MatchCard } from "./match-card";

function renderedCard(source: string): HTMLElement {
  render(<MatchCard match={aMatch({ source })} onToggleSaved={() => undefined} />);
  return screen.getByRole("article");
}

describe("MatchCard", () => {
  it("tints the listings that come from Marketplace", () => {
    const card = renderedCard("marketplace");

    expect(card).toHaveClass("bg-surface-marketplace");
    expect(screen.getByRole("link", { name: /Ver en Facebook Marketplace/ })).toBeInTheDocument();
  });

  it("keeps the plain surface for the other portals", () => {
    const card = renderedCard("plusvalia");

    expect(card).toHaveClass("bg-surface");
    expect(card).not.toHaveClass("bg-surface-marketplace");
  });
});
