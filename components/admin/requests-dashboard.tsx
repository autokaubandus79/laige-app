"use client";

import { useMemo, useState, useTransition } from "react";
import { Search, Trash2 } from "lucide-react";
import { deleteSampleRequests } from "@/app/admin/actions";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { STATUS_LABELS, formatDate, formatEuros } from "@/lib/format";
import { SLOT_INFO, STATUSES, type Slot } from "@/lib/logic";
import type { AdminRequest } from "@/lib/types";
import { RequestDetail } from "./request-detail";
import { StatusBadge } from "./status-badge";

const ALL = "ALL";
const STATUS_ITEMS = { [ALL]: "Kõik staatused", ...STATUS_LABELS };

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-white p-4 shadow-sm">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-extrabold text-primary tabular-nums">{value}</p>
    </div>
  );
}

export function RequestsDashboard({ requests, weekStartIso }: { requests: AdminRequest[]; weekStartIso: string }) {
  const [statusFilter, setStatusFilter] = useState<string>(ALL);
  const [search, setSearch] = useState("");
  const [hideSamples, setHideSamples] = useState(false);
  const [openId, setOpenId] = useState<number | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleting, startDelete] = useTransition();

  const pool = useMemo(
    () => (hideSamples ? requests.filter((r) => !r.isSample) : requests),
    [hideSamples, requests],
  );

  const stats = useMemo(() => {
    const weekStart = Date.parse(weekStartIso);
    return {
      fresh: pool.filter((r) => r.status === "NEW").length,
      thisWeek: pool.filter((r) => Date.parse(r.createdAtIso) >= weekStart).length,
      value: pool
        .filter((r) => r.status === "CONFIRMED" || r.status === "SCHEDULED")
        .reduce((sum, r) => sum + r.totalPrice, 0),
    };
  }, [pool, weekStartIso]);

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    return pool.filter(
      (r) =>
        (statusFilter === ALL || r.status === statusFilter) &&
        (!term || r.name.toLowerCase().includes(term) || r.code.toLowerCase().includes(term)),
    );
  }, [pool, search, statusFilter]);

  const sampleCount = requests.filter((r) => r.isSample).length;
  const openRequest = requests.find((r) => r.id === openId) ?? null;

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Uued päringud" value={String(stats.fresh)} />
        <Stat label="Päringuid sel nädalal" value={String(stats.thisWeek)} />
        <Stat label="Kinnitatud ja planeeritud kokku" value={formatEuros(stats.value)} />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-52 flex-1">
          <Search className="absolute top-3.5 left-3 size-4 text-muted-foreground" aria-hidden />
          <Input
            className="bg-white pl-9"
            placeholder="Otsi nime või koodi järgi"
            aria-label="Otsi nime või koodi järgi"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <Select items={STATUS_ITEMS} value={statusFilter} onValueChange={(value) => setStatusFilter(value as string)}>
          <SelectTrigger className="w-48 bg-white" aria-label="Filtreeri staatuse järgi">
            <SelectValue />
          </SelectTrigger>
          <SelectContent alignItemWithTrigger={false}>
            <SelectItem value={ALL}>Kõik staatused</SelectItem>
            {STATUSES.map((status) => (
              <SelectItem key={status} value={status}>
                {STATUS_LABELS[status]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Label className="flex h-11 cursor-pointer items-center gap-2 text-sm font-medium">
          <Switch checked={hideSamples} onCheckedChange={setHideSamples} />
          Peida näidisandmed
        </Label>

        {sampleCount > 0 && (
          <AlertDialog>
            <AlertDialogTrigger render={<Button variant="outline" className="h-11 text-destructive" />}>
              <Trash2 className="size-4" aria-hidden />
              Kustuta näidispäringud
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Kustutada {sampleCount} näidispäringut?</AlertDialogTitle>
                <AlertDialogDescription>
                  Näidisandmed kustutatakse jäädavalt ja nende kohad töögraafikus vabanevad. Päris päringud jäävad
                  alles.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Loobu</AlertDialogCancel>
                <AlertDialogAction
                  variant="destructive"
                  onClick={() =>
                    startDelete(async () => {
                      const result = await deleteSampleRequests();
                      setDeleteError(result.ok ? null : result.error);
                    })
                  }
                >
                  Kustuta
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>

      {deleting && <p className="text-sm text-muted-foreground">Kustutan…</p>}
      {deleteError && (
        <p role="alert" className="text-sm font-medium text-destructive">
          {deleteError}
        </p>
      )}

      <div className="overflow-x-auto rounded-lg border bg-white shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Kood</TableHead>
              <TableHead>Loodud</TableHead>
              <TableHead>Klient</TableHead>
              <TableHead>Teenus</TableHead>
              <TableHead>Piirkond</TableHead>
              <TableHead className="text-right">Hind</TableHead>
              <TableHead>Aeg</TableHead>
              <TableHead>Staatus</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visible.map((request) => (
              <TableRow key={request.id} className="cursor-pointer" onClick={() => setOpenId(request.id)}>
                <TableCell className="font-semibold">
                  <button
                    type="button"
                    className="inline-flex min-h-8 items-center gap-2 text-primary underline-offset-2 hover:underline"
                    onClick={(event) => {
                      event.stopPropagation();
                      setOpenId(request.id);
                    }}
                  >
                    {request.code}
                  </button>
                  {request.isSample && (
                    <Badge variant="outline" className="ml-2 text-muted-foreground">
                      Näidis
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="whitespace-nowrap">{request.createdLabel}</TableCell>
                <TableCell>{request.name}</TableCell>
                <TableCell>{request.serviceName}</TableCell>
                <TableCell>{request.areaName}</TableCell>
                <TableCell className="text-right font-semibold whitespace-nowrap">
                  {formatEuros(request.totalPrice)}
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  {formatDate(request.preferredDate)} {SLOT_INFO[request.timeSlot as Slot].label}
                </TableCell>
                <TableCell>
                  <StatusBadge status={request.status} />
                </TableCell>
              </TableRow>
            ))}
            {visible.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="py-10 text-center text-muted-foreground">
                  Päringuid ei leitud.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <RequestDetail key={openRequest?.id ?? "none"} request={openRequest} onClose={() => setOpenId(null)} />
    </div>
  );
}
