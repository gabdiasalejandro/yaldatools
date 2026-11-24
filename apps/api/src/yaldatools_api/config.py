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

    def __post_init__(self) -> None:
        object.__setattr__(self, "models_dir", Path(self.models_dir).expanduser())
        if self.concurrency < 1:
            raise ValueError("YALDA_CONCURRENCY must be at least 1")
        if self.max_waiting < 0 or self.threads < 0:
            raise ValueError("YALDA_MAX_WAITING and YALDA_THREADS cannot be negative")

    @classmethod
    def from_env(cls, env: dict[str, str] | None = None) -> Settings:
        env = os.environ if env is None else env
        return cls(
            models_dir=env.get("YALDA_MODELS_DIR", DEFAULT_MODELS_DIR),
            enable_full=_bool(env.get("YALDA_ENABLE_FULL", "true")),
            concurrency=int(env.get("YALDA_CONCURRENCY", "1")),
            max_waiting=int(env.get("YALDA_MAX_WAITING", "4")),
            threads=int(env.get("YALDA_THREADS", "0")),
        )
