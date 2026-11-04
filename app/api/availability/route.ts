import { NextResponse } from "next/server";
import { getAvailabilityDays } from "@/lib/availability";
import { DB_ERROR_MESSAGE, getSettingsMap, parseSettings } from "@/lib/catalog";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const settings = parseSettings(await getSettingsMap());
    const days = await getAvailabilityDays(settings, settings.bookingDaysAhead);
    return NextResponse.json({ days }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Availability failed", error);
    return NextResponse.json({ error: DB_ERROR_MESSAGE }, { status: 503 });
  }
}
