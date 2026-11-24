import { describe, expect, it } from "vitest";
import { formatBytes, formatCoordinates, formatDate } from "./display";

describe("formatCoordinates", () => {
  it("shows degrees with hemispheres", () => {
    expect(formatCoordinates(40.446111, -3.7)).toBe("40.44611° N, 3.70000° W");
    expect(formatCoordinates(-33.8688, 151.2093)).toBe("33.86880° S, 151.20930° E");
  });
});

describe("formatBytes", () => {
  it("uses the page language and a readable unit", () => {
    expect(formatBytes(512, "es")).toBe("512 B");
    expect(formatBytes(1536, "en")).toBe("1.5 KB");
    expect(formatBytes(2.25 * 1024 * 1024, "es")).toBe("2,3 MB");
  });
});

describe("formatDate", () => {
  it("formats real dates in the page language and tidies raw Exif strings", () => {
    expect(formatDate(new Date(2024, 4, 3, 10, 11, 12), "en")).toContain("2024");
    expect(formatDate("2024:01:02 03:04:05", "es")).toBe("2024-01-02 03:04:05");
  });
});
