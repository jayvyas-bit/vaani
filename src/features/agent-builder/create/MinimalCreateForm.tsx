import { useId, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { FieldError, FieldLabel, Input, Textarea } from "@/components/ui/Field";
import { Icon } from "@/components/ui/Icon";
import { RadioCard } from "@/components/ui/RadioCard";
import { WizardFooter } from "@/components/ui/WizardFooter";
import { cleanBusinessName } from "@/lib/persona";
import type { CallDirection } from "@/lib/types";

export interface CreateFormValues {
  name: string;
  purpose: string;
  direction: CallDirection;
  /** What callers hear. Left blank, it’s derived from the agent name. */
  businessName?: string;
}

export function MinimalCreateForm({
  initialValues = {
    name: "Riverside Dental Front Desk",
    purpose: "Answer incoming calls, book or reschedule appointments, and answer basic insurance questions",
    direction: "inbound",
  },
  onCreate,
  onBack,
}: {
  initialValues?: CreateFormValues;
  onCreate?: (values: CreateFormValues) => void;
  onBack?: () => void;
}) {
  const id = useId();
  const formId = `${id}-form`;
  const [name, setName] = useState(initialValues.name);
  const [purpose, setPurpose] = useState(initialValues.purpose);
  const [direction, setDirection] = useState<CallDirection>(initialValues.direction);
  const [businessName, setBusinessName] = useState(initialValues.businessName ?? "");
  const [submitted, setSubmitted] = useState(false);
  const suggestedBusinessName = name.trim() ? cleanBusinessName(name) : "";

  const canCreate = name.trim().length > 0 && purpose.trim().length > 0;
  const nameErr = submitted && !name.trim() ? "Give the agent a name." : null;
  const purposeErr = submitted && !purpose.trim() ? "Say what the agent should do." : null;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!canCreate) {
      setSubmitted(true);
      return;
    }
    onCreate?.({
      name: name.trim(),
      purpose: purpose.trim(),
      direction,
      businessName: businessName.trim() || suggestedBusinessName,
    });
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-y-auto">
        <form
          id={formId}
          onSubmit={submit}
          aria-labelledby={`${id}-title`}
          className="mx-auto w-full max-w-[640px] px-4 py-10 sm:px-0 sm:py-14"
        >
          <h1 id={`${id}-title`} className="text-[22px] font-semibold text-ink-950">
            Name it and tell us the job
          </h1>
          <p className="mt-1.5 text-[15px] text-ink-600">
            Your purpose line is used to write what the agent says.
          </p>

      <div className="mt-8 flex flex-col gap-6">
        <div>
          <FieldLabel htmlFor={`${id}-name`} required>
            Agent name
          </FieldLabel>
          <Input
            id={`${id}-name`}
            name="agentName"
            autoComplete="off"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Riverside Dental Front Desk"
            aria-invalid={!!nameErr || undefined}
            aria-describedby={nameErr ? `${id}-name-err` : undefined}
          />
          <FieldError id={`${id}-name-err`}>{nameErr}</FieldError>
        </div>

        <div>
          <FieldLabel htmlFor={`${id}-business`} hint="Only you see the agent name">
            Business name (what {direction === "outbound" ? "recipients" : "callers"} hear)
          </FieldLabel>
          <Input
            id={`${id}-business`}
            name="businessName"
            autoComplete="organization"
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            placeholder={suggestedBusinessName || "e.g. Riverside Dental"}
          />
          {!businessName.trim() && suggestedBusinessName && (
            <p className="mt-1.5 text-[12px] text-ink-500">
              Leave blank to use “{suggestedBusinessName}”.
            </p>
          )}
        </div>

        <div>
          <FieldLabel htmlFor={`${id}-purpose`} required hint={`${purpose.length}/160`}>
            Purpose
          </FieldLabel>
          <Textarea
            id={`${id}-purpose`}
            name="purpose"
            rows={2}
            maxLength={160}
            value={purpose}
            onChange={(e) => setPurpose(e.target.value)}
            placeholder="One line, in plain language — what should this agent do on a call?"
            aria-invalid={!!purposeErr || undefined}
            aria-describedby={purposeErr ? `${id}-purpose-err` : undefined}
          />
          <FieldError id={`${id}-purpose-err`}>{purposeErr}</FieldError>
        </div>

        <fieldset>
          <legend className="mb-1.5 text-sm font-medium text-ink-700">
            Call direction<span className="ml-0.5 text-brand-600">*</span>
          </legend>
          <div className="grid grid-cols-1 gap-2.5 min-[420px]:grid-cols-2">
            <RadioCard
              selected={direction === "inbound"}
              onSelect={() => setDirection("inbound")}
              icon={<Icon name="phone-inbound" className="size-4" />}
              title="Inbound"
              description="Answers calls coming in"
            />
            <RadioCard
              selected={direction === "outbound"}
              onSelect={() => setDirection("outbound")}
              icon={<Icon name="phone-outbound" className="size-4" />}
              title="Outbound"
              description="Places calls out"
            />
          </div>
          <p className="mt-2 text-[12px] text-ink-500">
            One agent only ever handles one direction. Need both? Create this one, then use "Add
            inbound/outbound counterpart" from its menu to link a second agent for the other direction.
          </p>
        </fieldset>
          </div>

          <p className="mt-6 max-w-[420px] text-[13px] text-ink-500">
            Voice, rules and AI settings start on sensible defaults. Change any of them in Build.
          </p>
        </form>
      </div>
      <WizardFooter onBack={onBack} showBack={!!onBack}>
        <Button type="submit" form={formId} size="lg">
          Create agent
        </Button>
      </WizardFooter>
    </div>
  );
}
