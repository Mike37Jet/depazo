# 0020. Facebook Marketplace por scraper sin sesión, omitiendo robots.txt

- **Estado:** Aceptada
- **Fecha:** 2026-11-14
- **Modifica a:** 0016

## Contexto
El objetivo de depazo es avisar de un departamento en cuanto se publica. Con el ADR 0016, Marketplace solo entraba por la extensión asistida: la demora dependía de que el dueño navegara, exportara e importara a mano.

Una comprobación del 2026-11-14 mostró que:
- Las páginas públicas de Marketplace para Quito responden **sin sesión** desde la IP residencial del dueño, ordenadas por fecha de creación, con los anuncios en un JSON embebido en el HTML. Funciona con el User-Agent identificable de depazo; solo hacen falta las cabeceras de una navegación normal (`Accept`, `Sec-Fetch-*`).
- La búsqueda por palabra clave (`/marketplace/quito/search?query=…`) trae casi solo departamentos; la categoría `propertyrentals` mezcla locales, bodegas y oficinas.
- La vista sin sesión y la vista con la sesión del dueño son **muestras distintas** del inventario: de 24 anuncios de cada una, solo coincidían 5. Ninguna es un listado completo.
- `facebook.com/robots.txt` declara `User-agent: *` / `Disallow: /` y avisa de que la recolección automatizada requiere permiso escrito.

## Decisión
Marketplace pasa a tener un **adaptador automático** (`infrastructure/sources/marketplace/`) además de la extensión:
- Pide, sin sesión ni cookies, dos búsquedas (`departamento arriendo`, `suite arriendo`) y la categoría `propertyrentals`, todas ordenadas por más recientes, y une los resultados por identificador. Son **3 peticiones por ejecución**, con 10 s entre ellas.
- Es la **única fuente que no consulta `robots.txt`**: `PoliteHttpClient` acepta `should_respect_robots=False` y solo este adaptador lo usa. El resto de reglas se mantiene: User-Agent identificable, allowlist de hosts (`www.facebook.com`), sin seguir redirecciones a otros dominios, y detenerse ante 401, 403 o 429.
- Si una página no trae anuncios legibles (cambio de formato o muro de inicio de sesión), la ingesta falla con `SourceLayoutChangedError`. No se evade ninguna protección: sin sesión, sin proxies, sin navegadores disfrazados y sin resolver desafíos.
- Usa el mismo `source` (`marketplace`) e identificador que la extensión, así que lo capturado por ambas vías se deduplica.
- Se queda solo con departamentos, suites, lofts y estudios disponibles del Distrito Metropolitano de Quito. Los precios simbólicos (menos de USD 100) se guardan como arriendo desconocido.
- **Nunca lee el bloque del vendedor** y elimina los teléfonos escritos en el título (también los escritos con emojis).

Plusvalía no cambia: sigue bloqueando a los clientes automatizados y solo entra por la extensión.

## Alternativas consideradas
- **Sondeo desde la extensión, en el navegador del dueño:** no rompe `robots.txt`, pero necesita service worker, permisos nuevos y un endpoint de ingesta, solo funciona con Chrome abierto y, con sesión iniciada, pone en riesgo la cuenta. Queda como vía para Plusvalía.
- **Playwright con la sesión del dueño:** los proyectos que lo hacen sondean cada 30 minutos, requieren resolver verificaciones a mano y exponen la cuenta.
- **Servicios de pago (Apify, ScrapeCreators):** hacen la misma petición sin sesión por decenas de dólares al mes.
- **Alertas nativas de Marketplace:** no hay evidencia de que existan para arriendos en Ecuador ni de su demora.

## Consecuencias
- Marketplace entra en la ingesta programada sin intervención del dueño. La demora es la del intervalo de la ingesta; nadie ha medido todavía cuánto tarda un anuncio nuevo en aparecer en la vista sin sesión.
- depazo ignora una prohibición expresa de `robots.txt` y de los términos de Meta. Es un riesgo asumido por el dueño, en un proyecto personal y sin fines comerciales. El riesgo práctico es que Facebook bloquee la IP de casa o exija iniciar sesión; en ese caso el adaptador se detiene y no se escala.
- La cobertura es parcial: la vista sin sesión es una muestra. La extensión sigue siendo útil para lo que el dueño ve con su cuenta.
- Facebook cambia su HTML con frecuencia. El parser busca los anuncios por la forma del dato y no por la ruta dentro del JSON, y los fixtures están en `backend/tests/fixtures/marketplace/`.
- La excepción a `robots.txt` es de este adaptador. Cualquier otra fuente que la necesite requiere su propio ADR.
