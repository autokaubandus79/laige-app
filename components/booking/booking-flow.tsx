"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, ChevronUp, Loader2 } from "lucide-react";
import { Assistant } from "@/components/assistant/assistant";
import { Button } from "@/components/ui/button";
import { contextTips } from "@/lib/assistant";
import { formatDateLong, formatEuros } from "@/lib/format";
import type { DayAvailability } from "@/lib/logic";
import { DB_ERROR_MESSAGE } from "@/lib/messages";
import { quoteForSelection } from "@/lib/quote";
import type { CreatedRequest } from "@/lib/requests";
import { saveConfirmation, useSavedConfirmation } from "@/lib/saved-confirmation";
import type { Catalog, Selection } from "@/lib/types";
import {
  AREA_MAX,
  AREA_MIN,
  parseAreaInput,
  trimContact,
  validateContact,
  validateSelection,
  type ContactDetails,
  type FieldErrors,
} from "@/lib/validation";
import { cn } from "@/lib/utils";
import { Confirmation } from "./confirmation";
import { PriceLines, PriceTotal } from "./price-summary";
import { StepContact } from "./step-contact";
import { StepQuote } from "./step-quote";
import { StepTime, type ChosenTime } from "./step-time";

type Step = 1 | 2 | 3;

const STEP_NAMES: Record<Step, string> = { 1: "Hind", 2: "Aeg", 3: "Andmed" };
const NEXT_LABEL: Record<Step, string> = { 1: "Vali aeg", 2: "Edasi", 3: "Saada päring" };

const EMPTY_CONTACT: ContactDetails = { address: "", name: "", phone: "", email: "", notes: "" };

function focusFirstError(errors: FieldErrors) {
  const key = Object.keys(errors)[0];
  if (!key) return;
  requestAnimationFrame(() => {
    document.getElementById(`field-${key}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
  });
}

export function BookingFlow({ catalog }: { catalog: Catalog }) {
  const [step, setStep] = useState<Step>(1);
  const [selection, setSelection] = useState<Selection>({
    serviceCode: catalog.services[0].code,
    areaCode: null,
    areaM2: 60,
    rooms: 2,
    bathrooms: 1,
    frequency: "ONE_TIME",
    extras: {},
  });
  const [areaInput, setAreaInput] = useState("60");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [days, setDays] = useState<DayAvailability[] | null>(null);
  const [daysLoading, setDaysLoading] = useState(false);
  const [daysError, setDaysError] = useState<string | null>(null);
  const [chosen, setChosen] = useState<ChosenTime | null>(null);
  const [timeError, setTimeError] = useState<string | undefined>();
  const [contact, setContact] = useState<ContactDetails>(EMPTY_CONTACT);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [created, setCreated] = useState<CreatedRequest | null>(null);
  const savedConfirmation = useSavedConfirmation();
  const [summaryOpen, setSummaryOpen] = useState(false);
  const topRef = useRef<HTMLDivElement>(null);

  const areaIsValid =
    Number.isInteger(selection.areaM2) && selection.areaM2 >= AREA_MIN && selection.areaM2 <= AREA_MAX;
  const quote = useMemo(
    () => (areaIsValid ? quoteForSelection(catalog, selection) : null),
    [areaIsValid, catalog, selection],
  );
  const tips = useMemo(() => contextTips(catalog, selection, quote), [catalog, selection, quote]);

  const loadDays = useCallback(async () => {
    setDaysLoading(true);
    setDaysError(null);
    try {
      const response = await fetch("/api/availability", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setDays(data.days);
      return data.days as DayAvailability[];
    } catch {
      setDaysError(DB_ERROR_MESSAGE);
      return null;
    } finally {
      setDaysLoading(false);
    }
  }, []);

  // Only when the step changes: on first load the header must stay in view.
  const shownStep = useRef(step);
  useEffect(() => {
    if (shownStep.current === step) return;
    shownStep.current = step;
    topRef.current?.scrollIntoView({ block: "start" });
  }, [step]);

  function goToTime() {
    setStep(2);
    void loadDays().then((fresh) => {
      if (!fresh) return;
      // A place chosen earlier may have gone in the meantime.
      setChosen((current) => {
        const slot = fresh.find((d) => d.date === current?.date)?.slots.find((s) => s.slot === current?.slot);
        return slot?.state === "open" ? current : null;
      });
    });
  }

  function patchSelection(patch: Partial<Selection>) {
    setSelection((current) => ({ ...current, ...patch }));
    setErrors((current) => {
      const next = { ...current };
      for (const key of Object.keys(patch)) delete next[key];
      return next;
    });
  }

  function handleAreaInput(value: string) {
    const { text, areaM2 } = parseAreaInput(value);
    setAreaInput(text);
    patchSelection({ areaM2 });
  }

  function handleAreaBlur() {
    const inRange = selection.areaM2 >= AREA_MIN && selection.areaM2 <= AREA_MAX;
    if (inRange) setAreaInput(String(selection.areaM2));
    setErrors((current) => {
      const next = { ...current };
      if (inRange) delete next.areaM2;
      else next.areaM2 = `Sisesta pind vahemikus ${AREA_MIN}–${AREA_MAX} m².`;
      return next;
    });
  }

  async function submit() {
    if (!chosen || submitting) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const response = await fetch("/api/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...selection,
          date: chosen.date,
          slot: chosen.slot,
          ...trimContact(contact),
        }),
      });
      const data = await response.json().catch(() => ({}));

      if (response.status === 201) {
        setCreated(data);
        saveConfirmation(data);
        window.scrollTo({ top: 0 });
      } else if (response.status === 409) {
        setChosen(null);
        setTimeError(data.error);
        goToTime();
      } else if (data.fieldErrors) {
        setErrors(data.fieldErrors);
        focusFirstError(data.fieldErrors);
      } else {
        setSubmitError(data.error ?? DB_ERROR_MESSAGE);
      }
    } catch {
      setSubmitError(DB_ERROR_MESSAGE);
    } finally {
      setSubmitting(false);
    }
  }

  function next() {
    setSummaryOpen(false);
    if (step === 1) {
      const found = validateSelection(selection, catalog);
      setErrors(found);
      if (Object.keys(found).length > 0) {
        focusFirstError(found);
        return;
      }
      goToTime();
    } else if (step === 2) {
      if (!chosen) {
        setTimeError("Vali sobiv saabumisaeg.");
        topRef.current?.scrollIntoView({ block: "start" });
        return;
      }
      setTimeError(undefined);
      setStep(3);
    } else {
      const found = validateContact(trimContact(contact));
      setErrors(found);
      if (Object.keys(found).length > 0) {
        focusFirstError(found);
        return;
      }
      void submit();
    }
  }

  function back() {
    setSummaryOpen(false);
    setErrors({});
    setStep((current) => (current === 3 ? 2 : 1));
  }

  // It stays through reloads and visits to other pages until "Uus päring".
  const confirmation = created ?? savedConfirmation;
  if (confirmation) {
    return <Confirmation created={confirmation} vatIncluded={catalog.settings.vatIncluded} />;
  }

  const actions = (
    <>
      {submitError && (
        <p role="alert" className="text-sm font-medium text-destructive">
          {submitError}
        </p>
      )}
      <Button size="lg" className="w-full" onClick={next} disabled={submitting}>
        {submitting ? <Loader2 className="size-5 animate-spin" aria-hidden /> : NEXT_LABEL[step]}
        {!submitting && <ArrowRight className="size-5" aria-hidden />}
      </Button>
    </>
  );

  const timeLine = chosen && step > 1 && (
    <p className="flex justify-between gap-4 text-sm">
      <span className="text-muted-foreground">Aeg</span>
      <span className="text-right font-semibold">
        {formatDateLong(chosen.date)}, {chosen.label}
      </span>
    </p>
  );

  return (
    <div ref={topRef} className="mx-auto max-w-6xl scroll-mt-4 px-4 pt-6 pb-8 lg:pb-12">
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">Koduse koristuse hind kohe</h1>
        <p className="mt-1 text-muted-foreground">Vali teenus, vaata hinda ja broneeri sobiv aeg.</p>
      </div>

      <ol className="mb-6 flex items-center gap-2" aria-label="Sammud">
        {([1, 2, 3] as Step[]).map((item) => (
          <li key={item} className="flex items-center gap-2" aria-current={item === step ? "step" : undefined}>
            <span
              className={cn(
                "flex size-8 items-center justify-center rounded-full text-sm font-bold",
                item <= step ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
              )}
            >
              {item}
            </span>
            <span className={cn("text-sm font-semibold", item !== step && "text-muted-foreground")}>
              {STEP_NAMES[item]}
            </span>
            {item < 3 && <span className="mx-1 h-px w-5 bg-border sm:w-10" aria-hidden />}
          </li>
        ))}
      </ol>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="min-w-0 space-y-4">
          {step === 1 && (
            <StepQuote
              catalog={catalog}
              selection={selection}
              areaInput={areaInput}
              errors={errors}
              onChange={patchSelection}
              onAreaInput={handleAreaInput}
              onAreaBlur={handleAreaBlur}
            />
          )}
          {step === 2 && (
            <StepTime
              days={days}
              loading={daysLoading}
              loadError={daysError}
              error={timeError}
              chosen={chosen}
              onChoose={(time) => {
                setChosen(time);
                setTimeError(undefined);
              }}
              onRetry={() => void loadDays()}
            />
          )}
          {step === 3 && (
            <StepContact
              contact={contact}
              errors={errors}
              onChange={(patch) => {
                setContact((current) => ({ ...current, ...patch }));
                setErrors((current) => {
                  const nextErrors = { ...current };
                  for (const key of Object.keys(patch)) delete nextErrors[key];
                  return nextErrors;
                });
              }}
            />
          )}
          {step > 1 && (
            <Button variant="ghost" className="h-11" onClick={back}>
              <ArrowLeft className="size-4" aria-hidden />
              Tagasi
            </Button>
          )}
        </div>

        {/* Desktop: sticky card on the right */}
        <aside className="sticky top-4 hidden rounded-lg border bg-white p-5 shadow-md lg:block">
          <h2 className="mb-3 text-lg font-bold">Sinu hind</h2>
          <PriceLines catalog={catalog} selection={selection} quote={quote} />
          <div className="my-4 border-t" />
          <PriceTotal catalog={catalog} quote={quote} />
          {timeLine && <div className="mt-2">{timeLine}</div>}
          <div className="mt-4 space-y-2">{actions}</div>
        </aside>
      </div>

      {/* Mobile: sticky bottom bar that expands */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t bg-white shadow-[0_-4px_16px_rgba(0,0,0,0.08)] lg:hidden">
        {summaryOpen && (
          <div id="mobile-summary" className="max-h-[55vh] overflow-y-auto border-b p-4">
            <PriceLines catalog={catalog} selection={selection} quote={quote} />
            <div className="my-3 border-t" />
            <PriceTotal catalog={catalog} quote={quote} />
            {timeLine && <div className="mt-2">{timeLine}</div>}
          </div>
        )}
        <div className="space-y-2 p-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="flex min-h-12 flex-1 items-center gap-2 text-left"
              aria-expanded={summaryOpen}
              aria-controls="mobile-summary"
              onClick={() => setSummaryOpen((open) => !open)}
            >
              <ChevronUp
                className={cn("size-5 text-muted-foreground transition-transform", summaryOpen && "rotate-180")}
                aria-hidden
              />
              <span>
                <span className="block text-xl leading-tight font-extrabold text-primary tabular-nums">
                  {quote ? formatEuros(quote.totalEuros) : "–"}
                </span>
                <span className="block text-xs text-muted-foreground">
                  {catalog.settings.vatIncluded ? "km-ga · " : ""}vaata hinda
                </span>
              </span>
            </button>
            <Button size="lg" className="flex-1" onClick={next} disabled={submitting}>
              {submitting ? <Loader2 className="size-5 animate-spin" aria-hidden /> : NEXT_LABEL[step]}
            </Button>
          </div>
          {submitError && (
            <p role="alert" className="text-sm font-medium text-destructive">
              {submitError}
            </p>
          )}
        </div>
      </div>

      <Assistant
        faq={catalog.faq}
        welcomeMessage={catalog.settings.welcomeMessage}
        fallbackMessage={catalog.settings.fallbackMessage}
        tips={tips}
        hideButton={summaryOpen}
      />
    </div>
  );
}
