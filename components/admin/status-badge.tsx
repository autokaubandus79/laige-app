import { Badge } from "@/components/ui/badge";
import { STATUS_LABELS } from "@/lib/format";
import type { Status } from "@/lib/logic";
import { cn } from "@/lib/utils";

const STYLES: Record<Status, string> = {
  NEW: "bg-amber-100 text-amber-900",
  CONFIRMED: "bg-accent text-primary",
  SCHEDULED: "bg-primary text-primary-foreground",
  DONE: "bg-green-600 text-white",
  CANCELLED: "bg-gray-200 text-gray-600",
};

export function StatusBadge({ status }: { status: Status }) {
  return <Badge className={cn("border-transparent", STYLES[status])}>{STATUS_LABELS[status]}</Badge>;
}
