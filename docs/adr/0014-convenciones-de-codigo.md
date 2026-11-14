# 0014. Convenciones de código: escalabilidad, cero comentarios y nombres

- **Estado:** Aceptada
- **Fecha:** 2026-11-13

## Contexto
Se busca un proyecto escalable en todos sus aspectos, con código que se explique solo y un historial legible.

## Decisión
- **Cero comentarios en el código** (tampoco docstrings ni código comentado). La intención se expresa con nombres, funciones pequeñas, tipos y tests. Únicas excepciones: directivas que exige una herramienta (`# noqa: XXX`, `# type: ignore[code]`, `// biome-ignore …`) y código de terceros incluido en el repo (`.claude/skills/ui-ux-pro-max`). Se verifica en CI.
- **Nombres:** PEP 8 en Python, la guía de estilo de TypeScript de Google en TS, y los principios de *Clean Code* (nombres que revelan intención, sin abreviaturas, sin prefijo `I` en interfaces). Todo el código en inglés.
- **Conventional Commits 1.0.0** con scopes por capa.
- **Escalabilidad por diseño:** Clean Architecture, servicios sin estado, jobs idempotentes, cada portal como un adaptador nuevo y configuración 12-factor; siempre equilibrado con YAGNI.

Detalle: `docs/conventions.md`.

## Alternativas consideradas
- **Comentarios solo para explicar el "por qué":** es la práctica más común, pero se eligió cero comentarios a propósito; el "por qué" de las decisiones vive en los ADRs y en los mensajes de commit.

## Consecuencias
Más exigencia con los nombres. Cuando el código no se entiende sin un comentario, se refactoriza o se extrae una función con un nombre claro.
