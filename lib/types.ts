import type { Frequency, PriceSettings, Status } from "./logic";

export type ServiceDto = {
  code: string;
  name: string;
  description: string;
  pricePerM2Cents: number;
  minPriceCents: number;
  minutesPerM2: number;
  discountsAllowed: boolean;
};

export type ExtraDto = {
  code: string;
  name: string;
  unit: string;
  priceCents: number;
  minutes: number;
  maxQty: number;
};

export type AreaDto = {
  code: string;
  name: string;
  region: string;
  travelFeeCents: number;
};

export type FaqDto = {
  code: string;
  question: string;
  answer: string;
  keywords: string;
  showAsChip: boolean;
};

export type CatalogSettings = PriceSettings & {
  vatIncluded: boolean;
  areaNotListedMessage: string;
  welcomeMessage: string;
  fallbackMessage: string;
  bookingDaysAhead: number;
  minHoursBefore: number;
  timezone: string;
};

export type Catalog = {
  services: ServiceDto[];
  extras: ExtraDto[];
  areas: AreaDto[];
  faq: FaqDto[];
  settings: CatalogSettings;
};

/** What the customer picked in the calculator. */
export type Selection = {
  serviceCode: string;
  areaCode: string | null;
  areaM2: number;
  rooms: number;
  bathrooms: number;
  frequency: Frequency;
  extras: Record<string, number>;
};

export type RequestExtra = {
  code: string;
  name: string;
  unit: string;
  quantity: number;
  priceCents: number;
  minutes: number;
};

/** A request as the admin view sees it. */
export type AdminRequest = {
  id: number;
  code: string;
  statusToken: string;
  createdLabel: string;
  createdAtIso: string;
  serviceName: string;
  areaName: string;
  areaM2: number;
  rooms: number;
  bathrooms: number;
  frequency: Frequency;
  extras: RequestExtra[];
  travelFeeCents: number;
  totalPrice: number;
  estimatedMinutes: number;
  preferredDate: string;
  timeSlot: string;
  address: string;
  name: string;
  phone: string;
  email: string;
  notes: string | null;
  status: Status;
  internalNote: string | null;
  isSample: boolean;
};
