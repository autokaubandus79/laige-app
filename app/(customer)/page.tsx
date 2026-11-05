import { BookingFlow } from "@/components/booking/booking-flow";
import { DbError } from "@/components/db-error";
import { getCatalog } from "@/lib/catalog";
import type { Catalog } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  let catalog: Catalog;
  try {
    catalog = await getCatalog();
  } catch (error) {
    console.error("Loading the calculator failed", error);
    return <DbError />;
  }

  if (catalog.services.length === 0) return <DbError />;
  return <BookingFlow catalog={catalog} />;
}
