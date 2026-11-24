"""Settings read from environment variables."""

from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

DEFAULT_MODELS_DIR = "~/.cache/yaldatools/models"
MODEL_SIDES = (1024, 768, 512)  # 1024 is the rembg file; 768 and 512 come from scripts/export_birefnet.py


def _bool(value: str) -> bool:
    return value.strip().lower() not in {"0", "false", "no", "off", ""}


def _side_error(variable: str) -> ValueError:
    return ValueError(f"{variable} must be one of {', '.join(map(str, MODEL_SIDES))}")


def _side(variable: str, value: str) -> int:
    try:
        return int(value)
    except ValueError:
        raise _side_error(variable) from None


@dataclass(frozen=True)
class Settings:
    models_dir: Path | str = DEFAULT_MODELS_DIR
    enable_full: bool = True
    concurrency: int = 1
    max_waiting: int = 4
    threads: int = 0  # ONNX Runtime intra-op threads; 0 keeps the ORT default
    rate_per_minute: int = 4  # per client (IPv4 address or IPv6 /64); 0 disables
    rate_per_day: int = 40
    # Images each model processes per hour for everyone together; 0 disables.
    lite_per_hour: int = 200
    full_per_hour: int = 50
    lite_side: int = 1024  # input side of the lite model; smaller uses less RAM
    full_side: int = 1024  # input side of the full model; smaller uses less RAM
    # ONNX Runtime's CPU arena keeps memory after each request (lite 1024 settles at ~12 GB);
    # off returns it between requests at ~10–20 % more time. Matters on a shared server.
    memory_arena: bool = False

    def __post_init__(self) -> None:
        object.__setattr__(self, "models_dir", Path(self.models_dir).expanduser())
        if self.concurrency < 1:
            raise ValueError("YALDA_CONCURRENCY must be at least 1")
        counts = (self.max_waiting, self.threads, self.rate_per_minute, self.rate_per_day, self.lite_per_hour, self.full_per_hour)
        if min(counts) < 0:
            raise ValueError("YALDA_MAX_WAITING, YALDA_THREADS, YALDA_RATE_* and YALDA_*_PER_HOUR cannot be negative")
        if self.lite_side not in MODEL_SIDES:
            raise _side_error("YALDA_LITE_SIDE")
        if self.full_side not in MODEL_SIDES:
            raise _side_error("YALDA_FULL_SIDE")

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
            lite_per_hour=int(env.get("YALDA_LITE_PER_HOUR", "200")),
            full_per_hour=int(env.get("YALDA_FULL_PER_HOUR", "50")),
            lite_side=_side("YALDA_LITE_SIDE", env.get("YALDA_LITE_SIDE", "1024")),
            full_side=_side("YALDA_FULL_SIDE", env.get("YALDA_FULL_SIDE", "1024")),
            memory_arena=_bool(env.get("YALDA_MEMORY_ARENA", "false")),
        )
