import { formatCents } from "./format";
import type { Quote } from "./logic";
import type { Catalog, FaqDto, Selection } from "./types";

const LARGE_HOME_M2 = 120;

/** The FAQ row with the most keyword matches, or null. On a tie the earlier row wins. */
export function matchFaq(question: string, faq: FaqDto[]): FaqDto | null {
  const text = question.toLowerCase();
  let best: FaqDto | null = null;
  let bestScore = 0;
  for (const item of faq) {
    const score = item.keywords
      .split(",")
      .map((k) => k.trim().toLowerCase())
      .filter((k) => k && text.includes(k)).length;
    if (score > bestScore) {
      best = item;
      bestScore = score;
    }
  }
  return best;
}

export type Tip = { id: string; text: string };

export function contextTips(catalog: Catalog, selection: Selection, quote: Quote | null): Tip[] {
  const tips: Tip[] = [];

  if (selection.serviceCode === "MOVE_OUT") {
    const missing = ["OVEN", "FRIDGE"]
      .map((code) => catalog.extras.find((e) => e.code === code))
      .filter((e) => e !== undefined && !selection.extras[e.code]);
    if (missing.length > 0) {
      const names = missing.map((e) => `${e!.name.toLowerCase()} (${formatCents(e!.priceCents)})`);
      tips.push({
        id: "move-out",
        text: `Kolimiskoristuse juurde tasub lisada ${names.join(" ja ")} – need jäävad muidu puhastamata.`,
      });
    }
  }

  if (
    selection.serviceCode === "REGULAR" &&
    selection.areaM2 > LARGE_HOME_M2 &&
    catalog.services.some((s) => s.code === "DEEP")
  ) {
    tips.push({
      id: "large-home",
      text: `Üle ${LARGE_HOME_M2} m² kodu puhul soovitame esimeseks korraks suurpuhastust – nii saab kõik korraga põhjalikult puhtaks.`,
    });
  }

  if (quote && quote.frequency !== "ONE_TIME" && quote.discountCents > 0) {
    const when = quote.frequency === "WEEKLY" ? "Iga nädal" : "Iga kahe nädala tagant";
    tips.push({
      id: "saving",
      text: `${when} tellides säästad iga koristuse pealt ${formatCents(quote.discountCents)}.`,
    });
  }

  return tips;
}
