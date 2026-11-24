import { unzipSync } from "fflate";
import { describe, expect, it } from "vitest";
import { buildZip } from "./zip";

describe("buildZip", () => {
  it("stores every file under its own name with identical bytes", async () => {
    const zip = await buildZip([
      { name: "a.jpg", bytes: Uint8Array.of(1, 2, 3) },
      { name: "a.jpg", bytes: Uint8Array.of(4) },
    ]);
    expect(unzipSync(zip)).toEqual({ "a.jpg": Uint8Array.of(1, 2, 3), "a (2).jpg": Uint8Array.of(4) });
  });
});
