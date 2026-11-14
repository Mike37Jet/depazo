# 0003. Backend FastAPI como monolito modular hexagonal

- **Estado:** Reemplazada por 0008 (organización interna; FastAPI y monolito modular siguen vigentes)
- **Fecha:** 2026-11-13

## Contexto
La API y la ingesta comparten el dominio (propiedades, puntaje). Los portales cambian con frecuencia y no deben contaminar la lógica de negocio.

## Decisión
Un único paquete Python `depazo` con dos entrypoints (API **FastAPI** y CLI `depazo ingest` con **Typer**). Organización por puertos y adaptadores:
`domain/` (puro) · `sources/` (un adaptador por portal) · `db/` (SQLAlchemy 2 async + Alembic) · `notifications/` · `api/` · `pipeline/`.

## Alternativas consideradas
- **Microservicios:** sobrecarga operativa sin beneficio a esta escala.
- **Django:** demasiado peso; el admin y el ORM acoplado no aportan aquí.

## Consecuencias
`domain/` se puede testear sin infraestructura. Si un portal se rompe, solo se rompe su adaptador. Se necesita disciplina en las dependencias, verificada con `import-linter` en CI.
