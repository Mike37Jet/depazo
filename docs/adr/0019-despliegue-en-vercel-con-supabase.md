# 0019. Despliegue en Vercel con la base de datos en Supabase

- **Estado:** Aceptada
- **Fecha:** 2026-11-14
- **Modifica a:** 0002, 0018

## Contexto
La PWA y la API solo funcionaban en la Mac del dueño, con un PostGIS local en `127.0.0.1`. Para usarlas desde el celular hace falta publicarlas. La arquitectura preveía Cloudflare Pages para la web y Cloud Run para la API, pero Cloud Run exige registrar una tarjeta en GCP y el dueño prefiere no hacerlo.

## Decisión
- **Web y API en Vercel (plan Hobby, gratis y sin tarjeta), como dos proyectos del mismo repositorio:** `frontend/` (sitio estático de Vite) y `backend/` (FastAPI en funciones de Python 3.13, con `backend/app.py` como punto de entrada).
- **Un solo origen para el navegador:** `frontend/vercel.json` reescribe `/api/:path*` hacia el proyecto de la API, así que no hace falta CORS y la app sigue usando `VITE_API_URL=/api`. El mismo archivo define la CSP y las demás cabeceras de seguridad.
- **La base pasa al Postgres de Supabase**, el mismo proyecto que ya da Auth:
  - La API en Vercel se conecta por el pooler compartido en modo transacción (puerto 6543), que es IPv4 y está pensado para funciones serverless.
  - La ingesta y las migraciones desde la Mac usan el pooler en modo sesión (puerto 5432).
  - El motor de SQLAlchemy desactiva la caché de sentencias y les da nombres únicos para que funcione detrás del pooler.
- **La ingesta sigue en la Mac** con launchd (ADR 0018), pero escribe en Supabase y ya no necesita el contenedor local.

## Alternativas consideradas
- **Cloud Run + Cloudflare Pages:** era el plan original. Exige una tarjeta en GCP.
- **Render:** gratis y sin tarjeta, pero la API se duerme y la primera petición tarda unos 50 s.
- **Mantener el PostGIS local y exponerlo a internet:** abre la Mac del dueño y depende de que esté encendida.

## Consecuencias
- La app y la API quedan publicadas sin costo y con HTTPS. Los despliegues se hacen solos con cada push a `main`.
- El limitador de peticiones vive en memoria, así que en serverless cada instancia lleva su propia cuenta y el límite es menos estricto. Supabase Auth mantiene sus propios límites.
- Los datos dependen del plan gratuito de Supabase: 500 MB, y el proyecto se pausa tras 7 días sin actividad (la ingesta cada 3 h lo mantiene activo).
- Si la Mac está apagada, no entran anuncios nuevos, pero la app sigue funcionando con los que ya hay.
- El plan Hobby de Vercel es para uso personal. Si depazo se vuelve comercial, hay que pasar al plan Pro o mover la API.
