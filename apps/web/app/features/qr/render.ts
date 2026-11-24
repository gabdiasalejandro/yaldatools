import type QRCodeStyling from "qr-code-styling";
import { toStylingOptions, type QrAppearance } from "./styling";

// qr-code-styling touches the DOM on import, so it is loaded only in the browser.
async function loadLibrary(): Promise<typeof QRCodeStyling> {
  const module = await import("qr-code-styling");
  return module.default;
}

export async function createPreview(appearance: QrAppearance, data: string, size: number): Promise<QRCodeStyling> {
  const QRCode = await loadLibrary();
  return new QRCode(toStylingOptions(appearance, data, size));
}

/** Renders the code at export size, as PNG (canvas) or SVG. */
export async function renderFile(
  appearance: QrAppearance,
  data: string,
  format: "png" | "svg",
  size: number,
): Promise<Blob> {
  const QRCode = await loadLibrary();
  const qr = new QRCode({ ...toStylingOptions(appearance, data, size), type: format === "svg" ? "svg" : "canvas" });
  const raw = await qr.getRawData(format);
  if (!(raw instanceof Blob)) throw new Error("QR rendering returned no data");
  return raw;
}

export function saveFile(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  // Give the browser time to start the download before releasing the blob.
  window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

export async function copyImage(blob: Blob): Promise<void> {
  if (!navigator.clipboard?.write || typeof ClipboardItem === "undefined") {
    throw new Error("Clipboard images are not supported");
  }
  await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
}
