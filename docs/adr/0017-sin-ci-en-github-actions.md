# 0017. Sin CI en GitHub Actions: verificación local

- **Estado:** Aceptada
- **Fecha:** 2026-11-14
- **Modifica a:** 0005, 0007, 0012

## Contexto
El primer workflow de CI (PR #2) nunca llegó a ejecutarse: GitHub no arrancó los jobs porque la cuenta del dueño quedó bloqueada por un problema de facturación. El dueño prefiere no depender de GitHub Actions para evitar más problemas de facturación.

## Decisión
No hay CI en GitHub Actions. Antes de cada push a `main` se corren en local las mismas verificaciones:
- `backend/`: `uv sync --locked`, `uv run ruff check`, `uv run ruff format --check`, `uv run mypy src tests`, `uv run pytest`.
- `extension/`: `pnpm install --frozen-lockfile`, `pnpm exec biome ci .`, `pnpm typecheck`, `pnpm test`, `pnpm build`.

Las menciones a "CI" en los demás documentos (import-linter, cliente TS generado, gitleaks, `pip-audit`, verificación de cero comentarios) pasan a ser pasos locales hasta que exista otra automatización.

## Alternativas consideradas
- **Resolver la facturación y mantener Actions:** el dueño no quiere depender de ella.
- **Otro proveedor de CI gratuito:** se puede retomar más adelante; hoy no se justifica para un solo desarrollador.

## Consecuencias
- Nada impide que llegue a `main` un cambio con tests rotos: la disciplina es local. Un hook `pre-push` que corra estas verificaciones lo automatizaría.
- **El cron de ingesta del ADR 0005 también depende de GitHub Actions**, así que queda sin ubicación. Opciones: Cloud Run Jobs + Cloud Scheduler (plan B del ADR 0005), un cron en una máquina propia o ejecutar `depazo ingest --save` a mano mientras no haya usuarios.
- Los tests de persistencia necesitan Docker en local. Sin Docker se saltan, así que conviene correrlos con Colima encendido.
