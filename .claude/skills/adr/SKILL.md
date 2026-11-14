---
name: adr
description: Registra una decisión de arquitectura o tecnología de depazo como ADR en docs/adr/. Usar cuando se elige o cambia una tecnología, librería, servicio, patrón o práctica del proyecto, o cuando el usuario dice "documenta esta decisión".
---

# Registrar una decisión (ADR)

1. Lista `docs/adr/` y toma el siguiente número libre, con cuatro dígitos (`0008`, `0009`…).
2. Copia `docs/adr/template.md` a `docs/adr/NNNN-titulo-en-kebab-case.md`.
3. Complétalo en español, en no más de unas 30 líneas: contexto, decisión, alternativas y consecuencias. Fecha de hoy en formato ISO.
4. Si la decisión reemplaza a otra, cambia el estado de la antigua a `Reemplazada por NNNN` sin borrar su contenido.
5. Actualiza lo que haya quedado desactualizado:
   - `docs/architecture.md` si cambia un componente, el pipeline o el modelo de datos.
   - La sección **Stack** o **Convenciones** de `CLAUDE.md` si cambia algo que se usa en el día a día.
6. Commit con el formato `docs(adr): NNNN título`.

Si la decisión no está tomada todavía, usa el estado `Propuesta` y deja anotadas las preguntas abiertas en Consecuencias.
