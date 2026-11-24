import { PDFDocument } from "pdf-lib";
import { describe, expect, it } from "vitest";
import { inspectPdf, mergePdfs } from "./merge";
import { makeCorruptPdf, makeEncryptedPdf, makePdf } from "./testPdfs";

async function pageWidths(bytes: Uint8Array): Promise<number[]> {
  const doc = await PDFDocument.load(bytes);
  return doc.getPages().map((page) => page.getWidth());
}

describe("inspectPdf", () => {
  it("counts the pages of a valid PDF", async () => {
    expect(await inspectPdf(await makePdf([100, 200, 300]))).toEqual({ ok: true, pages: 3 });
  });

  it("reports a password-protected PDF as encrypted", async () => {
    expect(await inspectPdf(await makeEncryptedPdf())).toEqual({ ok: false, reason: "encrypted" });
  });

  it("reports a damaged PDF as broken instead of throwing", async () => {
    expect(await inspectPdf(makeCorruptPdf())).toEqual({ ok: false, reason: "broken" });
  });
});

describe("mergePdfs", () => {
  it("joins every page in list order", async () => {
    const one = await makePdf([101]);
    const three = await makePdf([201, 202, 203]);
    const merged = await mergePdfs([one, three]);
    expect(await pageWidths(merged)).toEqual([101, 201, 202, 203]);
  });

  it("follows the order it is given", async () => {
    const one = await makePdf([101]);
    const three = await makePdf([201, 202, 203]);
    expect(await pageWidths(await mergePdfs([three, one]))).toEqual([201, 202, 203, 101]);
  });

  it("reports progress after each file", async () => {
    const steps: [number, number][] = [];
    await mergePdfs([await makePdf([1]), await makePdf([2])], (done, total) => steps.push([done, total]));
    expect(steps).toEqual([
      [1, 2],
      [2, 2],
    ]);
  });

});
