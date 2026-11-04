import path from "node:path";
import ExcelJS from "exceljs";
import {
  FREQUENCIES,
  SLOTS,
  STATUSES,
  calculateQuote,
  isValidDateString,
  zonedTimeToUtc,
  type Frequency,
  type Quote,
  type PriceSettings,
  type Slot,
  type Status,
} from "./logic";
import type { RequestExtra } from "./types";

/**
 * Reads the Excel files in data/. Nothing here touches the database, so
 * `npm run check:data` can validate the files anywhere.
 */

export class DataFileError extends Error {
  constructor(file: string, sheet: string, row: number | null, message: string) {
    super(`Viga failis ${file}, leht ${sheet}${row ? `, rida ${row}` : ""}: ${message}`);
    this.name = "DataFileError";
  }
}

type CellValue = string | number | boolean | Date | null;

class Row {
  constructor(
    readonly file: string,
    readonly sheet: string,
    readonly number: number,
    private readonly cells: Map<string, CellValue>,
  ) {}

  fail(message: string): never {
    throw new DataFileError(this.file, this.sheet, this.number, message);
  }

  raw(column: string): CellValue {
    return this.cells.get(column) ?? null;
  }

  optionalText(column: string): string | null {
    const value = this.raw(column);
    if (value === null) return null;
    if (value instanceof Date) this.fail(`veerus ${column} on oodatud tekst, leiti kuupäev.`);
    const text = String(value).trim();
    return text === "" ? null : text;
  }

  text(column: string): string {
    return this.optionalText(column) ?? this.fail(`veerg ${column} on tühi.`);
  }

  decimal(column: string): number {
    const value = this.raw(column);
    const parsed =
      typeof value === "number"
        ? value
        : typeof value === "string" && value.trim() !== ""
          ? Number(value.trim().replace(",", "."))
          : Number.NaN;
    if (!Number.isFinite(parsed)) {
      this.fail(`veerus ${column} peab olema number, leiti "${value ?? ""}".`);
    }
    if (parsed < 0) this.fail(`veerus ${column} ei tohi olla negatiivne arv (${parsed}).`);
    return parsed;
  }

  integer(column: string): number {
    const value = this.decimal(column);
    if (!Number.isInteger(value)) this.fail(`veerus ${column} peab olema täisarv, leiti ${value}.`);
    return value;
  }

  /** Euros in the file become integer cents, so 2.2 is 220 and not 220.00000000000003. */
  cents(column: string): number {
    return Math.round(this.decimal(column) * 100);
  }

  yesNo(column: string): boolean {
    return parseYesNo(this.raw(column)) ?? this.fail(`veerus ${column} peab olema yes või no, leiti "${this.raw(column) ?? ""}".`);
  }

  oneOf<T extends string>(column: string, allowed: readonly T[]): T {
    const value = this.text(column);
    if (!allowed.includes(value as T)) {
      this.fail(`veerus ${column} on tundmatu väärtus "${value}" (lubatud: ${allowed.join(", ")}).`);
    }
    return value as T;
  }

  /** Excel stores a date without a time zone; exceljs hands it over as UTC. */
  date(column: string): string {
    const value = this.raw(column);
    if (value instanceof Date && !Number.isNaN(value.getTime())) {
      return value.toISOString().slice(0, 10);
    }
    if (typeof value === "string" && isValidDateString(value.trim())) return value.trim();
    this.fail(`veerus ${column} peab olema kuupäev (Exceli kuupäev või YYYY-MM-DD), leiti "${value ?? ""}".`);
  }

  /** A wall clock time in the company's time zone. */
  dateTime(column: string, timeZone: string): Date {
    const value = this.raw(column);
    if (value instanceof Date && !Number.isNaN(value.getTime())) {
      return zonedTimeToUtc(
        value.toISOString().slice(0, 10),
        value.getUTCHours(),
        value.getUTCMinutes(),
        timeZone,
      );
    }
    if (typeof value === "string") {
      const match = value.trim().match(/^(\d{4}-\d{2}-\d{2})(?:[ T](\d{2}):(\d{2}))?/);
      if (match && isValidDateString(match[1])) {
        return zonedTimeToUtc(match[1], Number(match[2] ?? 0), Number(match[3] ?? 0), timeZone);
      }
    }
    this.fail(`veerus ${column} peab olema kuupäev ja kellaaeg, leiti "${value ?? ""}".`);
  }
}

function parseYesNo(value: CellValue): boolean | null {
  if (typeof value === "boolean") return value;
  if (typeof value !== "string") return null;
  const text = value.trim().toLowerCase();
  if (text === "yes") return true;
  if (text === "no") return false;
  return null;
}

function cellValue(value: ExcelJS.CellValue, file: string, sheet: string, row: number): CellValue {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) return value;
  if (typeof value !== "object") return value;
  if ("error" in value) {
    throw new DataFileError(file, sheet, row, `lahtris on valemi viga (${value.error}).`);
  }
  if ("result" in value) return cellValue(value.result as ExcelJS.CellValue, file, sheet, row);
  if ("richText" in value) return value.richText.map((part) => part.text).join("");
  if ("text" in value) return String(value.text);
  return null;
}

async function openWorkbook(dir: string, file: string): Promise<ExcelJS.Workbook> {
  const workbook = new ExcelJS.Workbook();
  try {
    await workbook.xlsx.readFile(path.join(dir, file));
  } catch (error) {
    throw new Error(`Viga failis ${file}: faili ei saa lugeda (${(error as Error).message}).`);
  }
  return workbook;
}

/** Finds columns by the header row, so their order in the file does not matter. */
function readRows(workbook: ExcelJS.Workbook, file: string, sheetName: string, required: string[]): Row[] {
  const sheet = workbook.getWorksheet(sheetName);
  if (!sheet) throw new DataFileError(file, sheetName, null, "lehte ei leitud.");

  const columns = new Map<number, string>();
  sheet.getRow(1).eachCell((cell, index) => {
    const name = cellValue(cell.value, file, sheetName, 1);
    if (typeof name === "string" && name.trim()) columns.set(index, name.trim());
  });
  const missing = required.filter((name) => ![...columns.values()].includes(name));
  if (missing.length > 0) {
    throw new DataFileError(file, sheetName, 1, `puudub veerg ${missing.join(", ")}.`);
  }

  const rows: Row[] = [];
  sheet.eachRow((row, number) => {
    if (number === 1) return;
    const cells = new Map<string, CellValue>();
    for (const [index, name] of columns) {
      cells.set(name, cellValue(row.getCell(index).value, file, sheetName, number));
    }
    const isEmpty = [...cells.values()].every(
      (value) => value === null || (typeof value === "string" && value.trim() === ""),
    );
    if (!isEmpty) rows.push(new Row(file, sheetName, number, cells));
  });
  return rows;
}

function assertUnique(rows: Row[], key: (row: Row) => string, what: string) {
  const seen = new Set<string>();
  for (const row of rows) {
    const value = key(row);
    if (seen.has(value)) row.fail(`${what} "${value}" on failis mitu korda.`);
    seen.add(value);
  }
}

// ---------------------------------------------------------------------------

export type ParsedService = {
  code: string;
  name: string;
  description: string;
  pricePerM2Cents: number;
  minPriceCents: number;
  minutesPerM2: number;
  discountsAllowed: boolean;
  sortOrder: number;
  active: boolean;
};

export type ParsedExtra = {
  code: string;
  name: string;
  unit: string;
  priceCents: number;
  minutes: number;
  maxQty: number;
  sortOrder: number;
  active: boolean;
};

export type ParsedArea = {
  code: string;
  name: string;
  region: string;
  travelFeeCents: number;
  sortOrder: number;
  active: boolean;
};

export type ParsedFaq = {
  code: string;
  question: string;
  answer: string;
  keywords: string;
  showAsChip: boolean;
  sortOrder: number;
  active: boolean;
};

export type ParsedSampleRequest = {
  row: Row;
  code: string;
  createdAt: Date;
  serviceCode: string;
  areaCode: string;
  areaM2: number;
  rooms: number;
  bathrooms: number;
  frequency: Frequency;
  extras: { code: string; quantity: number }[];
  preferredDate: string;
  timeSlot: Slot;
  address: string;
  name: string;
  phone: string;
  email: string;
  notes: string | null;
  status: Status;
  internalNote: string | null;
  expectedTotal: number;
  expectedMinutes: number;
};

export type ParsedData = {
  services: ParsedService[];
  extras: ParsedExtra[];
  areas: ParsedArea[];
  faq: ParsedFaq[];
  weekly: { weekday: number; slot: Slot; capacity: number }[];
  exceptions: { date: string; slot: string; capacity: number; note: string | null }[];
  settings: { key: string; value: string }[];
  samples: ParsedSampleRequest[];
};

function readSettings(workbook: ExcelJS.Workbook, file: string, requiredKeys: string[]) {
  const rows = readRows(workbook, file, "Settings", ["key", "value"]);
  assertUnique(rows, (row) => row.text("key"), "Seade");
  const settings = rows.map((row) => ({ key: row.text("key"), value: row.text("value"), row }));
  for (const key of requiredKeys) {
    if (!settings.some((s) => s.key === key)) {
      throw new DataFileError(file, "Settings", null, `puudub seade ${key}.`);
    }
  }
  return settings;
}

function isValidTimeZone(value: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

function parseSampleExtras(row: Row): { code: string; quantity: number }[] {
  const value = row.optionalText("extras");
  if (!value) return [];
  return value
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const match = part.match(/^([A-Z0-9_]+)\s*:\s*(\d+)$/);
      if (!match) row.fail(`veerus extras on vigane väärtus "${part}" (oodatud KOOD:kogus).`);
      return { code: match[1], quantity: Number(match[2]) };
    });
}

export async function readDataFiles(dir: string): Promise<ParsedData> {
  // hinnakiri.xlsx
  const priceList = await openWorkbook(dir, "hinnakiri.xlsx");
  const serviceRows = readRows(priceList, "hinnakiri.xlsx", "Services", [
    "code",
    "name",
    "description",
    "price_per_m2",
    "min_price",
    "minutes_per_m2",
    "discounts_allowed",
    "sort_order",
    "active",
  ]);
  assertUnique(serviceRows, (row) => row.text("code"), "Kood");
  const services = serviceRows.map((row) => ({
    code: row.text("code"),
    name: row.text("name"),
    description: row.optionalText("description") ?? "",
    pricePerM2Cents: row.cents("price_per_m2"),
    minPriceCents: row.cents("min_price"),
    minutesPerM2: row.decimal("minutes_per_m2"),
    discountsAllowed: row.yesNo("discounts_allowed"),
    sortOrder: row.integer("sort_order"),
    active: row.yesNo("active"),
  }));

  const extraRows = readRows(priceList, "hinnakiri.xlsx", "Extras", [
    "code",
    "name",
    "unit",
    "price",
    "minutes",
    "max_qty",
    "sort_order",
    "active",
  ]);
  assertUnique(extraRows, (row) => row.text("code"), "Kood");
  const extras = extraRows.map((row) => {
    const unit = row.oneOf("unit", ["piece", "hour", "fixed"]);
    const maxQty = row.integer("max_qty");
    if (unit === "fixed" && maxQty !== 1) row.fail(`ühiku fixed puhul peab max_qty olema 1, leiti ${maxQty}.`);
    if (maxQty < 1) row.fail("max_qty peab olema vähemalt 1.");
    return {
      code: row.text("code"),
      name: row.text("name"),
      unit,
      priceCents: row.cents("price"),
      minutes: row.integer("minutes"),
      maxQty,
      sortOrder: row.integer("sort_order"),
      active: row.yesNo("active"),
    };
  });

  const priceSettings = readSettings(priceList, "hinnakiri.xlsx", [
    "extra_bathroom_price",
    "biweekly_discount_percent",
    "weekly_discount_percent",
    "vat_included",
  ]);
  for (const setting of priceSettings) {
    if (setting.key === "vat_included") {
      if (parseYesNo(setting.value) === null) setting.row.fail("vat_included peab olema yes või no.");
    } else if (setting.key.endsWith("_percent")) {
      const percent = setting.row.decimal("value");
      if (percent > 100) setting.row.fail(`${setting.key} ei saa olla üle 100.`);
    } else if (setting.key === "extra_bathroom_price") {
      setting.row.decimal("value");
    }
  }

  // kkk.xlsx
  const faqFile = await openWorkbook(dir, "kkk.xlsx");
  const faqRows = readRows(faqFile, "kkk.xlsx", "FAQ", [
    "code",
    "question",
    "answer",
    "keywords",
    "show_as_chip",
    "sort_order",
    "active",
  ]);
  assertUnique(faqRows, (row) => row.text("code"), "Kood");
  const faq = faqRows.map((row) => ({
    code: row.text("code"),
    question: row.text("question"),
    answer: row.text("answer"),
    keywords: row.optionalText("keywords") ?? "",
    showAsChip: row.yesNo("show_as_chip"),
    sortOrder: row.integer("sort_order"),
    active: row.yesNo("active"),
  }));
  const faqSettings = readSettings(faqFile, "kkk.xlsx", ["welcome_message", "fallback_message"]);

  // piirkonnad.xlsx
  const areaFile = await openWorkbook(dir, "piirkonnad.xlsx");
  const areaRows = readRows(areaFile, "piirkonnad.xlsx", "Areas", [
    "code",
    "name",
    "region",
    "travel_fee",
    "sort_order",
    "active",
  ]);
  assertUnique(areaRows, (row) => row.text("code"), "Kood");
  const areas = areaRows.map((row) => ({
    code: row.text("code"),
    name: row.text("name"),
    region: row.text("region"),
    travelFeeCents: row.cents("travel_fee"),
    sortOrder: row.integer("sort_order"),
    active: row.yesNo("active"),
  }));
  const areaSettings = readSettings(areaFile, "piirkonnad.xlsx", ["area_not_listed_message"]);

  // toograafik.xlsx
  const scheduleFile = await openWorkbook(dir, "toograafik.xlsx");
  const weeklyRows = readRows(scheduleFile, "toograafik.xlsx", "WeeklyCapacity", ["weekday", "slot", "capacity"]);
  assertUnique(weeklyRows, (row) => `${row.integer("weekday")} ${row.text("slot")}`, "Päev ja ajavahemik");
  const weekly = weeklyRows.map((row) => {
    const weekday = row.integer("weekday");
    if (weekday < 1 || weekday > 7) row.fail(`weekday peab olema 1–7, leiti ${weekday}.`);
    return { weekday, slot: row.oneOf("slot", SLOTS), capacity: row.integer("capacity") };
  });

  const exceptionRows = readRows(scheduleFile, "toograafik.xlsx", "Exceptions", ["date", "slot", "capacity", "note"]);
  assertUnique(exceptionRows, (row) => `${row.date("date")} ${row.text("slot")}`, "Kuupäev ja ajavahemik");
  const exceptions = exceptionRows.map((row) => ({
    date: row.date("date"),
    slot: row.oneOf("slot", [...SLOTS, "ALL"] as const) as string,
    capacity: row.integer("capacity"),
    note: row.optionalText("note"),
  }));

  const scheduleSettings = readSettings(scheduleFile, "toograafik.xlsx", [
    "booking_days_ahead",
    "min_hours_before",
    "timezone",
  ]);
  for (const setting of scheduleSettings) {
    if (setting.key === "booking_days_ahead" || setting.key === "min_hours_before") setting.row.integer("value");
    if (setting.key === "timezone" && !isValidTimeZone(setting.value)) {
      setting.row.fail(`tundmatu ajavöönd "${setting.value}".`);
    }
  }
  const timeZone = scheduleSettings.find((s) => s.key === "timezone")!.value;

  // naidisparingud.xlsx
  const sampleFile = await openWorkbook(dir, "naidisparingud.xlsx");
  const sampleRows = readRows(sampleFile, "naidisparingud.xlsx", "Requests", [
    "code",
    "created_at",
    "service_code",
    "area_code",
    "area_m2",
    "rooms",
    "bathrooms",
    "frequency",
    "extras",
    "preferred_date",
    "time_slot",
    "address",
    "name",
    "phone",
    "email",
    "notes",
    "status",
    "internal_note",
    "expected_total",
    "expected_minutes",
  ]);
  assertUnique(sampleRows, (row) => row.text("code"), "Kood");
  const samples = sampleRows.map((row) => {
    const code = row.text("code");
    if (!/^LG-\d+$/.test(code)) row.fail(`kood peab olema kujul LG-1234, leiti "${code}".`);
    return {
      row,
      code,
      createdAt: row.dateTime("created_at", timeZone),
      serviceCode: row.text("service_code"),
      areaCode: row.text("area_code"),
      areaM2: row.integer("area_m2"),
      rooms: row.integer("rooms"),
      bathrooms: row.integer("bathrooms"),
      frequency: row.oneOf("frequency", FREQUENCIES),
      extras: parseSampleExtras(row),
      preferredDate: row.date("preferred_date"),
      timeSlot: row.oneOf("time_slot", SLOTS),
      address: row.text("address"),
      name: row.text("name"),
      phone: row.text("phone"),
      email: row.text("email"),
      notes: row.optionalText("notes"),
      status: row.oneOf("status", STATUSES),
      internalNote: row.optionalText("internal_note"),
      expectedTotal: row.decimal("expected_total"),
      expectedMinutes: row.decimal("expected_minutes"),
    };
  });

  const settings = [...priceSettings, ...faqSettings, ...areaSettings, ...scheduleSettings].map(({ key, value }) => ({
    key,
    value,
  }));

  return { services, extras, areas, faq, weekly, exceptions, settings, samples };
}

export function priceSettingsFrom(settings: { key: string; value: string }[]): PriceSettings {
  const value = (key: string) => Number((settings.find((s) => s.key === key)?.value ?? "").replace(",", "."));
  return {
    extraBathroomPriceCents: Math.round(value("extra_bathroom_price") * 100),
    biweeklyDiscountPercent: value("biweekly_discount_percent"),
    weeklyDiscountPercent: value("weekly_discount_percent"),
  };
}

type Lookup = {
  services: (Omit<ParsedService, "description" | "sortOrder" | "active"> & { id?: number })[];
  areas: (Pick<ParsedArea, "code" | "travelFeeCents"> & { id?: number })[];
  extras: Omit<ParsedExtra, "sortOrder" | "active">[];
  priceSettings: PriceSettings;
};

export type PricedSample = {
  serviceId: number | undefined;
  areaId: number | undefined;
  extras: RequestExtra[];
  quote: Quote;
  warning: string | null;
};

/** Resolves the codes in a sample row and prices it with the shared module. */
export function priceSample(sample: ParsedSampleRequest, lookup: Lookup): PricedSample {
  const service = lookup.services.find((s) => s.code === sample.serviceCode);
  if (!service) sample.row.fail(`tundmatu teenuse kood "${sample.serviceCode}".`);
  const area = lookup.areas.find((a) => a.code === sample.areaCode);
  if (!area) sample.row.fail(`tundmatu piirkonna kood "${sample.areaCode}".`);

  const extras: RequestExtra[] = sample.extras.map(({ code, quantity }) => {
    const extra = lookup.extras.find((e) => e.code === code);
    if (!extra) sample.row.fail(`tundmatu lisatöö kood "${code}".`);
    return {
      code,
      name: extra.name,
      unit: extra.unit,
      quantity,
      priceCents: extra.priceCents,
      minutes: extra.minutes,
    };
  });

  const quote = calculateQuote({
    service,
    areaM2: sample.areaM2,
    bathrooms: sample.bathrooms,
    frequency: sample.frequency,
    extras,
    travelFeeCents: area.travelFeeCents,
    settings: lookup.priceSettings,
  });

  const differs = quote.totalEuros !== sample.expectedTotal || quote.estimatedMinutes !== sample.expectedMinutes;
  return {
    serviceId: service.id,
    areaId: area.id,
    extras,
    quote,
    warning: differs
      ? `HOIATUS ${sample.code}: arvutatud ${quote.totalEuros} € / ${quote.estimatedMinutes} min, ` +
        `failis ${sample.expectedTotal} € / ${sample.expectedMinutes} min.`
      : null,
  };
}
