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
| [docs/security.md](docs/security.md) | Modelo de amenazas, OWASP Top 10:2025, secretos, privacidad |
| [docs/portals.md](docs/portals.md) | Verificación legal y técnica de cada portal |
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
| Extensión (captura asistida) | Chrome MV3, TypeScript strict, esbuild, Zod (`zod/mini`), Biome, Vitest + happy-dom |
| Datos / Auth | Supabase: Postgres + PostGIS, Supabase Auth (la API valida el JWT) |
| Notificaciones | Web Push (VAPID, pywebpush), email con Resend |
| Infra (free tiers) | Cloudflare Pages (web), Cloud Run (API), Sentry · sin CI ni cron en GitHub Actions (ADR 0017) |

## Estructura (prevista)

```
backend/src/depazo/
  domain/                     entidades, value objects, puntaje, dedupe (puro)
  application/{use_cases,ports,dto}/
  infrastructure/{sources/<portal>,persistence,notifications,geocoding}/
  presentation/{api,cli}/
  bootstrap.py                composition root
backend/migrations/           Alembic (versions/)
backend/tests/{unit,integration,fixtures/<portal>}/
frontend/src/
  components/{atoms,molecules,organisms,templates}/
  pages/  routes/  hooks/  api/ (generado, no editar)
frontend/e2e/
extension/src/{capture,sources/<portal>,content,popup}/   public/ (manifest, popup.html)
extension/tests/{sources,capture,contract,fixtures}/
docs/  .github/workflows/
```

## Comandos

Backend (desde `backend/`):

| Acción | Comando |
|---|---|
| Instalar | `uv sync` |
| Tests | `uv run pytest` (`tests/unit`, `tests/integration`) |
| Lint y formato | `uv run ruff check --fix` · `uv run ruff format` |
| Tipos | `uv run mypy src tests` |
| Migraciones | `uv run alembic upgrade head` (lee `DEPAZO_DATABASE_URL`) |
| Ingesta | `uv run depazo ingest --source icasas --pages 1 [--output json] [--save] [--alert-profile <perfil.json>]` |
| Alertas por email | `--alert-profile` (requiere `--save`) envía un resumen con los anuncios nuevos o con precio nuevo que superan el umbral. Variables: `RESEND_API_KEY`, `DEPAZO_ALERT_EMAIL` y, opcional, `DEPAZO_ALERT_FROM` |
| Importar captura | `uv run depazo import <archivo.json> [--save]` |
| Ingesta programada | LaunchAgent `com.depazo.ingest` cada 3 h → `scripts/scheduled_ingest.sh` desde el clon `~/.local/share/depazo/app` (ADR 0018). Config en `~/.config/depazo/{env,profile.json}`, log en `~/Library/Logs/depazo/ingest.log`. Ejecutar ya: `launchctl kickstart gui/$(id -u)/com.depazo.ingest` |
| Ranking | `uv run depazo match --profile <perfil.json> [--limit 20] [--output json]` (ejemplo en `docs/examples/search_profile.json`) |
| API | `uv run uvicorn depazo.bootstrap:create_api_app --factory` · endpoints `GET /health`, `GET`/`PUT /me/search-profile`, `GET /me/matches?limit=`, `GET /neighborhoods`. Variables: `DEPAZO_DATABASE_URL`, `DEPAZO_SUPABASE_URL` (origen https del proyecto), opcionales `DEPAZO_CORS_ORIGINS` (JSON), `DEPAZO_REQUESTS_PER_MINUTE` (60) y `DEPAZO_IS_OPENAPI_PUBLISHED` (`false`; `true` solo fuera de producción) |

Extensión (desde `extension/`): `pnpm install`, `pnpm test`, `pnpm typecheck`, `pnpm lint`, `pnpm build` (genera `dist/`, que se carga en `chrome://extensions` → "Cargar descomprimida").

Frontend (desde `frontend/`): `pnpm install`, `pnpm dev` (proxy `/api` → `localhost:8000`, o `DEPAZO_API_PROXY_TARGET`), `pnpm test`, `pnpm typecheck`, `pnpm lint`, `pnpm build`, `pnpm storybook`, `pnpm gen:api` (regenera `src/api/schema.ts` desde `depazo openapi`; corre openapi-typescript con `pnpm dlx` porque necesita TypeScript 5). Variables en `frontend/.env.local` (ver `.env.example`): `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` (pública) y `VITE_API_URL`. Pendiente: `pnpm e2e`.

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

## Seguridad (no negociable)

Detalle en `docs/security.md`.
- **Autorización en cada caso de uso:** toda consulta filtra por el `user_id` del token. RLS deny-by-default en Postgres como segunda barrera. Cada endpoint lleva un test que demuestra que el usuario B no puede acceder a lo del usuario A.
- **JWT de Supabase validado** (firma JWKS, `aud`, `iss`, `exp`). La clave de servicio de Supabase y los demás secretos viven **solo en el backend**; nunca en `VITE_*` ni en el código.
- **El contenido de los portales no es confiable:** se guarda como texto plano y nunca se renderiza como HTML (prohibido `dangerouslySetInnerHTML`). Los scrapers solo se conectan a los hosts de su allowlist (anti-SSRF).
- SQL solo a través del ORM o con parámetros; nada de `eval` ni `subprocess` con datos externos.
- Errores genéricos al cliente, sin trazas. Logs sin tokens, emails ni zonas.
- Pydantic con `extra="forbid"` y límites en todos los inputs; rate limiting en la API.
- El service worker no cachea respuestas autenticadas.
- Antes de cambios grandes en auth, API o ingesta, correr la skill `/security-review`.

## Fuentes de datos y scraping (ADR 0016)

Proyecto personal y experimental, sin fines comerciales.
- **Automático (scraper):** sitios públicos sin protección técnica (iCasas, BienesOnline, arriendos.ec), **aunque sus términos lo prohíban**. Siempre con frecuencia baja, respetando `robots.txt` y con un User-Agent identificable. Si un sitio empieza a bloquear, el adaptador se detiene; no se escala.
- **Asistido (extensión de navegador):** Plusvalía y Facebook Marketplace. El usuario navega con su propia sesión y la extensión captura los anuncios que él ve. No hay bots en esos sitios.
- **Properati no se captura:** publica el mismo inventario que iCasas (Lifull Connect), que ya entra por el scraper.
- **Oficial (API):** Mercado Libre, cuando se registre la app.
- No se guardan datos personales de los anunciantes (nombre, teléfono, email, nombre de agente): solo la URL del anuncio (LOPDP Ecuador). Los fixtures de tests se anonimizan. Los usuarios pueden exportar sus datos y borrar su cuenta.

## Flujo de trabajo (simple)

- **Directo a `main`** para cambios normales. Una rama + PR solo para cambios grandes o riesgosos.
- **Conventional Commits 1.0.0**, validados por un hook: `tipo(scope): descripción` en inglés, en imperativo, en minúscula, sin punto y de ≤ 72 caracteres.
  - Tipos: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`. Cambios incompatibles con `!` o con el footer `BREAKING CHANGE:`.
  - Scopes: `domain`, `application`, `infra`, `sources`, `db`, `api`, `cli`, `notifications`, `web`, `ui`, `pwa`, `ci`, `deps`, `docs`, `adr`.
  - Un commit = un cambio lógico.
  - **Sin coautoría de Claude:** los commits y PRs no llevan `Co-Authored-By: Claude…`, ni "Generated with Claude Code", ni ninguna otra atribución a la IA. El único autor es el usuario.
- Sin CI (ADR 0017): `scripts/verify.sh` corre lint, formato, tipos, tests y build de `backend/` y `extension/`, y el hook `pre-push` lo ejecuta antes de cada push. Tras clonar: `git config core.hooksPath .githooks`. Los tests de persistencia necesitan Docker.
- ADRs solo para decisiones que cambian la arquitectura o el stack.
- Código, nombres y commits en inglés; documentación en español.
