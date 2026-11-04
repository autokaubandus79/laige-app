import { RequestsDashboard } from "@/components/admin/requests-dashboard";
import { DbError } from "@/components/db-error";
import { requireAdmin } from "@/lib/auth";
import { getSettingsMap, parseSettings } from "@/lib/catalog";
import { fromDbDate, prisma } from "@/lib/db";
import { formatDate } from "@/lib/format";
import { dateInZone, startOfWeek, timeInZone, zonedTimeToUtc } from "@/lib/logic";
import type { AdminRequest, RequestExtra } from "@/lib/types";

export const dynamic = "force-dynamic";

async function loadRequests() {
  const { timezone } = parseSettings(await getSettingsMap());
  const rows = await prisma.cleaningRequest.findMany({
    orderBy: { createdAt: "desc" },
    include: { service: { select: { name: true } }, area: { select: { name: true } } },
  });
  const requests: AdminRequest[] = rows.map((row) => ({
    id: row.id,
    code: row.code,
    createdAtIso: row.createdAt.toISOString(),
    createdLabel: `${formatDate(dateInZone(row.createdAt, timezone))} ${timeInZone(row.createdAt, timezone)}`,
    serviceName: row.service.name,
    areaName: row.area.name,
    areaM2: row.areaM2,
    rooms: row.rooms,
    bathrooms: row.bathrooms,
    frequency: row.frequency,
    extras: row.extras as RequestExtra[],
    travelFeeCents: row.travelFeeCents,
    totalPrice: row.totalPrice,
    estimatedMinutes: row.estimatedMinutes,
    preferredDate: fromDbDate(row.preferredDate),
    timeSlot: row.timeSlot,
    address: row.address,
    name: row.name,
    phone: row.phone,
    email: row.email,
    notes: row.notes,
    status: row.status,
    internalNote: row.internalNote,
    isSample: row.isSample,
  }));
  const monday = startOfWeek(dateInZone(new Date(), timezone));
  return { requests, weekStartIso: zonedTimeToUtc(monday, 0, 0, timezone).toISOString() };
}

export default async function AdminRequestsPage() {
  await requireAdmin();
  let data: Awaited<ReturnType<typeof loadRequests>>;
  try {
    data = await loadRequests();
  } catch (error) {
    console.error("Loading requests failed", error);
    return <DbError />;
  }
  return <RequestsDashboard requests={data.requests} weekStartIso={data.weekStartIso} />;
}
