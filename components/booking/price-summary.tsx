import { formatCents, formatEuros, formatMinutes } from "@/lib/format";
import type { Quote } from "@/lib/logic";
import { chosenExtras } from "@/lib/quote";
import type { Catalog, Selection } from "@/lib/types";

function Line({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4 text-sm">
      <dt className={accent ? "font-medium text-primary" : "text-muted-foreground"}>{label}</dt>
      <dd className={accent ? "font-semibold whitespace-nowrap text-primary" : "font-semibold whitespace-nowrap"}>
        {value}
      </dd>
    </div>
  );
}

export function PriceLines({
  catalog,
  selection,
  quote,
}: {
  catalog: Catalog;
  selection: Selection;
  quote: Quote | null;
}) {
  const service = catalog.services.find((s) => s.code === selection.serviceCode);
  const area = catalog.areas.find((a) => a.code === selection.areaCode);

  if (!quote || !service) {
    return <p className="text-sm text-muted-foreground">Sisesta pindala, et näha hinda.</p>;
  }

  return (
    <dl className="space-y-2">
      <Line
        label={`${service.name}, ${selection.areaM2} m²${quote.minPriceApplied ? " (miinimumhind)" : ""}`}
        value={formatCents(quote.basePriceCents)}
      />
      {quote.bathroomCents > 0 && (
        <Line label={`Lisavannituba × ${selection.bathrooms - 1}`} value={formatCents(quote.bathroomCents)} />
      )}
      {chosenExtras(catalog, selection).map((extra) => (
        <Line
          key={extra.code}
          label={extra.quantity > 1 ? `${extra.name} × ${extra.quantity}` : extra.name}
          value={formatCents(extra.priceCents * extra.quantity)}
        />
      ))}
      {quote.discountCents > 0 && (
        <Line label={`Soodustus ${quote.discountPercent} %`} value={formatCents(-quote.discountCents)} accent />
      )}
      {area ? (
        <Line
          label={`Sõidutasu (${area.name})`}
          value={quote.travelFeeCents === 0 ? "tasuta" : formatCents(quote.travelFeeCents)}
        />
      ) : (
        <Line label="Sõidutasu" value="vali piirkond" />
      )}
    </dl>
  );
}

export function PriceTotal({ catalog, quote }: { catalog: Catalog; quote: Quote | null }) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-4">
        <span className="text-base font-bold">Kokku</span>
        <span className="text-3xl font-extrabold text-primary tabular-nums">
          {quote ? formatEuros(quote.totalEuros) : "–"}
        </span>
      </div>
      {catalog.settings.vatIncluded && (
        <p className="text-right text-sm text-muted-foreground">Hind sisaldab käibemaksu</p>
      )}
      {quote && (
        <p className="mt-2 flex justify-between gap-4 text-sm">
          <span className="text-muted-foreground">Hinnanguline tööaeg</span>
          <span className="font-semibold">{formatMinutes(quote.estimatedMinutes)}</span>
        </p>
      )}
    </div>
  );
}
