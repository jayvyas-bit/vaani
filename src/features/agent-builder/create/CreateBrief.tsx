import { useEffect, useRef, useState, type FormEvent } from "react";
import { Tooltip, TooltipTrigger } from "@/components/base/tooltip/tooltip";
import { ArrowRight, CheckCircle, ChevronLeft, Clock, Flag01, HelpCircle, List, Phone01, PhoneOutgoing01, Plus, Stars01, Tool01, User01, XClose } from "@untitledui/icons";
import { RadioGroup, RadioItem } from "@/components/base/radio-buttons/radio-buttons";
import { Tag, TagGroup, TagList } from "@/components/base/tags/tags";
import { FeaturedIcon } from "@/components/foundations/featured-icon/featured-icon";
import { Button } from "@/components/base/buttons/button";
import { Input } from "@/components/base/input/input";
import { Select } from "@/components/base/select/select";
import { TextArea } from "@/components/base/textarea/textarea";
import { VoiceWaveform } from "@/components/ui/VoiceWaveform";
import { fromDisplayAmount, type DisplayCurrency } from "@/lib/format";
import { cleanBusinessName, compileGreeting, inferPersonaDefaults, languageOptions } from "@/lib/persona";
import { agentTemplates } from "@/lib/templates";
import type { Agent, AgentLanguage, BusinessDetails, CallDirection, Offering, Faq } from "@/lib/types";
import { newId } from "@/lib/useControllable";
import type { CreateFormValues } from "./MinimalCreateForm";

export interface CreateBriefValues extends CreateFormValues {
  details: BusinessDetails;
  language?: AgentLanguage;
  /** Stored in USD like every other cost figure; `displayCurrency` only controls how it’s shown. */
  monthlyBudget?: number;
  displayCurrency?: DisplayCurrency;
  /** Inbound only: the busiest expected moment, in simultaneous calls. Never verified here. */
  peakCalls?: number;
}

export type BriefStep = "job" | "business";

const templateIcons = { user: User01, list: List, wrench: Tool01, flag: Flag01, clock: Clock, check: CheckCircle, sparkles: Stars01 } as const;
const CURRENCIES = { INR: "₹", USD: "$", EUR: "€", GBP: "£", AED: "AED " } as const;
type CurrencyCode = keyof typeof CURRENCIES;
const defaultCurrency = (): CurrencyCode => {
  try {
    return navigator.language.toUpperCase().endsWith("-IN") ? "INR" : "USD";
  } catch {
    return "USD";
  }
};
/** A bare number gets the chosen currency symbol; anything the user typed with its own symbol or words is kept. */
const withCurrency = (price: string | undefined, code: CurrencyCode) => {
  const p = price?.trim();
  if (!p) return undefined;
  return /^[\d.,]+$/.test(p) ? `${CURRENCIES[code]}${p}` : p;
};
const MESSAGE_FIELDS = ["Name", "Phone number", "Reason for calling", "Best time to call"];
const zones: string[] = (() => {
  try {
    return (Intl as unknown as { supportedValuesOf: (k: string) => string[] }).supportedValuesOf("timeZone");
  } catch {
    return ["UTC"];
  }
})();
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const TIMES = Array.from({ length: 48 }, (_, i) => {
  const h = Math.floor(i / 2);
  return `${h % 12 || 12}:${i % 2 ? "30" : "00"}${h < 12 ? "am" : "pm"}`;
});

/** "Mon–Fri, 9:00am to 5:00pm" — the same plain sentence the agent already reads. */
function compileHours(days: boolean[], open: string, close: string) {
  const picked = days.flatMap((on, i) => (on ? [i] : []));
  if (!picked.length) return "";
  const runs: number[][] = [];
  for (const i of picked) {
    const last = runs[runs.length - 1];
    if (last && last[last.length - 1] === i - 1) last.push(i);
    else runs.push([i]);
  }
  const label =
    picked.length === 7
      ? "Every day"
      : runs.map((r) => (r.length >= 3 ? `${DAYS[r[0]]}–${DAYS[r[r.length - 1]]}` : r.map((i) => DAYS[i]).join(", "))).join(", ");
  return `${label}, ${open} to ${close}`;
}

/** One labelled field: label above, controls below. */
function Row({ title, tip, badge, children }: { title: string; tip?: string; badge?: "Optional"; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2.5 pb-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-1.5 text-sm font-medium text-secondary">
          {title}
          {tip && (
            <Tooltip title={tip} placement="top">
              <TooltipTrigger className="text-fg-quaternary hover:text-fg-quaternary_hover" aria-label={`About ${title.toLowerCase()}`}>
                <HelpCircle className="size-4 stroke-[2.25px]" />
              </TooltipTrigger>
            </Tooltip>
          )}
        </h2>
        {badge && <span className="text-xs text-quaternary">{badge}</span>}
      </div>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

/** Both steps stay mounted; the inactive one folds away, so fields change in place. */
function Collapse({ open, children }: { open: boolean; children: React.ReactNode }) {
  return (
    <div
      inert={!open}
      aria-hidden={!open}
      className={`grid transition-[grid-template-rows,opacity] duration-300 ease-[cubic-bezier(0.25,1,0.5,1)] ${open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}
    >
      <div className="-mx-1 min-h-0 overflow-hidden px-1">{children}</div>
    </div>
  );
}

const emptyOffering = (): Offering => ({ id: newId("off"), name: "", price: "" });
const emptyFaq = (): Faq => ({ id: newId("faq"), question: "", answer: "" });

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
  const [currency, setCurrency] = useState<CurrencyCode>(defaultCurrency);
  const [offerings, setOfferings] = useState<Offering[]>([emptyOffering()]);
  const [days, setDays] = useState<boolean[]>(Array(7).fill(false));
  const [openAt, setOpenAt] = useState("9:00am");
  const [closeAt, setCloseAt] = useState("5:00pm");
  const hours = compileHours(days, openAt, closeAt);
  const [faqs, setFaqs] = useState<Faq[]>([emptyFaq()]);
  const [handoffMode, setHandoffMode] = useState<"message" | "person">("message");
  const [handoff, setHandoff] = useState("");
  const [emergency, setEmergency] = useState("");
  const [language, setLanguage] = useState<AgentLanguage>("en");
  const [budget, setBudget] = useState("");
  // The budget has its own currency so a business with no prices (an outage line, say) is not stuck on the price currency.
  const [budgetCurrency, setBudgetCurrency] = useState<"INR" | "USD">(() => (defaultCurrency() === "INR" ? "INR" : "USD"));
  const [peak, setPeak] = useState("");
  const [timezone, setTimezone] = useState(() => Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC");
  const [messageFields, setMessageFields] = useState<string[]>(["Name", "Phone number", "Reason for calling"]);
  const [tried, setTried] = useState(false);
  const [showAllTemplates, setShowAllTemplates] = useState(false);

  const inbound = direction === "inbound";
  const autoName = businessName.trim() ? `${businessName.trim()} ${inbound ? "inbound" : "outbound"} agent` : "";
  const purposeErr = tried && step === "job" && !purpose.trim() ? "Say what the agent should do on a call." : null;
  const businessErr =
    tried && step === "business" && businessName.trim().length < 2
      ? businessName.trim() ? "Use at least 2 characters." : `${inbound ? "Callers" : "People you call"} hear this, so it can’t be blank.`
      : null;

  const handoffErr = tried && step === "business" && handoffMode === "person" && !handoff.trim() ? "Say who follows up, or choose Take a message." : null;

  const nameRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    if (step === "business") {
      const t = setTimeout(() => nameRef.current?.focus({ preventScroll: true }), 220);
      return () => clearTimeout(t);
    }
  }, [step]);

  const goTo = (next: BriefStep) => {
    setStep(next);
    setTried(false);
    onStepChange?.(next);
  };

  const details: BusinessDetails = {
    offerings: offerings.filter((o) => o.name.trim()).map((o) => ({ ...o, name: o.name.trim(), price: withCurrency(o.price, currency) })),
    faqs: faqs.filter((f) => f.question.trim() && f.answer.trim()).map((f) => ({ ...f, question: f.question.trim(), answer: f.answer.trim() })),
    hours: hours.trim() || undefined,
    timezone: hours.trim() ? timezone : undefined,
    messageFields: handoffMode === "message" && messageFields.length ? messageFields : undefined,
    handoff: handoffMode === "person" ? handoff.trim() || undefined : undefined,
    emergency: inbound ? emergency.trim() || undefined : undefined,
  };

  const budgetNum = Number(budget.replace(/[^\d.]/g, ""));
  const peakNum = Math.floor(Number(peak.replace(/[^\d]/g, "")));
  const peakCalls = inbound && peakNum > 0 ? peakNum : undefined;
  const monthlyBudget = budget.trim() && budgetNum > 0 ? fromDisplayAmount(budgetNum, budgetCurrency) : undefined;

  // Shown as you type: a stray "-" or letter must not be silently stripped into a different number.
  const budgetErr = budget.trim() && (!/^[\d,.\s₹$]+$/.test(budget) || !(budgetNum > 0)) ? "Enter a number above 0, such as 15000." : null;
  const peakErr = peak.trim() && (!/^[\d,\s]+$/.test(peak) || !(peakNum > 0)) ? "Enter a whole number above 0, such as 1000." : null;

  const create = () => {
    if (businessName.trim().length < 2 || budgetErr || peakErr || (handoffMode === "person" && !handoff.trim())) {
      setTried(true);
      // Errors can sit above the fold; take the person to the first one.
      if (businessName.trim().length < 2) nameRef.current?.focus();
      return;
    }
    onCreate?.({
      name: customName.trim() || autoName,
      purpose: purpose.trim(),
      direction,
      businessName: businessName.trim(),
      details,
      language,
      displayCurrency: budgetCurrency,
      monthlyBudget,
      peakCalls,
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

  const allTemplates = agentTemplates.filter((t) => t.values.direction === direction);
  const templates = showAllTemplates ? allTemplates : allTemplates.slice(0, 3);


  return (
    <form onSubmit={submit} noValidate className="flex h-full bg-paper-50">
      <div ref={scrollRef} className="min-w-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-[600px] px-5 py-10 sm:px-8 sm:py-14">
          <div className="grid">
            <div
              aria-hidden={step !== "job"}
              className={`col-start-1 row-start-1 transition-opacity duration-300 ${step === "job" ? "opacity-100" : "pointer-events-none opacity-0"}`}
            >
              <h1 className="text-display-xs font-semibold tracking-[-0.02em] text-primary sm:text-display-md">What should your agent do?</h1>
              <p className="mt-3 text-md text-tertiary">Choose who starts the call, then describe the job in a sentence.</p>
            </div>
            <div
              aria-hidden={step !== "business"}
              className={`col-start-1 row-start-1 transition-opacity duration-300 ${step === "business" ? "opacity-100" : "pointer-events-none opacity-0"}`}
            >
              <h1 className="text-display-xs font-semibold tracking-[-0.02em] text-primary sm:text-display-md">Tell us about the business</h1>
              <p className="mt-3 text-md text-tertiary">Only the name is required. The agent quotes only what you add.</p>
            </div>
          </div>

          <div className="mt-10">
            <div>
              <Collapse open={step === "job"}>
                <Row title="Who starts the call">
                  <RadioGroup
                    aria-label="Who starts the call"
                    orientation="horizontal"
                    className="grid grid-cols-2 gap-3"
                    value={direction}
                    onChange={(v) => {
                      setDirection(v as CallDirection);
                      setShowAllTemplates(false);
                      if (picked) {
                        setPicked(undefined);
                        setPurpose("");
                      }
                    }}
                  >
                    <RadioItem value="inbound" label="Customers call you" leading={<Phone01 className="size-5 text-fg-quaternary" />} />
                    <RadioItem value="outbound" label="You call customers" leading={<PhoneOutgoing01 className="size-5 text-fg-quaternary" />} />
                  </RadioGroup>
                  <p className="text-xs text-tertiary">One agent handles one direction. If you also need {inbound ? "outgoing calls, such as service updates" : "incoming calls"}, create a second agent after this one.</p>
                </Row>
                <Row title="The job">
                  <TextArea
                    aria-label="The job"
                    isRequired
                    rows={3}
                    maxLength={160}
                    autoFocus
                    value={purpose}
                    onChange={(v) => {
                      setPurpose(v);
                      setPicked(undefined);
                    }}
                    placeholder="Describe the job in a sentence"
                    isInvalid={!!purposeErr}
                    hint={purposeErr ?? undefined}
                  />
                </Row>
                <Row title="Start from a template" badge="Optional">
                  <RadioGroup aria-label="Template" className="gap-2" value={picked ?? ""} onChange={(v) => pickTemplate(v)}>
                    {templates.map((t) => (
                      <RadioItem key={t.id} value={t.id} label={t.title} hint={t.tagline} leading={<FeaturedIcon icon={templateIcons[t.icon as keyof typeof templateIcons]} color="gray" theme="light" size="md" />} />
                    ))}
                  </RadioGroup>
                  {allTemplates.length > 3 && (
                    <Button size="md" color="link-color" className="mt-3" onClick={() => setShowAllTemplates((v) => !v)}>
                      {showAllTemplates ? "Show fewer" : `Show ${allTemplates.length - 3} more`}
                    </Button>
                  )}
                </Row>
              </Collapse>

              <Collapse open={step === "business"}>
                <Row title="Business name" tip={`What ${inbound ? "callers" : "recipients"} hear`}>
                  <Input
                    aria-label="Business name"
                    isRequired
                    autoComplete="organization"
                    enterKeyHint="next"
                    ref={nameRef}
                    value={businessName}
                    onChange={setBusinessName}
                    placeholder="Business name"
                    isInvalid={!!businessErr}
                    hint={businessErr ?? undefined}
                  />
                </Row>

                <Row title="Products, plans and prices">
                  <ul className="flex flex-col gap-2">
                    {offerings.map((o, i) => (
                      <li key={o.id} className="flex flex-wrap items-start gap-2">
                        <Input
                          aria-label={`Product ${i + 1} name`}
                          value={o.name}
                          onChange={(v) => updateOffering(o.id, { name: v })}
                          placeholder="Product or service"
                          className="min-w-[10rem] flex-1"
                        />
                        <Select aria-label="Currency" className="w-24 shrink-0" selectedKey={currency} onSelectionChange={(k) => setCurrency(k as CurrencyCode)} items={(Object.keys(CURRENCIES) as CurrencyCode[]).map((c) => ({ id: c, label: c }))}>
                          {(item) => <Select.Item id={item.id} label={item.label} />}
                        </Select>
                        <Input
                          aria-label={`Product ${i + 1} price`}
                          inputMode="decimal"
                          value={o.price ?? ""}
                          onChange={(v) => updateOffering(o.id, { price: v })}
                          placeholder="Price"
                          className="w-28 shrink-0"
                        />
                        {(offerings.length > 1 || o.name || o.price) && (
                          <Button
                            size="md"
                            color="tertiary"
                            iconLeading={XClose}
                            aria-label={`Remove product ${i + 1}`}
                            onClick={() => setOfferings((rows) => (rows.length > 1 ? rows.filter((r) => r.id !== o.id) : [emptyOffering()]))}
                          />
                        )}
                      </li>
                    ))}
                  </ul>
                  <Button size="md" color="link-color" iconLeading={Plus} className="mt-2" onClick={() => setOfferings((rows) => [...rows, emptyOffering()])}>
                    Add another
                  </Button>
                </Row>

                <Row title={inbound ? "Questions callers ask" : "Questions people may ask"} tip="Address, parking, insurance, policies. The agent gives your answer word for word.">
                  <ul className="flex flex-col gap-5">
                    {faqs.map((f, i) => (
                      <li key={f.id} className="flex items-start gap-2">
                        <div className="flex min-w-0 flex-1 flex-col gap-3">
                          <Input aria-label={`Question ${i + 1}`} value={f.question} onChange={(v) => setFaqs((r) => r.map((x) => (x.id === f.id ? { ...x, question: v } : x)))} placeholder={inbound ? "Question callers ask" : "Question people may ask"} />
                          <Input aria-label={`Answer ${i + 1}`} value={f.answer} onChange={(v) => setFaqs((r) => r.map((x) => (x.id === f.id ? { ...x, answer: v } : x)))} placeholder="Your answer" />
                        </div>
                        {(faqs.length > 1 || f.question || f.answer) && (
                          <Button size="md" color="tertiary" iconLeading={XClose} aria-label={`Remove question ${i + 1}`} onClick={() => setFaqs((r) => (r.length > 1 ? r.filter((x) => x.id !== f.id) : [emptyFaq()]))} />
                        )}
                      </li>
                    ))}
                  </ul>
                  <Button size="md" color="link-color" iconLeading={Plus} className="mt-2" onClick={() => setFaqs((r) => [...r, emptyFaq()])}>
                    Add another
                  </Button>
                </Row>

                <div className="grid gap-x-5 sm:grid-cols-2">
                  <Row title="Language" tip="The language the agent speaks on calls. Check that your voice provider supports it before going live.">
                    <Select aria-label="Language" selectedKey={language} onSelectionChange={(k) => setLanguage(k as AgentLanguage)} items={languageOptions.map((l) => ({ id: l.code, label: l.label }))}>
                      {(item) => <Select.Item id={item.id} label={item.label} />}
                    </Select>
                  </Row>
                  <Row title="Agent name" badge="Optional" tip="Only you see this. Defaults to the business name and direction.">
                    <Input
                      aria-label="Agent name"
                      autoComplete="off"
                      value={customName}
                      onChange={setCustomName}
                      placeholder={autoName || "Same as business name"}
                    />
                  </Row>
                </div>

                <Row title="Monthly budget" badge="Optional" tip="Sets the starting call volume so the cost estimate fits. Rates are modelled, not live quotes.">
                  <div className="flex items-start gap-2">
                    <Select aria-label="Budget currency" className="w-24 shrink-0" selectedKey={budgetCurrency} onSelectionChange={(k) => setBudgetCurrency(k as "INR" | "USD")} items={[{ id: "INR", label: "INR ₹" }, { id: "USD", label: "USD $" }]}>
                      {(item) => <Select.Item id={item.id} label={item.label} />}
                    </Select>
                    <Input
                      aria-label="Monthly budget"
                      inputMode="decimal"
                      value={budget}
                      onChange={setBudget}
                      isInvalid={!!budgetErr}
                      hint={budgetErr ?? undefined}
                      placeholder={budgetCurrency === "INR" ? "e.g. 15000" : "e.g. 200"}
                      className="max-w-[16rem]"
                    />
                  </div>
                </Row>

                {inbound && (
                  <Row title="Busiest moment" badge="Optional" tip="Your own estimate of calls at the same time, such as during an outage. It is a planning note: nothing here measures or guarantees capacity.">
                    <Input
                      aria-label="Busiest moment, calls at the same time"
                      inputMode="numeric"
                      value={peak}
                      onChange={setPeak}
                      isInvalid={!!peakErr}
                      hint={peakErr ?? undefined}
                      placeholder="Calls at the same time, e.g. 1000"
                      className="max-w-[16rem]"
                    />
                  </Row>
                )}

                <Row title={inbound ? "Hours you answer" : "When it may call"} tip={inbound ? undefined : "The agent only dials inside these days and hours."}>
                  <TagGroup
                    label="Open days"
                    size="lg"
                    selectionMode="multiple"
                    selectedKeys={DAYS.filter((_, i) => days[i])}
                    onSelectionChange={(keys) => setDays(DAYS.map((d) => keys === "all" || keys.has(d)))}
                  >
                    <TagList className="flex flex-wrap gap-2">
                      {DAYS.map((d) => (
                        <Tag key={d} id={d}>
                          {d}
                        </Tag>
                      ))}
                    </TagList>
                  </TagGroup>
                  <div className="mt-2.5 flex gap-4">
                    <Button size="md" color="link-color" onClick={() => setDays([true, true, true, true, true, false, false])}>
                      Weekdays
                    </Button>
                    <Button size="md" color="link-color" onClick={() => setDays(Array(7).fill(true))}>
                      Every day
                    </Button>
                    {days.some(Boolean) && (
                      <Button size="md" color="link-gray" onClick={() => setDays(Array(7).fill(false))}>
                        Clear
                      </Button>
                    )}
                  </div>
                  {days.some(Boolean) && (
                    <div className="mt-4 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3">
                      <Select aria-label="Opens at" selectedKey={openAt} onSelectionChange={(k) => setOpenAt(String(k))} items={TIMES.map((t) => ({ id: t, label: t }))}>
                        {(item) => <Select.Item id={item.id} label={item.label} />}
                      </Select>
                      <span className="text-sm text-tertiary">to</span>
                      <Select aria-label="Closes at" selectedKey={closeAt} onSelectionChange={(k) => setCloseAt(String(k))} items={TIMES.map((t) => ({ id: t, label: t }))}>
                        {(item) => <Select.Item id={item.id} label={item.label} />}
                      </Select>
                      <Select aria-label="Time zone" className="col-span-3" selectedKey={timezone} onSelectionChange={(k) => setTimezone(String(k))} items={zones.map((z) => ({ id: z, label: z.replace(/_/g, " ") }))}>
                        {(item) => <Select.Item id={item.id} label={item.label} />}
                      </Select>
                    </div>
                  )}
                </Row>

                <Row title={inbound ? "If it can’t help" : "If they want a person"} tip="Take a message collects details for a callback. Pass to a person names who follows up.">
                  <RadioGroup aria-label="If it can’t help" orientation="horizontal" className="grid grid-cols-2 gap-3" value={handoffMode} onChange={(v) => setHandoffMode(v as "message" | "person")}>
                    <RadioItem value="message" label="Take a message" />
                    <RadioItem value="person" label="Pass to a person" />
                  </RadioGroup>
                  {handoffMode === "message" && (
                    <div className="mt-3">
                      <p className="mb-2 text-sm text-tertiary">Ask for</p>
                      <TagGroup
                        label="Ask for"
                        size="lg"
                        selectionMode="multiple"
                        selectedKeys={messageFields}
                        onSelectionChange={(keys) => setMessageFields(MESSAGE_FIELDS.filter((f) => keys === "all" || keys.has(f)))}
                      >
                        <TagList className="flex flex-wrap gap-2">
                          {MESSAGE_FIELDS.map((f) => (
                            <Tag key={f} id={f}>
                              {f}
                            </Tag>
                          ))}
                        </TagList>
                      </TagGroup>
                    </div>
                  )}
                  {handoffMode === "person" && (
                    <Input aria-label="Who follows up" className="mt-3" autoComplete="off" value={handoff} onChange={setHandoff} placeholder="Name, team or phone number" isInvalid={!!handoffErr} hint={handoffErr ?? undefined} />
                  )}
                </Row>
                {inbound && (
                  <Row title="Emergency number" badge="Optional" tip="Where calls about danger go, such as an on-call phone. With a real number it becomes a Transfer tool, so hazard tests can be checked. This demo never dials it.">
                    <Input aria-label="Emergency number" inputMode="tel" autoComplete="off" value={emergency} onChange={setEmergency} placeholder="On-call phone number" className="max-w-[16rem]" />
                  </Row>
                )}
              </Collapse>

              <div className="flex items-center justify-between gap-3 border-t border-gray-200 pt-6">
                <Button color="tertiary" size="md" iconLeading={ChevronLeft} onClick={step === "business" ? () => goTo("job") : onBack}>
                  Back
                </Button>
                <div className="flex items-center gap-3">
                  <div inert={step !== "business"} className={`transition-opacity duration-300 ${step === "business" ? "opacity-100" : "pointer-events-none opacity-0"}`}>
                    <Button
                      color="tertiary"
                      size="md"
                      onClick={() => {
                        if (businessName.trim().length < 2 || budgetErr || peakErr) return setTried(true);
                        onCreate?.({
                          name: customName.trim() || autoName,
                          purpose: purpose.trim(),
                          direction,
                          businessName: businessName.trim(),
                          details: { offerings: [] },
                          language,
                          displayCurrency: budgetCurrency,
                          monthlyBudget,
                          peakCalls,
                        });
                      }}
                    >
                      Create with basics
                    </Button>
                  </div>
                  <Button type="submit" size="md" iconTrailing={step === "job" ? ArrowRight : undefined}>
                    {step === "job" ? "Continue" : "Create agent"}
                  </Button>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
      <BriefPreview direction={direction} businessName={businessName} purpose={purpose} details={details} />
    </form>
  );
}

/** What the agent will actually say, built from the answers so far. */
function BriefPreview({
  direction,
  businessName,
  purpose,
  details,
}: {
  direction: CallDirection;
  businessName: string;
  purpose: string;
  details: BusinessDetails;
}) {
  const typed = businessName.trim();
  const isExample = !typed;
  const biz = typed || "your business";
  const persona = inferPersonaDefaults(purpose, direction);
  const sample: Agent = {
    id: "preview",
    name: biz,
    businessName: cleanBusinessName(biz),
    purpose,
    direction,
    status: "draft",
    voice: persona.voice,
    greeting: "",
    tone: persona.tone,
    systemPrompt: "",
    llmProvider: "",
    sttProvider: "",
    ttsProvider: "",
    temperature: 0.4,
  };
  const greeting = compileGreeting(sample);
  const qa: { q: string; a: string }[] = [];
  details.offerings
    .filter((o) => o.name.trim())
    .slice(0, 2)
    .forEach((o) => {
      const name = o.name.trim().toLowerCase();
      const price = o.price?.trim();
      qa.push({
        q: price ? `How much is ${name}?` : `Do you do ${name}?`,
        a: price ? `${o.name.trim()} is ${price}.` : "Yes. I’ll have a teammate confirm the price with you.",
      });
    });
  (details.faqs ?? []).slice(0, 2).forEach((f) => qa.push({ q: f.question, a: f.answer }));
  if (details.hours) qa.push({ q: "What are your hours?", a: `We’re open ${details.hours}.` });
  if (qa.length || details.handoff)
    qa.push({
      q: "Can I speak to someone?",
      a: details.handoff ? `Of course. I’ll pass you to ${details.handoff}.` : `Of course. I’ll take your ${(details.messageFields?.length ? details.messageFields.map((f) => f.toLowerCase()) : ["number"]).join(", ").replace(/, ([^,]*)$/, " and $1")} so a teammate can call you back.`,
    });
  const shown = qa;
  const gaps = [
    !details.offerings.length && "prices",
    !details.hours && "opening hours",
    !(details.faqs ?? []).length && "other questions",
  ].filter(Boolean) as string[];

  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className="pointer-events-none fixed right-5 bottom-5 z-20 flex flex-col items-end gap-3 sm:right-8 sm:bottom-8">
      {open && (
        <section
          id="brief-preview"
          aria-label="Live preview"
          className="animate-fade-in pointer-events-auto max-h-[70dvh] w-[min(380px,calc(100vw-2.5rem))] overflow-y-auto rounded-2xl bg-white shadow-lg ring-1 ring-secondary"
        >
          <div className="flex items-center gap-3 border-b border-gray-200 px-5 py-4">
            <span className="relative flex size-10 items-center justify-center rounded-full bg-brand-600 text-white">
              <VoiceWaveform variant="idle" className="h-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-primary">{isExample ? "Your agent" : `${biz} agent`}</p>
              <p className="truncate text-xs text-tertiary">{purpose.trim() || (direction === "inbound" ? "Answers incoming calls" : "Makes outgoing calls")}</p>
            </div>
            <button type="button" aria-label="Close preview" onClick={() => setOpen(false)} className="rounded-md p-1 text-tertiary outline-focus-ring hover:bg-primary_hover focus-visible:outline-2">
              <XClose className="size-4" />
            </button>
          </div>
          <div className="space-y-3 px-5 py-5">
            <div key={greeting} className="animate-fade-in">
              <Bubble who="agent">{greeting}</Bubble>
            </div>
            {shown.map((x) => (
              <div key={x.q} className="animate-step-in space-y-3">
                <Bubble who="person">{x.q}</Bubble>
                <Bubble who="agent">{x.a}</Bubble>
              </div>
            ))}
            {typed && gaps.length > 0 && (
              <p className="border-t border-secondary pt-3 text-xs text-tertiary">
                Without {gaps.join(", ")}, the agent says a teammate will confirm.
              </p>
            )}
          </div>
        </section>
      )}
      <button
        type="button"
        aria-expanded={open}
        aria-controls="brief-preview"
        onClick={() => setOpen((v) => !v)}
        className="pointer-events-auto flex items-center gap-2.5 rounded-full bg-white py-2 pr-5 pl-2 text-sm font-medium text-primary shadow-lg ring-1 ring-secondary outline-focus-ring transition-shadow hover:shadow-xl focus-visible:outline-2"
      >
        <span className="flex size-9 items-center justify-center rounded-full bg-brand-600 text-white">
          <VoiceWaveform variant="idle" className="h-3.5" />
        </span>
        Preview
      </button>
    </div>
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
