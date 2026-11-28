import { useState, type FormEvent } from "react";
import { ArrowRight, ChevronLeft, Phone01, PhoneOutgoing01, Plus, XClose } from "@untitledui/icons";
import { Button } from "@/components/base/buttons/button";
import { Input } from "@/components/base/input/input";
import { Select } from "@/components/base/select/select";
import { TextArea } from "@/components/base/textarea/textarea";
import { Badge } from "@/components/base/badges/badges";
import { Icon } from "@/components/ui/Icon";
import { VoiceWaveform } from "@/components/ui/VoiceWaveform";
import {
  currencySymbol,
  displayCurrencyLabel,
  fromDisplayAmount,
  type DisplayCurrency,
} from "@/lib/format";
import { cleanBusinessName, compileGreeting } from "@/lib/persona";
import { agentTemplates } from "@/lib/templates";
import type { Agent, BusinessDetails, CallDirection, Offering } from "@/lib/types";
import { newId } from "@/lib/useControllable";
import type { CreateFormValues } from "./MinimalCreateForm";

export interface CreateBriefValues extends CreateFormValues {
  details: BusinessDetails;
  /** Stored in USD like every other cost figure; `displayCurrency` only controls how it’s shown. */
  monthlyBudget?: number;
  displayCurrency?: DisplayCurrency;
}

export type BriefStep = "job" | "business";

const emptyOffering = (): Offering => ({ id: newId("off"), name: "", price: "" });

/**
 * Two short questions instead of a form: what is the job, then what does the
 * business actually sell. Everything past the business name is optional, and
 * what’s entered is spoken back on the right as it will sound on a call.
 */
export function CreateBrief({
  initial,
  onStepChange,
  onCreate,
  onBack,
}: {
  initial?: Partial<CreateFormValues>;
  /** Lets the page’s stepper follow the screen the person is on. */
  onStepChange?: (step: BriefStep) => void;
  onCreate?: (values: CreateBriefValues) => void;
  onBack?: () => void;
}) {
  const [step, setStep] = useState<BriefStep>("job");
  const [direction, setDirection] = useState<CallDirection>(initial?.direction ?? "inbound");
  const [purpose, setPurpose] = useState(initial?.purpose ?? "");
  const [picked, setPicked] = useState<string | undefined>();
  const [businessName, setBusinessName] = useState(initial?.businessName ?? "");
  const [customName, setCustomName] = useState("");
  const [offerings, setOfferings] = useState<Offering[]>([emptyOffering()]);
  const [hours, setHours] = useState("");
  const [handoff, setHandoff] = useState("");
  const [budget, setBudget] = useState("");
  const [currency, setCurrency] = useState<DisplayCurrency>("USD");
  const [tried, setTried] = useState(false);

  const inbound = direction === "inbound";
  const autoName = businessName.trim() ? `${businessName.trim()} ${inbound ? "inbound" : "outbound"} agent` : "";
  const purposeErr = tried && step === "job" && !purpose.trim() ? "Say what the agent should do on a call." : null;
  const businessErr = tried && step === "business" && !businessName.trim() ? "Callers hear this, so it can’t be blank." : null;

  const goTo = (next: BriefStep) => {
    setStep(next);
    setTried(false);
    onStepChange?.(next);
  };

  const details: BusinessDetails = {
    offerings: offerings.filter((o) => o.name.trim()).map((o) => ({ ...o, name: o.name.trim(), price: o.price?.trim() || undefined })),
    hours: hours.trim() || undefined,
    handoff: handoff.trim() || undefined,
  };

  const create = () => {
    if (!businessName.trim()) {
      setTried(true);
      return;
    }
    const amount = Number(budget.replace(/[^0-9.]/g, ""));
    const template = agentTemplates.find((t) => t.id === picked);
    onCreate?.({
      name: customName.trim() || template?.values.name || autoName,
      purpose: purpose.trim(),
      direction,
      businessName: businessName.trim(),
      details,
      ...(amount > 0 ? { monthlyBudget: fromDisplayAmount(amount, currency), displayCurrency: currency } : {}),
    });
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (step === "job") {
      if (!purpose.trim()) return setTried(true);
      goTo("business");
    } else {
      create();
    }
  };

  const pickTemplate = (templateId: string) => {
    const t = agentTemplates.find((x) => x.id === templateId);
    if (!t) return;
    setPicked(templateId);
    setDirection(t.values.direction);
    setPurpose(t.values.purpose);
  };

  const updateOffering = (offId: string, patch: Partial<Offering>) =>
    setOfferings((rows) => rows.map((r) => (r.id === offId ? { ...r, ...patch } : r)));

  return (
    <form onSubmit={submit} noValidate className="flex h-full flex-col">
      <div className="flex-1 overflow-y-auto bg-[radial-gradient(60rem_26rem_at_75%_-8%,var(--color-brand-50),transparent_70%)]">
        <div className="mx-auto grid w-full max-w-[1040px] gap-x-16 gap-y-8 px-4 py-10 sm:px-6 sm:py-16 lg:grid-cols-[minmax(0,560px)_minmax(0,1fr)]">
        <div className="flex min-w-0 flex-col">
          {step === "job" ? (
            <div className="animate-step-in">
              <h1 className="text-display-sm font-semibold tracking-tight text-primary">What should your agent do?</h1>
              <p className="mt-2 text-lg text-tertiary">One sentence is enough. You can change everything later.</p>

              <fieldset className="mt-9">
                <legend className="mb-2.5 text-sm font-medium text-secondary">Who starts the call?</legend>
                <div className="grid gap-3 sm:grid-cols-2">
                  {(["inbound", "outbound"] as const).map((d) => {
                    const on = direction === d;
                    return (
                      <button
                        key={d}
                        type="button"
                        aria-pressed={on}
                        onClick={() => setDirection(d)}
                        className={`group flex items-start gap-3 rounded-xl p-4 text-left outline-none ring-1 ring-inset transition focus-visible:ring-2 focus-visible:ring-brand-500 ${
                          on ? "bg-brand-50 ring-2 ring-brand-600" : "bg-primary ring-secondary hover:ring-brand-300"
                        }`}
                      >
                        <span
                          className={`flex size-10 shrink-0 items-center justify-center rounded-lg ${
                            on ? "bg-brand-600 text-white" : "bg-secondary text-tertiary"
                          }`}
                        >
                          {d === "inbound" ? <Phone01 className="size-5" /> : <PhoneOutgoing01 className="size-5" />}
                        </span>
                        <span className="min-w-0">
                          <span className="block text-md font-semibold text-primary">
                            {d === "inbound" ? "Customers call you" : "You call customers"}
                          </span>
                          <span className="mt-0.5 block text-sm text-tertiary">
                            {d === "inbound" ? "Answers questions, books, takes messages" : "Follows up, reminds, confirms"}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </fieldset>

              <div className="mt-7">
                <TextArea
                  label="The job"
                  isRequired
                  hideRequiredIndicator
                  rows={3}
                  maxLength={160}
                  autoFocus
                  value={purpose}
                  onChange={(v) => {
                    setPurpose(v);
                    setPicked(undefined);
                  }}
                  placeholder={
                    inbound
                      ? "Answer calls, book appointments, and answer questions about prices and hours"
                      : "Call new leads, check they’re still interested, and book a visit"
                  }
                  isInvalid={!!purposeErr}
                  hint={purposeErr ?? `${purpose.length}/160`}
                />
              </div>

              <div className="mt-8">
                <p className="mb-3 text-sm font-medium text-secondary">Or start from an example</p>
                <div className="grid gap-3 sm:grid-cols-3">
                  {agentTemplates
                    .filter((t) => t.values.direction === direction)
                    .slice(0, 3)
                    .map((t) => {
                      const on = picked === t.id;
                      return (
                        <button
                          key={t.id}
                          type="button"
                          aria-pressed={on}
                          onClick={() => pickTemplate(t.id)}
                          className={`flex flex-col gap-2 rounded-xl p-3.5 text-left outline-none ring-1 ring-inset transition focus-visible:ring-2 focus-visible:ring-brand-500 ${
                            on ? "bg-brand-50 ring-2 ring-brand-600" : "bg-primary ring-secondary hover:ring-brand-300"
                          }`}
                        >
                          <span className="flex size-8 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
                            <Icon name={t.icon} className="size-4" />
                          </span>
                          <span className="text-sm font-semibold text-primary">{t.title}</span>
                          <span className="line-clamp-2 text-xs text-tertiary">{t.tagline}</span>
                        </button>
                      );
                    })}
                </div>
              </div>
            </div>
          ) : (
            <div className="animate-step-in">
              <h1 className="text-display-sm font-semibold tracking-tight text-primary">What does the business offer?</h1>
              <p className="mt-2 text-lg text-tertiary">
                The agent only quotes what you list here. Skip anything you’re not sure of.
              </p>

              <div className="mt-8 flex flex-col gap-6">
                <Input
                  label="Business name"
                  isRequired
                  hideRequiredIndicator
                  autoComplete="organization"
                  autoFocus
                  value={businessName}
                  onChange={setBusinessName}
                  placeholder="Riverside Dental"
                  isInvalid={!!businessErr}
                  hint={businessErr ?? `What ${inbound ? "callers" : "recipients"} hear`}
                />

                <Input
                  label="Agent name"
                  value={customName}
                  onChange={setCustomName}
                  placeholder={autoName || "e.g. Riverside Dental inbound agent"}
                  hint="Only you see this. Defaults to the business name and direction."
                />

                <fieldset>
                  <legend className="mb-1.5 flex w-full items-baseline justify-between text-sm font-medium text-secondary">
                    Products or services
                    <Badge size="sm" color="gray" type="pill-color">Optional</Badge>
                  </legend>
                  <ul className="flex flex-col gap-3">
                    {offerings.map((o, i) => (
                      <li key={o.id} className="flex items-start gap-2">
                        <Input
                          aria-label={`Offering ${i + 1} name`}
                          value={o.name}
                          onChange={(v) => updateOffering(o.id, { name: v })}
                          placeholder={i === 0 ? "e.g. Teeth cleaning" : "Another product or service"}
                          className="min-w-0 flex-1"
                        />
                        <Input
                          aria-label={`Offering ${i + 1} price`}
                          value={o.price ?? ""}
                          onChange={(v) => updateOffering(o.id, { price: v })}
                          placeholder="Price"
                          className="w-28 shrink-0"
                        />
                        <Button
                          size="md"
                          color="tertiary"
                          iconLeading={XClose}
                          aria-label={`Remove offering ${i + 1}`}
                          onClick={() => setOfferings((rows) => (rows.length > 1 ? rows.filter((r) => r.id !== o.id) : [emptyOffering()]))}
                        />
                      </li>
                    ))}
                  </ul>
                  <Button
                    size="sm"
                    color="link-gray"
                    iconLeading={Plus}
                    className="mt-3"
                    onClick={() => setOfferings((rows) => [...rows, emptyOffering()])}
                  >
                    Add another
                  </Button>
                </fieldset>

                <div className="grid gap-6 sm:grid-cols-2">
                  <Input label="Opening hours" value={hours} onChange={setHours} placeholder="Mon–Fri, 9am to 5pm" />
                  <Input
                    label="If it can’t help, who follows up?"
                    value={handoff}
                    onChange={setHandoff}
                    placeholder="Front desk, 555-0100"
                  />
                </div>

                <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_200px]">
                  <Input
                    label="Monthly budget"
                    hint="Used to flag overspend before you go live"
                    inputMode="decimal"
                    value={budget}
                    onChange={setBudget}
                    placeholder={`${currencySymbol[currency]}200`}
                  />
                  <Select
                    label="Currency"
                    selectedKey={currency}
                    onSelectionChange={(k) => setCurrency(k as DisplayCurrency)}
                    items={(Object.keys(displayCurrencyLabel) as DisplayCurrency[]).map((c) => ({ id: c, label: displayCurrencyLabel[c] }))}
                  >
                    {(item) => <Select.Item id={item.id} label={item.label} />}
                  </Select>
                </div>
              </div>
            </div>
          )}


          <div className="sticky bottom-0 z-10 -mx-2 mt-10 flex items-center justify-between gap-3 bg-linear-to-t from-gray-50 from-70% to-transparent px-2 pb-6 pt-8">
            <Button
              color="tertiary"
              size="md"
              iconLeading={ChevronLeft}
              onClick={step === "business" ? () => goTo("job") : onBack}
            >
              Back
            </Button>
            <div className="flex items-center gap-3">
        {step === "business" && (
          <Button
            color="tertiary"
            size="md"
            onClick={() => {
              if (!businessName.trim()) return setTried(true);
              onCreate?.({
                name: customName.trim() || autoName,
                purpose: purpose.trim(),
                direction,
                businessName: businessName.trim(),
                details: { offerings: [] },
              });
            }}
          >
            Skip details
          </Button>
        )}
        <Button type="submit" size="md" iconTrailing={step === "job" ? ArrowRight : undefined}>
          {step === "job" ? "Continue" : "Create agent"}
        </Button>
                  </div>
          </div>
        </div>

          <BriefPreview
            direction={direction}
            businessName={businessName}
            purpose={purpose}
            details={details}
            showBusiness={step === "business"}
          />
        </div>
      </div>

    </form>
  );
}

/** What the agent will actually say, built from the answers so far — illustrative, not a recording. */
function BriefPreview({
  direction,
  businessName,
  purpose,
  details,
  showBusiness,
}: {
  direction: CallDirection;
  businessName: string;
  purpose: string;
  details: BusinessDetails;
  showBusiness: boolean;
}) {
  const typed = businessName.trim();
  const isExample = !typed;
  const biz = typed || "Riverside Dental";
  const sample: Agent = {
    id: "preview",
    name: biz,
    businessName: cleanBusinessName(biz),
    purpose,
    direction,
    status: "draft",
    voice: "Daniel — calm, neutral pace",
    greeting: "",
    tone: 50,
    systemPrompt: "",
    llmProvider: "",
    sttProvider: "",
    ttsProvider: "",
    temperature: 0.4,
  };
  const greeting = compileGreeting(sample);
  const first = details.offerings[0];
  const qa: { q: string; a: string }[] = [];
  if (isExample) {
    qa.push(
      { q: "How much is a teeth cleaning?", a: "A teeth cleaning is $90." },
      { q: "Can I speak to someone?", a: "Of course. I’ll take your number so a teammate can call you back." },
    );
  } else {
    if (first) {
      qa.push({
        q: first.price ? `How much is ${first.name.toLowerCase()}?` : `Do you do ${first.name.toLowerCase()}?`,
        a: first.price ? `${first.name} is ${first.price}.` : "Yes. I’ll have a teammate confirm the price with you.",
      });
    }
    if (details.hours) qa.push({ q: "What are your hours?", a: `We’re open ${details.hours.charAt(0).toLowerCase()}${details.hours.slice(1)}.` });
    qa.push({
      q: "Can I speak to someone?",
      a: details.handoff ? `Of course. I’ll pass you to ${details.handoff}.` : "Of course. I’ll take your number so a teammate can call you back.",
    });
  }
  const shown = showBusiness || isExample ? qa : [];

  return (
    <aside aria-label="Preview" className="hidden lg:block">
      <div className="sticky top-8 overflow-hidden rounded-2xl bg-primary ring-1 ring-secondary ring-inset">
        <div className="flex items-center gap-3 border-b border-secondary bg-secondary px-5 py-4">
          <span className="relative flex size-10 items-center justify-center rounded-full bg-brand-600 text-white">
            <VoiceWaveform variant="idle" className="h-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-primary">{isExample ? "Your agent" : `${biz} agent`}</p>
            <p className="text-xs text-tertiary">{direction === "inbound" ? "Answers incoming calls" : "Makes outgoing calls"}</p>
          </div>
          <Badge size="sm" color={isExample ? "gray" : "success"} type="pill-color">
            {isExample ? "Example" : "Live preview"}
          </Badge>
        </div>
        <div className="space-y-3 px-5 py-5">
          <Bubble who="agent">{greeting}</Bubble>
          {shown.map((x) => (
            <div key={x.q} className="space-y-3">
              <Bubble who="person">{x.q}</Bubble>
              <Bubble who="agent">{x.a}</Bubble>
            </div>
          ))}
          {showBusiness && !isExample && !first && (
            <p className="border-t border-secondary pt-3 text-xs text-tertiary">Add a product and hear it quoted here.</p>
          )}
        </div>
        <p className="border-t border-secondary px-5 py-3 text-xs text-tertiary">
          {isExample
            ? "A sample call. It rewrites itself with your business as you type."
            : "Illustrative. Real calls use the voice and details you set."}
        </p>
      </div>
    </aside>
  );
}

function Bubble({ who, children }: { who: "agent" | "person"; children: string }) {
  return (
    <p
      className={`max-w-[92%] rounded-xl px-3.5 py-2.5 text-sm ${
        who === "agent" ? "bg-primary text-primary ring-1 ring-secondary ring-inset" : "ml-auto bg-brand-solid text-white"
      }`}
    >
      {children}
    </p>
  );
}
