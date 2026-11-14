# Verificación de portales (Quito)

> Actualización 2026-11-13: con un navegador normal, Plusvalía carga sin desafío; el bloqueo de Cloudflare afecta solo a clientes automatizados. La extensión lee las tarjetas por sus atributos `data-qa` (`posting PROPERTY`, `POSTING_CARD_PRICE`, `expensas`, `POSTING_CARD_FEATURES`, `POSTING_CARD_LOCATION`). La paginación es del lado del cliente, por eso la extensión observa cambios del DOM.

> Facebook Marketplace (2026-11-13): la categoría `propertyrentals` de Quito se ve sin iniciar sesión. Las clases están ofuscadas, así que la extensión se guía por la estructura: enlace `/marketplace/item/<id>` y tres textos (precio, título, lugar). Habitaciones, baños y m² solo aparecen en el título. Hay mucho ruido (ventas de US$220.000, cuartos de US$10, "Gratis"): el caso de uso descarta los arriendos fuera de 100–20.000 USD. Las imágenes son URLs firmadas del CDN de Facebook y caducan.

> Fecha: 2026-11-13. Decisión: [ADR 0016](adr/0016-fuentes-de-datos.md) (aceptada): scraper para iCasas, BienesOnline y arriendos.ec; extensión asistida para Plusvalía, Marketplace y Properati; API para Mercado Libre.
> Método: una petición por recurso (`robots.txt`, términos de uso, una página de listado), con un User-Agent identificable, sin evadir ninguna protección.

## 1. Resultado por portal

| Portal | Acceso automatizado | `robots.txt` | Términos de uso | Volumen en Quito | Veredicto |
|---|---|---|---|---|---|
| **Plusvalía** (líder) | ❌ **Cloudflare `cf-mitigated: challenge`** en todas las páginas (incluidos los términos) | Permite fichas; paginación limitada a 5 páginas; prohíbe `/avisos-api/` | No se pudieron leer (bloqueado) | Alto | **Descartado**: bloquea activamente |
| **Properati** | ❌ 403 incluso en `robots.txt` | No accesible | — | ~572 departamentos | **Descartado** |
| **Vive1** | ❌ Desafío Cloudflare ("Just a moment…") | No accesible | — | — | **Descartado** |
| **Mitula** | ❌ 401 | No accesible | — | ~551 (es un agregador de otros portales) | **Descartado** |
| **OLX Ecuador** | ❌ El dominio no tiene sitio web (solo correo) | — | — | — | **Cerrado** |
| **iCasas** (Lifull Connect) | ✅ 200 | Permite listados; prohíbe filtros (`/*/f_*`) y búsquedas personalizadas | ❌ Su aviso legal prohíbe "reproducir, compilar, copiar, **extraer**" el contenido | ~550 | **Descartado por términos** |
| **Arrienda y Vende** | ✅ 200 | Permisivo (WordPress) | ❌ Prohíbe usar "cualquier máquina, software, herramienta" para navegar el sitio | Bajo | **Descartado por términos** |
| **BienesOnline** | ✅ 301 → migró a `bienesonline.ai` | Permisivo | ⚠️ La página de términos da 404 tras la migración | Desconocido | **Dudoso**: solo con permiso escrito |
| **arriendos.ec** | ✅ 200 | Permite todo salvo `/api/` y paginación profunda | ⚠️ No publica términos (solo privacidad y cookies) | **~12 de 72** propiedades en todo el país; el precio no viene en el HTML estático | **Viable pero marginal**: tiene un feed RSS público (`/feed/properties`) |
| **Mercado Libre** | ⚠️ La API oficial devuelve **403 sin token OAuth**; el sitio web no es opción (sus términos y `robots.txt` lo restringen, y bloquea explícitamente a los bots de IA) | `api.mercadolibre.com`: `Disallow: /` para crawlers (la API se usa con una app registrada) | API sujeta a los términos de desarrollador | Medio | **Por probar**: hay que registrar una app y comprobar si la búsqueda funciona para terceros. Hay reportes no oficiales de que se restringió en 2025 |

## 2. Conclusión

**El modelo "scraping de varios portales" no es viable en Quito con nuestras reglas** (respetar los términos y no evadir protecciones):
- Los cinco portales con más volumen bloquean el acceso o lo prohíben en sus términos.
- Las fuentes permitidas tienen muy poco volumen (arriendos.ec) o una situación legal incierta (BienesOnline).
- La única fuente oficial con volumen real es **Mercado Libre**, y su acceso para búsquedas está **sin confirmar**.

## 3. Caminos posibles

| Opción | Cómo funciona | A favor | En contra |
|---|---|---|---|
| **A. API de Mercado Libre** | App registrada con OAuth; búsqueda de departamentos en alquiler en Quito | Oficial y legal; datos estructurados | Hay que verificar si la búsqueda está abierta a terceros; depende de un solo proveedor |
| **B. Acuerdos con portales** | Pedir un feed o una API a Plusvalía (Navent), Properati o iCasas (Lifull Connect), o a inmobiliarias de Quito | Volumen real; legal | Depende de negociar; es lento; puede tener costo |
| **C. depazo como organizador personal** | El usuario **comparte** un anuncio desde cualquier portal hacia depazo (Web Share Target de la PWA o pegando el enlace), confirma los datos clave y depazo puntúa, compara, organiza y recuerda | 100 % legal; funciona con **todos** los portales; aporta valor desde el primer día | La búsqueda deja de ser automática: el usuario sigue encontrando los anuncios |
| **D. Oferta directa** | Inmobiliarias y dueños publican en depazo (o envían un feed) | Datos propios y de calidad | Problema del huevo y la gallina: sin usuarios no hay oferta |

**Recomendación:** un enfoque **híbrido**. Empezar por **C** (valor inmediato y sin riesgo legal), sumar **A** si la prueba con Mercado Libre funciona, y abrir **B** y **D** a medida que haya usuarios. El motor de puntaje, la arquitectura (cada fuente es un adaptador de `ListingSource`) y las notificaciones siguen sirviendo tal cual.

## 4. Fuentes consultadas

- `robots.txt` de cada dominio (descargados el 2026-11-13).
- Aviso legal de Lifull Connect (iCasas): https://www.lifullconnect.com/aviso-legal-direct/
- Términos de Arrienda y Vende: https://arriendayvende.com/terminos-y-condiciones/
- Feed de arriendos.ec: https://arriendos.ec/feed/properties
- Documentación de Mercado Libre (búsquedas e ítems): https://developers.mercadolibre.com.ar/items-y-busquedas
- Volúmenes de referencia: https://www.properati.com.ec/s/quito/departamento/alquiler · https://www.icasas.ec/arriendo/departamentos/quito · https://casas.mitula.ec/casas/arriendo-departamentos-quito
