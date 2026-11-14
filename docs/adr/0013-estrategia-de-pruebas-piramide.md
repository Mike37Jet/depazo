# 0013. Estrategia de pruebas: pirámide de tests

- **Estado:** Aceptada
- **Fecha:** 2026-11-13

## Contexto
Se necesitan pruebas unitarias y de integración que den confianza sin volverse lentas ni frágiles.

## Decisión
Aplicar la **pirámide de tests** (Mike Cohn, *Succeeding with Agile*; Martin Fowler / Ham Vocke, *The Practical Test Pyramid*): muchos tests unitarios rápidos, menos de integración y muy pocos end-to-end, con una proporción orientativa de **70 / 20 / 10**. Reglas: tests de distinta granularidad; cuanto más alto el nivel, menos tests; empujar cada test lo más abajo posible. Detalle: `docs/testing.md`.

## Alternativas consideradas
- **Testing Trophy (Kent C. Dodds):** prioriza la integración en el frontend. Es compatible: los tests de componentes con Testing Library se cuentan como unitarios *sociables*.
- **Contract tests con Pact:** demasiado para un monorepo de un solo equipo. El cliente TS generado desde OpenAPI cumple ese rol.

## Consecuencias
Los tests de integración necesitan Docker (Testcontainers) en local y en CI. La cobertura mínima es de 90 % en `domain/` + `application/` y de 80 % global.
