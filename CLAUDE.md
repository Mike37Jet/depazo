# CLAUDE.md

Guía para Claude Code al trabajar en este repositorio.

## Proyecto: depazo

PWA multiusuario que automatiza la búsqueda de departamentos en arriendo en **Quito, Ecuador**. Recopila anuncios de varios portales, los normaliza y deduplica, calcula un puntaje de compatibilidad con las preferencias de cada usuario y avisa (push + email) cuando aparecen oportunidades relevantes.

**Proyecto escalable en todos sus aspectos** (código, datos, procesamiento, infraestructura, frontend y equipo), aplicando buenas prácticas de desarrollo: SOLID, Clean Architecture, KISS, DRY y YAGNI. Preparado para crecer, sin sobre-construir.

| Documento | Contenido |
|---|---|
| [docs/architecture.md](docs/architecture.md) | Componentes, pipeline, modelo de datos |
| [docs/conventions.md](docs/conventions.md) | Escalabilidad, cero comentarios, nombres, commits |
| [docs/testing.md](docs/testing.md) | Pirámide de tests |
| [docs/ux-guidelines.md](docs/ux-guidelines.md) · [docs/design-system.md](docs/design-system.md) | UX/UI y tokens |
| [docs/adr/](docs/adr/) | Decisiones y su porqué (nuevas con la skill `adr`) |

**Repositorio público:** nunca commitear credenciales, tokens, cookies, `.env` ni datos personales.

## Dominio

- Precios en **USD**. **Alícuota** = gastos de condominio (puede estar incluida o no en el arriendo).
- Ubicación por **sector / barrio / parroquia** (La Carolina, Cumbayá, González Suárez…), más coordenadas.
- `Listing` = anuncio de un portal · `Property` = inmueble canónico deduplicado · `SearchProfile` = preferencias de búsqueda de un usuario · `Match` = puntaje de una propiedad para un perfil. El glosario completo español → código está en `docs/conventions.md` §3.5.

## Stack

| Capa | Tecnología |
|---|---|
| Frontend (PWA) | Vite, React, TypeScript strict, TanStack Router/Query, Tailwind + shadcn/ui, vite-plugin-pwa, MapLibre, Motion · Atomic Design + Storybook · pnpm · Biome · Vitest + Testing Library + MSW · Playwright |
| Backend / API | Python 3.13, Clean Architecture, FastAPI, Pydantic v2, SQLAlchemy 2 async, Alembic · uv · Ruff · mypy strict · pytest + Hypothesis + Testcontainers + respx |
| Ingesta | CLI `depazo ingest` (Typer), httpx + selectolax; Playwright solo si es imprescindible |
| Datos / Auth | Supabase: Postgres + PostGIS, Supabase Auth (la API valida el JWT) |
| Notificaciones | Web Push (VAPID, pywebpush), email con Resend |
| Infra (free tiers) | Cloudflare Pages (web), Cloud Run (API), GitHub Actions (CI + cron de ingesta), Sentry |

## Estructura (prevista)

```
backend/src/depazo/
  domain/                     entidades, value objects, puntaje, dedupe (puro)
  application/{use_cases,ports,dto}/
  infrastructure/{sources/<portal>,persistence,notifications,geocoding}/
  presentation/{api,cli}/
  bootstrap.py                composition root
backend/tests/{unit,integration,fixtures/<portal>}/
frontend/src/
  components/{atoms,molecules,organisms,templates}/
  pages/  routes/  hooks/  api/ (generado, no editar)
frontend/e2e/
docs/  .github/workflows/
```

## Comandos

_Se completan cuando se haga el scaffolding._ Previstos: `uv run pytest tests/unit`, `uv run pytest tests/integration`, `uv run ruff check`, `uv run mypy`, `uv run depazo ingest --source <portal>`, `pnpm dev`, `pnpm test`, `pnpm e2e`, `pnpm gen:api`.

## Reglas de código (no negociables)

- **Cero comentarios en el código**: ni explicativos, ni docstrings, ni JSDoc, ni código comentado, ni `TODO`. Vale para todos los lenguajes y archivos de configuración. El código se explica solo con nombres claros y funciones pequeñas; el porqué va en ADRs y commits; los pendientes, en Issues. Únicas excepciones: directivas de herramientas con su código de regla (`# noqa: E501`, `# type: ignore[arg-type]`, `// biome-ignore lint/…: motivo`) y el código de terceros incluido en `.claude/skills/ui-ux-pro-max/`.
- **Nombres** (detalle en `docs/conventions.md` §3):
  - Todo en inglés, con nombres que revelan la intención y sin abreviaturas.
  - Clases = sustantivos; funciones = verbos; booleanos = `is_` / `has_` / `can_` / `should_`.
  - Python (PEP 8): `snake_case` en funciones, variables y módulos; `PascalCase` en clases; `UPPER_SNAKE_CASE` en constantes; las excepciones terminan en `Error`.
  - TS (Google): `camelCase` en variables y funciones; `PascalCase` en tipos, interfaces y componentes; `CONSTANT_CASE` en constantes globales; hooks `useX`.
  - Interfaces y Protocols **sin prefijo `I`**, nombrados por su rol (`ListingRepository`). Las implementaciones se nombran por su tecnología (`SqlAlchemyListingRepository`).
  - Prohibido usar `Manager`, `Helper`, `Util` o `Data` como nombre.
- **No se usan `catch` vacíos ni type assertions inseguros:** los errores se manejan de forma explícita y los datos externos se validan con Pydantic o Zod.
- El cliente TS **no se edita a mano**: se regenera con `pnpm gen:api`.

## Reglas de arquitectura

**Backend (Clean Architecture):**
- Regla de dependencia: `presentation`/`infrastructure` → `application` → `domain`, nunca al revés. Se verifica con import-linter.
- `domain/` usa `dataclasses` puras, sin Pydantic, SQLAlchemy, FastAPI ni httpx.
- Los casos de uso dependen de **puertos** (`Protocol`). Las implementaciones concretas se arman solo en `bootstrap.py`.
- Las entidades y los modelos ORM están separados; los repositorios hacen el mapeo.
- Los routers son delgados: validan, llaman a un caso de uso y devuelven un schema.
- Cada portal es un adaptador en `infrastructure/sources/<portal>/`. Agregar uno no toca el dominio.
- Los jobs son **idempotentes** y la API **no guarda estado**.
- El puntaje es una función pura del dominio y devuelve un desglose explicable.

**Frontend (Atomic Design):**
- Solo se importa hacia abajo: pages → templates → organisms → molecules → atoms.
- Los niveles de atoms a templates son presentacionales: solo props, sin fetch. Los datos entran en `pages/` a través de `hooks/`.
- Los primitivos de shadcn/ui van en `atoms/`. Los átomos y moléculas compartidos llevan su story de Storybook.

## Pruebas (pirámide de tests)

Proporción orientativa: **~70 % unitarios, ~20 % integración, ~10 % E2E** (detalle en `docs/testing.md`).
- **Unitarios:** dominio (con Hypothesis para el puntaje), casos de uso con fakes en memoria, parsers contra fixtures y componentes con Testing Library.
- **Integración:** repositorios con Testcontainers (Postgres + PostGIS), adaptadores HTTP con respx, API con `httpx.AsyncClient`, páginas con MSW.
- **E2E:** solo de 3 a 5 flujos críticos con Playwright.
- Cada test va lo más abajo posible en la pirámide; sin tests duplicados; nombres que describen el comportamiento; Arrange/Act/Assert separados por líneas en blanco, sin comentarios.
- **Cobertura:** ≥ 90 % en `domain/` + `application/` y ≥ 80 % global. Todo cambio de lógica lleva su test.

## UX/UI

Si las fuentes se contradicen, se aplica este orden de precedencia: **WCAG 2.2 AA** → **heurísticas de Nielsen** (skill `heuristic-review` para pantallas nuevas o cambios grandes; ningún hallazgo puede tener severidad ≥ 3) → skill **`apple-design`** → skill **`ui-ux-pro-max`** (solo sugiere; todo se valida).

**Estilo:** limpio y elegante, al estilo Apple (HIG + Liquid Glass), con los tokens de `docs/design-system.md`.
- Solo tokens: nada de hex, px de tipografía ni ms escritos a mano.
- Un solo color de acento y un solo botón principal por pantalla.
- Liquid Glass solo en la capa funcional, con controles agrupados en cápsulas:
  - Variante **regular** para la barra de pestañas, los sheets y las acciones flotantes.
  - Variante **clear** solo sobre fotos, con una capa oscura del 35 %.
  - Se respetan la preferencia transparente/tintado y `prefers-reduced-transparency` (`docs/design-system.md` §6).
- Fuente `system-ui` con la escala de Dynamic Type; íconos Lucide.
- Sin logos ni marcas de Apple.
- Mobile-first (375 px) y estados de carga, vacío y error en todas las pantallas.

## Datos y scraping responsable

- No se guardan datos personales de los anunciantes (teléfono, nombre, email): solo la URL del anuncio (LOPDP Ecuador).
- Respetar `robots.txt` y los términos de uso, usar rate limiting por portal y un User-Agent genérico, y preferir la API oficial. **No evadir protecciones anti-bot ni CAPTCHAs.** Si un portal lo prohíbe, se descarta.

## Flujo de trabajo (simple)

- **Directo a `main`** para cambios normales. Una rama + PR solo para cambios grandes o riesgosos.
- **Conventional Commits 1.0.0**, validados por un hook: `tipo(scope): descripción` en inglés, en imperativo, en minúscula, sin punto y de ≤ 72 caracteres.
  - Tipos: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`. Cambios incompatibles con `!` o con el footer `BREAKING CHANGE:`.
  - Scopes: `domain`, `application`, `infra`, `sources`, `db`, `api`, `cli`, `notifications`, `web`, `ui`, `pwa`, `ci`, `deps`, `docs`, `adr`.
  - Un commit = un cambio lógico.
  - **Sin coautoría de Claude:** los commits y PRs no llevan `Co-Authored-By: Claude…`, ni "Generated with Claude Code", ni ninguna otra atribución a la IA. El único autor es el usuario.
- La calidad la garantizan las herramientas: pre-commit (formato y lint con autocorrección) y CI en cada push. Nada de ceremonia manual.
- ADRs solo para decisiones que cambian la arquitectura o el stack.
- Código, nombres y commits en inglés; documentación en español.
