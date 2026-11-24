import { describe, expect, it } from "vitest";
import { pickLocale } from "./detect";

describe("pickLocale", () => {
  it("prefers the manual choice saved in localStorage", () => {
    expect(pickLocale("en", ["es-MX"])).toBe("en");
  });

  it("ignores an invalid saved value", () => {
    expect(pickLocale("fr", ["en-US"])).toBe("en");
  });

  it("uses the first browser language that matches", () => {
    expect(pickLocale(null, ["de-DE", "en-GB", "es"])).toBe("en");
    expect(pickLocale(null, ["es-419"])).toBe("es");
  });

  it("falls back to Spanish when nothing matches", () => {
    expect(pickLocale(null, ["de", "fr"])).toBe("es");
    expect(pickLocale(null, [])).toBe("es");
  });
});
