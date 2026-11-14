# 0001. Monorepo con backend Python y frontend TypeScript

- **Estado:** Aceptada
- **Fecha:** 2026-11-13

## Contexto
Hace falta un ecosistema fuerte para scraping y datos, y también una PWA moderna. Hay un solo desarrollador.

## Decisión
Un solo repositorio con `backend/` (Python 3.13 gestionado con **uv**) y `frontend/` (TypeScript gestionado con **pnpm**). El cliente TS de la API se **genera desde el OpenAPI** de FastAPI (`@hey-api/openapi-ts`) para que los tipos nunca se desincronicen.

## Alternativas consideradas
- **Todo TypeScript:** el scraping y el análisis de datos son más pobres.
- **Repos separados:** más fricción para un solo desarrollador; los cambios que tocan backend y frontend no serían atómicos.

## Consecuencias
Dos toolchains en CI. La generación del cliente pasa a ser un paso obligatorio cuando cambia la API.
