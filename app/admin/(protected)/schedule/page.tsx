import { DbError } from "@/components/db-error";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getAvailabilityDays } from "@/lib/availability";
import { requireAdmin } from "@/lib/auth";
import { getSettingsMap, parseSettings } from "@/lib/catalog";
import { formatDayMonth, weekdayName } from "@/lib/format";
import { SLOTS, SLOT_INFO, type DayAvailability, type SlotAvailability } from "@/lib/logic";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const SCHEDULE_DAYS = 14;

function SlotCell({ slot }: { slot: SlotAvailability }) {
  const isFull = slot.capacity > 0 && slot.booked >= slot.capacity;
  return (
    <TableCell className="text-center">
      <span
        title={slot.note ?? undefined}
        className={cn(
          "inline-flex min-w-14 justify-center rounded-md px-2 py-1 text-sm font-bold tabular-nums",
          slot.capacity === 0 && slot.booked === 0 && "bg-muted text-muted-foreground",
          slot.capacity > 0 && !isFull && slot.booked > 0 && "bg-accent text-primary",
          isFull && "bg-primary text-primary-foreground",
        )}
      >
        {slot.booked} / {slot.capacity}
      </span>
    </TableCell>
  );
}

export default async function SchedulePage() {
  await requireAdmin();
  let days: DayAvailability[];
  try {
    const settings = parseSettings(await getSettingsMap());
    days = await getAvailabilityDays(settings, SCHEDULE_DAYS);
  } catch (error) {
    console.error("Loading the schedule failed", error);
    return <DbError />;
  }

  return (
    <div className="space-y-3">
      <div>
        <h1 className="text-xl font-extrabold">Töögraafik: järgmised {SCHEDULE_DAYS} päeva</h1>
        <p className="text-sm text-muted-foreground">Broneeritud / maht. Tühistatud päringud kohta ei võta.</p>
      </div>
      <div className="overflow-x-auto rounded-lg border bg-white shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Päev</TableHead>
              {SLOTS.map((slot) => (
                <TableHead key={slot} className="text-center">
                  {SLOT_INFO[slot].label}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {days.map((day) => (
              <TableRow key={day.date}>
                <TableCell>
                  <span className="font-semibold capitalize">{weekdayName(day.date)}</span>{" "}
                  <span className="text-muted-foreground">{formatDayMonth(day.date)}</span>
                  {day.note && <span className="block text-xs text-muted-foreground">{day.note}</span>}
                </TableCell>
                {day.slots.map((slot) => (
                  <SlotCell key={slot.slot} slot={slot} />
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
