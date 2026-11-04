import type { Metadata } from "next";
import { LogOut } from "lucide-react";
import { logout } from "@/app/admin/actions";
import { AdminNav } from "@/components/admin/admin-nav";
import { Button } from "@/components/ui/button";
import { requireAdmin } from "@/lib/auth";

export const metadata: Metadata = { title: "Haldus – Läige", robots: { index: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <AdminNav />
        <form action={logout}>
          <Button type="submit" variant="outline">
            <LogOut className="size-4" aria-hidden />
            Logi välja
          </Button>
        </form>
      </div>
      {children}
    </div>
  );
}
