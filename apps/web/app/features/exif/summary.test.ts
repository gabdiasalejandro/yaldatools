import { describe, expect, it } from "vitest";
import { summarizeTags } from "./summary";

describe("summarizeTags", () => {
  it("picks the fields people care about and counts the rest", () => {
    const date = new Date(2024, 4, 3, 10, 11, 12);
    const summary = summarizeTags({
      Make: "Canon",
      Model: "Canon EOS R6",
      DateTimeOriginal: date,
      Software: "Lightroom",
      Artist: "Ana",
      Copyright: "© Ana",
      latitude: 40.446,
      longitude: -3.7,
      GPSLatitude: [40, 26, 46],
      GPSLatitudeRef: "N",
      ExposureTime: 0.01,
      FNumber: 2.8,
      Orientation: 6,
    });
    expect(summary).toEqual({
      camera: "Canon EOS R6",
      date,
      software: "Lightroom",
      author: "Ana",
      copyright: "© Ana",
      gps: { latitude: 40.446, longitude: -3.7 },
      otherTags: 2,
    });
  });

  it("joins make and model when the model does not repeat the make", () => {
    expect(summarizeTags({ Make: "Apple", Model: "iPhone 15" }).camera).toBe("Apple iPhone 15");
  });

  it("falls back to other date tags and flags GPS tags without readable coordinates", () => {
    const summary = summarizeTags({ CreateDate: "2024:01:02 03:04:05", GPSAltitude: 650 });
    expect(summary.date).toBe("2024:01:02 03:04:05");
    expect(summary.gps).toEqual({ latitude: null, longitude: null });
    expect(summary.otherTags).toBe(0);
  });

  it("returns an empty summary for no tags", () => {
    expect(summarizeTags(undefined)).toEqual({ otherTags: 0 });
  });
});
