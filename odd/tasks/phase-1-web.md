Objective: Phase 1 of YaldaTools — site base, ES/EN, desktop home and QR Code tool, in React + TypeScript + Vite.
Branch: feat/phase-1-web · Delivery: ask-on-risk (chain strategy asked at delivery) · Test runner: Vitest (`pnpm test` in apps/web).

## Specs

- S1: Stack. User: "en react y ts con vite por favor, el backend decides tú qué es lo más óptimo." Web uses React Router v8 framework mode (Vite) with `ssr: false` + `prerender` so every tool page and language is a static HTML page (docs/especificaciones.md, SEO: "Una página estática por herramienta e idioma").
- S2: Backend decision (documented, not built in phase 1): FastAPI + ONNX Runtime + BiRefNet on the VPS, in-process bounded queue instead of Redis (single VPS). Built in phase 3.
- S3: i18n routes: "`/es/qr`, `/es/quitar-fondo` y `/en/qr-code`, `/en/remove-background`"; "al entrar en `/` se elige según `Accept-Language`; si no hay coincidencia, español. La elección manual se guarda en `localStorage`." (static hosting: decided client-side from `navigator.languages`). "El botón ES | EN de la bandeja del taskbar lleva a la misma herramienta en el otro idioma." "etiquetas `hreflang` entre pares, y título y descripción propios por página e idioma." "un archivo JSON por idioma (`es.json`, `en.json`)".
- S4: Visual system from design/mockup (tokens, bevels, Pixelify Sans / Tahoma / VT323, 44 px targets, `prefers-reduced-motion`, mobile single window). Assumption: `98.css` is NOT used because its package ships MS Sans Serif fonts and the specs say "nada de logos, nombres ni fuentes de Microsoft"; own CSS replicates the mockup bevels. Title bar: "sakura" (mockup default; pending decision kept as one CSS variable).
- S5: Home desktop: program icons (Quitar fondo, Código QR, 4 "pronto", Léeme.txt, Apoyar), search, welcome window, mascot placeholder, wallpaper credit "Ilustración / ノーコピーライトガール" / "Illustration / No Copyright Girl". Wallpaper file is not committed (license forbids redistribution).
- S6: QR Code: "Tipos: URL, texto, WiFi (SSID, contraseña y seguridad), contacto vCard, WhatsApp y email." "color de puntos y de fondo, forma de puntos (cuadrado, redondo, puntos) y logo central opcional." "Al poner un logo, la corrección de errores pasa sola a H." "Exportar a PNG (hasta 2048 px) y SVG, y copiar al portapapeles." "Aviso de contraste si los colores elegidos dificultan el escaneo." Library `qr-code-styling`. Status bar "0 bytes enviados".
- S7: Support page `/es/apoyar` + `/en/support`, link in one config variable, empty for now. Remove background page placeholder for phase 2. Léeme/readme page with credits. 404 page.
- S8: SEO basics: sitemap, robots, Open Graph title/description.

## Tasks

| ID | Specs | Route | Status | Commit |
| --- | --- | --- | --- | --- |
| T1 | S1, S3, S4 | inline | done | 7339f5e, ab2eaf2 |
| T2 | S5 | inline | done | ab2eaf2 |
| T3 | S6 (domain + tests) | inline | done | ba3170b |
| T4 | S6 (UI) | inline | done | ae3d67b |
| T5 | S7, S8 | inline | done | ab2eaf2 |
| T6 | S1, S2 docs | inline | done | (docs commit) |

Route evidence: no Writer trigger (units depend on the shared shell from T1; no parallel independent units, no context backstop).

## Log

- L1 (2026-11-23, user): "Hola, crees que puedas empezar con este proyecto? en react y ts con vite por favor, el backend decides tú qué es lo más óptimo."
- L2: Scope of "empezar" = Phase 1 per docs/especificaciones.md. Specs say Astro; user asked React + TS + Vite → React Router v8 framework mode with prerender keeps the static-per-page SEO requirement.
- L3: Evidence: `npm pack 98.css@0.1.21` contains `dist/ms_sans_serif.woff2` → conflicts with the no-Microsoft-fonts rule; own CSS instead.
- L4: RED observed for i18n, desktop search, QR payload/contrast and styling tests before implementation (meta and messages tests written together with the code). The WiFi escaping test caught a real bug: a shell heredoc turned `\\;` into `\;`, so backslashes and vCard semicolons were not escaped; fixed and pinned with a vCard test.
- L5: Checks: `pnpm test` 42/42, `pnpm typecheck` clean, `pnpm build` prerenders 11 HTML pages + sitemap.xml + 404.html. Headless Chromium: `/` redirects es-ES→/es, en-US→/en, de-DE→/es; search "wifi"+Enter opens /es/qr; PNG export 1024×1024; SVG export; WiFi nopass hides password; values kept across tabs; contrast warning shown for light dots; ES|EN switch → /en/qr-code, html lang=en, choice saved; mobile 390 px without horizontal overflow; only 404 is the uncommitted wallpaper.webp.
- L6: RDD is off (global), so no native review. Delivery chain strategy still to be asked before any PR.
