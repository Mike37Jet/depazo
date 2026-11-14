import { describe, expect, it } from "vitest";
import { aMatch, aReport } from "../test/api-fixtures";
import { describeReport, describeSavedCount, explainEmptyReport } from "./matches-report";

describe("explainEmptyReport", () => {
  it("says listings have not been loaded yet", () => {
    const explanation = explainEmptyReport(
      { evaluated_count: 0, rejected_count: 0, discarded_count: 0 },
      60,
    );

    expect(explanation.title).toBe("Todavía no hay anuncios");
  });

  it("points at the filters when every listing fails them", () => {
    const explanation = explainEmptyReport(
      { evaluated_count: 555, rejected_count: 555, discarded_count: 0 },
      60,
    );

    expect(explanation.title).toBe("Ningún anuncio cumple tus filtros");
    expect(explanation.message).toContain("Revisamos 555 anuncios");
  });

  it("points at the minimum score when listings pass the filters", () => {
    const explanation = explainEmptyReport(
      { evaluated_count: 555, rejected_count: 541, discarded_count: 0 },
      60,
    );

    expect(explanation.title).toBe("Ninguno llega a tu puntaje mínimo");
    expect(explanation.message).toMatch(
      /^14 anuncios cumplen tus filtros, pero ninguno llega a 60 puntos/,
    );
  });

  it("uses the singular for a single listing", () => {
    const explanation = explainEmptyReport(
      { evaluated_count: 10, rejected_count: 9, discarded_count: 0 },
      undefined,
    );

    expect(explanation.message).toMatch(
      /^1 anuncio cumple tus filtros, pero ninguno llega a tu puntaje mínimo/,
    );
  });
});

describe("explainEmptyReport after discarding", () => {
  it("says every listing was discarded", () => {
    const explanation = explainEmptyReport(
      { evaluated_count: 0, rejected_count: 0, discarded_count: 4 },
      60,
    );

    expect(explanation.title).toBe("Descartaste todos los anuncios");
  });
});

describe("describeReport", () => {
  it("mentions the discarded listings", () => {
    const report = { ...aReport([aMatch()], 10), discarded_count: 3 };

    expect(describeReport(report)).toBe("1 de 10 anuncios encajan con tu búsqueda · 3 descartados");
  });

  it("stays short when nothing was discarded", () => {
    expect(describeReport(aReport([aMatch()], 10))).toBe(
      "1 de 10 anuncios encajan con tu búsqueda",
    );
  });
});

describe("describeSavedCount", () => {
  it("uses the singular for one listing", () => {
    expect(describeSavedCount(1)).toBe("1 anuncio guardado");
  });
});
