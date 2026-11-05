import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DbError } from "@/components/db-error";
import { StatusCard } from "@/components/status-card";
import { fromDbDate, prisma } from "@/lib/db";
import { SLOT_INFO, type Slot } from "@/lib/logic";
import { isValidStatusToken } from "@/lib/validation";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Päringu seis – Läige",
  robots: { index: false, follow: false },
};

async function findRequest(token: string) {
  return prisma.cleaningRequest.findUnique({
    where: { statusToken: token },
    select: {
      code: true,
      status: true,
      preferredDate: true,
      timeSlot: true,
      service: { select: { name: true } },
    },
  });
}

export default async function PersonalStatusPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!isValidStatusToken(token)) notFound();

  let found: Awaited<ReturnType<typeof findRequest>>;
  try {
    found = await findRequest(token);
  } catch (error) {
    console.error("Loading a status page failed", error);
    return <DbError />;
  }
  if (!found) notFound();

  return (
    <div className="mx-auto max-w-lg px-4 py-10">
      <h1 className="mb-6 text-2xl font-extrabold tracking-tight">Sinu päringu seis</h1>
      <StatusCard
        code={found.code}
        status={found.status}
        date={fromDbDate(found.preferredDate)}
        slotLabel={SLOT_INFO[found.timeSlot as Slot].label}
        serviceName={found.service.name}
      />
      <Link href="/" className="mt-5 inline-block text-sm font-semibold text-primary underline">
        Tagasi avalehele
      </Link>
    </div>
  );
}
