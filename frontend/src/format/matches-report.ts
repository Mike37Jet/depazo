import type { Matches } from "../services/api-client";

export interface EmptyReportExplanation {
  title: string;
  message: string;
  actionLabel: string;
}

type ReportCounts = Pick<Matches, "evaluated_count" | "rejected_count" | "discarded_count">;

export function explainEmptyReport(
  report: ReportCounts,
  minScore: number | undefined,
): EmptyReportExplanation {
  if (report.evaluated_count === 0 && report.discarded_count > 0) {
    return {
      title: "Descartaste todos los anuncios",
      message: "Cuando lleguen anuncios nuevos de los portales, aparecerán aquí.",
      actionLabel: "Revisar búsqueda",
    };
  }
  if (report.evaluated_count === 0) {
    return {
      title: "Todavía no hay anuncios",
      message: "Aún no cargamos anuncios de los portales. Vuelve en unas horas.",
      actionLabel: "Revisar búsqueda",
    };
  }
  const passingCount = report.evaluated_count - report.rejected_count;
  if (passingCount === 0) {
    return {
      title: "Ningún anuncio cumple tus filtros",
      message: `Revisamos ${report.evaluated_count} anuncios y ninguno entra en tu presupuesto, espacio o sectores. Prueba subir el presupuesto o bajar los mínimos.`,
      actionLabel: "Ajustar filtros",
    };
  }
  const threshold = minScore === undefined ? "tu puntaje mínimo" : `${minScore} puntos`;
  const passing =
    passingCount === 1
      ? "1 anuncio cumple tus filtros"
      : `${passingCount} anuncios cumplen tus filtros`;
  return {
    title: "Ninguno llega a tu puntaje mínimo",
    message: `${passing}, pero ninguno llega a ${threshold}. Prueba bajar el puntaje mínimo o agregar más sectores preferidos.`,
    actionLabel: "Bajar el puntaje mínimo",
  };
}

export function describeReport(report: Matches): string {
  const parts = [
    `${report.match_count} de ${report.evaluated_count} anuncios encajan con tu búsqueda`,
  ];
  if (report.match_count > report.matches.length) {
    parts.push(`ves los ${report.matches.length} mejores`);
  }
  if (report.discarded_count > 0) {
    parts.push(
      report.discarded_count === 1 ? "1 descartado" : `${report.discarded_count} descartados`,
    );
  }
  return parts.join(" · ");
}

export function describeSavedCount(count: number): string {
  return count === 1 ? "1 anuncio guardado" : `${count} anuncios guardados`;
}
