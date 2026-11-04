import { CloudOff } from "lucide-react";
import { DB_ERROR_MESSAGE } from "@/lib/messages";

export function DbError() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-3 px-4 py-20 text-center">
      <CloudOff className="size-10 text-muted-foreground" aria-hidden />
      <h1 className="text-xl font-bold">Vabandust, midagi läks valesti</h1>
      <p className="text-muted-foreground">{DB_ERROR_MESSAGE}</p>
    </div>
  );
}
