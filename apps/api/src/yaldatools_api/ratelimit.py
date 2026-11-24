"""Per-client rate limiting in memory: a sliding window per minute and per day.

Only accepted requests count, so a client that keeps retrying while limited
does not push its own wait further away. Runs on the event loop only.
"""

from __future__ import annotations

import ipaddress
import time
from collections import OrderedDict, deque
from collections.abc import Callable

MINUTE = 60.0
DAY = 86_400.0


def client_key(host: str) -> str:
    """IPv6 clients are grouped by /64: one home connection usually owns a whole /64."""
    try:
        address = ipaddress.ip_address(host)
    except ValueError:
        return host
    if address.version == 6:
        return str(ipaddress.ip_network(f"{address}/64", strict=False))
    return str(address)


class RateLimiter:
    def __init__(
        self,
        per_minute: int,
        per_day: int,
        clock: Callable[[], float] = time.monotonic,
        max_clients: int = 50_000,
    ) -> None:
        self.per_minute = per_minute
        self.per_day = per_day
        self.clock = clock
        self.max_clients = max_clients
        self._hits: OrderedDict[str, deque[float]] = OrderedDict()

    @property
    def enabled(self) -> bool:
        return self.per_minute > 0 or self.per_day > 0

    def check(self, key: str) -> float | None:
        """Record the request and return None, or return the seconds to wait."""
        if not self.enabled:
            return None
        now = self.clock()
        hits = self._hits.get(key)
        if hits is None:
            hits = deque()
            self._hits[key] = hits
        self._hits.move_to_end(key)
        while hits and now - hits[0] >= DAY:
            hits.popleft()

        waits: list[float] = []
        if self.per_day and len(hits) >= self.per_day:
            waits.append(hits[0] + DAY - now)
        if self.per_minute:
            recent = [hit for hit in hits if now - hit < MINUTE]
            if len(recent) >= self.per_minute:
                waits.append(recent[0] + MINUTE - now)
        if waits:
            return max(waits)

        hits.append(now)
        while len(self._hits) > self.max_clients:
            self._hits.popitem(last=False)
        return None


class GlobalCap:
    """Server-wide ceiling for one model: at most `per_hour` processed images in any sliding hour.

    Protects a small shared server whatever the traffic looks like. Only images
    that reach inference are recorded, so invalid uploads do not use it up.
    """

    HOUR = 3_600.0

    def __init__(self, per_hour: int, clock: Callable[[], float] = time.monotonic) -> None:
        self.per_hour = per_hour
        self.clock = clock
        self._processed: deque[float] = deque()

    def wait(self) -> float | None:
        """Seconds until a slot frees up, or None when processing is allowed now."""
        if self.per_hour <= 0:
            return None
        now = self.clock()
        while self._processed and now - self._processed[0] >= self.HOUR:
            self._processed.popleft()
        if len(self._processed) < self.per_hour:
            return None
        return self._processed[0] + self.HOUR - now

    def record(self) -> None:
        if self.per_hour > 0:
            self._processed.append(self.clock())
