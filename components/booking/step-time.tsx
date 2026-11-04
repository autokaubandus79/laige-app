"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDayMonth, weekdayName } from "@/lib/format";
import { startOfWeek, type DayAvailability, type Slot, type SlotAvailability } from "@/lib/logic";
import { cn } from "@/lib/utils";
import { FieldError, Section } from "./section";

export type ChosenTime = { date: string; slot: Slot; label: string };

function slotText(slot: SlotAvailability): string {
  if (slot.state === "closed") return "Suletud";
  if (slot.state === "full") return "Täis";
  if (slot.state === "too_soon") return "Liiga hilja";
  return `${slot.free} vaba`;
}

function chunkByWeek(days: DayAvailability[]): DayAvailability[][] {
  const weeks = new Map<string, DayAvailability[]>();
  for (const day of days) {
    const week = startOfWeek(day.date);
    weeks.set(week, [...(weeks.get(week) ?? []), day]);
  }
  return [...weeks.values()];
}

export function StepTime({
  days,
  loading,
  loadError,
  error,
  chosen,
  onChoose,
  onRetry,
}: {
  days: DayAvailability[] | null;
  loading: boolean;
  loadError: string | null;
  error?: string;
  chosen: ChosenTime | null;
  onChoose: (time: ChosenTime) => void;
  onRetry: () => void;
}) {
  const weeks = useMemo(() => chunkByWeek(days ?? []), [days]);
  // Until the customer turns the page: the chosen week, else the first with a free window.
  const [weekIndex, setWeekIndex] = useState<number | null>(null);
  const autoIndex = useMemo(() => {
    const chosenWeek = weeks.findIndex((w) => w.some((d) => d.date === chosen?.date));
    if (chosenWeek >= 0) return chosenWeek;
    return Math.max(0, weeks.findIndex((w) => w.some((d) => d.slots.some((s) => s.state === "open"))));
  }, [weeks, chosen]);
  const index = Math.min(weekIndex ?? autoIndex, Math.max(0, weeks.length - 1));
  const week = weeks[index] ?? [];

  return (
    <Section title="Vali saabumisaeg">
      <p className="-mt-2 mb-4 text-sm text-muted-foreground">
        Ajavahemik on koristaja saabumisaeg. Suurem töö võib kesta kauem.
      </p>

      {error && (
        <div id="field-time" className="mb-4 rounded-lg bg-destructive/10 p-3">
          <FieldError message={error} />
        </div>
      )}

      {loading && !days && (
        <div className="flex items-center justify-center gap-2 py-12 text-muted-foreground">
          <Loader2 className="size-5 animate-spin" aria-hidden />
          Laadime vabu aegu…
        </div>
      )}

      {loadError && (
        <div className="space-y-3 py-6 text-center">
          <p className="text-muted-foreground">{loadError}</p>
          <Button variant="outline" onClick={onRetry}>
            Proovi uuesti
          </Button>
        </div>
      )}

      {week.length > 0 && !loadError && (
        <>
          <div className="mb-4 flex items-center justify-between gap-2">
            <Button
              variant="outline"
              size="icon"
              className="size-11"
              disabled={index === 0}
              onClick={() => setWeekIndex(index - 1)}
              aria-label="Eelmine nädal"
            >
              <ChevronLeft className="size-5" aria-hidden />
            </Button>
            <p className="text-sm font-bold" aria-live="polite">
              {formatDayMonth(week[0].date)} – {formatDayMonth(week[week.length - 1].date)}
            </p>
            <Button
              variant="outline"
              size="icon"
              className="size-11"
              disabled={index >= weeks.length - 1}
              onClick={() => setWeekIndex(index + 1)}
              aria-label="Järgmine nädal"
            >
              <ChevronRight className="size-5" aria-hidden />
            </Button>
          </div>

          <div className="space-y-3">
            {week.map((day) => (
              <div key={day.date} className={cn("rounded-lg border p-3", day.closed && "bg-muted/60")}>
                <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-3">
                  <p className="text-sm font-bold first-letter:uppercase">
                    {weekdayName(day.date)}, {formatDayMonth(day.date)}
                  </p>
                  {day.note && <p className="text-sm font-medium text-muted-foreground">{day.note}</p>}
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {day.slots.map((slot) => {
                    const selected = chosen?.date === day.date && chosen.slot === slot.slot;
                    const open = slot.state === "open";
                    return (
                      <button
                        key={slot.slot}
                        type="button"
                        disabled={!open}
                        aria-pressed={selected}
                        title={slot.note ?? undefined}
                        onClick={() => onChoose({ date: day.date, slot: slot.slot, label: slot.label })}
                        className={cn(
                          "flex min-h-14 flex-col items-center justify-center rounded-lg border-2 px-1 py-1 text-center transition-colors",
                          open && !selected && "border-border bg-white hover:border-primary/50",
                          selected && "border-primary bg-primary text-primary-foreground",
                          !open && "cursor-not-allowed border-transparent bg-muted text-muted-foreground",
                        )}
                      >
                        <span className="text-sm font-bold tabular-nums">{slot.label}</span>
                        <span className={cn("text-xs", open && !selected && "font-semibold text-primary")}>
                          {slotText(slot)}
                        </span>
                      </button>
                    );
                  })}
                </div>
                {!day.note &&
                  day.slots
                    .filter((slot) => slot.note)
                    .map((slot) => (
                      <p key={slot.slot} className="mt-2 text-sm text-muted-foreground">
                        {slot.label}: {slot.note}
                      </p>
                    ))}
              </div>
            ))}
          </div>
        </>
      )}
    </Section>
  );
}
