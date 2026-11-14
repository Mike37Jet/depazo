# Seguridad y privacidad

> Decisión: [ADR 0015](adr/0015-seguridad-por-diseno.md). Referencias: OWASP Top 10:2025 (edición vigente, verificada en top10.owasp.org), OWASP ASVS y la LOPDP de Ecuador.

**Principio:** seguridad por diseño y automatizada. Casi todos los controles los ejecutan herramientas (CI, hooks, configuración), no pasos manuales.

## 1. Qué protegemos

| Activo | Ejemplos | Sensibilidad |
|---|---|---|
| Cuentas de usuario | Email, sesión (JWT de Supabase) | Alta |
| Preferencias de búsqueda | Presupuesto, zona dibujada (indica dónde quiere vivir la persona) | Alta: es un dato personal según la LOPDP |
| Suscripciones push | Endpoint y claves del navegador | Media |
| Secretos de la plataforma | Clave de servicio de Supabase, claves VAPID, API key de Resend, DSN de Sentry | Crítica |
| Anuncios recolectados | Datos públicos de los portales | Baja (sin datos personales de anunciantes) |
| Disponibilidad y reputación | Que depazo no sea usado para abusar de los portales | Media |

## 2. Modelo de amenazas (STRIDE)

| Amenaza | Escenario en depazo | Control |
|---|---|---|
| **S**uplantación | Robar o falsificar el token de otro usuario | Supabase Auth; la API valida la firma (JWKS), `aud`, `iss` y `exp`; sesiones cortas con refresh |
| **T**ampering (manipulación) | Modificar la búsqueda de otro usuario cambiando el ID en la URL (IDOR) | Toda consulta filtra por el `user_id` del token. RLS en Postgres como segunda barrera. Tests de autorización |
| **R**epudio | No poder reconstruir qué pasó ante un incidente | Logs estructurados de acciones sensibles (login, borrar cuenta, cambios de perfil), sin datos personales |
| **I**nformation disclosure (fuga de información) | Filtrar la zona de búsqueda de un usuario, secretos o trazas internas | Errores genéricos al cliente; secretos solo en el servidor; `/docs` de la API desactivado en producción; Sentry con limpieza de datos sensibles |
| **D**enegación de servicio | Que alguien inunde la API o agote los free tiers | Rate limiting por usuario e IP; límites de tamaño de request y de número de perfiles por usuario; funciones serverless de Vercel con tope de duración |
| **E**levación de privilegios | Usar la clave de servicio de Supabase desde el frontend; ejecutar código desde el HTML de un anuncio | La clave de servicio nunca sale del backend; el contenido de los anuncios se trata como no confiable (ver §4) |
| **T**ampering por el canal de captura | Inyectar anuncios falsos o enlaces a otro dominio, y con ellos avisos push, por el host local que recibe las capturas de la extensión (ADR 0021) | Chrome solo lanza el host para la extensión de `allowed_origins`; el service worker valida el remitente; el host valida como si el emisor fuera hostil: trama de máximo 256 KiB, máximo 100 anuncios, solo `source` `plusvalia`, host exacto en las URLs y errores de un conjunto cerrado (ver §4) |

## 3. OWASP Top 10:2025 aplicado

Los nombres de las categorías son los que se conocen de la edición 2025. Antes de una auditoría formal, confírmalos en top10.owasp.org.

| Riesgo | Controles en depazo |
|---|---|
| **Control de acceso roto** | Autorización en el caso de uso (`application/`), no solo en el router: `profile.owner_id == current_user.id`. IDs no secuenciales (UUID v7). RLS *deny by default* en todas las tablas. Un test por endpoint que verifica que el usuario B no puede ver ni editar lo del usuario A |
| **Configuración insegura** | Headers de seguridad (§5); CORS solo para el dominio de la PWA; `/docs` y `/openapi.json` públicos solo fuera de producción; contenedores sin root; valores seguros por defecto |
| **Fallas en la cadena de suministro** | Lockfiles (`uv.lock`, `pnpm-lock.yaml`) commiteados; versiones exactas; Dependabot semanal; `pip-audit` y `pnpm audit` en el CI; GitHub Actions fijadas por SHA; revisar cada dependencia nueva |
| **Fallas criptográficas** | HTTPS en todos lados (HSTS); secretos fuera del código; contraseñas gestionadas por Supabase (no guardamos ninguna); claves VAPID rotables |
| **Inyección** | SQL solo a través del ORM o con parámetros enlazados; el HTML de los portales se parsea con selectolax y nunca se ejecuta; sin `eval` ni `subprocess` con datos externos |
| **Diseño inseguro** | Este documento y el modelo de amenazas; los casos de abuso se consideran al diseñar cada feature |
| **Fallas de autenticación** | Login delegado a Supabase (código de un solo uso por email y Google OAuth con PKCE; el secreto del cliente de Google vive solo en Supabase); validación estricta del JWT; rate limiting en los endpoints de cuenta |
| **Integridad de software y datos** | Validación con Pydantic de todo dato externo (portales, requests); migraciones versionadas; despliegue solo desde el CI |
| **Fallas de logging y alertas** | structlog en JSON; nunca se loguean tokens, emails completos ni zonas; Sentry con `send_default_pii=False`; alerta en GitHub si la ingesta falla |
| **Mal manejo de condiciones excepcionales** | Excepciones de dominio tipadas que se traducen a respuestas HTTP genéricas; nunca se devuelven trazas al cliente; nunca un `except` o `catch` vacío (ver `docs/conventions.md`) |

## 4. Controles por capa

### API (FastAPI)
- Dependencia `current_user` que valida el JWT (JWKS en caché, `aud = authenticated`, `iss` de nuestro proyecto, `exp`).
- **Autorización en los casos de uso.** Los repositorios reciben el `user_id` y filtran siempre por él.
- Schemas Pydantic con `extra="forbid"`, límites de longitud y rangos (por ejemplo, polígonos de zona con un número máximo de vértices).
- Rate limiting por usuario (v1: en memoria, por instancia de Vercel; si hace falta uno global, pasa a un almacén compartido) y body de máximo 16 KiB (413; sin `Content-Length` responde 411).
- `/openapi.json` y `/docs` apagados salvo `DEPAZO_IS_OPENAPI_PUBLISHED=true`. Los 422 no repiten el input recibido.
- Middleware de headers de seguridad y CORS con una lista explícita de orígenes.

### Ingesta (scrapers)
- Si un sitio bloquea, el adaptador se detiene y registra el estado `blocked`.
- Todos los scrapers respetan `robots.txt` **salvo `marketplace`** (ADR 0020), que pide tres páginas públicas sin sesión por ejecución. No usa cuentas, cookies, proxies ni navegadores disfrazados, y falla si la página pide iniciar sesión. Fuera del scraper, la vigilancia de Plusvalía desde la extensión recarga una URL con `?sort=`, que el `robots.txt` de Plusvalía prohíbe a los rastreadores (`Disallow: *?sort=*`); el dueño lo aceptó (ADR 0021).
- De Marketplace no se lee el bloque del vendedor, y los teléfonos escritos en el título (también con emojis) se eliminan antes de guardar.
- **Allowlist de hosts por adaptador.** El cliente HTTP rechaza cualquier otro destino y no sigue redirecciones a otros dominios (anti-SSRF).
- **Suscripciones push con allowlist.** El endpoint que manda el navegador solo se acepta si es `https`, sin puerto ni credenciales, y su host pertenece a un servicio de push conocido (FCM, Mozilla, Apple, Windows). El emisor lo vuelve a comprobar antes de cada envío y no sigue redirecciones. La clave privada VAPID vive solo en el Mac que corre la ingesta.
- Timeouts, tamaño máximo de respuesta y reintentos con backoff.
- El contenido de los anuncios **no es confiable**. Se guarda como texto plano: se eliminan las etiquetas HTML y se normalizan espacios. Las URLs se validan (solo `https` y el dominio del portal).
- Las imágenes se referencian por URL validada; no se descargan ni se procesan en el servidor.
- **Capturas de la extensión** (`depazo import` y `depazo receive-capture`): la URL del anuncio exige el host exacto del portal y la de la imagen, un host que termine en el sufijo del CDN permitido (`.naventcdn.com` para Plusvalía, `.fbcdn.net` para Marketplace), ambas sobre una URL analizada de forma estricta, que rechaza barras invertidas, credenciales, puertos explícitos, caracteres de control y espacios. Los teléfonos se eliminan del título y del sector con la misma limpieza que usa Marketplace.
- **Host nativo de captura** (ADR 0021): Chrome lanza `scripts/capture_host.sh` solo para la extensión cuyo identificador figura en `allowed_origins`. El script ignora sus argumentos, no lee la entrada estándar y ejecuta `depazo receive-capture`, que lee una sola trama, la rechaza por su longitud declarada si pasa de 256 KiB antes de leer el cuerpo, la valida con Pydantic, acepta como máximo 100 anuncios y solo de `plusvalia`, y responde con una sola trama. Los errores son un conjunto cerrado de códigos (`invalid_capture`, `unavailable`), nunca el texto de una excepción. Los diagnósticos van a `~/Library/Logs/depazo/capture-host.log`. Comparte el candado de la ingesta programada, con una espera de 30 s.
- **Regla de parada de Plusvalía** (ADR 0021): si tras una recarga de la pestaña vigía no llega en un minuto un informe con al menos un anuncio legible, la extensión pasa a "necesita atención" y deja de recargar. Si la Mac no tiene conexión en el momento del ciclo, la recarga se salta sin cambiar el estado. No se reanuda sola: solo con el botón "Reanudar" del popup.

### Extensión de navegador

- Pide `storage`, `alarms` y `nativeMessaging`, y acceso a `www.plusvalia.com` y `www.facebook.com`. No pide `tabs`.
- Tiene un service worker (ADR 0021) que recarga la pestaña vigía de Plusvalía y entrega las capturas al host nativo `com.depazo.capture`. **No tiene red propia:** la CSP de sus páginas declara `connect-src 'none'`, y el host nativo es su único canal de salida. No guarda ningún secreto; la `key` del manifest es una clave pública.
- El service worker solo acepta informes cuyo remitente es la propia extensión (`sender.id === chrome.runtime.id`) desde una pestaña en el origen de Plusvalía, y vuelve a validar el contenido con Zod. No registra `onMessageExternal`.
- En Facebook el script corre en todo el dominio (Marketplace es una SPA), pero solo captura en páginas `/marketplace/<ciudad>/propertyrentals` y solo lee las tarjetas de anuncios.
- Nunca lee el bloque del vendedor (nombre, teléfono, perfil). El título es texto libre del anunciante: los teléfonos escritos en él se eliminan en el backend al importar o recibir la captura.
- Las capturas quedan en `chrome.storage.local` hasta que el usuario exporta. Con la vigilancia de Plusvalía encendida (viene apagada), los anuncios que informa la pestaña vigía (no los de otras pestañas de Plusvalía) se entregan además al host nativo, como máximo 100 por mensaje, y solo se marcan como entregados con una respuesta `ok: true`. Mientras tanto esperan en una cola de `chrome.storage.local` de hasta 500 anuncios.
- Lo capturado se valida con Zod al guardarlo y con Pydantic (`extra="forbid"`, límites, hosts permitidos) al importarlo o al recibirlo por el host nativo.

### PWA (React)
- **Nunca se usa `dangerouslySetInnerHTML`.** React escapa todo el texto por defecto.
- Los enlaces externos llevan `rel="noopener noreferrer"`.
- El frontend solo conoce la **anon key** de Supabase, que es pública por diseño y está protegida por RLS. Nunca conoce la clave de servicio.
- El service worker **no cachea respuestas autenticadas de la API**, solo assets estáticos. Al cerrar sesión se limpian las cachés.
- Las variables `VITE_*` son públicas. Nunca se pone un secreto en ellas.

### Base de datos (Supabase)
- RLS activado en todas las tablas con política *deny by default*. La API se conecta con su propio rol, con los privilegios mínimos.
- Backups: los que ofrece Supabase Free, más un `pg_dump` semanal cifrado como artifact privado del CI (si hace falta).
- Retención: los anuncios dados de baja se eliminan a los 90 días y las cuentas borradas, de inmediato.

## 5. Headers de seguridad

Se aplican en `frontend/vercel.json` para la PWA (Vercel agrega HSTS en sus dominios) y en un middleware para la API:

```
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data: https:; connect-src 'self' https://<api> https://<proyecto>.supabase.co https://<tiles>; worker-src 'self' blob:; frame-ancestors 'none'; base-uri 'self'; form-action 'self'
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=(self)
Cross-Origin-Opener-Policy: same-origin
```

La CSP se ajusta cuando se elija el proveedor de mapas. Se valida con securityheaders.com y con Mozilla Observatory.

## 6. Secretos

| Secreto | Dónde vive | Quién lo usa |
|---|---|---|
| `DEPAZO_DATABASE_URL`, clave de servicio de Supabase | Variables de entorno cifradas del proyecto de la API en Vercel; en la Mac, `~/.config/depazo/env` (permisos `600`) | API, ingesta y host nativo de captura |
| Claves VAPID (privada) | Ídem | Ingesta y host nativo de captura (notificaciones) |
| `RESEND_API_KEY` | Ídem | Ingesta |
| `SENTRY_DSN` | Ídem (el del frontend es público por diseño) | Todos |
| Local | `.env`, ignorado por git y bloqueado para Claude en `.claude/settings.json` | Desarrollo |

- **gitleaks** en pre-commit y en el CI.
- En GitHub: **secret scanning + push protection**, activados.
- `.env.example` lista las variables sin valores.
- Si se filtra un secreto, se **revoca y rota de inmediato**; reescribir el historial no basta.
- El host nativo de captura (ADR 0021) lo lanza Chrome y carga `~/.config/depazo/env`. Ningún secreto viaja a la extensión: la respuesta del host solo lleva contadores o un código de error.

## 7. Seguridad automatizada (CI)

| Herramienta | Qué detecta | Cuándo |
|---|---|---|
| Ruff con las reglas `S` (flake8-bandit) | Patrones inseguros en Python | pre-commit + CI |
| CodeQL (gratis en repos públicos) | Análisis estático de Python y TS | En cada push a `main` + semanal |
| gitleaks | Secretos en el código | pre-commit + CI |
| `pip-audit` / `pnpm audit` | Dependencias con CVEs | CI + semanal |
| Dependabot | Actualizaciones de dependencias y de Actions | Semanal |
| Tests de autorización | IDOR / control de acceso | En cada push |
| Skill `/security-review` de Claude Code | Revisión del diff con foco en seguridad | Antes de cambios grandes en auth, API o ingesta |

## 8. Configuración del repositorio en GitHub

- [ ] Secret scanning + push protection activados.
- [ ] Dependabot alerts y security updates activados.
- [ ] CodeQL (default setup) activado.
- [ ] **Private vulnerability reporting** activado (ver `SECURITY.md`).
- [ ] Workflows con `permissions:` mínimos (`contents: read` por defecto).
- [ ] Protección de `main`: no permitir force-push ni borrarla. Sin exigir PR, para mantener el flujo simple.

## 9. Privacidad (LOPDP Ecuador)

- **Minimización:** se guardan solo el email, las preferencias de búsqueda, los favoritos y las suscripciones push. No se guardan datos personales de anunciantes.
- **Transparencia:** una política de privacidad clara en la PWA antes del registro.
- **Derechos del titular:** exportar los datos (JSON) y **borrar la cuenta** desde Cuenta, con borrado en cascada.
- **Consentimiento** explícito para las notificaciones push y el email.
- Las ubicaciones de búsqueda no se comparten con terceros. Los logs no incluyen zonas ni emails.

## 10. Respuesta a incidentes

1. **Contener:** revocar los secretos o tokens afectados; desactivar la ingesta o la API si hace falta.
2. **Evaluar:** qué datos y qué usuarios se vieron afectados (usando los logs).
3. **Corregir:** un fix con test de regresión y un commit `fix(security): …`.
4. **Notificar:** a los usuarios afectados y, si aplica, a la autoridad de protección de datos, según los plazos de la LOPDP.
5. **Aprender:** registrar la causa y el control nuevo, como ADR o issue.
