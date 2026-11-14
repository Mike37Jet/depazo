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
| **Extensión asistida** | Plusvalía (prioridad), Facebook Marketplace | Extensión de navegador: el usuario navega con su propia sesión y la extensión envía a su cuenta los anuncios que está viendo. Sin bots ni cuentas automatizadas |
| **API oficial** | Mercado Libre | App registrada con OAuth, cuando el dueño cree la cuenta de desarrollador |

## Alternativas consideradas
- **Solo fuentes que permiten el scraping:** volumen insuficiente.
- **Solo organizador manual (pegar enlaces):** se mantiene como respaldo, pero la extensión ofrece la misma cobertura con menos fricción.

## Consecuencias
Búsqueda automática real desde el día 1 con iCasas (unos 550 departamentos en Quito) y cobertura de los portales grandes a través de la extensión. Si iCasas cambia su HTML, solo se rompe su adaptador (con fixtures y tests). Queda un riesgo contractual con los sitios scrapeados, aceptado por ser un proyecto no comercial.

## Actualización 2026-11-14
Properati sale de la extensión. Properati Ecuador e iCasas son de Lifull Connect y publican el mismo inventario: los 30 anuncios de la primera página de Properati en Quito estaban en iCasas con el mismo identificador, y ambos portales muestran 553 departamentos. iCasas ya entra por el scraper, así que capturar Properati solo produciría duplicados.

## Actualización 2026-11-14 (ADR 0020)
Facebook Marketplace pasa a tener además un scraper automático sin sesión, que es la única fuente que no consulta `robots.txt`. El detalle y el porqué están en el [ADR 0020](0020-marketplace-por-scraper-sin-sesion.md). Plusvalía sigue solo por la extensión.

## Actualización 2026-11-14 (ADR 0021)
Plusvalía deja de depender de que el dueño navegue: la extensión recarga por su cuenta una pestaña fijada cada 20 minutos, de 07:00 a 22:00, y entrega los anuncios a un host local en la Mac. Es automatización dentro del navegador del dueño, así que "sin bots" ya no describe a Plusvalía tal cual; sigue sin haber clientes automatizados fuera del navegador y sin evadir protecciones. La URL que recarga usa `?sort=`, que el `robots.txt` de Plusvalía prohíbe a los rastreadores, así que la frase "única fuente que no consulta `robots.txt`" de la nota anterior vale solo para los scrapers. El detalle, los costos y la regla de parada están en el [ADR 0021](0021-vigilancia-de-plusvalia-desde-la-extension.md).
