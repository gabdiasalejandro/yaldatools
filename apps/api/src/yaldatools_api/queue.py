"""Bounded in-memory admission: `concurrency` running, at most `max_waiting` waiting."""

from __future__ import annotations

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

import anyio


class Busy(Exception):
    """The queue is full (-> 503)."""


class AdmissionQueue:
    def __init__(self, concurrency: int, max_waiting: int) -> None:
        self.concurrency = concurrency
        self.max_waiting = max_waiting
        self.running = 0
        self.waiting = 0
        self._semaphore: anyio.Semaphore | None = None  # created inside the event loop

    @property
    def capacity(self) -> int:
        return self.concurrency + self.max_waiting

    def is_full(self) -> bool:
        return self.running + self.waiting >= self.capacity

    @asynccontextmanager
    async def slot(self) -> AsyncIterator[None]:
        # Runs on the single event loop, so these checks and updates are not interleaved.
        if self.is_full():
            raise Busy
        if self._semaphore is None:
            self._semaphore = anyio.Semaphore(self.concurrency)
        self.waiting += 1
        try:
            await self._semaphore.acquire()
        finally:
            self.waiting -= 1
        self.running += 1
        try:
            yield
        finally:
            self.running -= 1
            self._semaphore.release()

    def snapshot(self) -> dict[str, int]:
        return {"running": self.running, "waiting": self.waiting, "capacity": self.capacity}
