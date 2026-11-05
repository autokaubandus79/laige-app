"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Check, CheckCircle2, Copy, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatDateLong, formatEuros, formatMinutes } from "@/lib/format";
import { clearConfirmation, type SavedConfirmation } from "@/lib/saved-confirmation";

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Older browsers and some in-app browsers have no clipboard API.
    const field = document.createElement("textarea");
    field.value = text;
    field.style.position = "fixed";
    field.style.opacity = "0";
    document.body.append(field);
    field.select();
    const copied = document.execCommand("copy");
    field.remove();
    return copied;
  }
}

function CopyButton({ text, label }: { text: string; label: string }) {
  const [result, setResult] = useState<"idle" | "copied" | "failed">("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  async function handleCopy() {
    setResult((await copyText(text)) ? "copied" : "failed");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setResult("idle"), 2500);
  }

  return (
    <Button type="button" variant="outline" size="lg" className="w-full" onClick={handleCopy}>
      {result === "copied" ? <Check className="size-5" aria-hidden /> : <Copy className="size-5" aria-hidden />}
      <span aria-live="polite">
        {result === "copied" ? "Kopeeritud" : result === "failed" ? "Ei õnnestunud, kopeeri käsitsi" : label}
      </span>
    </Button>
  );
}

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
