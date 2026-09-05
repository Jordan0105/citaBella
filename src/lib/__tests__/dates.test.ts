import { describe, expect, it } from "vitest";
import {
  endOfManaguaDay,
  endOfManaguaMonth,
  endOfManaguaWeek,
  formatManaguaDate,
  getManaguaParts,
  startOfManaguaDay,
  startOfManaguaMonth,
  startOfManaguaWeek,
} from "../dates";

// 2026-08-29T23:30:00Z = sábado 29 de agosto de 2026, 5:30 p.m. en Managua
const SATURDAY_NIGHT = new Date("2026-08-29T23:30:00Z");

describe("getManaguaParts", () => {
  it("convierte un instante a hora de Managua", () => {
    const p = getManaguaParts(SATURDAY_NIGHT);
    expect(p).toEqual({
      year: 2026,
      month: 8,
      day: 29,
      hour: 17,
      minute: 30,
      second: 0,
    });
  });
});

describe("startOfManaguaDay", () => {
  it("es 06:00 UTC del mismo día calendario", () => {
    expect(startOfManaguaDay(SATURDAY_NIGHT).toISOString()).toBe(
      "2026-08-29T06:00:00.000Z",
    );
  });
});

describe("endOfManaguaDay", () => {
  it("es 05:59:59.999 UTC del día siguiente", () => {
    expect(endOfManaguaDay(SATURDAY_NIGHT).toISOString()).toBe(
      "2026-08-30T05:59:59.999Z",
    );
  });
});

describe("startOfManaguaWeek", () => {
  it("para un sábado devuelve el lunes 00:00 Managua", () => {
    expect(startOfManaguaWeek(SATURDAY_NIGHT).toISOString()).toBe(
      "2026-08-24T06:00:00.000Z",
    );
  });

  it("para un domingo devuelve el lunes anterior", () => {
    const sunday = new Date("2026-08-30T15:00:00Z");
    expect(startOfManaguaWeek(sunday).toISOString()).toBe(
      "2026-08-24T06:00:00.000Z",
    );
  });

  it("para un lunes devuelve ese mismo día", () => {
    const monday = new Date("2026-08-24T22:00:00Z");
    expect(startOfManaguaWeek(monday).toISOString()).toBe(
      "2026-08-24T06:00:00.000Z",
    );
  });
});

describe("endOfManaguaWeek", () => {
  it("es domingo 23:59:59.999 Managua (lunes siguiente 05:59 UTC)", () => {
    expect(endOfManaguaWeek(SATURDAY_NIGHT).toISOString()).toBe(
      "2026-08-31T05:59:59.999Z",
    );
  });
});

describe("startOfManaguaMonth", () => {
  it("es día 1 del mes a 00:00 Managua", () => {
    expect(startOfManaguaMonth(SATURDAY_NIGHT).toISOString()).toBe(
      "2026-08-01T06:00:00.000Z",
    );
  });
});

describe("endOfManaguaMonth", () => {
  it("es el último día del mes a 23:59:59.999 Managua", () => {
    expect(endOfManaguaMonth(SATURDAY_NIGHT).toISOString()).toBe(
      "2026-09-01T05:59:59.999Z",
    );
  });

  it("maneja años bisiestos (feb 2028)", () => {
    const feb = new Date("2028-02-10T20:00:00Z");
    expect(endOfManaguaMonth(feb).toISOString()).toBe(
      "2028-03-01T05:59:59.999Z",
    );
  });
});

describe("formatManaguaDate", () => {
  it("formatea fecha y hora en español", () => {
    expect(formatManaguaDate(SATURDAY_NIGHT, "date")).toContain(
      "29 de agosto de 2026",
    );
    expect(formatManaguaDate(SATURDAY_NIGHT, "time")).toBe("17:30");
  });
});
