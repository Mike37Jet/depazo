# 0002. Frontend PWA con Vite + React (SPA)

- **Estado:** Aceptada
- **Fecha:** 2026-11-13

## Contexto
Casi toda la app está detrás del login, así que el SEO no importa. Debe ser instalable y recibir push. El hosting debe ser gratis.

## Decisión
SPA con **Vite + React + TypeScript (strict)**, **TanStack Router** y **TanStack Query**, **Tailwind + shadcn/ui**, **vite-plugin-pwa** (Workbox) y **MapLibre GL** para dibujar zonas. Se despliega como sitio estático en **Cloudflare Pages**.

## Alternativas consideradas
- **Next.js:** su SSR no aporta valor aquí; el soporte PWA es más manual, y el plan Hobby de Vercel no permite uso comercial.
- **App nativa / React Native:** demasiado esfuerzo para el MVP.

## Consecuencias
Si más adelante se quieren landing pages con SEO, se pueden hacer como sitio aparte (por ejemplo, con Astro).
