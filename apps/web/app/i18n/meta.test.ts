import { describe, expect, it } from "vitest";
import { pageMeta } from "./meta";

describe("pageMeta", () => {
  it("gives each page its own title in its language plus hreflang pairs", () => {
    const tags = pageMeta("/en/qr-code");
    expect(tags).toContainEqual({ title: expect.stringContaining("QR code generator") });
    expect(tags).toContainEqual({
      tagName: "link", rel: "alternate", hrefLang: "es", href: "https://tools.yaldapika.com/es/qr",
    });
    expect(tags).toContainEqual({
      tagName: "link", rel: "alternate", hrefLang: "en", href: "https://tools.yaldapika.com/en/qr-code",
    });
    expect(tags).toContainEqual({
      tagName: "link", rel: "canonical", href: "https://tools.yaldapika.com/en/qr-code",
    });
  });

  it("marks unknown pages as noindex in the language of the URL", () => {
    const tags = pageMeta("/es/nope");
    expect(tags).toContainEqual({ name: "robots", content: "noindex" });
    expect(tags).toContainEqual({ title: expect.stringContaining("Página no encontrada") });
  });
});
