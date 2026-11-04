import assert from "node:assert/strict";
import { cp, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";
import ExcelJS from "exceljs";
import { priceSample, priceSettingsFrom, readDataFiles } from "../lib/excel";

const DATA_DIR = path.join(process.cwd(), "data");

async function withEditedFile(
  file: string,
  edit: (workbook: ExcelJS.Workbook) => void,
  check: (dir: string) => Promise<void>,
) {
  const dir = await mkdtemp(path.join(tmpdir(), "laige-data-"));
  try {
    await cp(DATA_DIR, dir, { recursive: true });
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(path.join(dir, file));
    edit(workbook);
    await workbook.xlsx.writeFile(path.join(dir, file));
    await check(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

test("real files parse into the expected shape", async () => {
  const data = await readDataFiles(DATA_DIR);
  assert.equal(data.services.length, 4);
  assert.equal(data.extras.length, 6);
  assert.equal(data.areas.length, 16);
  assert.equal(data.faq.length, 12);
  assert.equal(data.weekly.length, 21);
  assert.equal(data.exceptions.length, 11);
  assert.equal(data.samples.length, 20);
  assert.equal(data.services[1].pricePerM2Cents, 220);
  assert.equal(data.areas.find((a) => a.code === "KEILA")?.active, false);
  assert.equal(data.exceptions[1].date, "2026-12-24");
});

test("sample dates and times are read in Tallinn time", async () => {
  const data = await readDataFiles(DATA_DIR);
  const first = data.samples[0];
  assert.equal(first.preferredDate, "2026-10-27");
  // 09:14 in Tallinn on 20 October is summer time, UTC+3.
  assert.equal(first.createdAt.toISOString(), "2026-10-20T06:14:00.000Z");
});

test("every sample matches its expected total and minutes", async () => {
  const data = await readDataFiles(DATA_DIR);
  const lookup = { ...data, priceSettings: priceSettingsFrom(data.settings) };
  for (const sample of data.samples) {
    const priced = priceSample(sample, lookup);
    assert.equal(priced.quote.totalEuros, sample.expectedTotal, `${sample.code} total`);
    assert.equal(priced.quote.estimatedMinutes, sample.expectedMinutes, `${sample.code} minutes`);
  }
});

test("a non-numeric price names the file, sheet and row", async () => {
  await withEditedFile(
    "hinnakiri.xlsx",
    (workbook) => {
      workbook.getWorksheet("Services")!.getRow(3).getCell("D").value = "kallis";
    },
    (dir) =>
      assert.rejects(readDataFiles(dir), /hinnakiri\.xlsx, leht Services, rida 3.*price_per_m2.*kallis/),
  );
});

test("a missing sheet stops the seed", async () => {
  await withEditedFile(
    "kkk.xlsx",
    (workbook) => {
      workbook.removeWorksheet(workbook.getWorksheet("FAQ")!.id);
    },
    (dir) => assert.rejects(readDataFiles(dir), /kkk\.xlsx, leht FAQ: lehte ei leitud/),
  );
});

test("a missing column stops the seed", async () => {
  await withEditedFile(
    "piirkonnad.xlsx",
    (workbook) => {
      workbook.getWorksheet("Areas")!.getRow(1).getCell("D").value = "fee";
    },
    (dir) => assert.rejects(readDataFiles(dir), /piirkonnad\.xlsx, leht Areas, rida 1: puudub veerg travel_fee/),
  );
});

test("an unknown code in a sample request names the row", async () => {
  await withEditedFile(
    "naidisparingud.xlsx",
    (workbook) => {
      workbook.getWorksheet("Requests")!.getRow(5).getCell("C").value = "WINDOWS_ONLY";
    },
    async (dir) => {
      const data = await readDataFiles(dir);
      const lookup = { ...data, priceSettings: priceSettingsFrom(data.settings) };
      assert.throws(
        () => data.samples.forEach((sample) => priceSample(sample, lookup)),
        /naidisparingud\.xlsx, leht Requests, rida 5.*WINDOWS_ONLY/,
      );
    },
  );
});

test("dates as YYYY-MM-DD text and capitalised yes/no are accepted", async () => {
  await withEditedFile(
    "toograafik.xlsx",
    (workbook) => {
      workbook.getWorksheet("Exceptions")!.getRow(3).getCell("A").value = "2026-12-24";
    },
    async (dir) => {
      const data = await readDataFiles(dir);
      assert.equal(data.exceptions[1].date, "2026-12-24");
    },
  );
  await withEditedFile(
    "hinnakiri.xlsx",
    (workbook) => {
      workbook.getWorksheet("Services")!.getRow(2).getCell("I").value = " Yes ";
    },
    async (dir) => {
      const data = await readDataFiles(dir);
      assert.equal(data.services[0].active, true);
    },
  );
});

test("an invalid date stops the seed", async () => {
  await withEditedFile(
    "toograafik.xlsx",
    (workbook) => {
      workbook.getWorksheet("Exceptions")!.getRow(4).getCell("A").value = "jõulud";
    },
    (dir) => assert.rejects(readDataFiles(dir), /toograafik\.xlsx, leht Exceptions, rida 4.*date/),
  );
});
