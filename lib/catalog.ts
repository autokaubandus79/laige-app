import { prisma } from "./db";
import type { AssistantData, Catalog, CatalogSettings } from "./types";

export { DB_ERROR_MESSAGE } from "./messages";

export async function getSettingsMap(): Promise<Map<string, string>> {
  const rows = await prisma.setting.findMany();
  return new Map(rows.map((row) => [row.key, row.value]));
}

export function parseSettings(map: Map<string, string>): CatalogSettings {
  const number = (key: string) => Number((map.get(key) ?? "").replace(",", "."));
  return {
    extraBathroomPriceCents: Math.round(number("extra_bathroom_price") * 100),
    biweeklyDiscountPercent: number("biweekly_discount_percent"),
    weeklyDiscountPercent: number("weekly_discount_percent"),
    vatIncluded: map.get("vat_included")?.trim().toLowerCase() === "yes",
    areaNotListedMessage: map.get("area_not_listed_message") ?? "",
    bookingDaysAhead: number("booking_days_ahead"),
    minHoursBefore: number("min_hours_before"),
    timezone: map.get("timezone") ?? "Europe/Tallinn",
  };
}

/** Everything the public pages need: active rows only, in sort order. */
export async function getCatalog(): Promise<Catalog> {
  const where = { active: true };
  const orderBy = { sortOrder: "asc" } as const;
  const [services, extras, areas, settings] = await Promise.all([
    prisma.service.findMany({ where, orderBy }),
    prisma.extra.findMany({ where, orderBy }),
    prisma.serviceArea.findMany({ where, orderBy }),
    getSettingsMap(),
  ]);
  return {
    services: services.map(({ code, name, description, pricePerM2Cents, minPriceCents, minutesPerM2, discountsAllowed }) => ({
      code,
      name,
      description,
      pricePerM2Cents,
      minPriceCents,
      minutesPerM2,
      discountsAllowed,
    })),
    extras: extras.map(({ code, name, unit, priceCents, minutes, maxQty }) => ({
      code,
      name,
      unit,
      priceCents,
      minutes,
      maxQty,
    })),
    areas: areas.map(({ code, name, region, travelFeeCents }) => ({ code, name, region, travelFeeCents })),
    settings: parseSettings(settings),
  };
}

/** What Anna needs on every customer page. */
export async function getAssistantData(): Promise<AssistantData> {
  const [faq, settings] = await Promise.all([
    prisma.faqItem.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } }),
    getSettingsMap(),
  ]);
  return {
    faq: faq.map(({ code, question, answer, keywords, showAsChip }) => ({ code, question, answer, keywords, showAsChip })),
    welcomeMessage: settings.get("welcome_message") ?? "",
    fallbackMessage: settings.get("fallback_message") ?? "",
  };
}
