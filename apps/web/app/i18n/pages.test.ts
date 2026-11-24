import { describe, expect, it } from "vitest";
import { alternatePath, findPage, localeFromPath, pathFor, prerenderPaths } from "./pages";

describe("pathFor", () => {
  it("uses translated slugs per language", () => {
    expect(pathFor("qr", "es")).toBe("/es/qr");
    expect(pathFor("qr", "en")).toBe("/en/qr-code");
    expect(pathFor("removeBg", "es")).toBe("/es/quitar-fondo");
    expect(pathFor("removeBg", "en")).toBe("/en/remove-background");
    expect(pathFor("exif", "es")).toBe("/es/quitar-exif");
    expect(pathFor("exif", "en")).toBe("/en/remove-exif");
    expect(pathFor("mergePdf", "es")).toBe("/es/unir-pdf");
    expect(pathFor("mergePdf", "en")).toBe("/en/merge-pdf");
    expect(pathFor("support", "es")).toBe("/es/apoyar");
    expect(pathFor("support", "en")).toBe("/en/support");
  });
});

describe("findPage", () => {
  it("resolves a path to its page and language, ignoring a trailing slash", () => {
    expect(findPage("/en/qr-code")).toEqual({ page: "qr", locale: "en" });
    expect(findPage("/es/quitar-fondo/")).toEqual({ page: "removeBg", locale: "es" });
  });

  it("returns null for unknown paths", () => {
    expect(findPage("/es/nope")).toBeNull();
    expect(findPage("/")).toBeNull();
  });
});

describe("alternatePath", () => {
  it("leads to the same tool in the other language", () => {
    expect(alternatePath("/es/qr", "en")).toBe("/en/qr-code");
    expect(alternatePath("/en/remove-background", "es")).toBe("/es/quitar-fondo");
    expect(alternatePath("/es/quitar-exif", "en")).toBe("/en/remove-exif");
    expect(alternatePath("/en/merge-pdf", "es")).toBe("/es/unir-pdf");
  });

  it("falls back to the home page of the target language", () => {
    expect(alternatePath("/es/nope", "en")).toBe("/en");
  });
});

describe("localeFromPath", () => {
  it("reads the first segment and defaults to Spanish", () => {
    expect(localeFromPath("/en/support")).toBe("en");
    expect(localeFromPath("/es")).toBe("es");
    expect(localeFromPath("/fr/x")).toBe("es");
    expect(localeFromPath("/")).toBe("es");
  });
});

describe("prerenderPaths", () => {
  it("lists every page in both languages", () => {
    const paths = prerenderPaths();
    expect(paths).toContain("/es/qr");
    expect(paths).toContain("/en/qr-code");
    expect(paths).toContain("/es/quitar-exif");
    expect(paths).toContain("/en/remove-exif");
    expect(paths).toContain("/es/unir-pdf");
    expect(paths).toContain("/en/merge-pdf");
    expect(new Set(paths).size).toBe(paths.length);
  });
});
