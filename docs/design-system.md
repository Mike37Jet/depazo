# Sistema de diseño de depazo

> Decisión: [ADR 0011](adr/0011-identidad-visual-estilo-apple.md). Reglas de UX: [ux-guidelines.md](ux-guidelines.md).
> Inspirado en la **Human Interface Guidelines (HIG) de Apple** y en **Liquid Glass**, adaptado a la web y ajustado para cumplir **WCAG 2.2 AA**.

## 1. Filosofía: cómo diseña Apple

1. **El contenido es lo principal; la interfaz se retira.** Las propiedades (fotos, precio, sector) son las protagonistas. Los controles están en una capa funcional que flota por encima y no compite con ellas.
2. **Claridad.** Texto legible a cualquier tamaño, iconos precisos y adornos solo si comunican algo.
3. **Deferencia.** Movimiento fluido y materiales traslúcidos que ayudan a entender sin distraer.
4. **Profundidad.** La jerarquía se expresa con capas: contenido abajo, navegación y controles arriba.
5. **Moderación con el color.** Neutros en casi todo. **Un solo color de acento**, reservado para lo interactivo y para la acción principal. Según la HIG, se aplica al *fondo* del botón principal y no se colorean varios controles a la vez.
6. **Coherencia.** Lo que se ve igual, se comporta igual y está en el mismo lugar.
7. **Cada valor tiene una razón.** No hay espaciados, tamaños ni tiempos al azar: todo sale de tokens.

## 2. Color

### 2.1 Por qué no copiar los colores de Apple tal cual

Se midió el contraste según WCAG 2.2 (texto normal ≥ 4.5:1):

| Color de Apple | Sobre blanco | ¿Pasa AA? |
|---|---|---|
| systemBlue `#007AFF` | 4.02:1 | ❌ |
| secondaryLabel `rgba(60,60,67,.6)` | 3.44:1 | ❌ |
| systemGreen `#34C759` | 2.22:1 | ❌ |
| systemOrange `#FF9500` | 2.20:1 | ❌ |

Por eso se mantiene la **estructura** de Apple (colores semánticos, fondos agrupados, labels por nivel) y se ajustan los **tonos** hasta que pasen AA.

### 2.2 Tokens semánticos

Los componentes **nunca** usan colores sueltos (hex): siempre un token.

| Token | Claro | Oscuro | Uso | Contraste |
|---|---|---|---|---|
| `--bg` | `#F2F2F7` | `#000000` | Fondo de la app (agrupado) | — |
| `--surface` | `#FFFFFF` | `#1C1C1E` | Tarjetas, listas, sheets | — |
| `--surface-2` | `#F2F2F7` | `#2C2C2E` | Elementos dentro de una superficie | — |
| `--label` | `#000000` | `#FFFFFF` | Texto principal | 21:1 |
| `--label-2` | `#5E5E66` | `#AEAEB5` | Texto secundario | 6.4:1 / 7.7:1 |
| `--label-3` | `#8A8A90` | `#7C7C83` | Placeholders, bordes de inputs (≥ 3:1 para UI); **no** para texto que haya que leer | 3.1–3.4:1 / 4.1:1 |
| `--separator` | `rgba(60,60,67,.18)` | `rgba(84,84,88,.6)` | Líneas finas decorativas | — |
| `--accent` | `#0066CC` | `#4DA3FF` | Enlaces, iconos y controles interactivos | 5.6:1 / 6.5:1 |
| `--accent-fill` | `#0066CC` | `#0066CC` | Fondo del botón principal (texto blanco) | 5.6:1 |
| `--score-high` | `#1E7A35` | `#4ADE80` | Puntaje ≥ 80, sobre su tinte al 15–20 % | 4.8:1 / 6.6:1 |
| `--score-mid` | `#A15C00` | `#FFB340` | Puntaje 60–79 | 4.6:1 / 6.5:1 |
| `--danger` | `#D70015` | `#FF6961` | Errores y acciones destructivas | 5.4:1 / 6.0:1 |

El puntaje **nunca se comunica solo con color**: siempre va el número, y opcionalmente un ícono.

## 3. Tipografía

- **Fuente:** la del sistema. En dispositivos Apple se ve San Francisco, que incluye optical sizing. No se incrusta ni se distribuye SF Pro, porque su licencia es solo para plataformas Apple.
  `font-family: system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", sans-serif;`
- **Escala:** la de Dynamic Type de iOS en tamaño por defecto (**verificada en la HIG**), expresada en `rem` para respetar el tamaño de texto elegido por el usuario. Cuerpo de 17 px; **mínimo de 11 px**.

| Token | HIG | px / interlineado | rem | Peso | Tracking | Uso en depazo |
|---|---|---|---|---|---|---|
| `--text-large-title` | Large Title | 34 / 41 | 2.125 | 700 | -0.02em | Título grande de cada pestaña |
| `--text-title-1` | Title 1 | 28 / 34 | 1.75 | 700 | -0.015em | Precio en el detalle |
| `--text-title-2` | Title 2 | 22 / 28 | 1.375 | 700 | -0.01em | Secciones |
| `--text-title-3` | Title 3 | 20 / 25 | 1.25 | 600 | -0.005em | Precio en la tarjeta |
| `--text-headline` | Headline | 17 / 22 | 1.0625 | 600 | 0 | Título de fila o tarjeta |
| `--text-body` | Body | 17 / 22 | 1.0625 | 400 | 0 | Texto general |
| `--text-callout` | Callout | 16 / 21 | 1 | 400 | 0 | Descripciones |
| `--text-subhead` | Subhead | 15 / 20 | 0.9375 | 400 | 0 | Sector, metadatos |
| `--text-footnote` | Footnote | 13 / 18 | 0.8125 | 400 | 0.005em | "Hace 2 h · Plusvalía" |
| `--text-caption-1` | Caption 1 | 12 / 16 | 0.75 | 400 | 0.01em | Etiquetas de chips |
| `--text-caption-2` | Caption 2 | 11 / 13 | 0.6875 | 500 | 0.01em | Badges (el mínimo) |

- La jerarquía se construye combinando **peso, tamaño e interlineado**; para enfatizar se prefiere el peso.
- Números tabulares en precios y puntajes: `font-variant-numeric: tabular-nums`.

## 4. Espaciado y layout

- **Base de 4 px, ritmo de 8**: `--space-1: 4px` · `2: 8` · `3: 12` · `4: 16` · `5: 20` · `6: 24` · `8: 32` · `10: 40` · `12: 48`.
- **Márgenes laterales:** 16 px en móvil y 20 px a partir de 390 px. En escritorio el contenido tiene un ancho máximo de 1080 px.
- **Objetivos táctiles de al menos 44×44 px**, y filas de lista de al menos 44 px de alto.
- **Safe areas:** `env(safe-area-inset-*)` en la barra de pestañas, los sheets y el header (PWA instalada en iPhone).
- **Listas *inset grouped*** (como Ajustes de iOS) para el perfil de búsqueda y la configuración.

## 5. Forma

- **Radios:** `--radius-sm: 8px` (chips, badges) · `--radius-md: 12px` (botones, inputs) · `--radius-lg: 16px` (tarjetas) · `--radius-xl: 24px` (sheets, barra de pestañas flotante) · `--radius-full`.
- **Esquinas continuas** (estilo *squircle*): `corner-shape: squircle` como mejora progresiva donde el navegador lo soporte; si no, el `border-radius` normal.
- **Radios concéntricos:** un elemento dentro de otro usa como radio el del exterior menos el padding.

## 6. Materiales y profundidad (Liquid Glass en la web)

La HIG dice que Liquid Glass **es para la capa funcional** (barras de pestañas, navegación, sheets, controles flotantes) y que **no se usa en la capa de contenido**.

| Token | Uso | CSS |
|---|---|---|
| `--glass-chrome` | Barra de pestañas, header al hacer scroll | `background: rgb(255 255 255 / .72); backdrop-filter: blur(24px) saturate(180%);` · oscuro: `rgb(28 28 30 / .72)` |
| `--glass-thick` | Sheets, popovers | Más opaco (`/ .86`) y con más blur |
| Contenido | Tarjetas y listas | **Sólido** (`--surface`), sin blur |

- Con `prefers-reduced-transparency` y con `prefers-contrast: more`, los materiales pasan a ser sólidos y se agrega un borde visible.
- **Sombras mínimas.** El contenido no lleva sombra: se separa por contraste entre `--bg` y `--surface`. Solo los elementos flotantes llevan sombra: `--shadow-float: 0 8px 32px rgb(0 0 0 / .12)`.
- En lugar de líneas divisorias bajo el header, se usa un **efecto de borde al hacer scroll**: un fade o blur que aparece solo cuando hay contenido debajo.

## 7. Movimiento

Viene de la skill `apple-design` y se implementa con **Motion**.

| Token | Spring | Uso |
|---|---|---|
| `--motion-default` | `{ type: "spring", bounce: 0, duration: 0.4 }` | Casi todo |
| `--motion-snappy` | `{ bounce: 0, duration: 0.25 }` | Toggles, chips, segmented control |
| `--motion-momentum` | `{ bounce: 0.2, duration: 0.4 }` + velocidad heredada | Soltar un sheet, swipe de tarjeta |
| `--motion-fade` | `200ms ease` | Cambios de opacidad y alternativa con movimiento reducido |

Todo es interrumpible. Feedback en `pointerdown` (`scale(0.97)`). Con `prefers-reduced-motion`, cross-fade en lugar de desplazamiento.

## 8. Iconografía

- **Lucide** (el set de shadcn), con trazo de 1.75 y tamaño igual a la altura de línea del texto que acompaña.
- **No se usan SF Symbols**: su licencia los limita a apps de plataformas Apple.
- Los íconos que van solos llevan `aria-label`. Nunca se usan emojis como íconos.

## 9. Patrones de interfaz

| Patrón | En depazo |
|---|---|
| **Barra de pestañas flotante** (≤ 5, de vidrio, abajo) | Para ti · Mapa · Favoritos · Búsquedas · Cuenta |
| **Large title** que se contrae al hacer scroll | Encabezado de cada pestaña |
| **Sheets con detents** (Vaul vía el Drawer de shadcn) | Detalle de propiedad sobre el mapa; filtros |
| **Segmented control** | Lista / Mapa; orden por puntaje, precio o fecha |
| **Swipe actions** en filas y tarjetas | Favorito, descartar (con deshacer) |
| **Lista inset grouped** + **switch** estilo iOS | Editar búsqueda, notificaciones |
| **Un solo botón principal por pantalla** | "Guardar búsqueda", "Activar alertas" |
| **Estados vacíos** con ilustración mínima y una acción | "Aún no hay coincidencias: amplía tu zona" |

## 10. Implementación

Los tokens se definen como variables CSS en `frontend/src/styles/tokens.css` y se exponen a Tailwind v4 con `@theme`. Los tokens de shadcn (`--primary`, `--background`, …) se mapean a estos. El modo oscuro sigue a `prefers-color-scheme`, con opción manual (`data-theme`).

Ningún componente usa valores directos (hex, px de tipografía, ms): siempre tokens. Lo verifica la revisión de código.
