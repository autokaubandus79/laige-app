"use client";

import { Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Stepper({
  value,
  min,
  max,
  onChange,
  label,
}: {
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
  label: string;
}) {
  return (
    <div className="inline-flex items-center gap-1" role="group" aria-label={label}>
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="size-11 rounded-lg"
        disabled={value <= min}
        onClick={() => onChange(value - 1)}
        aria-label={`Vähenda: ${label}`}
      >
        <Minus className="size-4" aria-hidden />
      </Button>
      <span className="w-9 text-center text-base font-bold tabular-nums" aria-live="polite">
        {value}
      </span>
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="size-11 rounded-lg"
        disabled={value >= max}
        onClick={() => onChange(value + 1)}
        aria-label={`Suurenda: ${label}`}
      >
        <Plus className="size-4" aria-hidden />
      </Button>
    </div>
  );
}
