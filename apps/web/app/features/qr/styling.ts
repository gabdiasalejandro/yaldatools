import type { Options } from "qr-code-styling";

export type DotShape = "square" | "rounded" | "dots";
export type EccLevel = "M" | "H";

export type QrAppearance = {
  dots: string;
  background: string;
  shape: DotShape;
  ecc: EccLevel;
  /** Logo as a data URL: it is read in the browser and never uploaded. */
  logo: string | null;
};

export const DEFAULT_APPEARANCE: QrAppearance = {
  dots: "#000080",
  background: "#ffffff",
  shape: "square",
  ecc: "M",
  logo: null,
};

export const PNG_SIZES = [512, 1024, 2048] as const;
export type PngSize = (typeof PNG_SIZES)[number];

const SHAPES: Record<DotShape, Pick<Options, "dotsOptions" | "cornersSquareOptions" | "cornersDotOptions">> = {
  square: { dotsOptions: { type: "square" }, cornersSquareOptions: { type: "square" }, cornersDotOptions: { type: "square" } },
  rounded: {
    dotsOptions: { type: "rounded" },
    cornersSquareOptions: { type: "extra-rounded" },
    cornersDotOptions: { type: "square" },
  },
  dots: { dotsOptions: { type: "dots" }, cornersSquareOptions: { type: "extra-rounded" }, cornersDotOptions: { type: "dot" } },
};

/** A logo hides part of the code, so it always needs the highest correction. */
export function effectiveEcc(appearance: QrAppearance): EccLevel {
  return appearance.logo ? "H" : appearance.ecc;
}

export function toStylingOptions(appearance: QrAppearance, data: string, size: number): Partial<Options> {
  const shape = SHAPES[appearance.shape];
  return {
    type: "canvas",
    width: size,
    height: size,
    // Quiet zone around the code, needed by most readers.
    margin: Math.round(size / 20),
    data,
    image: appearance.logo ?? undefined,
    qrOptions: { errorCorrectionLevel: effectiveEcc(appearance) },
    dotsOptions: { ...shape.dotsOptions, color: appearance.dots },
    cornersSquareOptions: { ...shape.cornersSquareOptions, color: appearance.dots },
    cornersDotOptions: { ...shape.cornersDotOptions, color: appearance.dots },
    backgroundOptions: { color: appearance.background },
    imageOptions: { hideBackgroundDots: true, imageSize: 0.35, margin: Math.round(size / 100) },
  };
}
