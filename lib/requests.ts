import type { Prisma } from "@prisma/client";
import { getBookedCounts, getRules } from "./availability";
import { prisma, toDbDate } from "./db";
import { addDays, bookedKey, dateInZone, slotAvailability } from "./logic";
import { chosenExtras, quoteForSelection } from "./quote";
import type { Catalog } from "./types";
import type { BookingData } from "./validation";

/** Any fixed number: all booking writes wait for each other on this lock. */
const BOOKING_LOCK = 72_001;
const FIRST_CODE_NUMBER = 1001;

export const SLOT_TAKEN_MESSAGE = "See aeg broneeriti just ära – palun vali teine aeg.";
export const SLOT_UNAVAILABLE_MESSAGE = "See aeg ei ole enam saadaval – palun vali teine aeg.";

export class SlotError extends Error {}

async function nextCode(tx: Prisma.TransactionClient): Promise<string> {
  // Numeric, so LG-10000 counts as higher than LG-9999.
  const rows = await tx.$queryRaw<{ max: number | null }[]>`
    SELECT MAX(SUBSTRING(code FROM 4)::int) AS max
    FROM "CleaningRequest"
    WHERE code ~ '^LG-[0-9]+$'
  `;
  const highest = rows[0]?.max;
  return `LG-${highest ? highest + 1 : FIRST_CODE_NUMBER}`;
}

/**
 * Recalculates everything from the database. The lock makes the capacity check
 * and the insert one step, so two customers can never take the last place or
 * receive the same code.
 */
export async function createRequest(booking: BookingData, catalog: Catalog, now = new Date()) {
  const { settings } = catalog;
  const today = dateInZone(now, settings.timezone);
  if (booking.date < today || booking.date > addDays(today, settings.bookingDaysAhead - 1)) {
    throw new SlotError(SLOT_UNAVAILABLE_MESSAGE);
  }

  const quote = quoteForSelection(catalog, booking);
  const service = catalog.services.find((s) => s.code === booking.serviceCode);
  const area = catalog.areas.find((a) => a.code === booking.areaCode);
  if (!quote || !service || !area) throw new SlotError(SLOT_UNAVAILABLE_MESSAGE);

  return prisma.$transaction(
    async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(${BOOKING_LOCK}::bigint)`;

      const [rules, booked] = await Promise.all([
        getRules(settings, tx),
        getBookedCounts(booking.date, booking.date, tx),
      ]);
      const count = booked.get(bookedKey(booking.date, booking.slot)) ?? 0;
      const slot = slotAvailability(booking.date, booking.slot, count, now, rules);
      if (slot.state === "full") throw new SlotError(SLOT_TAKEN_MESSAGE);
      if (slot.state !== "open") throw new SlotError(SLOT_UNAVAILABLE_MESSAGE);

      const code = await nextCode(tx);
      const [dbService, dbArea] = await Promise.all([
        tx.service.findUniqueOrThrow({ where: { code: service.code }, select: { id: true } }),
        tx.serviceArea.findUniqueOrThrow({ where: { code: area.code }, select: { id: true } }),
      ]);

      await tx.cleaningRequest.create({
        data: {
          code,
          serviceId: dbService.id,
          areaId: dbArea.id,
          areaM2: booking.areaM2,
          rooms: booking.rooms,
          bathrooms: booking.bathrooms,
          frequency: quote.frequency,
          extras: chosenExtras(catalog, booking),
          travelFeeCents: quote.travelFeeCents,
          totalPrice: quote.totalEuros,
          estimatedMinutes: quote.estimatedMinutes,
          preferredDate: toDbDate(booking.date),
          timeSlot: booking.slot,
          address: booking.contact.address,
          name: booking.contact.name,
          phone: booking.contact.phone,
          email: booking.contact.email,
          notes: booking.contact.notes || null,
        },
      });

      return {
        code,
        serviceName: service.name,
        areaName: area.name,
        areaM2: booking.areaM2,
        date: booking.date,
        slotLabel: slot.label,
        address: booking.contact.address,
        totalEuros: quote.totalEuros,
        estimatedMinutes: quote.estimatedMinutes,
      };
    },
    { maxWait: 10_000, timeout: 15_000 },
  );
}

export type CreatedRequest = Awaited<ReturnType<typeof createRequest>>;
