import { describe, expect, it } from "vitest";
import { checkFile, cleanedName, MAX_FILE_BYTES, uniqueNames } from "./intake";

describe("checkFile", () => {
  it("accepts JPEG, PNG and WebP up to 25 MB, and files without a declared type", () => {
    expect(checkFile({ type: "image/jpeg", size: 10 })).toBeNull();
    expect(checkFile({ type: "image/webp", size: MAX_FILE_BYTES })).toBeNull();
    expect(checkFile({ type: "", size: 10 })).toBeNull();
  });

  it("rejects other types and files over 25 MB", () => {
    expect(checkFile({ type: "application/pdf", size: 10 })).toBe("unsupportedType");
    expect(checkFile({ type: "image/gif", size: 10 })).toBe("unsupportedType");
    expect(checkFile({ type: "image/png", size: MAX_FILE_BYTES + 1 })).toBe("tooLarge");
  });
});

describe("cleanedName", () => {
  it("adds the suffix before the extension and keeps the extension", () => {
    expect(cleanedName("IMG_0001.JPG", "-sin-exif", "jpeg")).toBe("IMG_0001-sin-exif.JPG");
    expect(cleanedName("my.photo.webp", "-no-exif", "webp")).toBe("my.photo-no-exif.webp");
  });

  it("adds the format's extension when the name has none", () => {
    expect(cleanedName("image", "-no-exif", "png")).toBe("image-no-exif.png");
    expect(cleanedName("", "-no-exif", "jpeg")).toBe("image-no-exif.jpg");
  });
});

describe("uniqueNames", () => {
  it("numbers repeated names so a ZIP keeps every file", () => {
    expect(uniqueNames(["a.jpg", "b.jpg", "a.jpg", "A.jpg"])).toEqual(["a.jpg", "b.jpg", "a (2).jpg", "A (3).jpg"]);
  });
});
