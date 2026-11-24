from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from conftest import FakeSegmenter, encode, make_settings
from yaldatools_api.app import create_app
from yaldatools_api.config import Settings
from yaldatools_api.ratelimit import GlobalCap


class Clock:
    def __init__(self) -> None:
        self.now = 5000.0

    def __call__(self) -> float:
        return self.now


def test_default_caps_are_200_lite_and_50_full_per_hour():
    assert (Settings().lite_per_hour, Settings().full_per_hour) == (200, 50)
    assert (Settings.from_env({}).lite_per_hour, Settings.from_env({}).full_per_hour) == (200, 50)


def test_caps_are_read_from_the_environment():
    settings = Settings.from_env({"YALDA_LITE_PER_HOUR": "10", "YALDA_FULL_PER_HOUR": "3"})
    assert (settings.lite_per_hour, settings.full_per_hour) == (10, 3)


@pytest.mark.parametrize("variable", ["YALDA_LITE_PER_HOUR", "YALDA_FULL_PER_HOUR"])
def test_negative_caps_are_rejected(variable):
    with pytest.raises(ValueError, match="YALDA_\*_PER_HOUR"):
        Settings.from_env({variable: "-1"})


def test_cap_counts_processed_images_in_a_sliding_hour():
    clock = Clock()
    cap = GlobalCap(per_hour=2, clock=clock)
    assert cap.wait() is None
    cap.record()
    clock.now += 100
    cap.record()
    clock.now += 100
    assert cap.wait() == pytest.approx(3400)
    clock.now += 3400
    assert cap.wait() is None


def test_zero_disables_the_cap():
    cap = GlobalCap(per_hour=0, clock=Clock())
    for _ in range(100):
        cap.record()
    assert cap.wait() is None


def test_http_stops_every_client_after_the_hourly_cap():
    fake = FakeSegmenter()
    app = create_app(make_settings(lite_per_hour=2), {"lite": fake})
    with TestClient(app) as client:
        send = lambda: client.post("/api/quitar-fondo", content=encode((40, 30)), headers={"Content-Type": "image/jpeg"})
        assert send().status_code == 200
        assert send().status_code == 200
        blocked = send()
        assert blocked.status_code == 503
        assert blocked.json() == {"error": "unavailable"}
        assert int(blocked.headers["Retry-After"]) > 0
    assert fake.calls == 2


def test_invalid_uploads_do_not_use_the_hourly_cap():
    fake = FakeSegmenter()
    app = create_app(make_settings(lite_per_hour=1), {"lite": fake})
    with TestClient(app) as client:
        bad = client.post("/api/quitar-fondo", content=b"\x89PNG broken", headers={"Content-Type": "image/png"})
        assert bad.status_code == 422
        good = client.post("/api/quitar-fondo", content=encode((40, 30)), headers={"Content-Type": "image/jpeg"})
        assert good.status_code == 200


def test_lite_and_full_have_separate_hourly_caps():
    lite, full = FakeSegmenter(), FakeSegmenter()
    app = create_app(make_settings(lite_per_hour=1, full_per_hour=1), {"lite": lite, "full": full})
    with TestClient(app) as client:
        send = lambda model: client.post(
            f"/api/quitar-fondo?model={model}", content=encode((40, 30)), headers={"Content-Type": "image/jpeg"}
        )
        assert send("lite").status_code == 200
        assert send("lite").json() == {"error": "unavailable"}
        assert send("full").status_code == 200  # the lite cap does not use up the full one
        blocked = send("full")
        assert blocked.status_code == 503
        assert blocked.json() == {"error": "unavailable"}
        assert int(blocked.headers["Retry-After"]) > 0
    assert (lite.calls, full.calls) == (1, 1)
