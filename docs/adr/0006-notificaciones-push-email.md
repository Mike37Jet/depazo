# 0006. Notificaciones: Web Push + email

- **Estado:** Aceptada
- **Fecha:** 2026-11-13

## Contexto
Los usuarios quieren enterarse rápido de las oportunidades. iOS solo admite push si la PWA está instalada.

## Decisión
**Web Push** (VAPID, `pywebpush`) para alertas inmediatas y **email con Resend** para un resumen diario, y como respaldo cuando no hay push. Todo pasa por un puerto `Notifier`, para que agregar Telegram o WhatsApp después no toque el dominio. Se registra cada envío para no notificar dos veces.

## Alternativas consideradas
- **WhatsApp:** muy usado en Ecuador, pero de pago y con plantillas aprobadas. Queda para el futuro.
- **Telegram:** gratis; queda como posible extensión.

## Consecuencias
El límite free de Resend (unos 100/día) obliga a usar resúmenes y no un email por cada match.
