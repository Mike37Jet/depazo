# 0012. Flujo de trabajo simple: automatizar en lugar de ceremonia

- **Estado:** Aceptada
- **Fecha:** 2026-11-13
- **Reemplaza a:** 0007
- **Modificada por:** 0017 (sin CI en GitHub Actions)

## Contexto
Un solo desarrollador con Claude. El proceso de 0007 (PR obligatorio, Kanban con límite de WIP, release-please) agrega fricción sin beneficio a esta escala.

## Decisión
- **Directo a `main`** para cambios normales. Una rama + PR solo para cambios grandes o riesgosos que convenga revisar antes.
- **La calidad la garantizan las herramientas, no el proceso:** hooks de pre-commit (formato y lint con autocorrección, validación de Conventional Commits) y CI en cada push (lint, tipos, tests).
- **Conventional Commits** obligatorios, validados por un hook y escritos por Claude.
- **Issues de GitHub** como lista de pendientes, sin tablero ni reglas de WIP.
- **ADRs** solo para decisiones que cambian la arquitectura o el stack (las genera Claude con la skill `adr`).
- **Releases:** sin automatizar por ahora; se agrega release-please cuando haya un primer despliegue público.

## Alternativas consideradas
- **Mantener 0007:** demasiada ceremonia para una sola persona.
- **Sin CI ni hooks:** rápido al inicio, pero la calidad se degrada.

## Consecuencias
Menos pasos manuales. Si `main` se rompe, el CI lo marca de inmediato y se corrige con el siguiente commit. Si el equipo crece, se vuelve a exigir PR.
