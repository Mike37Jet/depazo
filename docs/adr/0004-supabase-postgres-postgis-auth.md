# 0004. Supabase: Postgres + PostGIS + Auth

- **Estado:** Aceptada
- **Fecha:** 2026-11-13

## Contexto
La app es multiusuario desde el inicio, tiene consultas geográficas (zonas dibujadas en el mapa) y el presupuesto es de $0.

## Decisión
**Supabase Free**: Postgres con **PostGIS** para los datos y **Supabase Auth** (magic link + Google) para la identidad. El frontend usa Supabase **solo para autenticarse**; todos los datos pasan por la API FastAPI, que valida el JWT (JWKS). El esquema se versiona con **Alembic** (fuente de verdad en el repo).

## Alternativas consideradas
- **Neon + auth propia:** implementar la auth uno mismo es caro y riesgoso.
- **Clerk/Auth0:** un proveedor más que integrar; Supabase ya incluye la DB.

## Consecuencias
Límite de 500 MB: requiere política de retención. El proyecto se pausa con 7 días sin actividad, lo que la ingesta horaria evita. Cambiar a otro Postgres sería fácil porque no se usan funciones propietarias.
