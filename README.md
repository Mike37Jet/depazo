# depazo

PWA que automatiza la búsqueda de departamentos en arriendo en Quito, Ecuador. Recopila anuncios de varios portales inmobiliarios, calcula qué tan compatible es cada uno con tus preferencias (presupuesto, zona, habitaciones, características) y te avisa cuando aparece una buena oportunidad.

> Estado: diseño y arquitectura definidos; implementación por comenzar.

## Documentación

- [Arquitectura](docs/architecture.md)
- [Decisiones de arquitectura (ADRs)](docs/adr/)
- [Convenciones de código](docs/conventions.md)
- [Estrategia de pruebas](docs/testing.md)
- [Guía de UX/UI](docs/ux-guidelines.md) · [Sistema de diseño](docs/design-system.md)
- [Seguridad y privacidad](docs/security.md) · [Reportar una vulnerabilidad](SECURITY.md)

## Stack

PWA con React + TypeScript · API con FastAPI (Python) · Supabase (Postgres + PostGIS + Auth) · GitHub Actions · Cloudflare Pages · Cloud Run.

## Scraping responsable

depazo respeta `robots.txt` y los términos de uso de cada portal, limita la frecuencia de sus peticiones, prefiere las APIs oficiales y no guarda datos personales de los anunciantes.
