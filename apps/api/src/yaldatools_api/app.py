"""HTTP adapter: FastAPI app factory and the module-level `app` for uvicorn."""

from __future__ import annotations

import logging
import time
from collections.abc import Mapping

import anyio
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse, Response

from .config import Settings
from .imaging import (
    ACCEPTED_CONTENT_TYPES,
    MAX_UPLOAD_BYTES,
    MODEL_SIDE,
    InvalidImage,
    UnsupportedFormat,
    decode,
    encode_mask_png,
    fit_within,
)
from .models import MODELS, lite_filename
from .queue import AdmissionQueue, Busy
from .ratelimit import GlobalCap, RateLimiter, client_key
from .segmenter import OnnxSegmenter, Segmenter

# Privacy: only the model, size in px, seconds and status are ever logged.
log = logging.getLogger("yaldatools_api")
RETRY_AFTER_SECONDS = 5


def configure_logging() -> None:
    """uvicorn only configures its own loggers; give ours an INFO handler once."""
    if not log.handlers:
        handler = logging.StreamHandler()
        handler.setFormatter(logging.Formatter("%(levelname)s:     %(name)s %(message)s"))
        log.addHandler(handler)
        log.setLevel(logging.INFO)
        log.propagate = False


def error(status: int, code: str, headers: dict[str, str] | None = None) -> JSONResponse:
    return JSONResponse({"error": code}, status_code=status, headers=headers)


def default_segmenters(settings: Settings) -> dict[str, Segmenter]:
    """Segmenters for the cached model files. Nothing is loaded until the first request."""
    segmenters: dict[str, Segmenter] = {}
    for key, spec in MODELS.items():
        filename, side = spec.filename, MODEL_SIDE
        if key == "lite":
            filename, side = lite_filename(settings.lite_side), settings.lite_side
        path = settings.models_dir / filename
        if path.exists():
            segmenters[key] = OnnxSegmenter(path, threads=settings.threads, side=side, memory_arena=settings.memory_arena)
    return segmenters


async def read_limited(request: Request, limit: int) -> bytes | None:
    """Read the raw body in memory; None as soon as it exceeds `limit`."""
    declared = request.headers.get("content-length")
    if declared and declared.isdigit() and int(declared) > limit:
        return None
    body = bytearray()
    async for chunk in request.stream():
        body.extend(chunk)
        if len(body) > limit:
            return None
    return bytes(body)


def create_app(settings: Settings | None = None, segmenters: Mapping[str, Segmenter] | None = None) -> FastAPI:
    settings = settings or Settings.from_env()
    segmenters = dict(default_segmenters(settings) if segmenters is None else segmenters)
    if not settings.enable_full:
        segmenters.pop("full", None)
    queue = AdmissionQueue(settings.concurrency, settings.max_waiting)
    limiter = RateLimiter(settings.rate_per_minute, settings.rate_per_day)
    hourly_cap = GlobalCap(settings.global_per_hour)

    def unavailable(model: str, wait: float) -> JSONResponse:
        log.info("model=%s status=503 reason=hourly_cap", model)
        return error(503, "unavailable", {"Retry-After": str(max(1, round(wait)))})

    app = FastAPI(title="YaldaTools API", docs_url=None, redoc_url=None, openapi_url=None)

    @app.get("/api/health")
    async def health() -> dict:
        return {
            "status": "ok",
            "models": {key: key in segmenters for key in MODELS},
            "queue": queue.snapshot(),
        }

    @app.post("/api/quitar-fondo")
    async def remove_background(request: Request, model: str = "lite") -> Response:
        if model not in MODELS:
            return error(400, "unknown_model")
        segmenter = segmenters.get(model)
        if segmenter is None:
            return error(400, "model_unavailable")
        content_type = request.headers.get("content-type", "").split(";")[0].strip().lower()
        if content_type not in ACCEPTED_CONTENT_TYPES:
            return error(415, "unsupported_media_type")
        # Cheap checks first, before the upload is read or decoded. Behind Caddy on the
        # same host, uvicorn's proxy headers give the real client address.
        wait = limiter.check(client_key(request.client.host if request.client else "unknown"))
        if wait is not None:
            log.info("model=%s status=429", model)
            return error(429, "rate_limited", {"Retry-After": str(max(1, round(wait)))})
        cap_wait = hourly_cap.wait()
        if cap_wait is not None:
            return unavailable(model, cap_wait)
        if queue.is_full():
            log.info("model=%s status=503", model)
            return error(503, "busy", {"Retry-After": str(RETRY_AFTER_SECONDS)})
        body = await read_limited(request, MAX_UPLOAD_BYTES)
        if body is None:
            log.info("model=%s status=413", model)
            return error(413, "payload_too_large")

        try:
            image = await anyio.to_thread.run_sync(lambda: fit_within(decode(body)))
        except UnsupportedFormat:
            log.info("model=%s status=415", model)
            return error(415, "unsupported_media_type")
        except InvalidImage:
            log.info("model=%s status=422", model)
            return error(422, "invalid_image")
        del body

        try:
            async with queue.slot():
                # Checked again here: other requests may have used the last slots while this one waited.
                cap_wait = hourly_cap.wait()
                if cap_wait is not None:
                    return unavailable(model, cap_wait)
                hourly_cap.record()
                started = time.perf_counter()
                mask = await anyio.to_thread.run_sync(segmenter.segment, image)
                seconds = time.perf_counter() - started
        except Busy:
            log.info("model=%s size=%dx%d status=503", model, image.width, image.height)
            return error(503, "busy", {"Retry-After": str(RETRY_AFTER_SECONDS)})

        png = await anyio.to_thread.run_sync(encode_mask_png, mask)
        log.info("model=%s size=%dx%d seconds=%.2f status=200", model, image.width, image.height, seconds)
        return Response(
            png,
            media_type="image/png",
            headers={
                "X-Model": MODELS[model].label,
                "X-Processing-Seconds": f"{seconds:.3f}",
                "Cache-Control": "no-store",
            },
        )

    return app


configure_logging()
app = create_app()
