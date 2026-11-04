"use client";

import { useState, type FormEvent } from "react";
import { Check, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { STATUS_LABELS, formatDateLong } from "@/lib/format";
import type { Status } from "@/lib/logic";
import { DB_ERROR_MESSAGE } from "@/lib/messages";
import { cn } from "@/lib/utils";

type Result = { code: string; status: Status; date: string; slotLabel: string; serviceName: string };

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

export function StatusCheck() {
  const [code, setCode] = useState("");
  const [email, setEmail] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const response = await fetch("/api/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, email }),
      });
      const data = await response.json();
      if (response.ok) setResult(data);
      else setError(data.error ?? DB_ERROR_MESSAGE);
    } catch {
      setError(DB_ERROR_MESSAGE);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border bg-white p-5 shadow-sm">
        <div className="space-y-1.5">
          <Label htmlFor="code" className="font-semibold">
            Päringu kood
          </Label>
          <Input id="code" required placeholder="LG-1234" value={code} onChange={(e) => setCode(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="email" className="font-semibold">
            E-post
          </Label>
          <Input
            id="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        {error && (
          <p role="alert" className="text-sm font-medium text-destructive">
            {error}
          </p>
        )}
        <Button type="submit" size="lg" className="w-full" disabled={loading}>
          {loading ? <Loader2 className="size-5 animate-spin" aria-hidden /> : "Vaata staatust"}
        </Button>
      </form>

      {result && (
        <div className="rounded-lg border bg-white p-5 shadow-sm">
          <p className="text-lg font-extrabold text-primary">{result.code}</p>
          <p className="text-sm text-muted-foreground">
            {result.serviceName} · {formatDateLong(result.date)}, {result.slotLabel}
          </p>
          <Timeline status={result.status} />
        </div>
      )}
    </div>
  );
}
