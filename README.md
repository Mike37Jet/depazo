# depazo

PWA que automatiza la búsqueda de departamentos en arriendo en Quito, Ecuador. Recopila anuncios de varios portales inmobiliarios, calcula qué tan compatible es cada uno con tus preferencias (presupuesto, zona, habitaciones, características) y te avisa cuando aparece una buena oportunidad.

> Estado: primeros colectores funcionando (scraper de iCasas y extensión de captura para Plusvalía); API, base de datos y PWA por construir.

## Documentación

- [Arquitectura](docs/architecture.md)
- [Decisiones de arquitectura (ADRs)](docs/adr/)
- [Convenciones de código](docs/conventions.md)
- [Estrategia de pruebas](docs/testing.md)
- [Guía de UX/UI](docs/ux-guidelines.md) · [Sistema de diseño](docs/design-system.md)
- [Seguridad y privacidad](docs/security.md) · [Reportar una vulnerabilidad](SECURITY.md)

## Stack

PWA con React + TypeScript · API con FastAPI (Python) · Supabase (Postgres + PostGIS + Auth) · GitHub Actions · Cloudflare Pages · Cloud Run.

## Fuentes de datos

Proyecto personal y experimental, sin fines comerciales ([ADR 0016](docs/adr/0016-fuentes-de-datos.md)):

- **Scraper** para sitios públicos sin protección técnica (iCasas), con baja frecuencia, `robots.txt` respetado y un User-Agent identificable. Si un sitio bloquea, el colector se detiene.
- **Extensión de navegador** para Plusvalía y Facebook Marketplace: guarda los anuncios que tú ves mientras navegas con tu propia sesión. No hay bots en esos sitios.
- Nunca se evaden protecciones técnicas ni se guardan datos personales de los anunciantes.

## Probar la extensión

```bash
cd extension && pnpm install && pnpm build
```

1. Abre `chrome://extensions`, activa el modo desarrollador y elige **Cargar descomprimida** → `extension/dist`.
2. Navega por los resultados de arriendo de Plusvalía o de [Marketplace](https://www.facebook.com/marketplace/quito/propertyrentals) en Quito; los anuncios se guardan solos.
3. Abre la extensión, pulsa **Exportar JSON** e impórtalo:

```bash
cd backend && uv run depazo import ~/Downloads/depazo-captura-AAAA-MM-DD.json
```
