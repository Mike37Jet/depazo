# Convenciones de código

> Decisión: [ADR 0014](adr/0014-convenciones-de-codigo.md). Fuentes: PEP 8, Google TypeScript Style Guide, Conventional Commits 1.0.0 y *Clean Code* (R. C. Martin).

## 1. Escalable en todos los aspectos

| Aspecto | Cómo se logra |
|---|---|
| **Código** | Clean Architecture (backend) y Atomic Design (frontend); módulos con una sola responsabilidad; SOLID; dependencias hacia adentro |
| **Fuentes de datos** | Agregar un portal es crear un adaptador nuevo en `infrastructure/sources/`, sin tocar el dominio (abierto/cerrado) |
| **Datos** | Índices para cada consulta frecuente (GIST en ubicación y zona); retención de anuncios dados de baja; migraciones versionadas |
| **Procesamiento** | Jobs **idempotentes** (re-ejecutar no duplica nada); ingesta por portal en paralelo; se puede pasar a una cola cuando el volumen lo pida |
| **Infraestructura** | API sin estado (escala horizontal en Cloud Run); configuración 12-factor por variables de entorno; contenedores Docker |
| **Frontend** | Code splitting por ruta; lazy loading de imágenes y del mapa; presupuesto de rendimiento (LCP < 2.5 s en 4G) |
| **Equipo** | Convenciones automáticas (linters y hooks); ADRs; tests como documentación viva |

**Equilibrio con YAGNI:** el proyecto está preparado para escalar sin estar sobre-construido. Una abstracción se crea cuando hay un segundo caso real, no antes. También se aplican KISS y DRY, este último sin forzar abstracciones prematuras.

## 2. Cero comentarios

- **No se escriben comentarios en el código**: ni explicativos, ni docstrings, ni JSDoc, ni código comentado, ni `TODO`. Esto vale para Python, TS, CSS, SQL y archivos de configuración (YAML, TOML).
- El **qué** se expresa con nombres y funciones pequeñas; el **cómo**, con código simple; el **por qué**, en ADRs y mensajes de commit; los **ejemplos de uso**, en los tests.
- Los pendientes van a Issues de GitHub, no a `TODO` en el código.
- **Excepciones:**
  - Directivas que exige una herramienta, siempre con el código de la regla: `# noqa: E501`, `# type: ignore[arg-type]`, `// biome-ignore lint/…: <motivo>`.
  - El shebang.
  - El código de terceros incluido en el repo (`.claude/skills/ui-ux-pro-max/`).
- **Si dan ganas de comentar**, se extrae una función o variable con un nombre que diga lo mismo:

```python
if listing.price + listing.condo_fee <= profile.max_budget and listing.location.within(profile.zone):
```
→
```python
if profile.accepts(listing):
```

- Lo verifica un script en CI (`scripts/check_no_comments`).
- La guía de Google pide comentar los `catch` vacíos y los type assertions, así que **ninguno de los dos se permite**: los errores se manejan de forma explícita y los tipos se validan (Zod o Pydantic).

## 3. Nombres

### 3.1 Principios (Clean Code)
- **Revelan intención:** `days_since_published`, no `d`, `data` ni `tmp`.
- **Sin abreviaturas ni ruido:** `listing_repository`, no `lst_repo`; sin `Manager`, `Helper`, `Util`, `Data` ni `Info`.
- **Clases y tipos = sustantivos** (`Listing`, `ScoreBreakdown`). **Funciones y métodos = verbos** (`calculate_score`, `fetchMatches`).
- **Booleanos como pregunta:** `is_active`, `has_parking`, `can_notify`, `should_retry`.
- **Casos de uso = verbo + sustantivo:** `IngestListings`, `EvaluateMatches`, `CreateSearchProfile`.
- **Puertos por su rol, sin prefijo `I`:** `ListingRepository`; las implementaciones se nombran por su tecnología: `SqlAlchemyListingRepository`, `InMemoryListingRepository`.
- **Siglas como palabras** en camelCase y PascalCase: `loadHttpUrl`, `customerId`, `ApiClient`.
- **Nombres cortos** solo para variables cuyo alcance cabe en unas pocas líneas (`i`, `x`). Nunca `l`, `O` ni `I`.

### 3.2 Python (PEP 8)

| Elemento | Estilo | Ejemplo |
|---|---|---|
| Paquetes y módulos | `snake_case` corto | `search_profile.py` |
| Clases, excepciones, Protocols | `PascalCase` | `SearchProfile`, `ListingNotFoundError`, `Notifier` |
| Excepciones | sufijo `Error` | `PortalUnavailableError` |
| Funciones, métodos, variables | `snake_case` | `calculate_score`, `max_budget` |
| Constantes de módulo | `UPPER_SNAKE_CASE` | `DEFAULT_SCORE_THRESHOLD` |
| No públicos | `_prefijo` | `_normalize_price` |
| Type vars | `PascalCase` corto | `T`, `ListingT` |

### 3.3 TypeScript (Google TS Style Guide)

| Elemento | Estilo | Ejemplo |
|---|---|---|
| Clases, interfaces, types, enums, componentes | `PascalCase` | `ListingCard`, `SearchProfile` |
| Variables, funciones, métodos, props | `camelCase` | `formatPrice`, `isFavorite` |
| Constantes globales y valores de enum | `CONSTANT_CASE` | `MAX_ZONE_POINTS` |
| Hooks | `use` + sustantivo | `useMatches`, `useSearchProfile` |
| Handlers / props de eventos | `handle*` / `on*` | `handleDiscard`, `onDiscard` |
| Interfaces | **sin** prefijo `I` | `ListingSource`, no `IListingSource` |
| Privados | `private` de TS, sin `_` ni `#` | `private readonly client` |

### 3.4 Archivos, datos y otros

| Elemento | Estilo | Ejemplo |
|---|---|---|
| Componentes React | `PascalCase.tsx` | `ListingCard.tsx`, `ListingCard.test.tsx` |
| Otros módulos TS | `kebab-case.ts` | `format-price.ts` |
| Tablas y columnas de la DB | `snake_case`; tablas en plural | `search_profiles.max_budget` |
| Variables de entorno | `UPPER_SNAKE_CASE` con prefijo | `DEPAZO_DATABASE_URL`, `VITE_API_URL` |
| Endpoints REST | `kebab-case`, plural | `/search-profiles/{id}/matches` |
| Ramas | `tipo/descripcion-corta` | `feat/plusvalia-adapter` |

### 3.5 Glosario dominio → código

El código está en inglés y la interfaz en español.

| Negocio | Código |
|---|---|
| Anuncio | `Listing` |
| Inmueble (deduplicado) | `Property` |
| Perfil de búsqueda | `SearchProfile` |
| Coincidencia | `Match` |
| Alícuota | `condo_fee` / `condoFee` |
| Sector / barrio | `neighborhood` |
| Parqueadero | `parking` |
| Portal | `source` |
| Arriendo mensual | `monthly_rent` |

## 4. Commits: Conventional Commits 1.0.0

```
<tipo>(<scope>)!: <descripción>

[cuerpo opcional: el porqué del cambio]

[footer opcional: BREAKING CHANGE: …, Refs #12]
```

- **Tipos:**
  - `feat` (nueva funcionalidad → versión MINOR)
  - `fix` (corrección de bug → PATCH)
  - `docs`
  - `style` (formato, sin cambiar lógica)
  - `refactor`
  - `perf`
  - `test`
  - `build` (dependencias, empaquetado)
  - `ci`
  - `chore`
  - `revert`
- **Cambios incompatibles:** `!` antes de los dos puntos o el footer `BREAKING CHANGE:` → MAJOR.
- **Scopes de depazo:** `domain`, `application`, `infra`, `sources`, `db`, `api`, `cli`, `notifications`, `web`, `ui`, `pwa`, `ci`, `deps`, `docs`, `adr`.
- **Descripción** en inglés, en imperativo, en minúscula, sin punto final y de ≤ 72 caracteres: `feat(sources): add mercado libre adapter`.
- **Un commit = un cambio lógico.** No se mezclan un refactor y un feature.
- **Sin atribución a la IA:** ningún commit ni PR lleva `Co-Authored-By: Claude…`, "Generated with Claude Code" ni nada similar. El autor es el dueño del repositorio.
- Lo valida un hook `commit-msg` (commitlint con `config-conventional`).
