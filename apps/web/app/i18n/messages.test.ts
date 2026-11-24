import { describe, expect, it } from "vitest";
import en from "./messages/en.json";
import es from "./messages/es.json";
import { format } from "./messages";

function keyPaths(value: unknown, prefix = ""): string[] {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return [prefix];
  return Object.entries(value).flatMap(([key, child]) => keyPaths(child, prefix ? `${prefix}.${key}` : key));
}

describe("messages", () => {
  it("has the same keys in Spanish and English", () => {
    expect(keyPaths(en).sort()).toEqual(keyPaths(es).sort());
  });
});

describe("format", () => {
  it("replaces named placeholders and leaves unknown ones untouched", () => {
    expect(format("{total} programas · {ready} listos", { total: 8, ready: 2 })).toBe("8 programas · 2 listos");
    expect(format("Hola {name}", {})).toBe("Hola {name}");
  });
});
