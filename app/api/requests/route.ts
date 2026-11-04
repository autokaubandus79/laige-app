import { NextResponse } from "next/server";
import { DB_ERROR_MESSAGE, getCatalog } from "@/lib/catalog";
import { SlotError, createRequest } from "@/lib/requests";
import { parseBooking } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Päringut ei saanud lugeda." }, { status: 400 });
  }

  try {
    const catalog = await getCatalog();
    const parsed = parseBooking(body, catalog);
    if (!parsed.ok) return NextResponse.json({ fieldErrors: parsed.errors }, { status: 400 });

    const created = await createRequest(parsed.data, catalog);
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    if (error instanceof SlotError) {
      return NextResponse.json({ error: error.message, slotTaken: true }, { status: 409 });
    }
    console.error("Saving a request failed", error);
    return NextResponse.json({ error: DB_ERROR_MESSAGE }, { status: 503 });
  }
}
