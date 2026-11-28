import { useId, useRef, useState, type ChangeEvent, type FormEvent, type KeyboardEvent } from "react";
import { Button } from "@/components/ui/Button";
import { FieldError, FieldLabel, Input, Textarea } from "@/components/ui/Field";
import { Icon, type IconName } from "@/components/ui/Icon";
import { RadioCard } from "@/components/ui/RadioCard";
import { SectionCard } from "@/components/ui/SectionCard";
import { Switch } from "@/components/ui/Switch";
import { newId } from "@/lib/useControllable";
import type { BusinessDetails, KnowledgeSettings, KnowledgeSource, Offering } from "@/lib/types";

const kindIcon: Record<KnowledgeSource["kind"], IconName> = {
  pdf: "file",
  url: "link",
  text: "file",
};

/**
 * "Chunk size" / "top-k" are raw RAG internals with no actionable meaning to
 * any user — nobody, technical or not, can reason about "800 tokens" without
 * already knowing how this agent’s retrieval is implemented. These two
 * presets give the same underlying tuning as an outcome instead.
 */
export const knowledgeAnswerStylePresets = {
  quick: { chunkSize: 500, topK: 3 },
  thorough: { chunkSize: 1200, topK: 6 },
} satisfies Record<string, KnowledgeSettings>;

export type KnowledgeAnswerStyle = keyof typeof knowledgeAnswerStylePresets;

export const defaultKnowledgeSettings: KnowledgeSettings = knowledgeAnswerStylePresets.quick;

/** Settings from before this preset existed won’t match either exactly — nearest by topK. */
function answerStyleOf(settings: KnowledgeSettings): KnowledgeAnswerStyle {
  return settings.topK >= 5 ? "thorough" : "quick";
}

/** Splits "Pricing-Sheet-2024.pdf" into base + extension so the extension survives truncation. */
function splitFileName(name: string): { base: string; ext: string } {
  const dot = name.lastIndexOf(".");
  if (dot <= 0 || dot === name.length - 1) return { base: name, ext: "" };
  return { base: name.slice(0, dot), ext: name.slice(dot) };
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Accepts "example.com/faq" or a full URL; returns a display form or null. */
function normalizeUrl(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed || /\s/.test(trimmed)) return null;
  try {
    const u = new URL(/^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`);
    if (!u.hostname.includes(".")) return null;
    return `${u.hostname.replace(/^www\./, "")}${u.pathname === "/" ? "" : u.pathname}${u.search}`;
  } catch {
    return null;
  }
}

function SourceRow({ source, onToggle }: { source: KnowledgeSource; onToggle: (attached: boolean) => void }) {
  const { base, ext } = source.kind === "url" ? { base: source.name, ext: "" } : splitFileName(source.name);
  return (
    <div className="flex items-center gap-3 py-3">
      <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-paper-100 text-ink-500">
        <Icon name={kindIcon[source.kind]} className="size-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="flex min-w-0 text-[14px] font-medium text-ink-950">
          <span className="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap">{base}</span>
          {ext && <span className="shrink-0">{ext}</span>}
        </p>
        <p className="text-[13px] text-ink-500">
          {source.kind === "url" ? "Web page" : `${source.kind.toUpperCase()} · ${source.sizeLabel}`}
          {!source.attached && " · not used on calls"}
        </p>
      </div>
      <Switch checked={source.attached} onChange={onToggle} label={`Use on calls: ${source.name}`} />
    </div>
  );
}

export function KnowledgeSection({
  sources,
  onSourcesChange,
  settings = defaultKnowledgeSettings,
  onSettingsChange,
  defaultAdvanced = false,
  details,
  onDetailsChange,
}: {
  details?: BusinessDetails;
  onDetailsChange?: (next: BusinessDetails) => void;
  sources: KnowledgeSource[];
  onSourcesChange: (next: KnowledgeSource[]) => void;
  settings?: KnowledgeSettings;
  onSettingsChange?: (next: KnowledgeSettings) => void;
  defaultAdvanced?: boolean;
}) {
  const id = useId();
  const fileRef = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState("");
  const [urlError, setUrlError] = useState<string | null>(null);
  const [addingText, setAddingText] = useState(false);
  const [textTitle, setTextTitle] = useState("");
  const [textBody, setTextBody] = useState("");
  const [textSubmitted, setTextSubmitted] = useState(false);

  const addUrl = () => {
    const normalized = normalizeUrl(url);
    if (!normalized) {
      setUrlError("Enter a web address like example.com/faq.");
      return;
    }
    if (sources.some((s) => s.kind === "url" && s.name === normalized)) {
      setUrlError("That page is already added.");
      return;
    }
    onSourcesChange([
      ...sources,
      { id: newId("kb"), name: normalized, kind: "url", sizeLabel: "—", attached: true },
    ]);
    setUrl("");
    setUrlError(null);
  };

  const onUrlKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addUrl();
    }
  };

  const textTitleErr = textSubmitted && !textTitle.trim() ? "Give it a short title." : null;
  const textBodyErr = textSubmitted && !textBody.trim() ? "Paste the text this agent should know." : null;

  const submitText = (e: FormEvent) => {
    e.preventDefault();
    setTextSubmitted(true);
    if (!textTitle.trim() || !textBody.trim()) return;
    onSourcesChange([
      ...sources,
      {
        id: newId("kb"),
        name: textTitle.trim(),
        kind: "text",
        sizeLabel: formatBytes(new Blob([textBody]).size),
        attached: true,
        body: textBody.trim(),
      },
    ]);
    setTextTitle("");
    setTextBody("");
    setTextSubmitted(false);
    setAddingText(false);
  };

  const onFiles = (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length > 0) {
      onSourcesChange([
        ...sources,
        ...files.map<KnowledgeSource>((f) => ({
          id: newId("kb"),
          name: f.name,
          kind: f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf") ? "pdf" : "text",
          sizeLabel: formatBytes(f.size),
          attached: true,
        })),
      ]);
    }
    // Reset so picking the same file again still fires onChange.
    e.target.value = "";
  };

  return (
    <div className="grid items-start gap-x-14 lg:grid-cols-2 lg:[&>section:nth-child(2)]:border-t-0 lg:[&>section:nth-child(2)]:pt-0">
    {onDetailsChange && <BusinessDetailsCard details={details ?? { offerings: [] }} onChange={onDetailsChange} />}
    <SectionCard
      title="Sources"
      description="Pages and files the agent answers from."
      defaultAdvancedOpen={defaultAdvanced}
      guided={
        <div className="mt-1 divide-y divide-ink-950/8 border-t border-ink-950/8">
          {sources.length === 0 && (
            <p className="py-5 text-[14px] text-ink-500">
              Nothing attached, so the agent can only answer from its prompt. Add your hours, price
              list or FAQ page and it will quote them on calls instead of guessing.
            </p>
          )}
          {sources.map((s) => (
            <SourceRow
              key={s.id}
              source={s}
              onToggle={(attached) => onSourcesChange(sources.map((x) => (x.id === s.id ? { ...x, attached } : x)))}
            />
          ))}
          <div className="py-5">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
              <div className="min-w-0 flex-1">
                <label htmlFor={`${id}-url`} className="sr-only">
                  Add a web page by URL
                </label>
                <Input
                  id={`${id}-url`}
                  name="knowledgeUrl"
                  type="url"
                  inputMode="url"
                  value={url}
                  onChange={(e) => {
                    setUrl(e.target.value);
                    if (urlError) setUrlError(null);
                  }}
                  onKeyDown={onUrlKey}
                  aria-invalid={!!urlError || undefined}
                  aria-describedby={urlError ? `${id}-url-err` : undefined}
                  placeholder="Paste a URL and press Enter…"
                />
                <FieldError id={`${id}-url-err`}>{urlError}</FieldError>
              </div>
              <input
                ref={fileRef}
                id={`${id}-file`}
                name="knowledgeFile"
                type="file"
                accept=".pdf,application/pdf"
                multiple
                className="sr-only"
                tabIndex={-1}
                aria-label="Upload PDF"
                onChange={onFiles}
              />
              <Button variant="secondary" className="gap-1.5" onClick={() => fileRef.current?.click()}>
                <Icon name="file" className="size-4" />
                Upload PDF
              </Button>
              <Button
                variant="secondary"
                className="gap-1.5"
                onClick={() => setAddingText((v) => !v)}
                aria-expanded={addingText}
              >
                <Icon name="plus" className="size-4" />
                Add text
              </Button>
            </div>
            {addingText && (
              <form
                onSubmit={submitText}
                noValidate
                aria-label="Add a text knowledge source"
                className="mt-3 flex flex-col gap-3 rounded-lg border border-ink-950/10 bg-paper-50 p-4"
              >
                <div>
                  <FieldLabel htmlFor={`${id}-text-title`} required>
                    Title
                  </FieldLabel>
                  <Input
                    id={`${id}-text-title`}
                    name="knowledgeTextTitle"
                    autoFocus
                    value={textTitle}
                    onChange={(e) => setTextTitle(e.target.value)}
                    aria-invalid={!!textTitleErr || undefined}
                    aria-describedby={textTitleErr ? `${id}-text-title-err` : undefined}
                    placeholder="e.g. Office hours & holiday schedule"
                  />
                  <FieldError id={`${id}-text-title-err`}>{textTitleErr}</FieldError>
                </div>
                <div>
                  <FieldLabel htmlFor={`${id}-text-body`} required>
                    Text
                  </FieldLabel>
                  <Textarea
                    id={`${id}-text-body`}
                    name="knowledgeTextBody"
                    rows={5}
                    value={textBody}
                    onChange={(e) => setTextBody(e.target.value)}
                    aria-invalid={!!textBodyErr || undefined}
                    aria-describedby={textBodyErr ? `${id}-text-body-err` : undefined}
                    placeholder="Paste hours, prices, policies, or anything else this agent should know…"
                  />
                  <FieldError id={`${id}-text-body-err`}>{textBodyErr}</FieldError>
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setAddingText(false);
                      setTextTitle("");
                      setTextBody("");
                      setTextSubmitted(false);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" size="sm">
                    Save text
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      }
      advanced={
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <RadioCard
            selected={answerStyleOf(settings) === "quick"}
            onSelect={() => onSettingsChange?.(knowledgeAnswerStylePresets.quick)}
            title="Quick answers"
            description="Short, fast lookups. Best for FAQs and simple info."
          />
          <RadioCard
            selected={answerStyleOf(settings) === "thorough"}
            onSelect={() => onSettingsChange?.(knowledgeAnswerStylePresets.thorough)}
            title="Thorough search"
            description="Reads more of your documents per question. Best for long manuals or detailed policies."
          />
        </div>
      }
    />
    </div>
  );
}

/** The facts callers ask about most. The agent quotes only what is listed here. */
function BusinessDetailsCard({ details, onChange }: { details: BusinessDetails; onChange: (next: BusinessDetails) => void }) {
  const id = useId();
  const rows = details.offerings.length ? details.offerings : [{ id: newId("off"), name: "", price: "" }];
  const setRows = (offerings: Offering[]) => onChange({ ...details, offerings });
  const patch = (offId: string, p: Partial<Offering>) => setRows(rows.map((r) => (r.id === offId ? { ...r, ...p } : r)));
  return (
    <SectionCard
      title="Business details"
      description="Products, prices and hours. The agent quotes only what is listed and hands off the rest."
      guided={
        <div className="flex flex-col gap-5 py-1">
          <fieldset>
            <legend className="mb-1.5 text-[14px] font-medium text-ink-900">Products or services</legend>
            <ul className="flex flex-col gap-2">
              {rows.map((o, i) => (
                <li key={o.id} className="flex items-center gap-2">
                  <Input aria-label={`Offering ${i + 1} name`} value={o.name} onChange={(e) => patch(o.id, { name: e.target.value })} placeholder="Product or service" className="min-w-0 flex-1" />
                  <Input aria-label={`Offering ${i + 1} price`} value={o.price ?? ""} onChange={(e) => patch(o.id, { price: e.target.value })} placeholder="Price" className="w-28 shrink-0" />
                  <button
                    type="button"
                    aria-label={`Remove offering ${i + 1}`}
                    onClick={() => setRows(rows.filter((r) => r.id !== o.id))}
                    className="flex size-8 shrink-0 items-center justify-center rounded-md text-ink-500 outline-none hover:bg-paper-100 hover:text-ink-900 focus-visible:ring-2 focus-visible:ring-brand-500/30"
                  >
                    <Icon name="x" className="size-4" />
                  </button>
                </li>
              ))}
            </ul>
            <button type="button" onClick={() => setRows([...rows, { id: newId("off"), name: "", price: "" }])} className="mt-2 rounded-md px-1 py-1 text-[14px] font-medium text-ink-700 outline-none hover:text-ink-950 focus-visible:ring-2 focus-visible:ring-brand-500/30">
              + Add another
            </button>
          </fieldset>
          <fieldset>
            <legend className="mb-1.5 text-[14px] font-medium text-ink-900">Questions callers ask</legend>
            <ul className="flex flex-col gap-3">
              {(details.faqs ?? []).map((f, i) => (
                <li key={f.id} className="flex items-start gap-2">
                  <div className="flex min-w-0 flex-1 flex-col gap-2">
                    <Input aria-label={`Question ${i + 1}`} value={f.question} onChange={(e) => onChange({ ...details, faqs: (details.faqs ?? []).map((x) => (x.id === f.id ? { ...x, question: e.target.value } : x)) })} placeholder="Question callers ask" />
                    <Input aria-label={`Answer ${i + 1}`} value={f.answer} onChange={(e) => onChange({ ...details, faqs: (details.faqs ?? []).map((x) => (x.id === f.id ? { ...x, answer: e.target.value } : x)) })} placeholder="Your answer" />
                  </div>
                  <button type="button" aria-label={`Remove question ${i + 1}`} onClick={() => onChange({ ...details, faqs: (details.faqs ?? []).filter((x) => x.id !== f.id) })} className="flex size-8 shrink-0 items-center justify-center rounded-md text-ink-500 outline-none hover:bg-paper-100 hover:text-ink-900 focus-visible:ring-2 focus-visible:ring-brand-500/30">
                    <Icon name="x" className="size-4" />
                  </button>
                </li>
              ))}
            </ul>
            <button type="button" onClick={() => onChange({ ...details, faqs: [...(details.faqs ?? []), { id: newId("faq"), question: "", answer: "" }] })} className="mt-2 rounded-md px-1 py-1 text-[14px] font-medium text-ink-700 outline-none hover:text-ink-950 focus-visible:ring-2 focus-visible:ring-brand-500/30">
              + Add a question
            </button>
          </fieldset>
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <FieldLabel htmlFor={`${id}-hours`}>Opening hours</FieldLabel>
              <Input id={`${id}-hours`} value={details.hours ?? ""} onChange={(e) => onChange({ ...details, hours: e.target.value })} placeholder="Days and times" />
            </div>
            <div>
              <FieldLabel htmlFor={`${id}-handoff`}>If it can’t help, who follows up?</FieldLabel>
              <Input id={`${id}-handoff`} value={details.handoff ?? ""} onChange={(e) => onChange({ ...details, handoff: e.target.value })} placeholder="Name, team or phone number" />
            </div>
          </div>
        </div>
      }
    />
  );
}
