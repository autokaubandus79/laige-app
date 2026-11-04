"use client";

import { Button } from "@/components/ui/button";
import { DbError } from "@/components/db-error";

export default function ErrorPage({ retry }: { retry: () => void }) {
  return (
    <div className="pb-16 text-center">
      <DbError />
      <Button onClick={() => retry()}>Proovi uuesti</Button>
    </div>
  );
}
