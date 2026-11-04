import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { DataFileError, priceSample, priceSettingsFrom, readDataFiles } from "../lib/excel";

const DATA_DIR = path.join(process.cwd(), "data");

function asDate(date: string): Date {
  return new Date(`${date}T00:00:00Z`);
}

async function main() {
  // Every file is read and checked before the database is touched.
  const data = await readDataFiles(DATA_DIR);
  const prisma = new PrismaClient();
  const warnings: string[] = [];

  try {
    const sampleCount = await prisma.$transaction(
      async (tx) => {
        for (const { code, ...fields } of data.services) {
          await tx.service.upsert({ where: { code }, update: fields, create: { code, ...fields } });
        }
        await tx.service.updateMany({
          where: { code: { notIn: data.services.map((s) => s.code) } },
          data: { active: false },
        });

        for (const { code, ...fields } of data.extras) {
          await tx.extra.upsert({ where: { code }, update: fields, create: { code, ...fields } });
        }
        await tx.extra.updateMany({
          where: { code: { notIn: data.extras.map((e) => e.code) } },
          data: { active: false },
        });

        for (const { code, ...fields } of data.areas) {
          await tx.serviceArea.upsert({ where: { code }, update: fields, create: { code, ...fields } });
        }
        await tx.serviceArea.updateMany({
          where: { code: { notIn: data.areas.map((a) => a.code) } },
          data: { active: false },
        });

        for (const { code, ...fields } of data.faq) {
          await tx.faqItem.upsert({ where: { code }, update: fields, create: { code, ...fields } });
        }
        await tx.faqItem.updateMany({
          where: { code: { notIn: data.faq.map((f) => f.code) } },
          data: { active: false },
        });

        await tx.weeklyCapacity.deleteMany();
        await tx.weeklyCapacity.createMany({ data: data.weekly });

        await tx.capacityException.deleteMany();
        await tx.capacityException.createMany({
          data: data.exceptions.map((e) => ({ ...e, date: asDate(e.date) })),
        });

        for (const { key, value } of data.settings) {
          await tx.setting.upsert({ where: { key }, update: { value }, create: { key, value } });
        }

        if ((await tx.cleaningRequest.count()) > 0) return 0;

        // Rows that left the Excel files stay in the database as inactive, so
        // sample requests are resolved against the database, not the files.
        const lookup = {
          services: await tx.service.findMany(),
          areas: await tx.serviceArea.findMany(),
          extras: await tx.extra.findMany(),
          priceSettings: priceSettingsFrom(data.settings),
        };

        for (const sample of data.samples) {
          const priced = priceSample(sample, lookup);
          if (priced.warning) warnings.push(priced.warning);
          await tx.cleaningRequest.create({
            data: {
              code: sample.code,
              serviceId: priced.serviceId!,
              areaId: priced.areaId!,
              areaM2: sample.areaM2,
              rooms: sample.rooms,
              bathrooms: sample.bathrooms,
              frequency: priced.quote.frequency,
              extras: priced.extras,
              travelFeeCents: priced.quote.travelFeeCents,
              totalPrice: priced.quote.totalEuros,
              estimatedMinutes: priced.quote.estimatedMinutes,
              preferredDate: asDate(sample.preferredDate),
              timeSlot: sample.timeSlot,
              address: sample.address,
              name: sample.name,
              phone: sample.phone,
              email: sample.email,
              notes: sample.notes,
              status: sample.status,
              internalNote: sample.internalNote,
              isSample: true,
              createdAt: sample.createdAt,
            },
          });
        }
        return data.samples.length;
      },
      { maxWait: 20_000, timeout: 120_000 },
    );

    for (const warning of warnings) console.warn(warning);
    console.log(
      `Seed valmis: ${data.services.length} teenust, ${data.extras.length} lisatööd, ` +
        `${data.areas.length} piirkonda, ${data.faq.length} KKK rida, ` +
        `${data.exceptions.length} erandit, ${sampleCount} näidispäringut lisatud.`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error instanceof DataFileError ? error.message : error);
  process.exit(1);
});
