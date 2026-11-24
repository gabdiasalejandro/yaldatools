Objective: Phase 3 — server refinement (FastAPI + BiRefNet) plus brush, tap-to-select and "improve on the server" in the web.
Branch: feat/phase-3-refine (from feat/rat-mascot) · Delivery: ask-on-risk · Runners: Vitest (apps/web), pytest via uv (apps/api).

## Specs

- S1: Threshold. User: "sí, haz los ajustes" on the proposal "bajar el umbral a ~7 %". Doubtful threshold 0.15 → 0.07.
- S2: "agrega pincel": retouch brush with erase / restore, adjustable size, undo.
- S3: "tocar para seleccionar": the user taps what to keep (include / exclude points); SlimSAM runs in the browser and its mask becomes the cut-out.
- S4: "botón de mejorar en el servidor": always visible after a result, with a privacy notice before sending ("Si una imagen va al servidor, se avisa antes, se borra al terminar y hay una opción de procesarla solo en el dispositivo."). The status bar shows the bytes actually sent.
- S5: "ya pon la api en fastapi": FastAPI service in apps/api, BiRefNet on ONNX Runtime CPU, in-memory bounded queue (no Redis), images never written to disk.
- S6: "determina cómo decidir si van a lite o completo": user-driven ladder. First server request uses BiRefNet lite; a second "try the full model" request uses BiRefNet full. Full can be disabled by configuration (VPS RAM).

API contract (shared by T2 and T5):
- `POST /api/quitar-fondo?model=lite|full`, body = raw image bytes, `Content-Type: image/jpeg|image/png|image/webp`.
- 200 → `image/png` grayscale alpha mask, same size as the decoded input after downscaling to ≤ 2048 px; headers `X-Model`, `X-Processing-Seconds`.
- 413 over 25 MiB · 415 other content type · 422 undecodable · 400 `{"error":"model_unavailable"}` when the model is disabled · 503 `{"error":"busy"}` + `Retry-After` when the queue is full.
- `GET /api/health` → `{"status":"ok","models":{"lite":bool,"full":bool},"queue":{"running":n,"waiting":n,"capacity":n}}`.

## Tasks

| ID | Specs | Route | Status | Commit |
| --- | --- | --- | --- | --- |
| T1 | S1 | inline | done | 6b74cb3 |
| T2 | S5, S6 (API) | delegated (parallel writer, apps/api only) | done | ae0431b |
| T3 | S2 | inline | done | 5987755, 400e7c0 |
| T4 | S3 | inline | done | 5987755, 400e7c0 |
| T5 | S4, S6 (web) | inline | done | 5987755, 400e7c0 |
| T6 | docs | inline | done | (docs commit) |

Route evidence: Writer trigger (a) — the API (Python, apps/api/**) and the web units (TypeScript, apps/web/**) are independent with disjoint edit surfaces and several hundred lines each; launched together.

## Log

- L1 (2026-11-23, user): "sí, haz los ajustes, agrega pincel, tocar para seleccionar, botón de mejorar en el servidor, ya pon la api en fastapi, determina cómo decidir si van a lite o completo, y pincel"
- L2: Evidence for S6 (10 user-judged images): ISNet doubtful did not predict the needed model (needed full at 7 %, lite at 8 % and 20 %, JS enough at 17–18 %). Lite was enough in 3 of 4 server cases → lite first, full on user request.
- L3: T2 writer report: 20 API tests + slow real-model test pass; live server checks OK; extras beyond contract: unknown_model 400, EXIF transpose, 50 MP cap, Cache-Control no-store, docs routes off, magic-byte format sniffing, models.py downloader with sha256. Parent spot check: `uv run pytest -q` → 20 passed; upload read via request.stream() into memory; only BytesIO writes. Scratch /tmp/tmp.Pe9hP6yivu removed.
- L4: RED observed for threshold, brush, SAM helpers and server client tests. Web: 86 tests, typecheck clean, build OK (sam.worker 79 KB; models excluded from build).
- L5: Browser e2e with the API running (synthetic image): erase stroke → alpha 0, undo → 255; SlimSAM ready in 5.4 s, one tap on the head selected only the head; no POST before the privacy dialog; lite 6.9 s, full 18.7 s; status bar 32 KB → 64 KB sent; final state "most powerful model already used"; no console errors. Bug found and fixed: `.window { display:flex }` kept the closed <dialog> visible and blocking clicks.
- L6: Open: deploy (Caddy, COOP/COEP, models + wallpaper on the VPS, Turnstile/rate limit for the API); glass objects remain a known limit.
