import { describe, expect, it } from "vitest";
import { nextServerModel, refineErrorFor } from "./serverRefine";

describe("refineErrorFor", () => {
  it("maps API answers to what the user can do about them", () => {
    expect(refineErrorFor(503, { error: "busy" })).toBe("busy");
    expect(refineErrorFor(503, { error: "unavailable" })).toBe("unavailable");
    expect(refineErrorFor(429, { error: "rate_limited" })).toBe("rateLimited");
    expect(refineErrorFor(400, { error: "model_unavailable" })).toBe("modelUnavailable");
    expect(refineErrorFor(413, null)).toBe("tooLarge");
    expect(refineErrorFor(0, null)).toBe("unreachable");
    expect(refineErrorFor(502, null)).toBe("unreachable");
    expect(refineErrorFor(500, null)).toBe("failed");
    expect(refineErrorFor(422, null)).toBe("failed");
  });
});

describe("nextServerModel", () => {
  it("climbs the ladder: lite first, then full, then nothing", () => {
    expect(nextServerModel(null, true)).toBe("lite");
    expect(nextServerModel("birefnet-lite", true)).toBe("full");
    expect(nextServerModel("birefnet", true)).toBeNull();
  });

  it("stops after lite when the full model is disabled", () => {
    expect(nextServerModel(null, false)).toBe("lite");
    expect(nextServerModel("birefnet-lite", false)).toBeNull();
  });
});
