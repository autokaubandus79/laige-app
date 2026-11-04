/**
 * Shared business logic: price, work time, capacity and time zone handling.
 * Pure TypeScript with no server or browser dependencies, so the calculator,
 * the API and the seed script all compute exactly the same numbers.
 */

export const SLOTS = ["MORNING", "AFTERNOON", "EVENING"] as const;
export type Slot = (typeof SLOTS)[number];

export const SLOT_INFO: Record<Slot, { label: string; startHour: number }> = {
  MORNING: { label: "08–12", startHour: 8 },
  AFTERNOON: { label: "12–16", startHour: 12 },
  EVENING: { label: "16–20", startHour: 16 },
};

export const FREQUENCIES = ["ONE_TIME", "BIWEEKLY", "WEEKLY"] as const;
export type Frequency = (typeof FREQUENCIES)[number];

export const STATUSES = ["NEW", "CONFIRMED", "SCHEDULED", "DONE", "CANCELLED"] as const;
export type Status = (typeof STATUSES)[number];

// ---------------------------------------------------------------------------
// Price and work time
// ---------------------------------------------------------------------------

export type PriceSettings = {
  extraBathroomPriceCents: number;
  biweeklyDiscountPercent: number;
  weeklyDiscountPercent: number;
};

export type PricedService = {
  name?: string;
  pricePerM2Cents: number;
  minPriceCents: number;
  minutesPerM2: number;
  discountsAllowed: boolean;
};

export type PricedExtra = {
  name?: string;
  priceCents: number;
  minutes: number;
  quantity: number;
};

export type QuoteInput = {
  service: PricedService;
  areaM2: number;
  bathrooms: number;
  frequency: Frequency;
  extras: PricedExtra[];
  travelFeeCents: number;
  settings: PriceSettings;
};

export type Quote = {
  basePriceCents: number;
  minPriceApplied: boolean;
  bathroomCents: number;
  extrasCents: number;
  cleaningCents: number;
  /** The frequency that really applies: ONE_TIME unless discounts are allowed. */
  frequency: Frequency;
  discountPercent: number;
  discountCents: number;
  travelFeeCents: number;
  totalEuros: number;
  estimatedMinutes: number;
};

export function discountPercentFor(
  frequency: Frequency,
  discountsAllowed: boolean,
  settings: PriceSettings,
): number {
  if (!discountsAllowed) return 0;
  if (frequency === "BIWEEKLY") return settings.biweeklyDiscountPercent;
  if (frequency === "WEEKLY") return settings.weeklyDiscountPercent;
  return 0;
}

/**
 * All money stays in integers. The discounted amount can contain fractions of
 * a cent, so it is kept in units of 1/10000 cent until the final rounding.
 */
export function calculateQuote(input: QuoteInput): Quote {
  const { service, areaM2, bathrooms, extras, travelFeeCents, settings } = input;

  const areaPriceCents = areaM2 * service.pricePerM2Cents;
  const basePriceCents = Math.max(service.minPriceCents, areaPriceCents);
  const bathroomCents = Math.max(0, bathrooms - 1) * settings.extraBathroomPriceCents;
  const extrasCents = extras.reduce((sum, e) => sum + e.priceCents * e.quantity, 0);
  const cleaningCents = basePriceCents + bathroomCents + extrasCents;

  const discountPercent = discountPercentFor(input.frequency, service.discountsAllowed, settings);
  const percentHundredths = Math.round(discountPercent * 100);
  const discountCents = Math.floor((cleaningCents * percentHundredths + 5000) / 10000);

  const exactTotal = cleaningCents * (10000 - percentHundredths) + travelFeeCents * 10000;
  const totalEuros = Math.floor((exactTotal + 500000) / 1000000);

  return {
    basePriceCents,
    minPriceApplied: areaPriceCents < service.minPriceCents,
    bathroomCents,
    extrasCents,
    cleaningCents,
    frequency: service.discountsAllowed ? input.frequency : "ONE_TIME",
    discountPercent,
    discountCents,
    travelFeeCents,
    totalEuros,
    estimatedMinutes: calculateMinutes(service.minutesPerM2, areaM2, extras),
  };
}

/** Works in hundredths of a minute so that 1.2 × 75 is exactly 90, not 90.00000000000001. */
export function calculateMinutes(
  minutesPerM2: number,
  areaM2: number,
  extras: Pick<PricedExtra, "minutes" | "quantity">[],
): number {
  const hundredths =
    areaM2 * Math.round(minutesPerM2 * 100) +
    extras.reduce((sum, e) => sum + Math.round(e.minutes * 100) * e.quantity, 0);
  return Math.ceil(hundredths / 3000) * 30;
}

// ---------------------------------------------------------------------------
// Dates and time zone. A calendar date is always a "YYYY-MM-DD" string, so the
// server's own time zone (UTC on Railway) can never shift it.
// ---------------------------------------------------------------------------

export function isValidDateString(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** 1 = Monday ... 7 = Sunday */
export function isoWeekday(date: string): number {
  return new Date(`${date}T00:00:00Z`).getUTCDay() || 7;
}

function zonedParts(instant: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(instant);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "00";
  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hour: get("hour"),
    minute: get("minute"),
    second: get("second"),
  };
}

/** The calendar date at this instant in the given time zone. */
export function dateInZone(instant: Date, timeZone: string): string {
  const { year, month, day } = zonedParts(instant, timeZone);
  return `${year}-${month}-${day}`;
}

/** "HH:MM" at this instant in the given time zone. */
export function timeInZone(instant: Date, timeZone: string): string {
  const { hour, minute } = zonedParts(instant, timeZone);
  return `${hour}:${minute}`;
}

function zoneOffsetMs(instant: Date, timeZone: string): number {
  const p = zonedParts(instant, timeZone);
  const wall = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second);
  return wall - Math.floor(instant.getTime() / 1000) * 1000;
}

/** Converts a wall clock time in the given zone to a real instant, including DST. */
export function zonedTimeToUtc(date: string, hour: number, minute: number, timeZone: string): Date {
  const [y, m, d] = date.split("-").map(Number);
  const wall = Date.UTC(y, m - 1, d, hour, minute);
  const firstGuess = wall - zoneOffsetMs(new Date(wall), timeZone);
  return new Date(wall - zoneOffsetMs(new Date(firstGuess), timeZone));
}

/** Monday of the week that contains the date. */
export function startOfWeek(date: string): string {
  return addDays(date, 1 - isoWeekday(date));
}

// ---------------------------------------------------------------------------
// Capacity
// ---------------------------------------------------------------------------

export type CapacityExceptionRow = {
  date: string;
  slot: string;
  capacity: number;
  note: string | null;
};
export type WeeklyCapacityRow = { weekday: number; slot: string; capacity: number };

export type SlotState = "open" | "full" | "closed" | "too_soon";

export type SlotAvailability = {
  slot: Slot;
  label: string;
  state: SlotState;
  capacity: number;
  booked: number;
  free: number;
  /** The reason for a closed window, e.g. "Vana-aasta õhtu". */
  note: string | null;
};

export type DayAvailability = {
  date: string;
  /** True when no window can ever be booked on this date. */
  closed: boolean;
  note: string | null;
  slots: SlotAvailability[];
};

/** Date + slot exception, else date + ALL exception, else the weekly capacity. */
export function resolveCapacity(
  date: string,
  slot: Slot,
  exceptions: CapacityExceptionRow[],
  weekly: WeeklyCapacityRow[],
): { capacity: number; note: string | null } {
  const exception =
    exceptions.find((e) => e.date === date && e.slot === slot) ??
    exceptions.find((e) => e.date === date && e.slot === "ALL");
  if (exception) return { capacity: exception.capacity, note: exception.note };
  const weekday = isoWeekday(date);
  const row = weekly.find((w) => w.weekday === weekday && w.slot === slot);
  return { capacity: row?.capacity ?? 0, note: null };
}

export type AvailabilityRules = {
  exceptions: CapacityExceptionRow[];
  weekly: WeeklyCapacityRow[];
  minHoursBefore: number;
  timezone: string;
};

export function slotAvailability(
  date: string,
  slot: Slot,
  booked: number,
  now: Date,
  rules: AvailabilityRules,
): SlotAvailability {
  const { capacity, note } = resolveCapacity(date, slot, rules.exceptions, rules.weekly);
  const free = Math.max(0, capacity - booked);
  const start = zonedTimeToUtc(date, SLOT_INFO[slot].startHour, 0, rules.timezone);
  const tooSoon = start.getTime() - now.getTime() < rules.minHoursBefore * 3600 * 1000;

  let state: SlotState = "open";
  if (capacity <= 0) state = "closed";
  else if (tooSoon) state = "too_soon";
  else if (free <= 0) state = "full";

  return {
    slot,
    label: SLOT_INFO[slot].label,
    state,
    capacity,
    booked,
    free,
    // An exception note is only a closing reason when the window is really closed.
    note: capacity <= 0 ? note : null,
  };
}

export function bookedKey(date: string, slot: string): string {
  return `${date}|${slot}`;
}

export function buildAvailability(
  from: string,
  days: number,
  booked: Map<string, number>,
  now: Date,
  rules: AvailabilityRules,
): DayAvailability[] {
  return Array.from({ length: days }, (_, i) => {
    const date = addDays(from, i);
    const slots = SLOTS.map((slot) =>
      slotAvailability(date, slot, booked.get(bookedKey(date, slot)) ?? 0, now, rules),
    );
    const closed = slots.every((s) => s.state === "closed");
    return {
      date,
      closed,
      note: closed ? (slots.find((s) => s.note)?.note ?? null) : null,
      slots,
    };
  });
}
