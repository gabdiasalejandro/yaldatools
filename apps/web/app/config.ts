/** Donation link. Empty until the donation platform exists (docs/especificaciones.md). */
export const SUPPORT_URL: string | null = null;

/**
 * Background-removal model (ISNet general-use, int8). It is larger than the
 * 25 MiB per-file limit of Cloudflare Pages, so production points this to
 * external storage with VITE_BG_MODEL_URL. Locally: `pnpm fetch-model`.
 */
export const BG_MODEL_URL: string = import.meta.env.VITE_BG_MODEL_URL ?? "/models/isnet-general-use-q8.onnx";

/** SlimSAM files for tap-to-select (about 14 MB, int8). Locally: `pnpm fetch-model`. */
export const SAM_MODEL_BASE: string = import.meta.env.VITE_SAM_MODEL_BASE ?? "/models/slimsam";
