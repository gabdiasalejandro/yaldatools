from __future__ import annotations

import io
import threading

from fastapi.testclient import TestClient
from PIL import Image

from conftest import BlockingSegmenter, FakeSegmenter, encode, make_settings
from yaldatools_api.app import create_app
from yaldatools_api.imaging import MAX_UPLOAD_BYTES

URL = "/api/quitar-fondo"


def post(client: TestClient, body: bytes, content_type: str = "image/jpeg", model: str | None = "lite"):
    params = {"model": model} if model else None
    return client.post(URL, params=params, content=body, headers={"Content-Type": content_type})


def test_returns_grayscale_png_mask_of_downscaled_size_with_headers(client, fakes):
    response = post(client, encode((4096, 1000)))

    assert response.status_code == 200
    assert response.headers["content-type"] == "image/png"
    assert response.headers["x-model"] == "birefnet-lite"
    assert float(response.headers["x-processing-seconds"]) >= 0
    mask = Image.open(io.BytesIO(response.content))
    assert mask.format == "PNG"
    assert mask.mode == "L"
    assert mask.size == (2048, 500)
    assert fakes["lite"].calls == 1 and fakes["full"].calls == 0


def test_small_images_keep_their_size_and_png_webp_are_accepted(client):
    for fmt, content_type in (("PNG", "image/png"), ("WEBP", "image/webp")):
        response = post(client, encode((300, 120), fmt), content_type)
        assert response.status_code == 200, fmt
        assert Image.open(io.BytesIO(response.content)).size == (300, 120)


def test_full_model_uses_the_full_segmenter(client, fakes):
    response = post(client, encode((64, 64)), model="full")

    assert response.status_code == 200
    assert response.headers["x-model"] == "birefnet"
    assert fakes["full"].calls == 1 and fakes["lite"].calls == 0


def test_model_defaults_to_lite(client):
    assert post(client, encode((64, 64)), model=None).headers["x-model"] == "birefnet-lite"


def test_unknown_model_is_rejected(client):
    response = post(client, encode((64, 64)), model="huge")
    assert response.status_code == 400
    assert response.json() == {"error": "unknown_model"}


def test_415_for_text_plain(client):
    response = post(client, b"hello", "text/plain")
    assert response.status_code == 415
    assert response.json() == {"error": "unsupported_media_type"}


def test_415_for_gif_disguised_as_png(client, fakes):
    response = post(client, encode((32, 32), "GIF"), "image/png")
    assert response.status_code == 415
    assert response.json() == {"error": "unsupported_media_type"}
    assert fakes["lite"].calls == 0


def test_413_over_the_upload_limit(client, fakes):
    response = post(client, b"\xff\xd8\xff" + b"\0" * MAX_UPLOAD_BYTES)
    assert response.status_code == 413
    assert response.json() == {"error": "payload_too_large"}
    assert fakes["lite"].calls == 0


def test_413_when_streamed_body_exceeds_limit_without_content_length(client):
    def chunks():
        chunk = b"\0" * (1024 * 1024)
        for _ in range(26):
            yield chunk

    response = client.post(URL, params={"model": "lite"}, content=chunks(), headers={"Content-Type": "image/jpeg"})
    assert response.status_code == 413


def test_422_for_garbage_with_an_image_content_type(client):
    response = post(client, b"definitely not an image", "image/jpeg")
    assert response.status_code == 422
    assert response.json() == {"error": "invalid_image"}


def test_422_for_truncated_jpeg(client):
    response = post(client, encode((200, 200))[:300], "image/jpeg")
    assert response.status_code == 422


def test_400_model_unavailable_when_full_is_disabled():
    lite = FakeSegmenter()
    app = create_app(make_settings(enable_full=False), {"lite": lite, "full": FakeSegmenter()})
    with TestClient(app) as client:
        response = post(client, encode((64, 64)), model="full")
        health = client.get("/api/health").json()

    assert response.status_code == 400
    assert response.json() == {"error": "model_unavailable"}
    assert health["models"] == {"lite": True, "full": False}


def test_503_busy_with_retry_after_when_queue_is_full():
    blocking = BlockingSegmenter()
    app = create_app(make_settings(concurrency=1, max_waiting=0), {"lite": blocking})
    with TestClient(app) as client:
        first: dict = {}
        worker = threading.Thread(target=lambda: first.update(response=post(client, encode((64, 64)))))
        worker.start()
        try:
            assert blocking.entered.wait(timeout=10)
            busy = post(client, encode((64, 64)))
            health = client.get("/api/health").json()
        finally:
            blocking.release.set()
            worker.join(timeout=10)

    assert busy.status_code == 503
    assert busy.json() == {"error": "busy"}
    assert int(busy.headers["retry-after"]) > 0
    assert health["queue"] == {"running": 1, "waiting": 0, "capacity": 1}
    assert first["response"].status_code == 200


def test_health_reports_models_and_queue(client):
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json() == {
        "status": "ok",
        "models": {"lite": True, "full": True},
        "queue": {"running": 0, "waiting": 0, "capacity": 5},
    }
