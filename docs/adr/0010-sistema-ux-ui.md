# 0010. Marco de UX/UI: WCAG + Nielsen + Apple Design + UI UX Pro Max

- **Estado:** Aceptada
- **Fecha:** 2026-11-13

## Contexto
depazo es una PWA mobile-first de uso frecuente. Hace falta un criterio común para diseñar y evaluar la UI, que Claude pueda aplicar de forma consistente y sin quedarse con una sola fuente.

## Decisión
Cuatro fuentes, en este **orden de precedencia** cuando se contradicen:

1. **WCAG 2.2 AA**: el piso de accesibilidad.
2. **Las 10 heurísticas de Nielsen**: el criterio de evaluación, aplicado con la skill `heuristic-review` y la escala de severidad 0–4.
3. **Apple Design**: principios de interacción, movimiento (springs con **Motion**), materiales y tipografía. Skill `apple-design`, copiada al repo.
4. **UI UX Pro Max** (MIT, commit `6ae86f6`): catálogo de paletas, estilos y guías por stack. Skill `ui-ux-pro-max`, copiada al repo sin ejecutar su instalador npm. Sus salidas son **sugerencias que hay que validar**.

El detalle está en `docs/ux-guidelines.md`.

## Alternativas consideradas
- **Solo UI UX Pro Max:** su recomendación automática para "real estate" (landing hero y la tipografía de lujo Cinzel) no encaja con una herramienta utilitaria.
- **Material Design:** es coherente, pero empuja una estética Android y depazo apunta también a iOS.

## Consecuencias
Algunas reglas se superponen (contraste, objetivos táctiles), y la jerarquía resuelve los conflictos. UI UX Pro Max hay que actualizarlo a mano: volver a copiarlo desde el repo de origen y anotar el commit en `SOURCE.md`. La identidad visual (paleta y tipografía) queda para un ADR propio.
