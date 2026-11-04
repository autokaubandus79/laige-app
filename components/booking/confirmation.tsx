"use client";

import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { formatDateLong, formatEuros, formatMinutes } from "@/lib/format";
import type { CreatedRequest } from "@/lib/requests";

export function Confirmation({ created, vatIncluded }: { created: CreatedRequest; vatIncluded: boolean }) {
  const rows = [
    ["Teenus", created.serviceName],
    ["Pindala", `${created.areaM2} m²`],
    ["Piirkond", created.areaName],
    ["Aadress", created.address],
    ["Aeg", `${formatDateLong(created.date)}, ${created.slotLabel}`],
    ["Tööaeg", `umbes ${formatMinutes(created.estimatedMinutes)}`],
  ];

  return (
    <div className="mx-auto max-w-xl px-4 py-10">
      <div className="rounded-lg border bg-white p-6 text-center shadow-sm sm:p-8">
        <CheckCircle2 className="mx-auto size-14 text-primary" aria-hidden />
        <h1 className="mt-4 text-2xl font-extrabold">Aitäh! Päring on saadetud.</h1>
        <p className="mt-2 text-muted-foreground">Kinnitame aja telefoni teel ühe tööpäeva jooksul.</p>

        <div className="mt-6 rounded-lg bg-accent p-4">
          <p className="text-sm text-muted-foreground">Päringu kood</p>
          <p className="text-3xl font-extrabold tracking-wide text-primary">{created.code}</p>
        </div>

        <dl className="mt-6 space-y-2 text-left text-sm">
          {rows.map(([label, value]) => (
            <div key={label} className="flex justify-between gap-4">
              <dt className="text-muted-foreground">{label}</dt>
              <dd className="text-right font-semibold">{value}</dd>
            </div>
          ))}
          <div className="flex items-baseline justify-between gap-4 border-t pt-3">
            <dt className="text-base font-bold">Kokku</dt>
            <dd className="text-2xl font-extrabold text-primary">{formatEuros(created.totalEuros)}</dd>
          </div>
          {vatIncluded && <p className="text-right text-muted-foreground">Hind sisaldab käibemaksu</p>}
        </dl>

        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Link
            href="/status"
            className="inline-flex h-12 items-center justify-center rounded-lg bg-primary px-6 font-semibold text-primary-foreground"
          >
            Vaata staatust
          </Link>
          {/* A full reload clears the whole form. */}
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="inline-flex h-12 items-center justify-center rounded-lg border px-6 font-semibold"
          >
            Uus päring
          </button>
        </div>
      </div>
    </div>
  );
}
