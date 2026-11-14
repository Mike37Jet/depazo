import type { PushAvailability } from "../services/push-gateway";

const EXPLANATIONS: Record<PushAvailability, string> = {
  available:
    "Te avisamos cuando llegue un departamento que supere tu puntaje mínimo. Revisamos los portales cada 3 horas.",
  "needs-install":
    "En iPhone, primero agrega depazo a la pantalla de inicio (Compartir → Agregar a inicio) y ábrelo desde ahí.",
  unsupported: "Este navegador no permite avisos. Prueba con Chrome, Edge, Firefox o Safari.",
  blocked:
    "Bloqueaste los avisos de depazo. Actívalos en los ajustes del navegador para este sitio.",
  "not-configured": "Los avisos todavía no están disponibles.",
};

export function explainPushAvailability(availability: PushAvailability): string {
  return EXPLANATIONS[availability];
}
