"use client";

import Link from "next/link";
import { CheckCircle2, Search } from "lucide-react";
import { CopyButton } from "@/components/copy-button";
import { Input } from "@/components/ui/input";
import { formatDateLong, formatEuros, formatMinutes } from "@/lib/format";
import { clearConfirmation, type SavedConfirmation } from "@/lib/saved-confirmation";

export function Confirmation({
  created,
  vatIncluded,
}: {
  created: SavedConfirmation & { address?: string };
  vatIncluded: boolean;
}) {
  const statusPath = `/status/${created.statusToken}`;
  const statusLink = `${window.location.origin}${statusPath}`;

  const rows = [
    ["Teenus", created.serviceName],
    ["Pindala", `${created.areaM2} m²`],
    ["Piirkond", created.areaName],
    ...(created.address ? [["Aadress", created.address]] : []),
    ["Aeg", `${formatDateLong(created.date)}, ${created.slotLabel}`],
    ["Tööaeg", `umbes ${formatMinutes(created.estimatedMinutes)}`],
  ];

  return (
    <div className="mx-auto max-w-xl px-4 py-10">
      <div className="rounded-lg border bg-white p-6 text-center shadow-sm sm:p-8">
        <CheckCircle2 className="mx-auto size-14 text-primary" aria-hidden />
        <h1 className="mt-4 text-2xl font-extrabold">Aitäh! Päring on saadetud.</h1>
        <p className="mt-2 text-muted-foreground">Kinnitame aja telefoni teel ühe tööpäeva jooksul.</p>

        <div className="mt-6 rounded-lg bg-accent p-5">
          <p className="text-sm text-muted-foreground">Päringu kood</p>
          <p className="text-4xl font-extrabold tracking-wide text-primary sm:text-5xl">{created.code}</p>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <CopyButton text={created.code} label="Kopeeri kood" />
            <Link
              href={statusPath}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-primary px-6 font-semibold text-primary-foreground"
            >
              <Search className="size-5" aria-hidden />
              Vaata staatust
            </Link>
          </div>
        </div>

        <div className="mt-4 space-y-2 rounded-lg border p-4 text-left">
          <p className="text-sm font-semibold">Salvesta see link – sellega näed alati oma päringu seisu</p>
          <Input
            readOnly
            value={statusLink}
            aria-label="Sinu isiklik staatuse link"
            className="text-sm"
            onFocus={(event) => event.target.select()}
          />
          <CopyButton text={statusLink} label="Kopeeri link" />
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

        <button
          type="button"
          onClick={() => {
            clearConfirmation();
            window.location.reload();
          }}
          className="mt-6 inline-flex h-12 items-center justify-center rounded-lg border px-6 font-semibold"
        >
          Uus päring
        </button>
      </div>
    </div>
  );
}
