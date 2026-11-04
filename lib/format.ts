import type { Frequency, Status } from "./logic";

const NBSP = " ";

/** Hand-written formatters: the same output on the server and in every browser. */
export function formatEuros(euros: number): string {
  return `${euros}${NBSP}€`;
}

export function formatCents(cents: number): string {
  const sign = cents < 0 ? "−" : "";
  const abs = Math.abs(cents);
  const euros = Math.floor(abs / 100);
  const rest = abs % 100;
  const amount = rest === 0 ? `${euros}` : `${euros},${String(rest).padStart(2, "0")}`;
  return `${sign}${amount}${NBSP}€`;
}

export function formatMinutes(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) return `${rest} min`;
  return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`;
}

const WEEKDAYS = ["esmaspäev", "teisipäev", "kolmapäev", "neljapäev", "reede", "laupäev", "pühapäev"];
const MONTHS = [
  "jaanuar",
  "veebruar",
  "märts",
  "aprill",
  "mai",
  "juuni",
  "juuli",
  "august",
  "september",
  "oktoober",
  "november",
  "detsember",
];

function dateParts(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  const weekday = new Date(`${date}T00:00:00Z`).getUTCDay() || 7;
  return { year, month, day, weekday };
}

/** 04.11.2026 */
export function formatDate(date: string): string {
  const { year, month, day } = dateParts(date);
  return `${String(day).padStart(2, "0")}.${String(month).padStart(2, "0")}.${year}`;
}

/** kolmapäev, 4. november */
export function formatDateLong(date: string): string {
  const { month, day, weekday } = dateParts(date);
  return `${WEEKDAYS[weekday - 1]}, ${day}. ${MONTHS[month - 1]}`;
}

export function weekdayName(date: string): string {
  return WEEKDAYS[dateParts(date).weekday - 1];
}

const SHORT_MONTHS = ["jaan", "veebr", "märts", "apr", "mai", "juuni", "juuli", "aug", "sept", "okt", "nov", "dets"];

/** 4. nov */
export function formatDayMonth(date: string): string {
  const { month, day } = dateParts(date);
  return `${day}. ${SHORT_MONTHS[month - 1]}`;
}

export const STATUS_LABELS: Record<Status, string> = {
  NEW: "Uus",
  CONFIRMED: "Kinnitatud",
  SCHEDULED: "Planeeritud",
  DONE: "Tehtud",
  CANCELLED: "Tühistatud",
};

export const FREQUENCY_LABELS: Record<Frequency, string> = {
  ONE_TIME: "Ühekordne",
  BIWEEKLY: "Iga kahe nädala tagant",
  WEEKLY: "Iga nädal",
};
