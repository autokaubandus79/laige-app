"use client";

import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import { login } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function LoginForm() {
  const [state, action, pending] = useActionState(login, { error: null });

  return (
    <form action={action} className="space-y-4 rounded-lg border bg-white p-5 shadow-sm">
      <div className="space-y-1.5">
        <Label htmlFor="password" className="font-semibold">
          Parool
        </Label>
        <Input id="password" name="password" type="password" required autoComplete="current-password" />
      </div>
      {state.error && (
        <p role="alert" className="text-sm font-medium text-destructive">
          {state.error}
        </p>
      )}
      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? <Loader2 className="size-5 animate-spin" aria-hidden /> : "Logi sisse"}
      </Button>
    </form>
  );
}
