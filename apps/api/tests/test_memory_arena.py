from __future__ import annotations

from yaldatools_api.config import Settings
from yaldatools_api.segmenter import session_options


def test_memory_arena_is_off_by_default_so_memory_returns_between_requests():
    assert Settings().memory_arena is False
    assert session_options(threads=0, memory_arena=False).enable_cpu_mem_arena is False


def test_memory_arena_can_be_turned_back_on():
    assert Settings.from_env({"YALDA_MEMORY_ARENA": "true"}).memory_arena is True
    assert session_options(threads=0, memory_arena=True).enable_cpu_mem_arena is True


def test_threads_are_still_applied():
    assert session_options(threads=3, memory_arena=False).intra_op_num_threads == 3
