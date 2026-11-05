import { Check, X } from "lucide-react";
import { STATUS_LABELS, formatDateLong } from "@/lib/format";
import type { Status } from "@/lib/logic";
import { cn } from "@/lib/utils";

const TIMELINE: Status[] = ["NEW", "CONFIRMED", "SCHEDULED", "DONE"];

function Timeline({ status }: { status: Status }) {
  const cancelled = status === "CANCELLED";
  const reached = TIMELINE.indexOf(status);

  return (
    <ol className="mt-5">
      {TIMELINE.map((step, index) => {
        const done = !cancelled && index <= reached;
        const isDone = step === "DONE" && done;
        return (
          <li key={step} className="flex gap-3" aria-current={step === status ? "step" : undefined}>
            <div className="flex flex-col items-center">
              <span
                className={cn(
                  "flex size-8 items-center justify-center rounded-full",
                  done ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
                  isDone && "bg-green-600",
                )}
              >
                {done && <Check className="size-4" aria-hidden />}
              </span>
              {index < TIMELINE.length - 1 && (
                <span className={cn("h-7 w-0.5", !cancelled && index < reached ? "bg-primary" : "bg-border")} />
              )}
            </div>
            <span className={cn("pt-1 text-sm font-semibold", !done && "text-muted-foreground")}>
              {STATUS_LABELS[step]}
            </span>
          </li>
        );
      })}
      {cancelled && (
        <li className="mt-3 flex items-center gap-3">
          <span className="flex size-8 items-center justify-center rounded-full bg-gray-500 text-white">
            <X className="size-4" aria-hidden />
          </span>
          <span className="text-sm font-semibold text-gray-600">{STATUS_LABELS.CANCELLED}</span>
        </li>
      )}
    </ol>
  );
}

export function StatusCard({
  code,
  status,
  date,
  slotLabel,
  serviceName,
}: {
  code: string;
  status: Status;
  date: string;
  slotLabel: string;
  serviceName: string;
}) {
  return (
    <div className="rounded-lg border bg-white p-5 shadow-sm">
      <p className="text-lg font-extrabold text-primary">{code}</p>
      <p className="text-sm text-muted-foreground">
        {serviceName} · {formatDateLong(date)}, {slotLabel}
      </p>
      <Timeline status={status} />
    </div>
  );
}
