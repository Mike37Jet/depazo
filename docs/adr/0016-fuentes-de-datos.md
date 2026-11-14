# 0016. Fuentes de datos de anuncios

- **Estado:** Propuesta
- **Fecha:** 2026-11-13

## Contexto
La verificación de portales (`docs/portals.md`) mostró que los portales con más volumen en Quito bloquean el acceso automatizado (Plusvalía, Properati, Vive1 y Mitula, con Cloudflare o 403) o lo prohíben en sus términos (iCasas, Arrienda y Vende). OLX Ecuador cerró. Las fuentes permitidas tienen muy poco volumen (arriendos.ec). La API de Mercado Libre requiere OAuth y no se ha confirmado que permita búsquedas a terceros.

## Decisión propuesta
Enfoque híbrido, por etapas:
1. **MVP: depazo como organizador personal.** El usuario comparte un anuncio desde cualquier portal (Web Share Target de la PWA o pegando el enlace), confirma los datos clave, y depazo puntúa, compara y organiza.
2. **Mercado Libre por API oficial**, si la prueba con una app registrada confirma que la búsqueda funciona.
3. **Acuerdos de feed** con portales e inmobiliarias, y **oferta directa**, a medida que haya usuarios.

Se mantiene la regla: no se hace scraping de sitios que lo bloquean o lo prohíben.

## Alternativas consideradas
- **Scraping de los portales grandes evadiendo protecciones:** se descarta por razones legales y éticas, y porque contradice `docs/security.md`.
- **Solo arriendos.ec y BienesOnline:** volumen insuficiente para que el producto tenga valor.

## Consecuencias
Cambia la propuesta de valor: de "buscar por ti" a "decidir mejor y no perder ninguna oportunidad", con búsqueda automática donde sea legal. El motor de puntaje, la arquitectura de adaptadores y las notificaciones siguen sirviendo.

**Preguntas abiertas:** ¿se acepta el cambio de propuesta de valor? ¿Se registra una app de desarrollador en Mercado Libre para probar la API? ¿Se contacta a portales o inmobiliarias?
