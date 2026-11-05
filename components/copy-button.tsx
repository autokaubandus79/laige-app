"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";

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

export function CopyButton({ text, label }: { text: string; label: string }) {
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
