"""Settings read from environment variables."""

from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

DEFAULT_MODELS_DIR = "~/.cache/yaldatools/models"


def _bool(value: str) -> bool:
    return value.strip().lower() not in {"0", "false", "no", "off", ""}


@dataclass(frozen=True)
class Settings:
    models_dir: Path | str = DEFAULT_MODELS_DIR
    enable_full: bool = True
    concurrency: int = 1
    max_waiting: int = 4
    threads: int = 0  # ONNX Runtime intra-op threads; 0 keeps the ORT default
    rate_per_minute: int = 4  # per client (IPv4 address or IPv6 /64); 0 disables
    rate_per_day: int = 40

    def __post_init__(self) -> None:
        object.__setattr__(self, "models_dir", Path(self.models_dir).expanduser())
        if self.concurrency < 1:
            raise ValueError("YALDA_CONCURRENCY must be at least 1")
        if min(self.max_waiting, self.threads, self.rate_per_minute, self.rate_per_day) < 0:
            raise ValueError("YALDA_MAX_WAITING, YALDA_THREADS and YALDA_RATE_* cannot be negative")

    @classmethod
    def from_env(cls, env: dict[str, str] | None = None) -> Settings:
        env = os.environ if env is None else env
        return cls(
            models_dir=env.get("YALDA_MODELS_DIR", DEFAULT_MODELS_DIR),
            enable_full=_bool(env.get("YALDA_ENABLE_FULL", "true")),
            concurrency=int(env.get("YALDA_CONCURRENCY", "1")),
            max_waiting=int(env.get("YALDA_MAX_WAITING", "4")),
            threads=int(env.get("YALDA_THREADS", "0")),
            rate_per_minute=int(env.get("YALDA_RATE_PER_MINUTE", "4")),
            rate_per_day=int(env.get("YALDA_RATE_PER_DAY", "40")),
        )
