import { FREQUENCIES, SLOTS, isValidDateString, type Frequency, type Slot } from "./logic";
import type { Catalog, Selection } from "./types";

export const AREA_MIN = 10;
export const AREA_MAX = 300;
export const ROOMS_MIN = 1;
export const ROOMS_MAX = 8;
export const BATHROOMS_MIN = 1;
export const BATHROOMS_MAX = 4;

export type FieldErrors = Record<string, string>;

export type ContactDetails = {
  address: string;
  name: string;
  phone: string;
  email: string;
  notes: string;
};

export type BookingData = Selection & {
  areaCode: string;
  date: string;
  slot: Slot;
  contact: ContactDetails;
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_PATTERN = /^\+?[0-9][0-9 ()-]*$/;

export function isValidEmail(value: string): boolean {
  return value.length <= 200 && EMAIL_PATTERN.test(value);
}

export function isValidPhone(value: string): boolean {
  const digits = value.replace(/\D/g, "").length;
  return PHONE_PATTERN.test(value) && digits >= 7 && digits <= 15;
}

function isIntegerBetween(value: unknown, min: number, max: number): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= min && value <= max;
}

/** Step 1 of the form. The server runs the same check on what it receives. */
export function validateSelection(selection: Selection, catalog: Catalog): FieldErrors {
  const errors: FieldErrors = {};

  if (!catalog.services.some((s) => s.code === selection.serviceCode)) {
    errors.serviceCode = "Vali teenus.";
  }
  if (!isIntegerBetween(selection.areaM2, AREA_MIN, AREA_MAX)) {
    errors.areaM2 = `Sisesta pind täisarvuna vahemikus ${AREA_MIN}–${AREA_MAX} m².`;
  }
  if (!isIntegerBetween(selection.rooms, ROOMS_MIN, ROOMS_MAX)) {
    errors.rooms = `Tubade arv peab olema ${ROOMS_MIN}–${ROOMS_MAX}.`;
  }
  if (!isIntegerBetween(selection.bathrooms, BATHROOMS_MIN, BATHROOMS_MAX)) {
    errors.bathrooms = `Vannitubade arv peab olema ${BATHROOMS_MIN}–${BATHROOMS_MAX}.`;
  }
  if (!catalog.areas.some((a) => a.code === selection.areaCode)) {
    errors.areaCode = "Vali piirkond.";
  }
  if (!FREQUENCIES.includes(selection.frequency)) {
    errors.frequency = "Vali sagedus.";
  }

  for (const [code, quantity] of Object.entries(selection.extras)) {
    const extra = catalog.extras.find((e) => e.code === code);
    if (!extra) {
      errors[`extras.${code}`] = "See lisatöö ei ole enam saadaval.";
    } else if (!isIntegerBetween(quantity, 0, extra.maxQty)) {
      errors[`extras.${code}`] = `Kogus peab olema 0–${extra.maxQty}.`;
    }
  }
  return errors;
}

/** Step 3 of the form. */
export function validateContact(contact: ContactDetails): FieldErrors {
  const errors: FieldErrors = {};
  if (!contact.address) errors.address = "Sisesta aadress.";
  else if (contact.address.length > 200) errors.address = "Aadress on liiga pikk.";
  if (!contact.name) errors.name = "Sisesta oma nimi.";
  else if (contact.name.length > 100) errors.name = "Nimi on liiga pikk.";
  if (!contact.phone) errors.phone = "Sisesta telefoninumber.";
  else if (!isValidPhone(contact.phone)) errors.phone = "Sisesta korrektne telefoninumber, nt +372 5123 4567.";
  if (!contact.email) errors.email = "Sisesta e-posti aadress.";
  else if (!isValidEmail(contact.email)) errors.email = "Sisesta korrektne e-posti aadress.";
  if (contact.notes.length > 2000) errors.notes = "Lisainfo on liiga pikk (kuni 2000 tähemärki).";
  return errors;
}

export function trimContact(contact: ContactDetails): ContactDetails {
  return {
    address: contact.address.trim(),
    name: contact.name.trim(),
    phone: contact.phone.trim(),
    email: contact.email.trim(),
    notes: contact.notes.trim(),
  };
}

function text(value: unknown): string {
  return typeof value === "string" ? value : "";
}

/** Reads an untrusted request body. Unknown fields, such as a price, are ignored. */
export function parseBooking(
  body: unknown,
  catalog: Catalog,
): { ok: true; data: BookingData } | { ok: false; errors: FieldErrors } {
  const raw = (body && typeof body === "object" ? body : {}) as Record<string, unknown>;
  const rawExtras = raw.extras && typeof raw.extras === "object" ? raw.extras : {};
  const service = catalog.services.find((s) => s.code === raw.serviceCode);

  const selection: Selection = {
    serviceCode: text(raw.serviceCode),
    areaCode: text(raw.areaCode),
    areaM2: raw.areaM2 as number,
    rooms: raw.rooms as number,
    bathrooms: raw.bathrooms as number,
    frequency: raw.frequency as Frequency,
    extras: rawExtras as Record<string, number>,
  };
  const contact = trimContact({
    address: text(raw.address),
    name: text(raw.name),
    phone: text(raw.phone),
    email: text(raw.email),
    notes: text(raw.notes),
  });

  const errors: FieldErrors = { ...validateSelection(selection, catalog), ...validateContact(contact) };
  if (!isValidDateString(raw.date)) errors.date = "Vali aeg.";
  if (!SLOTS.includes(raw.slot as Slot)) errors.slot = "Vali aeg.";
  if (Object.keys(errors).length > 0) return { ok: false, errors };

  return {
    ok: true,
    data: {
      ...selection,
      areaCode: selection.areaCode as string,
      // A service without discounts can never be booked with a discounted frequency.
      frequency: service?.discountsAllowed ? selection.frequency : "ONE_TIME",
      date: raw.date as string,
      slot: raw.slot as Slot,
      contact,
    },
  };
}
