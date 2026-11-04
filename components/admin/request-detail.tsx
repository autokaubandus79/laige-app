"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { unstable_isUnrecognizedActionError } from "next/navigation";
import { updateRequest } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { FREQUENCY_LABELS, STATUS_LABELS, formatCents, formatDateLong, formatEuros, formatMinutes } from "@/lib/format";
import { SLOT_INFO, STATUSES, type Slot, type Status } from "@/lib/logic";
import { OUTDATED_PAGE_MESSAGE } from "@/lib/messages";
import type { AdminRequest } from "@/lib/types";
import { StatusBadge } from "./status-badge";

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium">{value}</dd>
    </div>
  );
}

export function RequestDetail({ request, onClose }: { request: AdminRequest | null; onClose: () => void }) {
  const [status, setStatus] = useState<Status>(request?.status ?? "NEW");
  const [note, setNote] = useState(request?.internalNote ?? "");
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);
  const [saving, startSaving] = useTransition();

  if (!request) return null;

  function save() {
    if (!request) return;
    startSaving(async () => {
      try {
        const result = await updateRequest(request.id, status, note);
        setFeedback(result.ok ? { ok: true, text: "Salvestatud." } : { ok: false, text: result.error });
      } catch (error) {
        // Keep the open panel and the typed note when the page predates a deploy.
        if (!unstable_isUnrecognizedActionError(error)) throw error;
        setFeedback({ ok: false, text: OUTDATED_PAGE_MESSAGE });
      }
    });
  }

  return (
    <Sheet open onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-3 text-xl">
            {request.code}
            <StatusBadge status={request.status} />
          </SheetTitle>
          <SheetDescription>Loodud {request.createdLabel}</SheetDescription>
        </SheetHeader>

        <div className="space-y-6 px-4 pb-6">
          <dl className="space-y-2">
            <Row label="Klient" value={request.name} />
            <Row label="Telefon" value={<a className="text-primary underline" href={`tel:${request.phone.replace(/\s/g, "")}`}>{request.phone}</a>} />
            <Row label="E-post" value={<a className="text-primary underline" href={`mailto:${request.email}`}>{request.email}</a>} />
            <Row label="Aadress" value={request.address} />
            <Row label="Piirkond" value={request.areaName} />
          </dl>

          <dl className="space-y-2 border-t pt-4">
            <Row label="Teenus" value={request.serviceName} />
            <Row label="Pind, toad, vannitoad" value={`${request.areaM2} m², ${request.rooms}, ${request.bathrooms}`} />
            <Row label="Sagedus" value={FREQUENCY_LABELS[request.frequency]} />
            {request.extras.map((extra) => (
              <Row
                key={extra.code}
                label={extra.quantity > 1 ? `${extra.name} × ${extra.quantity}` : extra.name}
                value={formatCents(extra.priceCents * extra.quantity)}
              />
            ))}
            <Row label="Sõidutasu" value={request.travelFeeCents === 0 ? "tasuta" : formatCents(request.travelFeeCents)} />
            <Row label="Hind" value={<strong>{formatEuros(request.totalPrice)}</strong>} />
            <Row label="Tööaeg" value={formatMinutes(request.estimatedMinutes)} />
            <Row
              label="Aeg"
              value={`${formatDateLong(request.preferredDate)}, ${SLOT_INFO[request.timeSlot as Slot].label}`}
            />
          </dl>

          {request.notes && (
            <div className="border-t pt-4">
              <p className="text-sm text-muted-foreground">Kliendi lisainfo</p>
              <p className="mt-1 text-sm whitespace-pre-wrap">{request.notes}</p>
            </div>
          )}

          <div className="space-y-4 border-t pt-4">
            <div className="space-y-1.5">
              <Label className="font-semibold">Staatus</Label>
              <Select items={STATUS_LABELS} value={status} onValueChange={(value) => setStatus(value as Status)}>
                <SelectTrigger className="w-full" aria-label="Staatus">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent alignItemWithTrigger={false}>
                  {STATUSES.map((item) => (
                    <SelectItem key={item} value={item}>
                      {STATUS_LABELS[item]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="internal-note" className="font-semibold">
                Sisemärkus
              </Label>
              <Textarea id="internal-note" rows={4} value={note} onChange={(event) => setNote(event.target.value)} />
            </div>
            {feedback && (
              <p role="status" className={feedback.ok ? "text-sm font-medium text-primary" : "text-sm font-medium text-destructive"}>
                {feedback.text}
              </p>
            )}
            <Button size="lg" className="w-full" onClick={save} disabled={saving}>
              {saving ? <Loader2 className="size-5 animate-spin" aria-hidden /> : "Salvesta"}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
