/**
 * Helpers de tiempo del negocio. Todo CitaBella opera en America/Managua
 * (UTC-6 fijo, sin DST) sin importar la zona del dispositivo.
 * Los límites de día/semana/mes se calculan SIEMPRE con estas funciones.
 */
export const SALON_TIME_ZONE = "America/Managua";

const MANAGUA_OFFSET_MS = -6 * 60 * 60 * 1000;

const DAY_MS = 24 * 60 * 60 * 1000;

export interface ManaguaParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

const PARTS_FORMATTER = new Intl.DateTimeFormat("en-CA", {
  timeZone: SALON_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

/** Partes de calendario (fecha y hora en Managua) de un instante. */
export function getManaguaParts(date: Date): ManaguaParts {
  const parts: Record<string, number> = {};
  for (const part of PARTS_FORMATTER.formatToParts(date)) {
    if (part.type !== "literal") parts[part.type] = Number(part.value);
  }
  return {
    year: parts.year,
    month: parts.month,
    day: parts.day,
    hour: parts.hour,
    minute: parts.minute,
    second: parts.second,
  };
}

/** Fecha-hora de pared en Managua → instante UTC. */
function managuaWallToUtc(p: ManaguaParts): Date {
  return new Date(
    Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) -
      MANAGUA_OFFSET_MS,
  );
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/**
 * Convierte fecha ("YYYY-MM-DD") + hora ("HH:mm") de pared en Managua a ISO UTC.
 * Fuente única para formularios de cita.
 */
export function managuaWallToUtcISO(dateISO: string, timeHM: string): string {
  const [year, month, day] = dateISO.split("-").map(Number);
  const [hour, minute] = timeHM.split(":").map(Number);
  return managuaWallToUtc({
    year,
    month,
    day,
    hour: hour ?? 0,
    minute: minute ?? 0,
    second: 0,
  }).toISOString();
}

/**
 * Próximo día laborable (no domingo) a una hora dada, en Managua.
 * Para precargar formularios de cita.
 */
export function nextWorkdayManagua(
  hours: number,
  minutes = 0,
): { date: string; time: string; iso: string } {
  for (let add = 1; add <= 7; add++) {
    const candidate = new Date(Date.now() - MANAGUA_OFFSET_MS + add * DAY_MS);
    const p = getManaguaParts(candidate);
    const dow = new Date(Date.UTC(p.year, p.month - 1, p.day)).getUTCDay();
    if (dow !== 0) {
      const date = `${p.year}-${pad(p.month)}-${pad(p.day)}`;
      const time = `${pad(hours)}:${pad(minutes)}`;
      return { date, time, iso: managuaWallToUtcISO(date, time) };
    }
  }
  throw new Error("No se encontró día laborable");
}

/** Inicio del día (00:00 Managua) que contiene al instante dado. */
export function startOfManaguaDay(date: Date): Date {
  const p = getManaguaParts(date);
  return managuaWallToUtc({ ...p, hour: 0, minute: 0, second: 0 });
}

/** Fin del día (23:59:59.999 Managua) que contiene al instante dado. */
export function endOfManaguaDay(date: Date): Date {
  return new Date(startOfManaguaDay(date).getTime() + DAY_MS - 1);
}

/** Día de semana (0=domingo … 6=sábado) según calendario de Managua. */
function managuaWeekday(date: Date): number {
  const p = getManaguaParts(date);
  return new Date(Date.UTC(p.year, p.month - 1, p.day)).getUTCDay();
}

/** Inicio de la semana laboral (lunes 00:00 Managua) de ese día. */
export function startOfManaguaWeek(date: Date): Date {
  const p = getManaguaParts(date);
  const dow = managuaWeekday(date);
  const diff = dow === 0 ? 6 : dow - 1;
  return managuaWallToUtc({
    year: p.year,
    month: p.month,
    day: p.day - diff,
    hour: 0,
    minute: 0,
    second: 0,
  });
}

/** Fin de la semana laboral (domingo 23:59:59.999 Managua). */
export function endOfManaguaWeek(date: Date): Date {
  return new Date(startOfManaguaWeek(date).getTime() + 7 * DAY_MS - 1);
}

/** Inicio del mes (día 1, 00:00 Managua) que contiene al instante dado. */
export function startOfManaguaMonth(date: Date): Date {
  const p = getManaguaParts(date);
  return managuaWallToUtc({
    year: p.year,
    month: p.month,
    day: 1,
    hour: 0,
    minute: 0,
    second: 0,
  });
}

/** Fin del mes (último día 23:59:59.999 Managua). */
export function endOfManaguaMonth(date: Date): Date {
  const start = startOfManaguaMonth(date);
  const p = getManaguaParts(start);
  return new Date(
    managuaWallToUtc({
      ...p,
      day: 1,
      month: p.month + 1,
      hour: 0,
      minute: 0,
      second: 0,
    }).getTime() - 1,
  );
}

/** Rango ISO de la semana laboral actual (lunes–domingo, Managua). */
export function currentWeekRangeISO(): { from: string; to: string } {
  const now = new Date();
  return {
    from: startOfManaguaWeek(now).toISOString(),
    to: endOfManaguaWeek(now).toISOString(),
  };
}

/**
 * Fecha de "hoy" en Managua como "YYYY-MM-DD". Única fuente de verdad para
 * los cortes de día en queries, cron y reportes (no duplicar el offset).
 */
export function todayManaguaISO(): string {
  const p = getManaguaParts(new Date());
  const mm = String(p.month).padStart(2, "0");
  const dd = String(p.day).padStart(2, "0");
  return `${p.year}-${mm}-${dd}`;
}

/** Inicio del año (1 de enero, 00:00 Managua) del instante dado. */
export function startOfManaguaYear(date: Date): Date {
  const p = getManaguaParts(date);
  return managuaWallToUtc({
    year: p.year,
    month: 1,
    day: 1,
    hour: 0,
    minute: 0,
    second: 0,
  });
}

/** Fin del año (31 de dic, 23:59:59.999 Managua) del instante dado. */
export function endOfManaguaYear(date: Date): Date {
  return new Date(
    managuaWallToUtc({
      year: getManaguaParts(startOfManaguaYear(date)).year + 1,
      month: 1,
      day: 1,
      hour: 0,
      minute: 0,
      second: 0,
    }).getTime() - 1,
  );
}

const DATE_FORMATTER = new Intl.DateTimeFormat("es-NI", {
  timeZone: SALON_TIME_ZONE,
  day: "numeric",
  month: "long",
  year: "numeric",
});

const DATETIME_FORMATTER = new Intl.DateTimeFormat("es-NI", {
  timeZone: SALON_TIME_ZONE,
  day: "numeric",
  month: "long",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

const TIME_FORMATTER = new Intl.DateTimeFormat("es-NI", {
  timeZone: SALON_TIME_ZONE,
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

export type ManaguaDateStyle = "date" | "datetime" | "time";

/** Formato de presentación en español (es-NI) en hora de Managua. */
export function formatManaguaDate(
  date: Date,
  style: ManaguaDateStyle = "date",
): string {
  switch (style) {
    case "datetime":
      return DATETIME_FORMATTER.format(date);
    case "time":
      return TIME_FORMATTER.format(date);
    default:
      return DATE_FORMATTER.format(date);
  }
}
