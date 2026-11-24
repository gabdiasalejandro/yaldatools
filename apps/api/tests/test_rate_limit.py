from __future__ import annotations

import threading

import pytest
from fastapi.testclient import TestClient

from yaldatools_api.app import create_app
from yaldatools_api.ratelimit import RateLimiter, client_key

from conftest import BlockingSegmenter, FakeSegmenter, encode, make_settings


class Clock:
    def __init__(self) -> None:
        self.now = 1000.0

    def __call__(self) -> float:
        return self.now


def test_allows_the_minute_quota_then_says_when_to_retry():
    clock = Clock()
    limiter = RateLimiter(per_minute=2, per_day=100, clock=clock)
    assert limiter.check("a") is None
    clock.now += 10
    assert limiter.check("a") is None
    clock.now += 5
    assert limiter.check("a") == pytest.approx(45)
    clock.now += 45
    assert limiter.check("a") is None


def test_daily_quota_is_separate_from_the_minute_one():
    clock = Clock()
    limiter = RateLimiter(per_minute=100, per_day=3, clock=clock)
    for _ in range(3):
        assert limiter.check("a") is None
        clock.now += 120
    retry = limiter.check("a")
    assert retry == pytest.approx(86_400 - 360)


def test_rejected_attempts_do_not_extend_the_wait():
    clock = Clock()
    limiter = RateLimiter(per_minute=1, per_day=100, clock=clock)
    assert limiter.check("a") is None
    for _ in range(5):
        clock.now += 10
        assert limiter.check("a") is not None
    clock.now += 10
    assert limiter.check("a") is None


def test_clients_are_limited_independently():
    limiter = RateLimiter(per_minute=1, per_day=100, clock=Clock())
    assert limiter.check("a") is None
    assert limiter.check("b") is None
    assert limiter.check("a") is not None


def test_zero_disables_a_limit():
    limiter = RateLimiter(per_minute=0, per_day=0, clock=Clock())
    assert all(limiter.check("a") is None for _ in range(1000))


def test_memory_is_bounded_by_forgetting_the_oldest_clients():
    limiter = RateLimiter(per_minute=1, per_day=100, clock=Clock(), max_clients=2)
    limiter.check("a")
    limiter.check("b")
    limiter.check("c")  # evicts "a"
    assert limiter.check("a") is None


def test_client_key_groups_ipv6_by_64_prefix():
    assert client_key("2001:db8:1:2:aaaa::1") == client_key("2001:db8:1:2:bbbb::9")
    assert client_key("2001:db8:1:3::1") != client_key("2001:db8:1:2::1")
    assert client_key("203.0.113.7") == "203.0.113.7"
    assert client_key("testclient") == "testclient"


def test_http_answers_429_with_retry_after_and_health_is_not_limited():
    app = create_app(make_settings(rate_per_minute=2, rate_per_day=50), {"lite": FakeSegmenter()})
    with TestClient(app) as client:
        send = lambda: client.post("/api/quitar-fondo", content=encode((40, 30)), headers={"Content-Type": "image/jpeg"})
        assert send().status_code == 200
        assert send().status_code == 200
        limited = send()
        assert limited.status_code == 429
        assert limited.json() == {"error": "rate_limited"}
        assert 1 <= int(limited.headers["Retry-After"]) <= 60
        assert all(client.get("/api/health").status_code == 200 for _ in range(10))


def test_full_queue_is_rejected_before_the_upload_is_read():
    blocking = BlockingSegmenter()
    app = create_app(make_settings(concurrency=1, max_waiting=0), {"lite": blocking})
    with TestClient(app) as client:
        holder = threading.Thread(
            target=lambda: client.post("/api/quitar-fondo", content=encode((40, 30)), headers={"Content-Type": "image/jpeg"})
        )
        holder.start()
        assert blocking.entered.wait(timeout=5)
        # Garbage would be a 422 if it were decoded: a 503 proves it was never read.
        busy = client.post("/api/quitar-fondo", content=b"\x89PNG not really", headers={"Content-Type": "image/png"})
        blocking.release.set()
        holder.join(timeout=10)
    assert busy.status_code == 503
    assert busy.headers["Retry-After"]
