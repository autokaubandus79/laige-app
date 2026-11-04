import type { Metadata } from "next";
import { StatusCheck } from "@/components/status-check";

export const metadata: Metadata = { title: "Päringu staatus – Läige" };

export default function StatusPage() {
  return (
    <div className="mx-auto max-w-lg px-4 py-10">
      <h1 className="text-2xl font-extrabold tracking-tight">Vaata päringu staatust</h1>
      <p className="mt-1 mb-6 text-muted-foreground">Sisesta päringu kood ja e-post, mille päringus märkisid.</p>
      <StatusCheck />
    </div>
  );
}
