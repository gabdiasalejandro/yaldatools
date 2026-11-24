# YaldaTools

Herramientas pequeñas y gratuitas que corren en tu navegador, con estética Windows 95 y una mascota anime. Se publicarán en `yaldatools.yaldapika.com`.

La primera versión incluye:

- **Quitar fondo:** estima la dificultad de la imagen y elige el método. Lo fácil y lo medio se procesa en el navegador; lo difícil, en un servidor propio.
- **Código QR:** códigos estáticos que nunca caducan, para URL, WiFi, contacto, WhatsApp y email.

Hechas: fase 1 (base del sitio, ES/EN, portada y Código QR) y fase 2 (Quitar fondo en el navegador, con triage y diagnóstico).

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

El quitafondos necesita el modelo ISNet, que no está en el repo por su tamaño. `pnpm fetch-model` lo descarga de la release de rembg, lo cuantiza a int8 (hace falta `uv`) y lo deja en `public/models/`, que solo usa el servidor de desarrollo. El build no lo incluye: en producción, `VITE_BG_MODEL_URL` apunta a donde esté alojado.

Para comparar el modelo del navegador con BiRefNet (el que usará el servidor en la fase 3) sobre tus propias fotos:

```sh
uv run apps/api/scripts/compare_models.py --images ~/fotos --out /tmp/comparacion
```

Descarga los modelos de BiRefNet una vez a `~/.cache/yaldatools/models` (unos 1,2 GB) y deja un `index.html` con los recortes lado a lado, el tiempo de cada modelo y su zona dudosa.

El fondo de pantalla no está en el repo porque su licencia prohíbe redistribuirlo. Para verlo en local, copia el archivo a `apps/web/public/wallpaper.webp`; sin él se usa un color de reserva. Ver [`docs/fondo-de-pantalla.md`](docs/fondo-de-pantalla.md).

## Documentación

- [Especificaciones](docs/especificaciones.md): alcance, requisitos, i18n ES/EN, sistema visual, arquitectura y fases.
- [Fondo de pantalla](docs/fondo-de-pantalla.md): ilustración elegida, condiciones de uso y crédito.
- [Mockup](design/mockup): fuentes de las pantallas de diseño.
