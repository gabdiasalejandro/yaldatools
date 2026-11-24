# Desplegar YaldaTools con Rosemary

## Web

Ejecuta desde la raíz de YaldaTools con Node y pnpm. Si quieres incluir el fondo ilustrado, prepara las dos variantes WebP según `docs/fondo-de-pantalla.md` antes del build.

```sh
paquete=$(mktemp -d)
(
  cd apps/web
  pnpm install --frozen-lockfile
  pnpm fetch-model
  VITE_BG_SERVER_FULL=false pnpm build
)
cp deploy/rosemary/web/lab.toml "$paquete/"
cp -R apps/web/build/client "$paquete/dist"
cp -R apps/web/public/models "$paquete/dist/models"
```

Transfiere el paquete a `hetzner-codex` y ejecuta allí `sudo lab deploy /ruta/al/paquete --json`. La zona `lab` publica el sitio en `tools.yaldapika.com`.

## API

Exporta `BiRefNet-lite-512.onnx` con `apps/api/scripts/export_birefnet.py` según el README de la API. Prepara un contexto temporal para Docker que contenga ese archivo en la raíz y los archivos de la aplicación.

```sh
contexto=$(mktemp -d)
mkdir -p "$contexto/apps/api"
cp apps/api/pyproject.toml apps/api/uv.lock apps/api/README.md "$contexto/apps/api/"
cp -R apps/api/src "$contexto/apps/api/src"
cp ~/.cache/yaldatools/models/BiRefNet-lite-512.onnx "$contexto/"
cp deploy/rosemary/api/Dockerfile "$contexto/"
docker build -t yaldatools-api:release "$contexto"
```

Carga la imagen con esa etiqueta en el Docker rootless del VPS. En el host de Rosemary, `tools-api` usa el puerto local `18085`, un límite de memoria de 3072 MiB y un archivo de entorno para `FORWARDED_ALLOW_IPS` con la IP del proxy vista desde el contenedor. Publica el manifiesto de `deploy/rosemary/api` con `lab deploy`.

En el bloque comodín de Caddy, reenvía las rutas `/api/*` de `tools.yaldapika.com` al puerto 18085. Conserva el prefijo `/api`. Pasa a Uvicorn la IP del visitante que entrega Cloudflare, con el acceso público al origen limitado a Cloudflare. Comprueba que `/api/health` muestra el modelo lite disponible y envía un recorte de prueba por HTTPS.
