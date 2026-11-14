# 0008. Clean Architecture en el backend

- **Estado:** Aceptada
- **Fecha:** 2026-11-13
- **Reemplaza a:** 0003, solo en la organización interna. FastAPI y el monolito modular se mantienen.

## Contexto
La lógica de negocio (puntaje, deduplicación, reglas de notificación) es el corazón del producto y debe sobrevivir a cambios de portales, de base de datos o de framework web. Se quiere una estructura reconocible y profesional.

## Decisión
Aplicar **Clean Architecture** (Robert C. Martin, 2012/2017) con la **regla de dependencia**: el código solo depende hacia adentro.

| Círculo (Martin) | Capa en `depazo` | Contenido |
|---|---|---|
| Entities | `domain/` | Entidades y value objects (`Listing`, `Property`, `SearchProfile`, `Match`, `Money`, `Location`), servicios de dominio puros (puntaje, dedupe), errores de dominio |
| Use Cases | `application/` | Casos de uso (`IngestListings`, `EvaluateMatches`, `CreateSearchProfile`, `ListMatches`, `NotifyNewMatches`), **puertos** (`ListingSource`, `ListingRepository`, `Notifier`, `Geocoder`, `Clock`, `UnitOfWork`) y DTOs de entrada/salida |
| Interface Adapters | `presentation/` + `infrastructure/` | Controladores HTTP (FastAPI) y CLI (Typer); implementaciones de los puertos: portales, repositorios SQLAlchemy, Web Push, Resend, Nominatim |
| Frameworks & Drivers | (externos) | FastAPI, SQLAlchemy, httpx, Postgres, Supabase |

- Las entidades son `dataclasses` sin dependencias; Pydantic solo se usa en los bordes (schemas de la API, validación de parsers, config).
- Los modelos ORM están separados de las entidades; los repositorios hacen el mapeo.
- **Composition root** en `bootstrap.py`: es el único lugar que conoce las implementaciones concretas y las inyecta (DI manual + `Depends` de FastAPI).
- La regla de dependencia se verifica en CI con un contrato `layers` de **import-linter**.

## Alternativas consideradas
- **Hexagonal liviano (ADR 0003):** es compatible, pero no distingue explícitamente los casos de uso; la lógica tendía a quedar en el pipeline.
- **Capas tradicionales (routers → services → models):** acopla el dominio al ORM.

## Consecuencias
Más archivos y algo de mapeo repetitivo a cambio de un dominio testeable sin infraestructura. Estrategia de tests: `domain/` con tests unitarios, `application/` con *fakes* en memoria de los puertos, `infrastructure/` con tests de integración (Testcontainers: Postgres + PostGIS) y la API con tests end-to-end.

Referencias: R. C. Martin, *The Clean Architecture* (blog.cleancoder.com, 2012) y *Clean Architecture* (2017).
