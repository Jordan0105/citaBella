import { describe, expect, it } from "vitest";
import { periodDayRange } from "../queries/get-report";

// Sábado 2026-08-29 23:30 UTC = sábado 29 de agosto, 5:30 p.m. en Managua
const SATURDAY = new Date("2026-08-29T23:30:00Z");

describe("periodDayRange", () => {
  it("daily: un solo día en Managua", () => {
    expect(periodDayRange("daily", SATURDAY)).toEqual({
      fromDay: "2026-08-29",
      toDay: "2026-08-29",
    });
  });

  it("weekly: lunes a domingo (ISO, lunes inicio)", () => {
    expect(periodDayRange("weekly", SATURDAY)).toEqual({
      fromDay: "2026-08-24",
      toDay: "2026-08-30",
    });
  });

  it("monthly: mes completo", () => {
    expect(periodDayRange("monthly", SATURDAY)).toEqual({
      fromDay: "2026-08-01",
      toDay: "2026-08-31",
    });
  });

  it("yearly: año completo", () => {
    expect(periodDayRange("yearly", SATURDAY)).toEqual({
      fromDay: "2026-01-01",
      toDay: "2026-12-31",
    });
  });
});
