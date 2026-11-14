# 0009. Atomic Design en el frontend

- **Estado:** Aceptada
- **Fecha:** 2026-11-13

## Contexto
La PWA reutiliza muchos elementos (tarjetas de propiedad, filtros, badges de puntaje, formularios). Se necesita un sistema de componentes consistente y fácil de ampliar.

## Decisión
Organizar los componentes con **Atomic Design** (Brad Frost, 2013/2016):

| Nivel | Qué es | Ejemplos en depazo |
|---|---|---|
| `atoms/` | Elementos mínimos, sin dependencias de otros componentes | `Button`, `Input`, `Badge`, `Icon`, `Spinner` (los primitivos de shadcn/ui viven aquí) |
| `molecules/` | Combinación simple de átomos con un propósito | `FormField`, `PriceRange`, `ScoreBadge`, `FeatureChip` |
| `organisms/` | Secciones complejas y autónomas | `ListingCard`, `SearchProfileForm`, `ZoneMapEditor`, `AppHeader` |
| `templates/` | Esqueleto de página sin datos reales | `DashboardTemplate`, `AuthTemplate` |
| `pages/` | Templates con datos reales; las monta el router | `MatchesPage`, `SearchProfilePage` |

Reglas:
- **Solo se importa hacia abajo:** pages → templates → organisms → molecules → atoms. Se verifica con `noRestrictedImports` de Biome por carpeta.
- Átomos, moléculas, organismos y templates son **presentacionales**: reciben props y no hacen fetch. Los datos (TanStack Query, cliente generado) solo entran en `pages/` y en hooks de `src/hooks/`.
- `components.json` de shadcn apunta su alias `ui` a `@/components/atoms`.
- **Storybook** documenta los niveles de átomos a templates, y sirve de catálogo visual y de banco de pruebas.

## Alternativas consideradas
- **Carpetas por feature:** escalan bien en apps grandes, pero no dan un vocabulario de diseño claro.
- **Estructura plana `components/`:** se vuelve caótica rápido.

## Consecuencias
A veces cuesta decidir si algo es molécula u organismo. Criterio: si tiene estado propio o varias responsabilidades, es organismo. Storybook agrega una dependencia y un build extra en CI.

Referencia: B. Frost, *Atomic Design* (atomicdesign.bradfrost.com).
