"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { ContactDetails, FieldErrors } from "@/lib/validation";
import { FieldError, Section } from "./section";

type TextField = {
  key: "address" | "name" | "phone" | "email";
  label: string;
  type: string;
  autoComplete: string;
  placeholder: string;
};

const FIELDS: TextField[] = [
  { key: "address", label: "Aadress", type: "text", autoComplete: "street-address", placeholder: "Tänav, maja ja korter" },
  { key: "name", label: "Nimi", type: "text", autoComplete: "name", placeholder: "Ees- ja perekonnanimi" },
  { key: "phone", label: "Telefon", type: "tel", autoComplete: "tel", placeholder: "+372 5123 4567" },
  { key: "email", label: "E-post", type: "email", autoComplete: "email", placeholder: "nimi@näide.ee" },
];

export function StepContact({
  contact,
  errors,
  onChange,
}: {
  contact: ContactDetails;
  errors: FieldErrors;
  onChange: (patch: Partial<ContactDetails>) => void;
}) {
  return (
    <Section title="Sinu andmed">
      <div className="space-y-4">
        {FIELDS.map((field) => (
          <div key={field.key} id={`field-${field.key}`} className="space-y-1.5">
            <Label htmlFor={field.key} className="text-sm font-semibold">
              {field.label}
            </Label>
            <Input
              id={field.key}
              type={field.type}
              autoComplete={field.autoComplete}
              placeholder={field.placeholder}
              value={contact[field.key]}
              aria-invalid={Boolean(errors[field.key])}
              onChange={(event) => onChange({ [field.key]: event.target.value })}
            />
            <FieldError message={errors[field.key]} />
          </div>
        ))}
        <div id="field-notes" className="space-y-1.5">
          <Label htmlFor="notes" className="text-sm font-semibold">
            Lisainfo
          </Label>
          <Textarea
            id="notes"
            rows={4}
            placeholder="Lemmikloomad, uksekood, parkimine vms"
            value={contact.notes}
            aria-invalid={Boolean(errors.notes)}
            onChange={(event) => onChange({ notes: event.target.value })}
          />
          <FieldError message={errors.notes} />
        </div>
      </div>
    </Section>
  );
}
