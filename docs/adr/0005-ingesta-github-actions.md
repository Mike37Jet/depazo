# 0005. Ingesta programada con GitHub Actions y scraping responsable

- **Estado:** Aceptada
- **Fecha:** 2026-11-13

## Contexto
Los recolectores deben correr periódicamente, pueden tardar minutos y el presupuesto es de $0.

## Decisión
Un workflow con `schedule` (cron horario) y una **matriz de jobs, uno por portal**, que ejecuta `depazo ingest --source <portal>`. En repos públicos los minutos son gratuitos. Prioridad de métodos: **API oficial → HTTP + parseo (httpx + selectolax) → Playwright** solo si es imprescindible.

Reglas no negociables: respetar `robots.txt` y los términos de uso, rate limiting por portal, User-Agent genérico identificable, y **no evadir protecciones anti-bot**. Si un portal lo prohíbe, se descarta.

## Alternativas consideradas
- **Cloud Run Jobs + Scheduler:** queda como plan B si GitHub retrasa o restringe el cron.
- **VPS:** tiene costo mensual.

## Consecuencias
El cron de GitHub puede retrasarse varios minutos, lo cual es aceptable. Cada parser necesita fixtures guardados y un health check (0 resultados = alerta).
