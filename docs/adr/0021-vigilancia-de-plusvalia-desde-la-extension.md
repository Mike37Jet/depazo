# 0021. Vigilancia de Plusvalía desde la extensión, con entrega por Native Messaging

- **Estado:** Aceptada
- **Fecha:** 2026-11-14
- **Modifica a:** 0016, 0018

## Contexto
El objetivo de depazo es avisar de un departamento en cuanto se publica, y el dueño quiere esos avisos **en minutos**. Con el ADR 0016, Plusvalía (el portal con más volumen) solo entraba por la extensión asistida: la demora dependía de que el dueño navegara, exportara el JSON y lo importara a mano.

- Plusvalía responde a **todo cliente que no sea un navegador** con un desafío gestionado de Cloudflare (`cf-mitigated: challenge`), también en `robots.txt` y en los términos (`docs/portals.md`). En un navegador normal carga sin desafío.
- El proyecto **no evade protecciones**: sin proxies, sin navegadores disfrazados y sin resolver desafíos (ADR 0016 y 0020). Un scraper como el de Marketplace no es posible aquí.
- El ADR 0020 ya dejó anotado el sondeo desde la extensión, en el navegador del dueño, como la vía que quedaba para Plusvalía.
- Comprobación del 2026-11-14 en un navegador real: `https://www.plusvalia.com/alquiler/departamentos/pichincha/quito?sort=more_recent` carga 30 tarjetas sin desafío y coincide con el patrón `/alquiler/*` del content script. Las primeras tarjetas son promocionadas (identificadores antiguos) y después vienen las publicaciones nuevas.

## Decisión
La extensión **vigila Plusvalía por su cuenta dentro del Chrome del dueño** y entrega lo que encuentra a un **host local de Native Messaging** en la Mac, que reutiliza el pipeline de importación y los avisos push.

**En la extensión**
- Un service worker con una alarma **cada 20 minutos**. Solo actúa si la vigilancia está encendida (viene **apagada**), si la hora local está **entre las 07:00 y las 22:00** y si el estado no es "necesita atención".
- Recarga la **pestaña vigía**: fijada, inactiva y con `autoDiscardable: false`, abierta en la URL verificada. La identifica por el `tabId` guardado, validado con `chrome.tabs.get`, y porque su URL sigue en `https://www.plusvalia.com/alquiler/`. Si falta, la crea. Si Chrome no tiene ninguna ventana, salta el ciclo sin cambiar el estado.
- El content script sigue leyendo y guardando las capturas como antes, y además informa de cada lectura al service worker (`pageReport`), **también cuando encuentra cero tarjetas**.
- Un anuncio es "nuevo" por su identificador, nunca por su posición en la página.
- Popup: una sección aparte con el interruptor "Vigilar Plusvalía automáticamente", una línea de estado (último sondeo, última entrega y su resultado) y, cuando necesita atención, la explicación y el botón "Reanudar".
- Manifest: se agregan `key` (la clave pública, que fija el identificador `fabgniffhpmdifgbdlgjchjchgfjcldm`), `background.service_worker`, los permisos `alarms` y `nativeMessaging` (ninguno más; no se pide `tabs`) y `content_security_policy.extension_pages` con `connect-src 'none'`, de modo que la extensión **no tiene red propia**.

**Entrega a la Mac**
- `chrome.runtime.connectNative("com.depazo.capture")`: un mensaje, una respuesta y desconexión, con un tiempo máximo propio de 4 minutos.
- El mensaje es el sobre `depazo.capture` versión 1 que ya usa la exportación manual. La trama lleva 4 bytes de longitud en el orden de bytes nativo y después el JSON en UTF-8, en ambos sentidos.
- Solo se envían los anuncios cuya clave `externalId:monthlyRentUsd:condoFeeUsd` no está en el conjunto de entregados: como máximo **100 por mensaje**, una sola entrega en curso y al menos 60 s entre entregas. Solo se entrega con la vigilancia encendida.
- Una clave se marca como entregada **solo** con una respuesta `ok: true`. Cualquier otro resultado (respuesta de error, desconexión sin respuesta o tiempo agotado) la deja pendiente para el siguiente ciclo y se muestra en el popup. El conjunto vive en `chrome.storage.local`, con un tope de 2000 claves (se descartan las más antiguas).
- Solo se entregan los anuncios que informa **la pestaña vigía**. Los que el dueño ve en otra pestaña de Plusvalía se capturan como siempre, pero no se entregan solos.
- Mientras el estado es "necesita atención", los informes se ignoran y no se encola nada.
- Lo pendiente espera en una cola persistente (`watchPendingListings` en `chrome.storage.local`) de **500 anuncios** como máximo; si se llena, se descartan los más antiguos. Una tercera alarma, `watchDelivery`, retoma la entrega cuando quedan pendientes o cuando aún no pasaron los 60 s.
- Los anuncios con un arriendo o una alícuota de más de 1 000 000 USD no se encolan ni se envían: el host los rechazaría.
- Encender el interruptor o pulsar "Reanudar" ejecuta un ciclo en el momento: dentro del horario, eso es una recarga inmediata.
- Una respuesta `invalid_capture` deja el lote pendiente igual que cualquier otro fallo, así que se reintenta sin límite hasta que esos anuncios salgan de la cola.

**En la Mac**
- `scripts/capture_host.sh` es el programa que lanza Chrome. Ignora sus argumentos, fija el `PATH`, carga `~/.config/depazo/env`, no lee la entrada estándar y toma **el mismo candado** que la ingesta programada (`~/.config/depazo/scheduled-ingest.lock`) con una espera de 30 s. Después ejecuta `depazo receive-capture` desde `backend/`, con `--notify-users` solo si hay clave privada VAPID. No hace `git pull`, no aplica migraciones y no arranca Docker ni Colima: la base de producción es remota (Supabase). Los diagnósticos van a `~/Library/Logs/depazo/capture-host.log`.
- `depazo receive-capture [--notify-users]` lee **una** trama, la valida, ejecuta el mismo guardado y los mismos avisos push que `depazo import --save [--notify-users]` y escribe **una** trama de respuesta: `{"ok":true,"new":…,"repriced":…,"unchanged":…}` o `{"ok":false,"error":"invalid_capture"|"unavailable"}`. Si el candado está ocupado, el host termina sin responder y la extensión lo trata como "no entregado; se reintenta en el siguiente ciclo".
- `scripts/install_capture_host.sh` calcula el identificador de la extensión a partir de la `key` de `extension/public/manifest.json` y escribe `~/Library/Application Support/Google/Chrome/NativeMessagingHosts/com.depazo.capture.json`, con la ruta absoluta al `capture_host.sh` del clon desde el que se ejecuta y `allowed_origins` limitado a esa extensión. Es idempotente.

**Regla de parada**
Es la regla del proyecto ("si un sitio bloquea, el adaptador se detiene; no se escala") aplicada al navegador. Tras cada recarga hay un plazo de **un minuto**. Si en ese plazo la pestaña vigía no entregó un informe con al menos un anuncio legible, el estado pasa a **"necesita atención"**, el icono muestra `!` y **no se recarga nada más**. El estado se guarda en `chrome.storage.local`, así que sobrevive a reiniciar Chrome. **Nunca se reanuda solo:** solo el botón "Reanudar" del popup, pulsado por el dueño, lo reactiva. La falta de informe cubre por igual un desafío de Cloudflare, una página de bloqueo, una redirección, un cambio de HTML, un resultado vacío y una red que figura conectada pero no llega al sitio (portal cautivo): la extensión no distingue la causa. Si el navegador informa que no hay red, el ciclo se salta y el estado no cambia.

**Medidas de seguridad**
- El service worker comprueba el remitente de cada informe (`sender.id === chrome.runtime.id` y pestaña en el origen de Plusvalía) y vuelve a validar el contenido con Zod. No registra `onMessageExternal`.
- El host valida como si el emisor fuera hostil: rechaza por la longitud declarada, **antes de leer el cuerpo**, toda trama de más de **256 KiB**; valida con el modelo Pydantic de las capturas (`extra="forbid"`); acepta como máximo **100 anuncios** y solo con `source` igual a `plusvalia`.
- Los errores son un conjunto cerrado de códigos; la respuesta nunca lleva el texto de una excepción. La salida estándar solo lleva la trama de respuesta.
- La validación de URLs de las capturas se endurece (también para `depazo import`): host exacto para la URL del anuncio y sufijo de CDN permitido para la de la imagen (`.naventcdn.com`, `.fbcdn.net`: los CDN sirven desde subdominios), ambos sobre una URL analizada de forma estricta, que rechaza barras invertidas, credenciales, puertos explícitos, caracteres de control y espacios.
- La limpieza de teléfonos que tenía el adaptador de Marketplace pasa a un módulo compartido de `infrastructure/sources/` y se aplica al título y al sector de todo anuncio capturado.
- **Ningún secreto llega a la extensión.** La clave del manifest es pública; la privada no se guardó. Los secretos siguen solo en `~/.config/depazo/env`.

## Alternativas consideradas
- **Endpoint autenticado en la nube:** obliga a guardar una credencial dentro de la extensión, le da red propia y abre en la API pública una vía de escritura a la tabla compartida de anuncios.
- **Receptor HTTP en `localhost`:** un servicio escuchando de forma permanente, alcanzable por cualquier página web y cualquier proceso local, que habría que autenticar aparte. Native Messaging limita quién llama con `allowed_origins` y no deja nada escuchando.
- **Playwright o navegadores disfrazados:** es evadir la protección de Cloudflare, lo que el proyecto excluye.
- **Alertas por email de Plusvalía:** nadie sabe cuánto tardan en llegar, y el objetivo son minutos.

## Consecuencias
**Qué se gana**
- Los anuncios nuevos de Plusvalía entran y disparan el push sin que el dueño haga nada. La demora máxima es la del intervalo, 20 minutos, dentro del horario.
- El endurecimiento de URLs y la limpieza de teléfonos benefician también a la importación manual.

**Costos, dichos con claridad**
- **Es automatización dentro del navegador del dueño.** Una pestaña que se recarga sola unas 46 veces al día cambia la frase "no hay bots en esos sitios" del ADR 0016: en Plusvalía ya no es cierta tal cual. Lo que se mantiene es que no hay clientes automatizados fuera del navegador, que no se evade ninguna protección y que no se resuelven desafíos.
- **La URL vigía usa `?sort=`, y el `robots.txt` de Plusvalía declara `Disallow: *?sort=*` para los rastreadores.** El dueño lo acepta como riesgo propio, en un proyecto personal y sin fines comerciales. Queda escrito aquí; no se esquiva con otra URL.
- **Solo funciona con Chrome abierto y la Mac despierta.** Sin ventana de Chrome no hay sondeo.
- **Sin conexión no se recarga.** Si el navegador informa que no hay red (`navigator.onLine`) en el momento del ciclo, la recarga se salta sin cambiar el estado. Una red que figura como conectada pero no llega a Plusvalía (un portal cautivo, por ejemplo) sí termina en "necesita atención", igual que un bloqueo.
- **Nadie ha medido todavía si Cloudflare empieza a desafiar las recargas periódicas.** Si ocurre, la regla de parada detiene la vigilancia y el dueño decide si la reanuda.
- El identificador fijo es el mismo para cualquiera que cargue este repositorio. Solo importa en una Mac donde alguien instaló el manifiesto del host.
- El host se ejecuta desde el clon de despliegue del ADR 0018, que ahora aloja también este programa.
- El host comparte el candado con la ingesta programada: si la ingesta lo retiene más de 30 s, esa entrega se pospone al ciclo siguiente.

**Instalación (manual, una vez)**
1. En `extension/`: `pnpm build`.
2. En `chrome://extensions`, recargar la extensión descomprimida. **Su identificador cambia una sola vez**, porque ahora lo fija la `key`. `chrome.storage.local` no migra: las capturas pendientes bajo el identificador anterior **se pierden si no se exportan antes**.
3. Desde el clon de despliegue (`~/.local/share/depazo/app`, ya actualizado con este cambio): `scripts/install_capture_host.sh`.
4. En el popup, encender "Vigilar Plusvalía automáticamente".

**Para quitarlo**
- Apagar el interruptor en el popup y cerrar la pestaña fijada: con eso no hay más recargas ni entregas.
- Borrar `~/Library/Application Support/Google/Chrome/NativeMessagingHosts/com.depazo.capture.json`: sin ese archivo Chrome no puede lanzar el host.
- La captura mientras se navega y la exportación manual siguen funcionando igual.
