FROM python:3.12-slim-bookworm

ENV UV_PYTHON_DOWNLOADS=never \
    UV_NO_CACHE=1 \
    PYTHONUNBUFFERED=1 \
    YALDA_MODELS_DIR=/opt/models \
    YALDA_LITE_SIDE=512 \
    YALDA_FULL_SIDE=512 \
    YALDA_ENABLE_FULL=true \
    YALDA_CONCURRENCY=1 \
    YALDA_THREADS=2

WORKDIR /opt/yaldatools

RUN pip install --no-cache-dir uv==0.13.7
COPY apps/api/pyproject.toml apps/api/uv.lock apps/api/README.md ./
COPY apps/api/src/ src/
RUN uv sync --locked --no-dev --no-editable
COPY BiRefNet-lite-512.onnx BiRefNet-full-512.onnx /opt/models/

USER 65532:65532
CMD ["/opt/yaldatools/.venv/bin/uvicorn", "yaldatools_api.app:app", "--host", "0.0.0.0", "--port", "8000"]
