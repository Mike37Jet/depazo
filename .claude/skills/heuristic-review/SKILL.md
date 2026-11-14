---
name: heuristic-review
description: Evaluación heurística de una pantalla, componente o flujo de la PWA de depazo con las 10 heurísticas de Jakob Nielsen y la escala de severidad 0–4. Usar al revisar UI antes de un merge, cuando el usuario pide "revisa la UX" o "evaluación heurística", o al terminar una pantalla nueva.
---

# Evaluación heurística (Nielsen)

Referencia: https://www.nngroup.com/articles/ten-usability-heuristics/. La aplicación concreta a depazo está en `docs/ux-guidelines.md` §3.

## Procedimiento

1. **Delimitar el alcance:** qué pantalla o flujo se revisa, y qué tarea quiere completar el usuario (por ejemplo, "crear un perfil de búsqueda y activar alertas").
2. **Recorrer el flujo real.** Si la app corre en local, recórrela en el navegador integrado con un viewport de 375 px y luego en escritorio. Si no, revisa el código de `pages/`, `templates/` y `organisms/`.
3. **Contrastar con cada heurística**, H1 a H10:
   - H1 Visibilidad del estado del sistema
   - H2 Coincidencia entre el sistema y el mundo real
   - H3 Control y libertad del usuario
   - H4 Consistencia y estándares
   - H5 Prevención de errores
   - H6 Reconocer antes que recordar
   - H7 Flexibilidad y eficiencia de uso
   - H8 Diseño estético y minimalista
   - H9 Ayudar a reconocer, diagnosticar y recuperarse de errores
   - H10 Ayuda y documentación
4. **Asignar severidad** a cada hallazgo: 0 no es problema · 1 cosmético · 2 menor · 3 mayor · 4 catástrofe.
5. **Revisar lo complementario:** WCAG 2.2 AA (contraste, foco, teclado, etiquetas) y los principios de interacción de la skill `apple-design` (respuesta inmediata, interrumpibilidad, consistencia espacial, movimiento reducido).

## Formato del informe

| Heurística | Hallazgo | Dónde (archivo:línea o pantalla) | Severidad | Recomendación |
|---|---|---|---|---|

Termina con un resumen: el número de hallazgos por severidad, los tres más importantes y un veredicto. **Si hay algún hallazgo de severidad ≥ 3, la UI no está lista para merge.**

No inventes hallazgos para llenar la tabla: si una heurística no tiene problemas, anótala como "OK".
