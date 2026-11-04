import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/admin/login-form";
import { isAdmin } from "@/lib/auth";

export const metadata: Metadata = { title: "Sisselogimine – Läige", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function LoginPage() {
  if (await isAdmin()) redirect("/admin");
  return (
    <div className="mx-auto max-w-sm px-4 py-16">
      <h1 className="mb-6 text-2xl font-extrabold tracking-tight">Halduri sisselogimine</h1>
      <LoginForm />
    </div>
  );
}
