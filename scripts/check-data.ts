import path from "node:path";
import { DataFileError, priceSample, priceSettingsFrom, readDataFiles } from "../lib/excel";

/** Checks the Excel files without a database: `npm run check:data`. */
async function main() {
  const data = await readDataFiles(path.join(process.cwd(), "data"));
  const lookup = {
    services: data.services,
    areas: data.areas,
    extras: data.extras,
    priceSettings: priceSettingsFrom(data.settings),
  };

  let differences = 0;
  for (const sample of data.samples) {
    const { warning } = priceSample(sample, lookup);
    if (warning) {
      differences += 1;
      console.warn(warning);
    }
  }

  console.log(
    `Failid korras: ${data.services.length} teenust, ${data.extras.length} lisatööd, ` +
      `${data.areas.length} piirkonda, ${data.faq.length} KKK rida, ${data.weekly.length} nädala rida, ` +
      `${data.exceptions.length} erandit, ${data.settings.length} seadet, ${data.samples.length} näidispäringut.`,
  );
  console.log(`Näidispäringud: ${data.samples.length - differences} klapib, ${differences} erineb.`);
  if (differences > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error instanceof DataFileError ? error.message : error);
  process.exit(1);
});
