import { calculateQuote, type Quote } from "./logic";
import type { Catalog, RequestExtra, Selection } from "./types";

/** The chosen extras with quantity above zero, in catalogue order. */
export function chosenExtras(catalog: Pick<Catalog, "extras">, selection: Pick<Selection, "extras">): RequestExtra[] {
  return catalog.extras.flatMap((extra) => {
    const quantity = selection.extras[extra.code] ?? 0;
    if (quantity <= 0) return [];
    return [
      {
        code: extra.code,
        name: extra.name,
        unit: extra.unit,
        quantity,
        priceCents: extra.priceCents,
        minutes: extra.minutes,
      },
    ];
  });
}

/** Turns a calculator selection into a quote. The browser and the server both use this. */
export function quoteForSelection(catalog: Catalog, selection: Selection): Quote | null {
  const service = catalog.services.find((s) => s.code === selection.serviceCode);
  if (!service) return null;
  const area = catalog.areas.find((a) => a.code === selection.areaCode);
  return calculateQuote({
    service,
    areaM2: selection.areaM2,
    bathrooms: selection.bathrooms,
    frequency: selection.frequency,
    extras: chosenExtras(catalog, selection),
    travelFeeCents: area?.travelFeeCents ?? 0,
    settings: catalog.settings,
  });
}
