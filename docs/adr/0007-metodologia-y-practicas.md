# 0007. Metodología y buenas prácticas

- **Estado:** Reemplazada por 0012
- **Fecha:** 2026-11-13

## Contexto
Un solo desarrollador trabajando con Claude Code, en un repo público que debe verse profesional y mantenerse fácil.

## Decisión
- **Kanban personal** en GitHub Projects (Backlog → Ready → In progress → Review → Done), con issues pequeños y un límite de WIP de 2.
- **Trunk-based development:** `main` siempre desplegable; ramas cortas `feat/…`, `fix/…`; PR obligatorio aunque se trabaje solo (para pasar CI y revisión con Claude). Merge con squash.
- **Conventional Commits** + **release-please** para el changelog y SemVer.
- **TDD** en `domain/` (puntaje, dedupe) y en los parsers (con fixtures).
- **Calidad automática:** pre-commit; Ruff (lint y formato) y mypy strict en Python; Biome y `tsc --noEmit` en TS; pytest y Vitest; Playwright E2E en los flujos críticos.
- **CI en cada PR:** lint, tipos, tests y build. Dependabot semanal. Ningún secreto en el repo: GitHub Secrets y `.env` local.
- **Configuración 12-factor**, logs estructurados (structlog en JSON) y Sentry para errores.
- **ADRs** para cada decisión relevante (este directorio).

## Consecuencias
Algo de ceremonia extra (PRs, ADRs) a cambio de un historial claro y de un repo que sirve como portafolio.
