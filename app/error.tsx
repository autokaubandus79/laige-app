"use client";

import { useEffect } from "react";
import { unstable_isUnrecognizedActionError } from "next/navigation";
import { DbError } from "@/components/db-error";
import { Button } from "@/components/ui/button";

export default function ErrorPage({ error, retry }: { error: Error; retry: () => void }) {
  // A page opened before a deploy calls server code that no longer exists.
  const pageIsOutdated = unstable_isUnrecognizedActionError(error);

  useEffect(() => {
    if (pageIsOutdated) window.location.reload();
  }, [pageIsOutdated]);

  if (pageIsOutdated) {
    return <p className="px-4 py-20 text-center text-muted-foreground">Rakendus uuenes. Laadime lehe uuesti…</p>;
  }

  return (
    <div className="pb-16 text-center">
      <DbError />
      <Button onClick={() => retry()}>Proovi uuesti</Button>
    </div>
  );
}
