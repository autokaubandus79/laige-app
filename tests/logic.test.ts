import assert from "node:assert/strict";
import { test } from "node:test";
import { matchFaq } from "../lib/assistant";
import {
  addDays,
  buildAvailability,
  calculateMinutes,
  calculateQuote,
  dateInZone,
  isoWeekday,
  resolveCapacity,
  slotAvailability,
  startOfWeek,
  zonedTimeToUtc,
  type AvailabilityRules,
  type QuoteInput,
} from "../lib/logic";
import { formatCents, formatMinutes } from "../lib/format";
import { isValidEmail, isValidPhone, isValidStatusToken, parseAreaInput, parseBooking } from "../lib/validation";
import type { Catalog, FaqDto } from "../lib/types";

const TZ = "Europe/Tallinn";
const settings = { extraBathroomPriceCents: 1000, biweeklyDiscountPercent: 10, weeklyDiscountPercent: 15 };
const regular = { pricePerM2Cents: 120, minPriceCents: 4500, minutesPerM2: 1.2, discountsAllowed: true };
const deep = { pricePerM2Cents: 220, minPriceCents: 8000, minutesPerM2: 2.2, discountsAllowed: false };

const base: QuoteInput = {
  service: regular,
  areaM2: 54,
  bathrooms: 1,
  frequency: "ONE_TIME",
  extras: [],
  travelFeeCents: 0,
  settings,
};

test("price uses the minimum price when the area price is below it", () => {
  const quote = calculateQuote({ ...base, areaM2: 10 });
  assert.equal(quote.basePriceCents, 4500);
  assert.equal(quote.minPriceApplied, true);
  assert.equal(quote.totalEuros, 45);
});

test("discount covers cleaning and extras but not the travel fee", () => {
  const quote = calculateQuote({
    ...base,
    areaM2: 120,
    bathrooms: 2,
    frequency: "WEEKLY",
    travelFeeCents: 1000,
  });
  assert.equal(quote.cleaningCents, 15400);
  assert.equal(quote.discountCents, 2310);
  assert.equal(quote.totalEuros, 141);
});

test("a service without discounts ignores the frequency", () => {
  const quote = calculateQuote({ ...base, service: deep, areaM2: 72, frequency: "WEEKLY" });
  assert.equal(quote.discountPercent, 0);
  assert.equal(quote.frequency, "ONE_TIME");
  assert.equal(quote.totalEuros, 158);
});

test("total rounds half up to whole euros", () => {
  const service = { ...regular, pricePerM2Cents: 105, minPriceCents: 0 };
  assert.equal(calculateQuote({ ...base, service, areaM2: 50 }).totalEuros, 53); // 52.50
  assert.equal(calculateQuote({ ...base, service, areaM2: 10 }).totalEuros, 11); // 10.50
});

test("work time is exact and rounds up to 30 minutes", () => {
  assert.equal(calculateMinutes(1.2, 75, []), 90); // float maths would give 90.00000000000001
  assert.equal(calculateMinutes(1.2, 76, []), 120);
  assert.equal(calculateMinutes(2.8, 35, [{ minutes: 40, quantity: 1 }]), 150);
});

test("Tallinn dates ignore the server time zone and follow DST", () => {
  // 22:30 UTC in winter is already the next day in Tallinn.
  assert.equal(dateInZone(new Date("2026-11-04T22:30:00Z"), TZ), "2026-11-05");
  assert.equal(zonedTimeToUtc("2026-11-05", 8, 0, TZ).toISOString(), "2026-11-05T06:00:00.000Z");
  assert.equal(zonedTimeToUtc("2026-07-01", 8, 0, TZ).toISOString(), "2026-07-01T05:00:00.000Z");
  // Around the change to summer time on 2027-03-28.
  assert.equal(zonedTimeToUtc("2027-03-27", 8, 0, TZ).toISOString(), "2027-03-27T06:00:00.000Z");
  assert.equal(zonedTimeToUtc("2027-03-28", 8, 0, TZ).toISOString(), "2027-03-28T05:00:00.000Z");
});

test("date helpers", () => {
  assert.equal(addDays("2026-12-31", 1), "2027-01-01");
  assert.equal(isoWeekday("2026-11-08"), 7);
  assert.equal(isoWeekday("2026-11-09"), 1);
  assert.equal(startOfWeek("2026-11-08"), "2026-11-02");
});

const rules: AvailabilityRules = {
  exceptions: [
    { date: "2026-11-28", slot: "AFTERNOON", capacity: 3, note: "Näide: laupäeval lisameeskond" },
    { date: "2026-12-24", slot: "ALL", capacity: 0, note: "Jõululaupäev" },
    { date: "2026-12-31", slot: "EVENING", capacity: 0, note: "Vana-aasta õhtu" },
    { date: "2026-12-30", slot: "ALL", capacity: 1, note: null },
    { date: "2026-12-30", slot: "MORNING", capacity: 5, note: null },
  ],
  weekly: [
    { weekday: 4, slot: "MORNING", capacity: 3 },
    { weekday: 4, slot: "EVENING", capacity: 2 },
    { weekday: 6, slot: "AFTERNOON", capacity: 1 },
    { weekday: 6, slot: "EVENING", capacity: 0 },
    { weekday: 3, slot: "AFTERNOON", capacity: 3 },
  ],
  minHoursBefore: 24,
  timezone: TZ,
};
const now = new Date("2026-11-04T12:00:00Z");

test("capacity order: date + slot, then date + ALL, then weekly", () => {
  const capacity = (date: string, slot: "MORNING" | "AFTERNOON" | "EVENING") =>
    resolveCapacity(date, slot, rules.exceptions, rules.weekly).capacity;
  assert.equal(capacity("2026-12-30", "MORNING"), 5);
  assert.equal(capacity("2026-12-30", "AFTERNOON"), 1);
  assert.equal(capacity("2026-11-28", "AFTERNOON"), 3);
  assert.equal(capacity("2026-11-21", "AFTERNOON"), 1);
});

test("window states", () => {
  assert.equal(slotAvailability("2026-11-12", "MORNING", 1, now, rules).free, 2);
  assert.equal(slotAvailability("2026-11-12", "MORNING", 3, now, rules).state, "full");
  assert.equal(slotAvailability("2026-11-14", "EVENING", 0, now, rules).state, "closed");
  const newYearsEve = slotAvailability("2026-12-31", "EVENING", 0, now, rules);
  assert.equal(newYearsEve.state, "closed");
  assert.equal(newYearsEve.note, "Vana-aasta õhtu");
});

test("minimum notice is measured from the window start in Tallinn time", () => {
  // Now is 14:00 in Tallinn, so 14:00 tomorrow is the limit.
  assert.equal(slotAvailability("2026-11-05", "MORNING", 0, now, rules).state, "too_soon");
  assert.equal(slotAvailability("2026-11-12", "MORNING", 0, now, rules).state, "open");
  const edge = new Date("2026-11-04T14:00:00Z"); // 16:00 in Tallinn
  assert.equal(slotAvailability("2026-11-05", "EVENING", 0, edge, rules).state, "open");
  const justLate = new Date("2026-11-04T14:00:01Z");
  assert.equal(slotAvailability("2026-11-05", "EVENING", 0, justLate, rules).state, "too_soon");
});

test("a note on an open window is not shown as a closing reason", () => {
  assert.equal(slotAvailability("2026-11-28", "AFTERNOON", 0, now, rules).note, null);
});

test("closed days carry the exception note", () => {
  const [day] = buildAvailability("2026-12-24", 1, new Map(), now, rules);
  assert.equal(day.closed, true);
  assert.equal(day.note, "Jõululaupäev");
  assert.equal(day.slots.length, 3);
});

const faq: FaqDto[] = [
  { code: "CANCEL", question: "", answer: "", keywords: "tühist, muut, edasi", showAsChip: true },
  { code: "PETS", question: "", answer: "", keywords: "loom, koer, kass, lemmik", showAsChip: false },
  { code: "EMPTY", question: "", answer: "", keywords: " , ", showAsChip: false },
];

test("assistant picks the row with the most keyword matches", () => {
  assert.equal(matchFaq("Kuidas tühistada?", faq)?.code, "CANCEL");
  assert.equal(matchFaq("MUL ON KOER JA KASS, kas tohib aega muuta?", faq)?.code, "PETS");
  assert.equal(matchFaq("Tere hommikust", faq), null);
});

test("Estonian formatting", () => {
  assert.equal(formatCents(8900), "89 €");
  assert.equal(formatCents(648), "6,48 €");
  assert.equal(formatCents(-605), "−6,05 €");
  assert.equal(formatMinutes(150), "2 h 30 min");
  assert.equal(formatMinutes(60), "1 h");
  assert.equal(formatMinutes(30), "30 min");
});

test("email and phone checks", () => {
  assert.equal(isValidEmail("mari.tamm@example.com"), true);
  assert.equal(isValidEmail("mari@tamm"), false);
  assert.equal(isValidPhone("+372 5123 4567"), true);
  assert.equal(isValidPhone("5123456"), true);
  assert.equal(isValidPhone("12ab"), false);
  assert.equal(isValidPhone("123"), false);
});

const catalog: Catalog = {
  services: [
    { code: "REGULAR", name: "Tavakoristus", description: "", ...regular },
    { code: "DEEP", name: "Suurpuhastus", description: "", ...deep },
  ],
  extras: [
    { code: "OVEN", name: "Ahi", unit: "fixed", priceCents: 2500, minutes: 40, maxQty: 1 },
    { code: "WINDOW", name: "Aken", unit: "piece", priceCents: 600, minutes: 15, maxQty: 30 },
  ],
  areas: [{ code: "KESKLINN", name: "Kesklinn", region: "Tallinn", travelFeeCents: 0 }],
  settings: {
    ...settings,
    vatIncluded: true,
    areaNotListedMessage: "",
    bookingDaysAhead: 60,
    minHoursBefore: 24,
    timezone: TZ,
  },
};

const validBody = {
  serviceCode: "REGULAR",
  areaCode: "KESKLINN",
  areaM2: 50,
  rooms: 2,
  bathrooms: 1,
  frequency: "WEEKLY",
  extras: { WINDOW: 3 },
  date: "2026-11-12",
  slot: "MORNING",
  address: " Kase 1 ",
  name: "Mari",
  phone: "+372 5123 4567",
  email: "mari@example.com",
  notes: "",
};

test("server parsing accepts a valid booking and ignores a sent price", () => {
  const result = parseBooking({ ...validBody, totalPrice: 1 }, catalog);
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.data.contact.address, "Kase 1");
    assert.equal("totalPrice" in result.data, false);
  }
});

test("server parsing forces ONE_TIME when a service has no discounts", () => {
  const result = parseBooking({ ...validBody, serviceCode: "DEEP" }, catalog);
  assert.equal(result.ok && result.data.frequency, "ONE_TIME");
});

test("server parsing refuses bad values next to the right field", () => {
  const errorsFor = (patch: object) => {
    const result = parseBooking({ ...validBody, ...patch }, catalog);
    return result.ok ? {} : result.errors;
  };
  assert.ok(errorsFor({ areaM2: 9 }).areaM2);
  assert.ok(errorsFor({ areaM2: 301 }).areaM2);
  assert.ok(errorsFor({ areaM2: "50" }).areaM2);
  assert.ok(errorsFor({ rooms: 9 }).rooms);
  assert.ok(errorsFor({ bathrooms: 0 }).bathrooms);
  assert.ok(errorsFor({ extras: { OVEN: 2 } })["extras.OVEN"]);
  assert.ok(errorsFor({ extras: { WINDOW: 31 } })["extras.WINDOW"]);
  assert.ok(errorsFor({ extras: { GOLD: 1 } })["extras.GOLD"]);
  assert.ok(errorsFor({ areaCode: "KEILA" }).areaCode);
  assert.ok(errorsFor({ date: "2026-02-31" }).date);
  assert.ok(errorsFor({ slot: "NIGHT" }).slot);
  assert.ok(errorsFor({ email: "x" }).email);
  assert.ok(errorsFor({ phone: "" }).phone);
});

test("area input keeps a decimal comma while typing and uses whole m²", () => {
  assert.deepEqual(parseAreaInput("55,"), { text: "55,", areaM2: 55 });
  assert.deepEqual(parseAreaInput("55,5"), { text: "55,5", areaM2: 56 });
  assert.deepEqual(parseAreaInput("55.4"), { text: "55.4", areaM2: 55 });
  assert.deepEqual(parseAreaInput("060"), { text: "060", areaM2: 60 });
  assert.deepEqual(parseAreaInput("12abc"), { text: "12", areaM2: 12 });
  assert.deepEqual(parseAreaInput("1,2,3"), { text: "1,2", areaM2: 1 });
  assert.deepEqual(parseAreaInput(","), { text: ",", areaM2: 0 });
  assert.deepEqual(parseAreaInput(""), { text: "", areaM2: 0 });
});

test("status token format", () => {
  assert.equal(isValidStatusToken("0123456789abcdef0123456789abcdef"), true);
  assert.equal(isValidStatusToken("0123456789ABCDEF0123456789ABCDEF"), false);
  assert.equal(isValidStatusToken("0123456789abcdef"), false);
  assert.equal(isValidStatusToken("LG-1021"), false);
  assert.equal(isValidStatusToken(""), false);
});
