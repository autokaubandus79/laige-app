"use client";

import { useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Status } from "@/lib/logic";
import { DB_ERROR_MESSAGE } from "@/lib/messages";
import { StatusCard } from "@/components/status-card";

type Result = { code: string; status: Status; date: string; slotLabel: string; serviceName: string };

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

      {result && <StatusCard {...result} />}
    </div>
  );
}
