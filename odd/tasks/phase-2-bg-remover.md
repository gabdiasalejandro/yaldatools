Objective: Phase 2 of YaldaTools — in-browser background remover with triage and diagnostics panel.
Branch: feat/phase-2-bg-remover (from feat/phase-1-web) · Delivery: ask-on-risk · Test runner: Vitest (`pnpm test` in apps/web).

## Specs

- S1: Intake. "El usuario sube o pega una imagen (JPG, PNG o WebP; hasta 25 MB, que se reduce a 2048 px de lado mayor)."
- S2: Triage. "El triage en el navegador mide la uniformidad del borde, el contraste y la densidad de bordes."
- S3: Easy path. "Si el fondo es uniforme, se recorta con *flood fill* (OpenCV.js)." Assumption: flood fill is implemented in TypeScript instead of OpenCV.js (~8 MB of WASM for one algorithm); same behavior, testable, no extra download.
- S4: Model path. "Si no, pasa por un modelo ligero en el navegador (ISNet o MODNet cuantizado), del que se mide la zona de alfa dudosa." Decision: ISNet general-use, int8 dynamic quantization made locally from the rembg release (MODNet is portrait-only). ~44 MB, over the 25 MiB Cloudflare Pages per-file limit → model URL is configurable; production hosting (R2) is part of the deploy work.
- S5: "Si la zona dudosa supera un umbral a calibrar (punto de partida: 15 %), se ofrece refinar en el servidor con aviso de privacidad. En la v1 este paso queda desactivado."
- S6: "El resultado tiene fondo transparente, blanco o de color, y se descarga en PNG."
- S7: "El panel de diagnóstico enseña la dificultad, el método elegido y dónde se procesó."
- S8: Privacy: "Las herramientas locales no envían nada; la barra de estado lo dice ("0 bytes enviados")." The wallpaper must never be used as a test image (license forbids AI use).

## Tasks

| ID | Specs | Route | Status | Commit |
| --- | --- | --- | --- | --- |
| T1 | S1 | inline | done | e0c507b |
| T2 | S2, S3 | inline | done | e0c507b |
| T3 | S4, S5 | inline | done | 4fb980c |
| T4 | S6, S7, S8 (UI + worker) | inline | done | 0a475f0 |
| T5 | docs | inline | done | (docs commit) |

Route evidence: inline; units share the same pipeline types and UI, no parallel independent units.

## Log

- L1 (2026-11-23, user): "empieza la fase 2 ahora ci xd"
- L2: Research: ISNet general int8 ≈ 44 MB, fp32 ≈ 176 MB (Apache-2.0 upstream xuebinqin/DIS); MODNet quantized 6.63 MB, portraits only; Cloudflare Pages caps each file at 25 MiB.
- L3: Model built by scripts/fetch-model.sh from the rembg release (178,648,008 bytes), int8 dynamic quantization → 45 MB. I/O: input_image [1,3,1024,1024] → output_image [1,1,1024,1024] (sigmoid). Ops include ConvInteger → WASM backend only. Source sha256 not pinned yet (lost to an output filter on the first run).
- L4: RED observed for intake, triage, flood fill, model helpers and pipeline tests. 72 tests, typecheck clean. Build: worker 80 KB, ort wasm 15 MB; public/models and wallpaper.png removed from build/client.
- L5: Browser e2e (dev server, synthetic images only, never the wallpaper): GIF rejected with message; plain-background PNG → flood fill, easy, 0.1 s, PNG download; busy JPG → stages "Descargando el modelo…" → "Recortando con el modelo…", ISNet, medium, doubtful 4 %, 4.7 s; white background option; no non-GET requests (nothing uploaded); no console errors. QR re-checked after moving saveFile: PNG 1024, SVG OK.
- L6: Open: production model hosting (R2) with deploy; COOP/COEP for threads; calibrate the 15 % threshold with real photos; pin model sha256.
