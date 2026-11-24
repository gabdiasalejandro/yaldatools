# YaldaTools

Herramientas pequeñas y gratuitas que corren en tu navegador, con estética Windows 95 y una mascota anime. Disponibles en `tools.yaldapika.com`.

La primera versión incluye:

- **Quitar fondo:** estima la dificultad de la imagen y elige el método. Lo fácil y lo medio se procesa en el navegador; lo difícil, en un servidor propio.
- **Código QR:** códigos estáticos que nunca caducan, para URL, WiFi, contacto, WhatsApp y email.
- **Quitar EXIF:** muestra y quita los metadatos de las fotos (sobre todo el GPS) sin volver a comprimirlas.
- **Unir PDF:** une y reordena varios PDF en el navegador.

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

El quitafondos necesita los modelos del navegador (ISNet y SlimSAM), que no están en el repo por su tamaño. `pnpm fetch-model` los descarga (ISNet de la release de rembg, cuantizado aquí a int8 con `uv`; SlimSAM de Hugging Face) y los deja en `public/models/`, que solo usa el servidor de desarrollo. El empaquetado para Rosemary incorpora estos modelos al sitio después del build. Para servirlos desde otro origen, configura `VITE_BG_MODEL_URL` y `VITE_SAM_MODEL_BASE` al compilar.

El botón «Mejorar en el servidor» usa la API de [`apps/api`](apps/api) (FastAPI + BiRefNet). En desarrollo, Vite reenvía `/api` al puerto 8000:

```sh
cd apps/api
uv sync
uv run uvicorn yaldatools_api.app:app --port 8000
```

Para comparar el modelo del navegador con BiRefNet (el que usará el servidor en la fase 3) sobre tus propias fotos:

```sh
uv run apps/api/scripts/compare_models.py --images ~/fotos --out /tmp/comparacion
```

Descarga los modelos de BiRefNet una vez a `~/.cache/yaldatools/models` (unos 1,2 GB) y deja un `index.html` con los recortes lado a lado, el tiempo de cada modelo y su zona dudosa.

El fondo de pantalla no está en el repo porque su licencia prohíbe redistribuirlo. Para verlo en local, copia el archivo a `apps/web/public/wallpaper.webp`; sin él se usa un color de reserva. Ver [`docs/fondo-de-pantalla.md`](docs/fondo-de-pantalla.md).

## Despliegue

La web y la API se publican con Rosemary. Consulta [el procedimiento de despliegue](deploy/rosemary/README.md).

## Documentación

- [Especificaciones](docs/especificaciones.md): alcance, requisitos, i18n ES/EN, sistema visual, arquitectura y fases.
- [Fondo de pantalla](docs/fondo-de-pantalla.md): ilustración elegida, condiciones de uso y crédito.
- [Mockup](design/mockup): fuentes de las pantallas de diseño.
