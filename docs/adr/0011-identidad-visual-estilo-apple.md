# 0011. Identidad visual con estilo Apple (HIG + Liquid Glass)

- **Estado:** Aceptada
- **Fecha:** 2026-11-13

## Contexto
Se busca un estilo **limpio y elegante**, con la forma de pensar de los equipos de diseño de Apple. depazo se usa sobre todo en el móvil, como PWA.

## Decisión
Adoptar los **principios y la estructura** de la HIG de Apple: contenido primero, un solo color de acento, colores semánticos, fondos agrupados, la escala de Dynamic Type de iOS (verificada en la HIG: cuerpo de 17 px, mínimo de 11 px), Liquid Glass **solo en la capa funcional** y movimiento con springs. Los tokens están en `docs/design-system.md`.

Ajustes deliberados:
- **Tonos ajustados para WCAG AA.** Medido: systemBlue da 4.02:1, secondaryLabel 3.44:1 y systemGreen/systemOrange 2.2:1 sobre blanco. El acento pasa a `#0066CC` (5.6:1) y el texto secundario a `#5E5E66` (6.4:1).
- **Fuente del sistema** (`system-ui`): en dispositivos Apple se ve San Francisco, sin incrustar SF Pro (su licencia es solo para plataformas Apple).
- **Lucide en lugar de SF Symbols**, por la misma restricción de licencia.
- **Inspirado, no imitado:** no se usan logos, marcas, nombres ni capturas de Apple, ni se copian sus apps.

## Alternativas consideradas
- **Paleta de UI UX Pro Max para "real estate"** (teal + Cinzel): estética de lujo y marketing, que no encaja con una herramienta utilitaria.
- **Material 3:** coherente, pero no responde al estilo que se busca.

## Consecuencias
El acento azul se parece al de Apple. Si se quiere una marca más propia, basta con cambiar `--accent` y `--accent-fill` (y volver a medir el contraste). `corner-shape: squircle` y `backdrop-filter` funcionan como mejora progresiva. Falta definir el logo y el nombre visual de la marca.
