"use client";

import { useMemo } from "react";
import { Check } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { FREQUENCY_LABELS, formatCents } from "@/lib/format";
import { FREQUENCIES, discountPercentFor, type Frequency } from "@/lib/logic";
import type { AreaDto, Catalog, Selection } from "@/lib/types";
import { AREA_MAX, AREA_MIN, BATHROOMS_MAX, BATHROOMS_MIN, ROOMS_MAX, ROOMS_MIN, type FieldErrors } from "@/lib/validation";
import { cn } from "@/lib/utils";
import { FieldError, Section } from "./section";
import { Stepper } from "./stepper";

function areaLabel(area: AreaDto): string {
  return `${area.name} · ${area.travelFeeCents === 0 ? "tasuta" : `+${formatCents(area.travelFeeCents)}`}`;
}

export function StepQuote({
  catalog,
  selection,
  areaInput,
  errors,
  onChange,
  onAreaInput,
  onAreaBlur,
}: {
  catalog: Catalog;
  selection: Selection;
  areaInput: string;
  errors: FieldErrors;
  onChange: (patch: Partial<Selection>) => void;
  onAreaInput: (value: string) => void;
  onAreaBlur: () => void;
}) {
  const service = catalog.services.find((s) => s.code === selection.serviceCode);

  const regions = useMemo(() => {
    const groups = new Map<string, AreaDto[]>();
    for (const area of catalog.areas) {
      groups.set(area.region, [...(groups.get(area.region) ?? []), area]);
    }
    return [...groups.entries()];
  }, [catalog.areas]);

  const areaItems = useMemo(
    () => Object.fromEntries(catalog.areas.map((area) => [area.code, areaLabel(area)])),
    [catalog.areas],
  );

  function setExtra(code: string, quantity: number) {
    onChange({ extras: { ...selection.extras, [code]: quantity } });
  }

  return (
    <div className="space-y-6">
      <Section title="Vali teenus">
        <div role="radiogroup" aria-label="Teenus" className="grid gap-3 sm:grid-cols-2">
          {catalog.services.map((item) => {
            const selected = item.code === selection.serviceCode;
            return (
              <button
                key={item.code}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => {
                  onChange({
                    serviceCode: item.code,
                    // Only some services allow a repeating order.
                    frequency: item.discountsAllowed ? selection.frequency : "ONE_TIME",
                  });
                }}
                className={cn(
                  "relative rounded-lg border-2 bg-white p-4 text-left shadow-sm transition-colors",
                  selected ? "border-primary bg-accent/50" : "border-border hover:border-primary/40",
                )}
              >
                <span className="flex items-start justify-between gap-3 pr-7">
                  <span className="text-base font-bold">{item.name}</span>
                </span>
                {selected && (
                  <span className="absolute top-3 right-3 flex size-6 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    <Check className="size-4" aria-hidden />
                  </span>
                )}
                <span className="mt-1 block text-sm font-semibold text-primary">
                  alates {formatCents(item.minPriceCents)}
                </span>
                <span className="mt-2 block text-sm leading-relaxed text-muted-foreground">
                  <span className="font-semibold text-foreground">Mis on hinnas: </span>
                  {item.description}
                </span>
              </button>
            );
          })}
        </div>
      </Section>

      <Section title="Sinu kodu">
        <div className="space-y-5">
          <div id="field-areaM2" className="space-y-3">
            <div className="flex items-center justify-between gap-4">
              <Label htmlFor="area-input" className="text-base font-semibold">
                Pindala
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  id="area-input"
                  inputMode="numeric"
                  className="w-24 text-right font-bold"
                  value={areaInput}
                  aria-invalid={Boolean(errors.areaM2)}
                  onChange={(event) => onAreaInput(event.target.value)}
                  onBlur={onAreaBlur}
                />
                <span className="text-sm text-muted-foreground">m²</span>
              </div>
            </div>
            <Slider
              aria-label="Pindala"
              min={AREA_MIN}
              max={AREA_MAX}
              step={1}
              value={[Math.min(AREA_MAX, Math.max(AREA_MIN, selection.areaM2 || AREA_MIN))]}
              onValueChange={(value) => onAreaInput(String(Array.isArray(value) ? value[0] : value))}
            />
            <FieldError message={errors.areaM2} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex items-center justify-between gap-3">
              <span className="text-base font-semibold">Tube</span>
              <Stepper
                label="Tubade arv"
                value={selection.rooms}
                min={ROOMS_MIN}
                max={ROOMS_MAX}
                onChange={(rooms) => onChange({ rooms })}
              />
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-base font-semibold">Vannitube</span>
              <Stepper
                label="Vannitubade arv"
                value={selection.bathrooms}
                min={BATHROOMS_MIN}
                max={BATHROOMS_MAX}
                onChange={(bathrooms) => onChange({ bathrooms })}
              />
            </div>
          </div>
        </div>
      </Section>

      <Section title="Lisatööd">
        <ul className="divide-y">
          {catalog.extras.map((extra) => {
            const quantity = selection.extras[extra.code] ?? 0;
            const price = formatCents(extra.priceCents);
            const unitLabel = extra.unit === "hour" ? `${price} / tund` : extra.unit === "piece" ? `${price} / tk` : price;
            return (
              <li key={extra.code} className="py-1">
                {extra.unit === "fixed" ? (
                  <Label className="flex min-h-12 w-full cursor-pointer items-center gap-3 font-normal">
                    <Checkbox
                      className="size-6 rounded-md"
                      checked={quantity > 0}
                      onCheckedChange={(checked) => setExtra(extra.code, checked ? 1 : 0)}
                    />
                    <span className="flex-1 text-base">{extra.name}</span>
                    <span className="text-sm font-semibold text-muted-foreground">{unitLabel}</span>
                  </Label>
                ) : (
                  <div className="flex min-h-12 flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-base">{extra.name}</p>
                      <p className="text-sm font-semibold text-muted-foreground">{unitLabel}</p>
                    </div>
                    <Stepper
                      label={extra.name}
                      value={quantity}
                      min={0}
                      max={extra.maxQty}
                      onChange={(value) => setExtra(extra.code, value)}
                    />
                  </div>
                )}
                <FieldError message={errors[`extras.${extra.code}`]} />
              </li>
            );
          })}
        </ul>
      </Section>

      {service?.discountsAllowed && (
        <Section title="Kui tihti?">
          <div role="radiogroup" aria-label="Sagedus" className="grid gap-2 sm:grid-cols-3">
            {FREQUENCIES.map((frequency: Frequency) => {
              const selected = selection.frequency === frequency;
              const percent = discountPercentFor(frequency, true, catalog.settings);
              return (
                <button
                  key={frequency}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => onChange({ frequency })}
                  className={cn(
                    "flex min-h-14 flex-col justify-center rounded-lg border-2 bg-white px-3 py-2 text-left transition-colors",
                    selected ? "border-primary bg-accent/50" : "border-border hover:border-primary/40",
                  )}
                >
                  <span className="text-sm font-bold">{FREQUENCY_LABELS[frequency]}</span>
                  {percent > 0 && <span className="text-sm font-semibold text-primary">−{percent} %</span>}
                </button>
              );
            })}
          </div>
        </Section>
      )}

      <Section title="Piirkond">
        <div id="field-areaCode" className="space-y-2">
          <Select
            items={areaItems}
            value={selection.areaCode}
            onValueChange={(areaCode) => onChange({ areaCode: areaCode as string })}
          >
            <SelectTrigger className="w-full bg-white" aria-label="Piirkond" aria-invalid={Boolean(errors.areaCode)}>
              <SelectValue placeholder="Vali piirkond" />
            </SelectTrigger>
            <SelectContent alignItemWithTrigger={false}>
              {regions.map(([region, areas]) => (
                <SelectGroup key={region}>
                  <SelectLabel>{region}</SelectLabel>
                  {areas.map((area) => (
                    <SelectItem key={area.code} value={area.code} className="min-h-10">
                      {areaLabel(area)}
                    </SelectItem>
                  ))}
                </SelectGroup>
              ))}
            </SelectContent>
          </Select>
          <FieldError message={errors.areaCode} />
          <p className="text-sm text-muted-foreground">{catalog.settings.areaNotListedMessage}</p>
        </div>
      </Section>
    </div>
  );
}
