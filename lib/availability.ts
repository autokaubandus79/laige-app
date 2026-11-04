import type { Prisma } from "@prisma/client";
import { fromDbDate, prisma, toDbDate } from "./db";
import {
  addDays,
  bookedKey,
  buildAvailability,
  dateInZone,
  type AvailabilityRules,
  type DayAvailability,
  type WeeklyCapacityRow,
} from "./logic";

type Db = Prisma.TransactionClient | typeof prisma;

export async function getRules(
  settings: { minHoursBefore: number; timezone: string },
  db: Db = prisma,
): Promise<AvailabilityRules> {
  const [weekly, exceptions] = await Promise.all([db.weeklyCapacity.findMany(), db.capacityException.findMany()]);
  return {
    weekly: weekly as WeeklyCapacityRow[],
    exceptions: exceptions.map((e) => ({
      date: fromDbDate(e.date),
      slot: e.slot,
      capacity: e.capacity,
      note: e.note,
    })),
    minHoursBefore: settings.minHoursBefore,
    timezone: settings.timezone,
  };
}

/** Booked places per date and window. Cancelled requests do not hold a place. */
export async function getBookedCounts(from: string, to: string, db: Db = prisma): Promise<Map<string, number>> {
  const rows = await db.cleaningRequest.groupBy({
    by: ["preferredDate", "timeSlot"],
    where: {
      preferredDate: { gte: toDbDate(from), lte: toDbDate(to) },
      status: { not: "CANCELLED" },
    },
    _count: { _all: true },
  });
  return new Map(rows.map((row) => [bookedKey(fromDbDate(row.preferredDate), row.timeSlot), row._count._all]));
}

export async function getAvailabilityDays(
  settings: { minHoursBefore: number; timezone: string },
  days: number,
  now = new Date(),
): Promise<DayAvailability[]> {
  const today = dateInZone(now, settings.timezone);
  const [rules, booked] = await Promise.all([getRules(settings), getBookedCounts(today, addDays(today, days - 1))]);
  return buildAvailability(today, days, booked, now, rules);
}
