# 0015. Seguridad por diseño y automatizada

- **Estado:** Aceptada
- **Fecha:** 2026-11-13

## Contexto
depazo es multiusuario, guarda datos personales (email y zona donde alguien quiere vivir), procesa contenido no confiable de portales externos y su código es público. Hay un solo desarrollador y no se quiere proceso manual extra.

## Decisión
- Usar como marco el **OWASP Top 10:2025** y un **modelo de amenazas STRIDE**, documentados en `docs/security.md`.
- **Control de acceso** en los casos de uso, más **RLS deny-by-default** en Postgres como defensa en profundidad, y tests de autorización por endpoint.
- **Contenido de los portales = no confiable:** se guarda como texto plano, nunca se renderiza como HTML, y los scrapers solo pueden conectarse a los hosts de su allowlist (anti-SSRF).
- **Automatización en lugar de checklist manual:** Ruff `S`, CodeQL, gitleaks, `pip-audit` / `pnpm audit`, Dependabot y secret scanning con push protection.
- **Headers de seguridad** (CSP estricta, HSTS, etc.) en la PWA y la API.
- **Privacidad según la LOPDP:** datos mínimos, exportación y borrado de cuenta, y logs sin datos personales.
- Reporte de vulnerabilidades privado vía GitHub (`SECURITY.md`).

## Alternativas consideradas
- **Seguridad solo al final (auditoría previa al lanzamiento):** más barato al inicio, pero los fallos de diseño (IDOR, SSRF) son caros de corregir después.
- **Herramientas de pago (Snyk, etc.):** las alternativas gratuitas de GitHub cubren lo necesario para un repo público.

## Consecuencias
El CI suma unos minutos por los análisis. RLS y la autorización en la aplicación duplican una verificación a propósito. La CSP hay que ajustarla cuando se elija el proveedor de mapas.
