# YaldaTools API

Servicio de quitar fondo en el servidor: FastAPI + BiRefNet sobre ONNX Runtime (CPU). La web lo usa solo cuando la persona pide «mejorar en el servidor»; el recorte normal sigue ocurriendo en el navegador.

## Instalación

Requiere [uv](https://docs.astral.sh/uv/). Python 3.11–3.13 (se fija 3.12 en `.python-version`).

```sh
cd apps/api
uv sync
```

Los modelos no van en el repositorio. Se descargan una vez (con verificación sha256) a `YALDA_MODELS_DIR`:

```sh
uv run python -m yaldatools_api.models        # lite y completo
uv run python -m yaldatools_api.models lite   # solo lite
```

| Modelo | Archivo | Tamaño |
| --- | --- | --- |
| `lite` | `BiRefNet-general-bb_swin_v1_tiny-epoch_232.onnx` | 224 MB |
| `full` | `BiRefNet-general-epoch_244.onnx` | 973 MB |

## Ejecución

```sh
uv run uvicorn yaldatools_api.app:app --port 8000
```

En producción va detrás de Caddy en el mismo origen que la web, así que no hace falta CORS. En desarrollo, el proxy de Vite reenvía `/api` al puerto 8000.

## Variables de entorno

| Variable | Por defecto | Uso |
| --- | --- | --- |
| `YALDA_MODELS_DIR` | `~/.cache/yaldatools/models` | Carpeta de los `.onnx`. Un modelo sin archivo se informa como no disponible. |
| `YALDA_ENABLE_FULL` | `true` | `false` desactiva el modelo completo (VPS con poca RAM). |
| `YALDA_CONCURRENCY` | `1` | Inferencias simultáneas. |
| `YALDA_MAX_WAITING` | `4` | Peticiones en espera; por encima se responde 503. |
| `YALDA_THREADS` | `0` | Hilos intra-op de ONNX Runtime; `0` usa el valor por defecto de ONNX Runtime. |

## Endpoints

### `POST /api/quitar-fondo?model=lite|full`

- Cuerpo: los bytes de la imagen tal cual (no multipart), con `Content-Type: image/jpeg`, `image/png` o `image/webp`. Sin `model` se usa `lite`.
- La imagen se reduce a 2048 px por el lado mayor (LANCZOS) antes de la inferencia. Se respeta la orientación EXIF, igual que el navegador.
- `200`: máscara PNG en escala de grises (modo `L`) del tamaño de la imagen ya reducida. Cabeceras `X-Model` (`birefnet-lite` o `birefnet`) y `X-Processing-Seconds`.

| Estado | Cuerpo | Cuándo |
| --- | --- | --- |
| 400 | `{"error":"model_unavailable"}` | Modelo desactivado o sin archivo. |
| 400 | `{"error":"unknown_model"}` | `model` distinto de `lite` o `full`. |
| 413 | `{"error":"payload_too_large"}` | Más de 25 MiB; se corta en cuanto se supera. |
| 415 | `{"error":"unsupported_media_type"}` | Otro `Content-Type`, o los bytes no son JPEG, PNG ni WebP (por ejemplo, un GIF enviado como PNG). |
| 422 | `{"error":"invalid_image"}` | Bytes que no se pueden decodificar, o más de 50 megapíxeles. |
| 503 | `{"error":"busy"}` + `Retry-After` | Cola llena. |

### `GET /api/health`

```json
{"status":"ok","models":{"lite":true,"full":true},"queue":{"running":0,"waiting":0,"capacity":5}}
```

## Lite primero, completo solo si se pide

1. La primera petición al servidor usa BiRefNet lite: más rápido y con menos memoria.
2. Si la persona no queda conforme y lo vuelve a pedir, la web usa el modelo completo (`model=full`).
3. Cada modelo se carga en memoria con su primera petición, nunca al arrancar. Los modelos se quedan en memoria mientras el proceso vive. Memoria medida (RSS del proceso con una imagen de 3000×2000):

   | Modelos cargados | RAM |
   | --- | --- |
   | Solo lite (`YALDA_ENABLE_FULL=false`) | unos 7–7,5 GB |
   | Solo completo | unos 9 GB |
   | Lite y completo a la vez (`YALDA_CONCURRENCY=2`) | unos 16 GB |

   El gasto viene de procesar a 1024×1024, no del archivo del modelo; desactivar el *arena* de memoria de ONNX Runtime apenas lo baja (7,4 → 6,9 GB). Un VPS de 8 GB solo da para el lite; para ofrecer el completo hacen falta unos 12 GB con `YALDA_CONCURRENCY=1`. Con el completo desactivado, la API responde `400 model_unavailable` a `model=full`.

## Privacidad

- Las imágenes se procesan solo en memoria: el cuerpo se lee como flujo, sin archivos temporales, y nunca se escriben en disco.
- No se registran bytes ni nombres de archivo. El registro solo incluye modelo, tamaño en píxeles, segundos y estado.
- La respuesta lleva `Cache-Control: no-store`.

## Pruebas

```sh
uv run pytest -q            # rápidas, con segmentadores falsos
uv run pytest -q -m slow    # usa el modelo lite real de la caché (se omite si falta)
```
