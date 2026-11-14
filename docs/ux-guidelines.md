# Guía de UX/UI de depazo

> Decisión: [ADR 0010](adr/0010-sistema-ux-ui.md). Complementa a [Atomic Design (ADR 0009)](adr/0009-atomic-design-frontend.md).

## 1. Fuentes y jerarquía

Usamos cuatro fuentes. Cuando se contradicen, **gana la de mayor prioridad**:

| # | Fuente | Rol | Dónde |
|---|---|---|---|
| 1 | **WCAG 2.2 nivel AA** | Piso legal y ético de accesibilidad; no se negocia | w3.org/TR/WCAG22 |
| 2 | **10 heurísticas de Jakob Nielsen** (1994, rev. 2024) | Criterio para **evaluar** si una pantalla es usable | nngroup.com/articles/ten-usability-heuristics · skill `heuristic-review` |
| 3 | **Apple Design** (WWDC, adaptado a web) | Principios de **interacción, movimiento, materiales y tipografía** | skill `apple-design` |
| 4 | **UI UX Pro Max** (uupm.cc, MIT) | **Catálogo** de paletas, estilos, tipografías, guías por stack y checklists | skill `ui-ux-pro-max` |

UI UX Pro Max sugiere; no decide. Sus resultados se validan contra las fuentes 1–3 y contra el contexto de depazo antes de adoptarlos. Ejemplo real: para "real estate" propuso una landing *hero-centric* y la tipografía Cinzel (lujo), pero depazo es una **herramienta de uso frecuente**, no un sitio de marketing, así que esa propuesta se descarta.

## 2. Contexto de diseño

- **Tipo de producto:** herramienta utilitaria de búsqueda y decisión, con bastantes datos y uso recurrente.
- **Plataforma principal:** móvil (PWA instalada), **mobile-first**. En escritorio se usa para comparar con calma.
- **Usuarios:** personas en Quito buscando arriendo, a menudo con prisa y con datos móviles.
- **Emoción objetivo:** *calma y confianza* ("ya lo están buscando por mí").

## 3. Las 10 heurísticas aplicadas a depazo

| # | Heurística | Cómo se traduce en depazo |
|---|---|---|
| H1 | Visibilidad del estado del sistema | Mostrar "Última búsqueda: hace 12 min · 3 portales OK, 1 con fallas"; skeletons al cargar; toast cuando se guarda un perfil |
| H2 | Coincidencia con el mundo real | Vocabulario local: *alícuota*, *sector*, *parqueadero*, *USD*; zonas con nombres de barrio, no solo el polígono |
| H3 | Control y libertad | "Descartar" con **deshacer** (toast de 5 s); editar o pausar alertas en cualquier momento; volver atrás siempre predecible |
| H4 | Consistencia y estándares | Un solo `ScoreBadge`, una sola `ListingCard`; patrones nativos de móvil (bottom nav, sheets); tokens de diseño, nunca colores sueltos |
| H5 | Prevención de errores | Rango de precio con slider + valores válidos por defecto; avisar si los filtros dejan 0 resultados **antes** de guardar |
| H6 | Reconocer antes que recordar | Chips visibles con los filtros activos; mapa con la zona dibujada siempre a la vista; historial de favoritos |
| H7 | Flexibilidad y eficiencia | Swipe para favorito o descarte; varios perfiles de búsqueda; atajos de teclado en escritorio |
| H8 | Diseño estético y minimalista | La tarjeta muestra lo decisivo (precio total, sector, habitaciones, puntaje); el detalle va un nivel más abajo |
| H9 | Reconocer, diagnosticar y recuperarse de errores | Mensajes en lenguaje claro con acción ("No pudimos activar las notificaciones: en iPhone instala la app primero. Ver cómo"). Errores junto al campo |
| H10 | Ayuda y documentación | Explicar **por qué** una propiedad tiene 87 puntos (desglose del puntaje); onboarding breve; ayuda contextual sobre push en iOS |

**Escala de severidad** (Nielsen) para los hallazgos: 0 no es problema · 1 cosmético · 2 menor · 3 mayor (corregir pronto) · 4 catástrofe (bloquea el release).

## 4. Interacción y movimiento (Apple Design)

- **Respuesta inmediata:** feedback en `pointerdown`, sin el retraso de 300 ms; latencia mínima en filtros.
- **Manipulación directa:** las tarjetas, el bottom sheet del mapa y el editor de zona siguen al dedo 1:1, respetando el punto donde se tomaron.
- **Todo es interrumpible:** nada bloquea el input durante una transición.
- **Springs** con **Motion** (motion.dev): `bounce: 0` por defecto; un poco de rebote solo después de un flick (swipe de tarjeta, soltar el sheet).
- **Proyección de momentum** al soltar sheets y tarjetas (`decelerationRate ≈ 0.998`).
- **Consistencia espacial:** lo que entra desde abajo sale por abajo; los popovers nacen de su botón.
- **Materiales:** barras traslúcidas (`backdrop-filter`) solo donde aportan jerarquía, y con alternativa sólida para `prefers-reduced-transparency`.
- **Tipografía:** fuente del sistema (`system-ui`) por defecto; tracking negativo en títulos grandes; tamaños en `rem` para respetar el tamaño de texto que elija el usuario.
- **Movimiento reducido:** con `prefers-reduced-motion`, se reemplazan los movimientos por cross-fades.

## 5. Catálogo (UI UX Pro Max)

Úsalo para:
- Proponer paletas y tokens, siempre verificando un contraste ≥ 4.5:1.
- Guías específicas del stack (`--stack react`, `--stack shadcn`).
- Checklists de accesibilidad, formularios y navegación (`--domain ux`).
- Elegir gráficos accesibles (`--domain chart`), por ejemplo para el historial de precios.

```bash
python3 .claude/skills/ui-ux-pro-max/scripts/search.py "<consulta>" --domain ux
```

## 6. Identidad visual

Estilo Apple (HIG + Liquid Glass) ajustado para cumplir WCAG: ver [design-system.md](design-system.md) y el [ADR 0011](adr/0011-identidad-visual-estilo-apple.md).

## 7. Checklist antes de hacer merge de un cambio de UI

- [ ] WCAG 2.2 AA: contraste, foco visible, navegable con teclado, `aria-label` en botones que solo tienen ícono.
- [ ] Objetivos táctiles de al menos 44×44 px; nada que dependa solo de hover.
- [ ] Probado en un viewport de 375 px y en escritorio, en modo claro y oscuro.
- [ ] Estados de carga, vacío y error diseñados (H1, H9).
- [ ] `prefers-reduced-motion` y `prefers-reduced-transparency` respetados.
- [ ] Pantalla nueva o cambio grande: revisión con `heuristic-review` sin hallazgos de severidad ≥ 3.
- [ ] Story de Storybook actualizada.
