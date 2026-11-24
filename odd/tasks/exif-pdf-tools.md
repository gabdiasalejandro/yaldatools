Objective: two new in-browser tools — Remove EXIF, then Merge PDF — on the existing YaldaTools shell (React Router + Vite, ES/EN, Win95 style).
Branch: feat/exif-pdf-tools (from feat/phase-3-refine) · Delivery: ask-on-risk · Test runner: Vitest (`pnpm test` in apps/web).

## Specs

- S1 (both): Runs only in the browser; nothing is uploaded ("Las herramientas locales no envían nada; la barra de estado lo dice ("0 bytes enviados")."). Each tool has its own page per language with translated slugs, title and description (SEO), desktop icon no longer "pronto", rat mascot, ES/EN texts in es.json/en.json, a short help/FAQ block under the tool ("Cada página lleva debajo un texto breve de ayuda y preguntas frecuentes, en estilo "Léeme.txt"."). Routes: `/es/quitar-exif` + `/en/remove-exif`; `/es/unir-pdf` + `/en/merge-pdf`.
- S2 (EXIF): Agreed scope: "Mostrar qué datos lleva la foto (sobre todo el GPS) y quitarlos **sin volver a comprimir**, editando el archivo JPEG, PNG o WebP directamente." Several files at once; download each one, or all together as a ZIP. Keep the color profile (ICC) and keep the image upright: when the original had an EXIF orientation other than 1, the output keeps a minimal EXIF with only the Orientation tag. Show a clear warning when GPS location is present.
- S3 (PDF): Agreed scope: "Unir y reordenar con `pdf-lib` (MIT)". Add several PDFs, see name and page count, reorder (keyboard-accessible buttons; drag optional), remove, merge, download. Encrypted or broken PDFs get a clear message instead of a crash. Thumbnails with pdf.js are out of scope for this version.

## Tasks

| ID | Specs | Route | Status | Commit |
| --- | --- | --- | --- | --- |
| T1 | S1, S2 | delegated (context backstop) | done | b5a7d20 |
| T2 | S1, S3 | delegated (context backstop), after T1 | done | (this commit) |

Route evidence: long-session backstop — the parent context is far past ~150k tokens; units run one after the other as the user asked ("primero exif, luego pdf"), so no shared-file conflicts.

## Log

- L1 (2026-11-23, user): "puedes ir haciendo la del exif y luego la de los pdf's?"
- L2: Scope comes from the estimate the user accepted: EXIF "Mostrar qué datos lleva la foto (sobre todo el GPS) y quitarlos sin volver a comprimir"; PDF "Unir y reordenar con pdf-lib (MIT); las miniaturas de las páginas con pdf.js (Apache-2.0), que pesa más" — thumbnails deferred.
- L3: T1 writer report: 129 tests (RED per pure module), typecheck, build with prerendered /es/quitar-exif + /en/remove-exif in sitemap; exifr 7.1.3 + fflate 0.8.3 (MIT) lazy chunks. Deviations accepted: trailing data after EOI/IEND/RIFF dropped (can hide previews; strips motion-photo video), PNG keeps Orientation-only eXIf, readme credits list exifr/fflate. Parent check: 129 tests pass; dev server restarted (stuck 500 after routes.ts referenced a missing module); browser: GPS warning + camera shown, download gps-sin-exif.jpg has EXIF {274: 6} only, no GPS, pixels identical, 0 non-GET, no errors. Scratch /tmp/tmp.j2W2nuYbwZ and /tmp/tmp.IfmgsnqxYq removed.
- L4: T2 writer report: 148 tests, typecheck, build; pdf-lib 1.17.1 (MIT) lazy chunk ~420 KB; encrypted PDFs detected via ignoreEncryption + isEncrypted; keyboard reorder with focus management and aria-live; no drag-and-drop (optional). Parent check: 148 tests; browser: a.pdf (1 p) + b.pdf (2 p), "Subir b.pdf", merged unido.pdf page widths [221, 222, 111] = new order, 0 non-GET, no errors. Parent fix: formatBytes moved to app/shared/format/bytes.ts so the PDF tool no longer imports from features/exif (exif-* CSS classes are still shared; a shared drop zone is a follow-up). Scratch /tmp/tmp.IPkikvUdoZ removed.
