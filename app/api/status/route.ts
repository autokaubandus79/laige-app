import { NextResponse } from "next/server";
import { DB_ERROR_MESSAGE } from "@/lib/catalog";
import { fromDbDate, prisma } from "@/lib/db";
import { SLOT_INFO, type Slot } from "@/lib/logic";

export const dynamic = "force-dynamic";

/** The same answer for a wrong code and a wrong email, so codes cannot be probed. */
const NOT_FOUND = "Sellise koodi ja e-posti aadressiga päringut ei leitud.";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { code?: unknown; email?: unknown } | null;
  const code = typeof body?.code === "string" ? body.code.trim().toUpperCase() : "";
  const email = typeof body?.email === "string" ? body.email.trim() : "";
  if (!code || !email) return NextResponse.json({ error: NOT_FOUND }, { status: 404 });

  try {
    const found = await prisma.cleaningRequest.findFirst({
      where: { code, email: { equals: email, mode: "insensitive" } },
      select: {
        code: true,
        status: true,
        preferredDate: true,
        timeSlot: true,
        service: { select: { name: true } },
      },
    });
    if (!found) return NextResponse.json({ error: NOT_FOUND }, { status: 404 });

    return NextResponse.json({
      code: found.code,
      status: found.status,
      date: fromDbDate(found.preferredDate),
      slotLabel: SLOT_INFO[found.timeSlot as Slot].label,
      serviceName: found.service.name,
    });
  } catch (error) {
    console.error("Status check failed", error);
    return NextResponse.json({ error: DB_ERROR_MESSAGE }, { status: 503 });
  }
}
