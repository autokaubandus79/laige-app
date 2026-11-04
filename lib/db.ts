import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

/** A calendar date stored in a Postgres DATE column. */
export function toDbDate(date: string): Date {
  return new Date(`${date}T00:00:00Z`);
}

export function fromDbDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}
