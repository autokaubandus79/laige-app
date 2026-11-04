import type { ReactNode } from "react";
import { DbError } from "@/components/db-error";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatCents } from "@/lib/format";

export const dynamic = "force-dynamic";

function DataTable({ title, headers, rows }: { title: string; headers: string[]; rows: ReactNode[][] }) {
  return (
    <section className="space-y-2">
      <h2 className="text-lg font-bold">{title}</h2>
      <div className="overflow-x-auto rounded-lg border bg-white shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              {headers.map((header) => (
                <TableHead key={header}>{header}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((cells, index) => (
              <TableRow key={index}>
                {cells.map((cell, cellIndex) => (
                  <TableCell key={cellIndex} className="max-w-sm whitespace-normal">
                    {cell}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </section>
  );
}

const yesNo = (value: boolean) => (value ? "jah" : "ei");

async function loadData() {
  const orderBy = { sortOrder: "asc" } as const;
  const [services, extras, areas, faq, settings] = await Promise.all([
    prisma.service.findMany({ orderBy }),
    prisma.extra.findMany({ orderBy }),
    prisma.serviceArea.findMany({ orderBy }),
    prisma.faqItem.findMany({ orderBy }),
    prisma.setting.findMany({ orderBy: { key: "asc" } }),
  ]);
  return { services, extras, areas, faq, settings };
}

export default async function DataPage() {
  await requireAdmin();
  let data: Awaited<ReturnType<typeof loadData>>;
  try {
    data = await loadData();
  } catch (error) {
    console.error("Loading data failed", error);
    return <DbError />;
  }

  return (
    <div className="space-y-6">
      <p className="rounded-lg bg-accent p-3 text-sm font-medium">
        Muuda Exceli faili kaustas data/ ja tee push – Railway uuendab andmed järgmisel deploy&apos;l.
      </p>
      <DataTable
        title="Teenused"
        headers={["Kood", "Nimi", "Hind m²", "Miinimum", "Min/m²", "Soodustus", "Aktiivne"]}
        rows={data.services.map((s) => [
          s.code,
          s.name,
          formatCents(s.pricePerM2Cents),
          formatCents(s.minPriceCents),
          String(s.minutesPerM2).replace(".", ","),
          yesNo(s.discountsAllowed),
          yesNo(s.active),
        ])}
      />
      <DataTable
        title="Lisatööd"
        headers={["Kood", "Nimi", "Ühik", "Hind", "Minutid", "Max kogus", "Aktiivne"]}
        rows={data.extras.map((e) => [
          e.code,
          e.name,
          e.unit,
          formatCents(e.priceCents),
          e.minutes,
          e.maxQty,
          yesNo(e.active),
        ])}
      />
      <DataTable
        title="Piirkonnad"
        headers={["Kood", "Nimi", "Regioon", "Sõidutasu", "Aktiivne"]}
        rows={data.areas.map((a) => [a.code, a.name, a.region, formatCents(a.travelFeeCents), yesNo(a.active)])}
      />
      <DataTable
        title="KKK"
        headers={["Kood", "Küsimus", "Vastus", "Märksõnad", "Kiirnupp", "Aktiivne"]}
        rows={data.faq.map((f) => [f.code, f.question, f.answer, f.keywords, yesNo(f.showAsChip), yesNo(f.active)])}
      />
      <DataTable
        title="Seaded"
        headers={["Võti", "Väärtus"]}
        rows={data.settings.map((s) => [s.key, s.value])}
      />
    </div>
  );
}
