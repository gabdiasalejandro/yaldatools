import { describe, expect, it } from "vitest";
import { DEFAULT_APPEARANCE, effectiveEcc, toStylingOptions } from "./styling";

describe("effectiveEcc", () => {
  it("switches to H on its own when there is a logo", () => {
    expect(effectiveEcc({ ...DEFAULT_APPEARANCE, ecc: "M", logo: "data:image/png;base64,x" })).toBe("H");
  });

  it("keeps the chosen level without a logo", () => {
    expect(effectiveEcc({ ...DEFAULT_APPEARANCE, ecc: "M", logo: null })).toBe("M");
  });
});

describe("toStylingOptions", () => {
  it("maps colors, shape, size and error correction", () => {
    const options = toStylingOptions(
      { ...DEFAULT_APPEARANCE, dots: "#a4307f", background: "#ffffff", shape: "dots", ecc: "M" },
      "https://yaldapika.com",
      2048,
    );
    expect(options).toMatchObject({
      width: 2048,
      height: 2048,
      data: "https://yaldapika.com",
      qrOptions: { errorCorrectionLevel: "M" },
      dotsOptions: { color: "#a4307f", type: "dots" },
      backgroundOptions: { color: "#ffffff" },
    });
  });

  it("adds the logo as a centered image", () => {
    const options = toStylingOptions({ ...DEFAULT_APPEARANCE, logo: "data:x" }, "hi", 300);
    expect(options.image).toBe("data:x");
    expect(options.qrOptions?.errorCorrectionLevel).toBe("H");
  });
});
