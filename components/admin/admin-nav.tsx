"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/admin", label: "Päringud" },
  { href: "/admin/schedule", label: "Töögraafik" },
  { href: "/admin/data", label: "Andmed" },
];

export function AdminNav() {
  const pathname = usePathname();
  return (
    <nav className="flex gap-1 rounded-lg bg-muted p-1" aria-label="Haldus">
      {LINKS.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          aria-current={pathname === link.href ? "page" : undefined}
          className={cn(
            "inline-flex h-10 items-center rounded-md px-4 text-sm font-semibold",
            pathname === link.href ? "bg-white text-primary shadow-sm" : "text-muted-foreground hover:text-foreground",
          )}
        >
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
