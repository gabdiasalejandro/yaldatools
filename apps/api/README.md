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
| `lite` a 768 px | `BiRefNet-lite-768.onnx` | 205 MB |
| `lite` a 512 px | `BiRefNet-lite-512.onnx` | 192 MB |

Los dos últimos no se descargan: se generan en local con el script de exportación (ver [Lite a menor resolución](#lite-a-menor-resolución)).

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
| `YALDA_LITE_SIDE` | `1024` | Resolución de entrada del lite: `1024` (archivo de rembg), `768` o `512` (exportados en local). Otro valor impide arrancar. |
| `YALDA_CONCURRENCY` | `1` | Inferencias simultáneas. |
| `YALDA_MAX_WAITING` | `4` | Peticiones en espera; por encima se responde 503. |
| `YALDA_THREADS` | `0` | Hilos intra-op de ONNX Runtime; `0` usa el valor por defecto de ONNX Runtime. |
| `YALDA_MEMORY_ARENA` | `false` | `true` activa el *arena* de memoria de ONNX Runtime: algo más rápido (10–20 %), pero no devuelve la memoria entre peticiones. |
| `YALDA_RATE_PER_MINUTE` | `4` | Peticiones por minuto y cliente; `0` lo desactiva. |
| `YALDA_RATE_PER_DAY` | `40` | Peticiones por día y cliente; `0` lo desactiva. |

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
| 429 | `{"error":"rate_limited"}` + `Retry-After` | El cliente superó su límite por minuto o por día. |

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
   | Solo lite (`YALDA_ENABLE_FULL=false`) | unos 7,5 GB tras la primera petición, 12 GB desde la segunda (a 512 px: 2,2 y 3,4 GB) |
   | Solo completo | unos 9 GB |
   | Lite y completo a la vez (`YALDA_CONCURRENCY=2`) | unos 16 GB |

   El gasto viene de procesar a 1024×1024, no del archivo del modelo; con el *arena* de memoria de ONNX Runtime activado, el proceso no devuelve la memoria y además vuelve a crecer en la segunda petición. Por eso está desactivado por defecto (`YALDA_MEMORY_ARENA=false`): la memoria vuelve a unos 0,5–1 GB entre peticiones, con picos de unos 6,9 GB a 1024, 4 GB a 768 y 1,8–2,1 GB a 512. Un VPS de 8 GB solo da para el lite a menor resolución (`YALDA_LITE_SIDE`); para ofrecer el completo hacen falta unos 12 GB con `YALDA_CONCURRENCY=1`. Con el completo desactivado, la API responde `400 model_unavailable` a `model=full`.

## Lite a menor resolución

El archivo lite de rembg tiene la entrada fija en 1×3×1024×1024. Los mismos pesos, exportados a 768 o 512 px, gastan mucha menos memoria y tardan menos, con una máscara casi igual.

Medido con la API real (`YALDA_ENABLE_FULL=false`), una JPEG de 3000×2000, CPU de 16 hilos. La RSS sube en la primera petición, sube otra vez en la segunda y luego se mantiene (seis peticiones seguidas):

| `YALDA_LITE_SIDE` | RSS tras la 1.ª petición | RSS estable (2.ª en adelante) | Segundos (1.ª / siguientes) | Diferencia media de máscara frente a 1024 |
| --- | --- | --- | --- | --- |
| `1024` | 7,5 GB | 12,1 GB | 6,1 / 4,8–5,9 | — |
| `768` | 4,2 GB | 6,9 GB | 3,8 / 2,8–3,0 | 0,23 / 255 |
| `512` | 2,2 GB | 3,4 GB | 2,1–2,4 / 1,2–1,4 | 0,67 / 255 |

La diferencia de máscara se midió con `scripts/compare_models.py` sobre cuatro imágenes sintéticas (retrato, taza, planta); los píxeles que cambian de lado al umbral del 50 % fueron menos del 0,06 % a 768 y menos del 0,6 % a 512. A 512 se pierde algo de detalle en bordes finos (hojas, pelo); la zona dudosa sube unos puntos.

Para usarlo:

```sh
uv run scripts/export_birefnet.py          # crea BiRefNet-lite-768.onnx y BiRefNet-lite-512.onnx en ~/.cache/yaldatools/models
YALDA_LITE_SIDE=512 uv run uvicorn yaldatools_api.app:app --port 8000
```

- El script descarga una vez PyTorch para CPU (~1 GB) y los pesos oficiales (`BiRefNet-general-bb_swin_v1_tiny-epoch_232.pth`, 178 MB, con verificación sha256), el mismo punto de control que el archivo de rembg. Código y pesos: [ZhengPeng7/BiRefNet](https://github.com/ZhengPeng7/BiRefNet), licencia MIT.
- `deform_conv2d` de torchvision no se exporta a ONNX por sí solo; el script lo registra con `deform_conv2d_onnx_exporter` (MIT), como el cuaderno oficial `tutorials/BiRefNet_pth2onnx.ipynb`, y compara la salida ONNX con PyTorch antes de guardar.
- Exportado a 1024 con el mismo script, el resultado coincide con el archivo de rembg (diferencia media de máscara de 0,01–0,03 / 255).
- Si el archivo del tamaño elegido no existe, `/api/health` informa el lite como no disponible.
- `--sides` y `--out` permiten otros tamaños (múltiplos de 32) u otra carpeta, pero la API solo acepta 1024, 768 y 512.

## Límite de peticiones

- Cada cliente tiene un límite por minuto (ráfagas) y otro por día (abuso sostenido), en una ventana deslizante en memoria. Se comprueba antes de leer la imagen, igual que la cola llena, así que una petición rechazada no gasta memoria ni CPU.
- Solo cuentan las peticiones aceptadas: reintentar mientras se está limitado no alarga la espera.
- Un cliente es una dirección IPv4 o un bloque IPv6 /64, porque una conexión doméstica suele tener un /64 entero.
- Detrás de Caddy en la misma máquina, uvicorn toma la IP real de `X-Forwarded-For`: por defecto solo confía en `127.0.0.1` y `::1` (`FORWARDED_ALLOW_IPS`). No hay que exponer el puerto de la API fuera de esa máquina, o cualquiera podría falsear su IP.
- Los contadores viven en memoria y se reinician con el proceso. Con un solo proceso basta; si algún día hay varios, cada uno llevaría su propia cuenta.

## Servidor compartido

Configuración recomendada para un VPS de 8 GB compartido con otras aplicaciones:

```sh
YALDA_LITE_SIDE=512 YALDA_ENABLE_FULL=false YALDA_CONCURRENCY=1
```

Medido con la API real (imágenes de 3000×2000, *arena* desactivado por defecto): unos 0,5 GB entre peticiones, un pico de unos 1,8 GB mientras recorta y 1,7–1,8 s por imagen. Con el *arena* activado o a 1024 px, el proceso llega a 3,4 GB (512) o a 12 GB (1024) y no los libera. En cualquier caso, conviene limitar la API para que el sistema la detenga a ella y no a las demás aplicaciones (por ejemplo `MemoryMax=` en systemd o `mem_limit` en Docker), con `YALDA_ENABLE_FULL=false` y `YALDA_CONCURRENCY=1`.

## Privacidad

- Las imágenes se procesan solo en memoria: el cuerpo se lee como flujo, sin archivos temporales, y nunca se escriben en disco.
- No se registran bytes ni nombres de archivo. El registro solo incluye modelo, tamaño en píxeles, segundos y estado.
- La respuesta lleva `Cache-Control: no-store`.

## Pruebas

```sh
uv run pytest -q            # rápidas, con segmentadores falsos
uv run pytest -q -m slow    # usa el modelo lite real de la caché (se omite si falta)
```
