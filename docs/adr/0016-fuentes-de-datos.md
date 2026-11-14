# 0016. Fuentes de datos de anuncios

- **Estado:** Aceptada
- **Fecha:** 2026-11-13

## Contexto
La verificación de portales (`docs/portals.md`) mostró que Plusvalía, Properati, Vive1 y Mitula bloquean el acceso automatizado (Cloudflare o 403), que iCasas y Arrienda y Vende lo prohíben en sus términos y que OLX Ecuador cerró. El dueño del proyecto aclaró que depazo es **personal y experimental, sin fines comerciales**, y que sin datos la app no tiene valor.

## Decisión
Tres vías, todas convergiendo en el mismo pipeline (cada una es un adaptador de `ListingSource`):

| Vía | Fuentes | Cómo |
|---|---|---|
| **Scraper automático** | iCasas (primero), BienesOnline, arriendos.ec | Páginas públicas sin protección técnica, **aunque sus términos lo prohíban** (riesgo contractual asumido por el dueño). Frecuencia baja, respetando `robots.txt`, con un User-Agent identificable. Si un sitio bloquea, el adaptador se detiene |
| **Extensión asistida** | Plusvalía (prioridad), Facebook Marketplace, Properati | Extensión de navegador: el usuario navega con su propia sesión y la extensión envía a su cuenta los anuncios que está viendo. Sin bots ni cuentas automatizadas |
| **API oficial** | Mercado Libre | App registrada con OAuth, cuando el dueño cree la cuenta de desarrollador |

## Alternativas consideradas
- **Solo fuentes que permiten el scraping:** volumen insuficiente.
- **Solo organizador manual (pegar enlaces):** se mantiene como respaldo, pero la extensión ofrece la misma cobertura con menos fricción.

## Consecuencias
Búsqueda automática real desde el día 1 con iCasas (unos 550 departamentos en Quito) y cobertura de los portales grandes a través de la extensión. Si iCasas cambia su HTML, solo se rompe su adaptador (con fixtures y tests). Queda un riesgo contractual con los sitios scrapeados, aceptado por ser un proyecto no comercial.
