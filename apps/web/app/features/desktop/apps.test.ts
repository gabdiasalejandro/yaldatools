import { describe, expect, it } from "vitest";
import { getMessages } from "~/i18n/messages";
import { DESKTOP_APPS, searchApps, toolStats } from "./apps";

const es = getMessages("es").desktop.apps;
const en = getMessages("en").desktop.apps;
const ids = (query: string, texts = es) => searchApps(DESKTOP_APPS, texts, query).map((app) => app.id);

describe("searchApps", () => {
  it("returns every program for an empty query", () => {
    expect(ids("  ")).toHaveLength(DESKTOP_APPS.length);
  });

  it("matches labels and keywords, ignoring case and accents", () => {
    expect(ids("qr wifi")).toEqual(["qr"]);
    expect(ids("CONTRASENA")).toEqual(["passwords"]);
    expect(ids("leeme")).toEqual(["readme"]);
  });

  it("searches in the page language", () => {
    expect(ids("background", en)).toEqual(["removeBg"]);
  });

  it("requires every word to match", () => {
    expect(ids("qr pdf")).toEqual([]);
  });
});

describe("toolStats", () => {
  it("counts tools only, not the readme or support files", () => {
    expect(toolStats(DESKTOP_APPS)).toEqual({ total: 6, ready: 2 });
  });
});
