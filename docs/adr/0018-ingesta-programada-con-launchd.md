# 0018. Ingesta programada con launchd en la Mac del dueño

- **Estado:** Aceptada
- **Fecha:** 2026-11-14
- **Modifica a:** 0005, 0017

## Contexto
El ADR 0017 dejó la ingesta sin cron: GitHub Actions se descartó por problemas de facturación. Mientras depazo tenga un solo usuario, basta con que la ingesta corra en la Mac del dueño.

## Decisión
Un LaunchAgent de macOS (`~/Library/LaunchAgents/com.depazo.ingest.plist`) ejecuta `scripts/scheduled_ingest.sh` cada 3 horas desde un **clon de despliegue en `~/.local/share/depazo/app`**, no desde el repo de trabajo: macOS (TCC) no deja que los procesos en segundo plano lean `~/Documents`, y dar "Acceso total al disco" a `bash` sería demasiado amplio. El script:
- Actualiza el clon con `git pull --ff-only` desde GitHub, así siempre corre el `main` que pasó el hook `pre-push`. Si no puede actualizar, sigue con el código que ya tiene.
- Lee la configuración de `~/.config/depazo/env` (permisos `600`, fuera del repo): `DEPAZO_DATABASE_URL`, `RESEND_API_KEY`, `DEPAZO_ALERT_EMAIL`, `DEPAZO_COLIMA_PROFILE` y `DEPAZO_DATABASE_CONTAINER`, más los opcionales `DEPAZO_SCHEDULED_SOURCES` y `DEPAZO_SCHEDULED_PAGES`.
- Enciende Colima y el contenedor de PostGIS si están apagados, aplica las migraciones y corre `depazo ingest --save` por cada fuente.
- Agrega `--alert-profile ~/.config/depazo/profile.json` solo si hay clave de Resend y destinatario.
- Escribe el log en `~/Library/Logs/depazo/ingest.log`.

La base es un PostGIS local permanente (contenedor `depazo-db` con el volumen `depazo-db-data`, en `127.0.0.1:55433`).

## Alternativas consideradas
- **Cloud Run Jobs + Cloud Scheduler:** requiere una cuenta con tarjeta en GCP y una base accesible desde internet (Supabase). Queda para cuando haya varios usuarios.
- **cron:** launchd es el mecanismo nativo de macOS y recupera las ejecuciones perdidas mientras la Mac dormía.

## Consecuencias
- Si la Mac está apagada no hay ingesta. Al despertar, launchd corre la ejecución pendiente.
- La IP es residencial, así que hay menos riesgo de que iCasas bloquee el acceso que desde un datacenter.
- Para desactivarla: `launchctl bootout gui/$(id -u)/com.depazo.ingest`.
