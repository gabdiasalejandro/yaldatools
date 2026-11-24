import { describe, expect, it } from "vitest";
import { getMessages } from "~/i18n/messages";
import {
  buildDetailGroups,
  buildRawList,
  decodeUserComment,
  formatAperture,
  formatExposureTime,
  formatTagValue,
} from "./details";

const es = getMessages("es").exif.details;
const en = getMessages("en").exif.details;
const fromAscii = (text: string) => Uint8Array.from(text, (c) => c.charCodeAt(0));

/** Tags as exifr returns them for a camera JPEG with translateValues off. */
const CAMERA = {
  Make: "Canon",
  Model: "Canon EOS R6",
  Orientation: 6,
  Artist: "Ana Pérez",
  ExposureTime: 0.004,
  FNumber: 2.8,
  ExposureProgram: 3,
  ISO: 400,
  DateTimeOriginal: new Date(2024, 4, 3, 10, 11, 12),
  CreateDate: new Date(2024, 4, 3, 10, 11, 13),
  ModifyDate: "2024:05:04 08:00:00",
  Flash: 16,
  FocalLength: 50,
  FocalLengthIn35mmFormat: 75,
  ExifImageWidth: 6000,
  ExifImageHeight: 4000,
  ExposureMode: 0,
  WhiteBalance: 1,
  SerialNumber: "SN0123456789",
  LensMake: "Canon",
  LensModel: "RF50mm F1.8 STM",
  LensSerialNumber: "LN987654",
  GPSLatitudeRef: "N",
  GPSLatitude: [40, 26, 46],
  GPSAltitudeRef: Uint8Array.of(0),
  GPSAltitude: 650.5,
  GPSTimeStamp: "10:11:12",
  GPSDateStamp: "2024:05:03",
  GPSImgDirection: 180.5,
  latitude: 40.446111,
  longitude: -3.7,
  makerNote: new Uint8Array(2048).fill(7),
  userComment: fromAscii("ASCII\0\0\0hola mundo"),
};

const rows = (groups: ReturnType<typeof buildDetailGroups>) =>
  Object.fromEntries(groups.map((group) => [group.id, group.rows.map((row) => [row.label, row.value])]));

describe("formatExposureTime", () => {
  it("shows fast shutter speeds as a fraction and slow ones in seconds", () => {
    expect(formatExposureTime(0.004, "es")).toBe("1/250 s");
    expect(formatExposureTime(1 / 3, "en")).toBe("1/3 s");
    expect(formatExposureTime(2.5, "es")).toBe("2,5 s");
    expect(formatExposureTime(30, "en")).toBe("30 s");
  });
});

describe("formatAperture", () => {
  it("uses the photographic f-number notation", () => {
    expect(formatAperture(2.8)).toBe("f/2.8");
    expect(formatAperture(16)).toBe("f/16");
    expect(formatAperture(1.7999999)).toBe("f/1.8");
  });
});

describe("buildDetailGroups", () => {
  it("groups the technical data in human-readable form", () => {
    expect(rows(buildDetailGroups(CAMERA, "es", es))).toEqual({
      shooting: [
        ["Exposición", "1/250 s"],
        ["Diafragma", "f/2.8"],
        ["ISO", "ISO 400"],
        ["Distancia focal", "50 mm (75 mm en formato 35 mm)"],
        ["Objetivo", "Canon RF50mm F1.8 STM"],
        ["Flash", "No se disparó"],
        ["Balance de blancos", "Manual"],
        ["Modo de exposición", "Automático"],
      ],
      image: [
        ["Dimensiones", "6000 × 4000 px"],
        ["Orientación", "Girada 90° a la derecha"],
      ],
      dates: [
        ["Fecha original", new Date(2024, 4, 3, 10, 11, 12).toLocaleString("es", { dateStyle: "medium", timeStyle: "short" })],
        ["Fecha de digitalización", new Date(2024, 4, 3, 10, 11, 13).toLocaleString("es", { dateStyle: "medium", timeStyle: "short" })],
        ["Fecha de modificación", "2024-05-04 08:00:00"],
      ],
      location: [
        ["Latitud", "40.44611° N"],
        ["Longitud", "3.70000° W"],
        ["Altitud", "650,5 m"],
        ["Fecha y hora GPS", "2024-05-03 10:11:12 UTC"],
        ["Dirección", "180,5°"],
      ],
      identity: [
        ["Número de serie de la cámara", "SN0123456789"],
        ["Número de serie del objetivo", "LN987654"],
      ],
    });
  });

  it("uses English labels on English pages", () => {
    const groups = rows(buildDetailGroups(CAMERA, "en", en));
    expect(groups.shooting[5]).toEqual(["Flash", "Did not fire"]);
    expect(groups.image[1]).toEqual(["Orientation", "Rotated 90° right"]);
    expect(groups.location[2]).toEqual(["Altitude", "650.5 m"]);
  });

  it("handles the less common shapes of these tags", () => {
    const groups = rows(
      buildDetailGroups(
        {
          Flash: 25,
          LensModel: "EF 24-70mm",
          PixelXDimension: 800,
          PixelYDimension: 600,
          GPSAltitude: 12,
          GPSAltitudeRef: 1,
          GPSTimeStamp: [9, 5, 3.5],
          BodySerialNumber: "B-77",
        },
        "en",
        en,
      ),
    );
    expect(groups).toEqual({
      shooting: [
        ["Lens", "EF 24-70mm"],
        ["Flash", "Fired"],
      ],
      image: [["Dimensions", "800 × 600 px"]],
      location: [
        ["Altitude", "-12 m"],
        ["GPS date and time", "09:05:03 UTC"],
      ],
      identity: [["Camera serial number", "B-77"]],
    });
  });

  it("returns no groups when there is nothing technical", () => {
    expect(buildDetailGroups({ Make: "Canon", Artist: "Ana" }, "es", es)).toEqual([]);
  });
});

describe("formatTagValue", () => {
  it("formats numbers, dates, arrays and text for the page language", () => {
    expect(formatTagValue(650.5, "es", es)).toEqual({ text: "650,5" });
    expect(formatTagValue(0.004, "en", en)).toEqual({ text: "0.004" });
    expect(formatTagValue([40, 26, 46.25], "es", es)).toEqual({ text: "40, 26, 46,25" });
    expect(formatTagValue("2024:01:02 03:04:05", "es", es)).toEqual({ text: "2024-01-02 03:04:05" });
    const date = new Date(2024, 4, 3, 10, 11, 12);
    expect(formatTagValue(date, "en", en)).toEqual({
      text: date.toLocaleString("en", { dateStyle: "medium", timeStyle: "short" }),
    });
    expect(formatTagValue("  Ana  ", "es", es)).toEqual({ text: "Ana" });
  });

  it("shows binary data only by its size", () => {
    expect(formatTagValue(new Uint8Array(1536), "es", es)).toEqual({ text: "(datos binarios, 1,5 KB)" });
    expect(formatTagValue(new Uint8Array(20), "en", en)).toEqual({ text: "(binary data, 20 B)" });
  });

  it("lists short byte values as numbers", () => {
    expect(formatTagValue(Uint8Array.of(2, 3, 0, 0), "es", es)).toEqual({ text: "2, 3, 0, 0" });
  });

  it("truncates very long text and keeps the full value as a title", () => {
    const long = "x".repeat(300);
    const value = formatTagValue(long, "es", es);
    expect(value?.text).toHaveLength(120);
    expect(value?.text.endsWith("…")).toBe(true);
    expect(value?.title).toBe(long);
  });

  it("skips empty values", () => {
    expect(formatTagValue("   ", "es", es)).toBeUndefined();
    expect(formatTagValue(undefined, "es", es)).toBeUndefined();
    expect(formatTagValue(null, "es", es)).toBeUndefined();
  });
});

describe("decodeUserComment", () => {
  it("reads the character-code prefix", () => {
    expect(decodeUserComment(fromAscii("ASCII\0\0\0hola mundo"))).toBe("hola mundo");
    expect(decodeUserComment(new Uint8Array([...fromAscii("UNICODE\0"), 0x68, 0, 0xe9, 0]))).toBe("hé");
    expect(decodeUserComment(new Uint8Array([...fromAscii("UNICODE\0"), 0, 0x68, 0, 0xe9]))).toBe("hé");
    expect(decodeUserComment(new Uint8Array([0, 0, 0, 0, 0, 0, 0, 0, ...new TextEncoder().encode("Pérez")]))).toBe("Pérez");
  });

  it("gives nothing for empty or unknown comments", () => {
    expect(decodeUserComment(new Uint8Array([...fromAscii("ASCII\0\0\0"), 0, 0, 0x20]))).toBeUndefined();
    expect(decodeUserComment(new Uint8Array([...fromAscii("JIS\0\0\0\0\0"), 0x1b, 0x24]))).toBeUndefined();
    expect(decodeUserComment(new Uint8Array(4))).toBeUndefined();
  });
});

describe("buildRawList", () => {
  it("lists every tag, never the maker note contents", () => {
    const list = buildRawList(CAMERA, "es", es);
    expect(list).toHaveLength(Object.keys(CAMERA).length);
    expect(list.find((entry) => entry.key === "Make")).toEqual({ key: "Make", text: "Canon" });
    expect(list.find((entry) => entry.key === "Artist")).toEqual({ key: "Artist", text: "Ana Pérez" });
    expect(list.find((entry) => entry.key === "GPSLatitude")).toEqual({ key: "GPSLatitude", text: "40, 26, 46" });
    expect(list.find((entry) => entry.key === "MakerNote")).toEqual({ key: "MakerNote", text: "(datos binarios, 2 KB)" });
    expect(list.find((entry) => entry.key === "UserComment")).toEqual({ key: "UserComment", text: "hola mundo" });
  });

  it("shows an undecodable user comment by its size", () => {
    expect(buildRawList({ userComment: new Uint8Array([...fromAscii("JIS\0\0\0\0\0"), 1, 2]) }, "en", en)).toEqual([
      { key: "UserComment", text: "(binary data, 10 B)" },
    ]);
  });

  it("is empty when there are no tags", () => {
    expect(buildRawList({}, "es", es)).toEqual([]);
  });
});
