/** Donation link. Empty until the donation platform exists (docs/especificaciones.md). */
export const SUPPORT_URL: string | null = null;

/**
 * Background-removal model (ISNet general-use, int8). It is larger than the
 * 25 MiB per-file limit of Cloudflare Pages, so production points this to
 * external storage with VITE_BG_MODEL_URL. Locally: `pnpm fetch-model`.
 */
export const BG_MODEL_URL: string = import.meta.env.VITE_BG_MODEL_URL ?? "/models/isnet-general-use-q8.onnx";
