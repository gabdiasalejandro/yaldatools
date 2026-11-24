# YaldaTools

Herramientas pequeñas y gratuitas que corren en tu navegador, con estética Windows 95 y una mascota anime. Se publicarán en `yaldatools.yaldapika.com`.

La primera versión incluye:

- **Quitar fondo:** estima la dificultad de la imagen y elige el método. Lo fácil y lo medio se procesa en el navegador; lo difícil, en un servidor propio.
- **Código QR:** códigos estáticos que nunca caducan, para URL, WiFi, contacto, WhatsApp y email.

La fase 1 está en marcha: base del sitio, ES/EN, portada y Código QR.

## Desarrollo

La web está en [`apps/web`](apps/web): React + TypeScript con React Router en modo framework sobre Vite. Todas las páginas se prerenderizan a HTML estático.

```sh
cd apps/web
pnpm install
pnpm dev        # servidor de desarrollo
pnpm test       # tests (Vitest)
pnpm typecheck
pnpm build      # sitio estático en build/client
```

El fondo de pantalla no está en el repo porque su licencia prohíbe redistribuirlo. Para verlo en local, copia el archivo a `apps/web/public/wallpaper.webp`; sin él se usa un color de reserva. Ver [`docs/fondo-de-pantalla.md`](docs/fondo-de-pantalla.md).

## Documentación

- [Especificaciones](docs/especificaciones.md): alcance, requisitos, i18n ES/EN, sistema visual, arquitectura y fases.
- [Fondo de pantalla](docs/fondo-de-pantalla.md): ilustración elegida, condiciones de uso y crédito.
- [Mockup](design/mockup): fuentes de las pantallas de diseño.
