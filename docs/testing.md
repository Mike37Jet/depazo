# Estrategia de pruebas

> Decisión: [ADR 0013](adr/0013-estrategia-de-pruebas-piramide.md). Fuentes: Mike Cohn, *Succeeding with Agile* (2009); Ham Vocke en martinfowler.com, *The Practical Test Pyramid* (2018).

## 1. La pirámide

```
            ▲   E2E (~10 %)          Playwright: pocos flujos críticos completos
           ▲▲▲  Integración (~20 %)  DB real, HTTP, API, migraciones
        ▲▲▲▲▲▲▲ Unitarios (~70 %)    dominio, casos de uso, parsers, componentes
```

Reglas que seguimos (Fowler):
1. **Tests de distinta granularidad.**
2. **Cuanto más alto el nivel, menos tests.** Los end-to-end son lentos, frágiles y caros de mantener.
3. **Cada test, lo más abajo posible.** Si falla un test de alto nivel y ninguno de bajo nivel lo detectó, se agrega el test de bajo nivel que falta.
4. **Sin duplicación:** no se prueba lo mismo en dos niveles.
5. **Se prueba comportamiento público,** no métodos privados ni getters triviales.
6. **Nunca contra sistemas de producción.**

## 2. Backend (pytest)

| Nivel | Qué se prueba | Cómo | Ubicación |
|---|---|---|---|
| **Unitario** | `domain/`: entidades, value objects, puntaje, dedupe | Funciones puras. Puntaje con *property-based testing* (Hypothesis): el resultado siempre está entre 0 y 100, y si falla un filtro duro, el puntaje es 0 | `tests/unit/domain/` |
| **Unitario** | `application/`: casos de uso | Fakes en memoria de los puertos (`InMemoryListingRepository`, `FakeNotifier`, `FixedClock`) | `tests/unit/application/` |
| **Unitario** | Parsers de cada portal | HTML/JSON real guardado en fixtures; sin red | `tests/unit/sources/` + `tests/fixtures/<portal>/` |
| **Integración** | Repositorios SQLAlchemy y consultas PostGIS | **Testcontainers** con Postgres + PostGIS reales; cada test en una transacción que se revierte | `tests/integration/persistence/` |
| **Integración** | Adaptadores HTTP (portales, Resend, Web Push) | `respx` simula las respuestas HTTP; se verifican reintentos, rate limit y errores | `tests/integration/adapters/` |
| **Integración** | API FastAPI | `httpx.AsyncClient` contra la app con DB real y auth simulada | `tests/integration/api/` |
| **Integración** | Migraciones Alembic | `upgrade head` y `downgrade` en una DB vacía | `tests/integration/migrations/` |

## 3. Frontend (Vitest + Testing Library)

| Nivel | Qué se prueba | Cómo | Ubicación |
|---|---|---|---|
| **Unitario** | Utilidades y hooks (formato de precios, cálculo de la alícuota) | Vitest | junto al archivo: `*.test.ts` |
| **Unitario (sociable)** | Átomos → organismos | Testing Library, buscando elementos por rol accesible (`getByRole`), lo que a la vez valida la accesibilidad | `*.test.tsx` junto al componente |
| **Integración** | Páginas completas | **MSW** simula la API; se prueba el flujo de la página con el router y TanStack Query | `src/pages/**/*.test.tsx` |

## 4. End-to-end (Playwright)

Solo los flujos críticos, de 3 a 5 en total:
1. Iniciar sesión → crear un perfil de búsqueda → ver coincidencias.
2. Activar las notificaciones.
3. Marcar favorito y descartar, con deshacer.

Corren contra un entorno local completo (API + DB en Docker + build de la PWA), en móvil (375 px) y en escritorio. Ubicación: `frontend/e2e/`.

## 5. Contrato API ↔ PWA

El cliente TS se genera desde el OpenAPI de FastAPI. En CI se regenera el cliente y, si hay diferencias sin commitear, falla. Eso cumple el papel de los contract tests sin usar Pact.

## 6. Convenciones de los tests

- **Nombres que describen el comportamiento:**
  - Python: `test_rejects_listing_when_price_exceeds_budget`
  - TS: `it("rejects listing when price exceeds budget")`
- **Estructura Arrange / Act / Assert,** separando los bloques con una línea en blanco y **sin comentarios**.
- **Un comportamiento por test.** Los datos se construyen con *builders* o factories (`a_listing().with_price(800).build()`), no con objetos gigantes copiados.
- **Determinismo:** sin `sleep`, sin red real, con reloj inyectado (`Clock`) y semillas fijas.
- **Velocidad:** la suite unitaria completa debe tardar menos de 10 s.

## 7. Cobertura y CI

- **Cobertura mínima:** 90 % en `domain/` + `application/`, 80 % global. No se persigue el 100 %.
- **En cada push:** unitarios e integración, tanto de backend como de frontend.
- **En cada push a `main`:** además, los E2E.

| Comando | Qué corre |
|---|---|
| `uv run pytest tests/unit` | Unitarios del backend |
| `uv run pytest tests/integration` | Integración (requiere Docker) |
| `pnpm test` | Unitarios e integración del frontend |
| `pnpm e2e` | Playwright |
