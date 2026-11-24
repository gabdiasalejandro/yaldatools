/** Donation link (docs/especificaciones.md: one config variable). */
export const SUPPORT_URL: string | null = "https://ko-fi.com/yaldapika";

/**
 * Background-removal model (ISNet general-use, int8). Rosemary serves it
 * under /models/. For local development run `pnpm fetch-model`.
 */
export const BG_MODEL_URL: string = import.meta.env.VITE_BG_MODEL_URL ?? "/models/isnet-general-use-q8.onnx";

export const BG_SERVER_FULL = import.meta.env.VITE_BG_SERVER_FULL !== "false";

/** SlimSAM files for tap-to-select (about 14 MB, int8). Locally: `pnpm fetch-model`. */
export const SAM_MODEL_BASE: string = import.meta.env.VITE_SAM_MODEL_BASE ?? "/models/slimsam";
