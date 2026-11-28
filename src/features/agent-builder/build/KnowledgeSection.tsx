import { useId, useRef, useState, type ChangeEvent, type FormEvent, type KeyboardEvent } from "react";
import { Button } from "@/components/ui/Button";
import { FieldError, FieldLabel, Input, Textarea } from "@/components/ui/Field";
import { Icon, type IconName } from "@/components/ui/Icon";
import { RadioCard } from "@/components/ui/RadioCard";
import { Drawer, Section } from "@/components/ui/PanelCard";
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

function SourceRow({ source, onToggle, onRemove }: { source: KnowledgeSource; onToggle: (attached: boolean) => void; onRemove: () => void }) {
  const { base, ext } = source.kind === "url" ? { base: source.name, ext: "" } : splitFileName(source.name);
  const [confirming, setConfirming] = useState(false);
  return (
    <li className="flex items-start gap-4 py-5">
      <span
        className={`flex size-11 shrink-0 items-center justify-center rounded-xl ${
          source.attached ? "bg-brand-600 text-lime-300" : "text-tertiary ring-1 ring-inset ring-ink-950/20"
        }`}
      >
        <Icon name={kindIcon[source.kind]} className="size-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className={`flex min-w-0 text-md font-semibold ${source.attached ? "text-primary" : "text-tertiary"}`}>
          <span className="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap">{base}</span>
          {ext && <span className="shrink-0">{ext}</span>}
        </p>
        <p className="mt-0.5 text-sm text-tertiary">
          {source.kind === "url" ? "Web page" : `${source.kind.toUpperCase()} · ${source.sizeLabel}`}
          {!source.attached && ". Not used on calls."}
        </p>
        <div className="mt-1 flex h-9 items-center gap-1">
          {confirming ? (
            <div role="alertdialog" aria-label={`Remove ${source.name}?`} className="flex items-center gap-3">
              <span className="text-sm font-medium text-terracotta-500">Remove this source?</span>
              <Button size="sm" variant="ghost" onClick={() => setConfirming(false)}>
                Keep it
              </Button>
              <Button size="sm" variant="destructive" onClick={onRemove}>
                Remove
              </Button>
            </div>
          ) : (
            <Button size="sm" variant="ghost" className="-ml-2.5" onClick={() => setConfirming(true)} aria-label={`Remove source: ${source.name}`}>
              Remove
            </Button>
          )}
        </div>
      </div>
      <Switch checked={source.attached} onChange={onToggle} label={`Use on calls: ${source.name}`} />
    </li>
  );
}

export function KnowledgeSection({
  sources,
  onSourcesChange,
  settings = defaultKnowledgeSettings,
  onSettingsChange,
  details,
  onDetailsChange,
  outbound,
}: {
  outbound?: boolean;
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
  const [panel, setPanel] = useState<"web" | "text" | "details" | null>(null);
  const [textTitle, setTextTitle] = useState("");
  const [textBody, setTextBody] = useState("");
  const [textSubmitted, setTextSubmitted] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);

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
    setPanel(null);
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
    setPanel(null);
  };

  const isPdf = (f: File) => f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf");

  const addFiles = (files: File[]) => {
    const pdfs = files.filter(isPdf);
    setFileError(
      pdfs.length < files.length
        ? "Only PDF files can be uploaded. Use Add text for anything else."
        : null,
    );
    if (pdfs.length === 0) return;
    onSourcesChange([
      ...sources,
      ...pdfs.map<KnowledgeSource>((f) => ({
        id: newId("kb"),
        name: f.name,
        kind: "pdf",
        sizeLabel: formatBytes(f.size),
        attached: true,
      })),
    ]);
  };

  const onFiles = (e: ChangeEvent<HTMLInputElement>) => {
    addFiles(Array.from(e.target.files ?? []));
    // Reset so picking the same file again still fires onChange.
    e.target.value = "";
  };

  const list = (details ?? { offerings: [] }) as BusinessDetails;
  const nProducts = list.offerings.filter((o) => o.name.trim()).length;
  const nFaqs = (list.faqs ?? []).filter((f) => f.question.trim()).length;
  const detailRows: { label: string; value: string }[] = [
    { label: "Products or services", value: nProducts ? `${nProducts} listed` : "None yet" },
    { label: outbound ? "Questions people may ask" : "Questions callers ask", value: nFaqs ? `${nFaqs} answered` : "None yet" },
    { label: "Opening hours", value: list.hours?.trim() || "Not set" },
    { label: "If it can’t help", value: list.handoff?.trim() || "Not set" },
  ];
  const closePanel = () => {
    setPanel(null);
    setUrlError(null);
    setTextSubmitted(false);
  };
  const addButtons = (
    <div className="flex flex-wrap items-center gap-2">
      <Button className="gap-2 rounded-full" onClick={() => fileRef.current?.click()}>
        <Icon name="file" className="size-4" />
        Upload PDF
      </Button>
      <Button variant="secondary" className="gap-2 rounded-full" onClick={() => setPanel("web")}>
        <Icon name="link" className="size-4" />
        Add a web page
      </Button>
      <Button variant="secondary" className="gap-2 rounded-full" onClick={() => setPanel("text")}>
        <Icon name="plus" className="size-4" />
        Add text
      </Button>
    </div>
  );

  return (
    <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(340px,440px)] xl:gap-10">
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
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          addFiles(Array.from(e.dataTransfer.files));
        }}
        className={dragging ? "rounded-2xl outline-2 -outline-offset-2 outline-dashed outline-brand-600" : ""}
      >
        <Section
          title="Sources"
          icon="book"
          summary={
            sources.length === 0
              ? "None yet"
              : `${sources.length} ${sources.length === 1 ? "source" : "sources"} · ${sources.filter((x) => x.attached).length} on`
          }
        >
          {sources.length === 0 ? (
            <p className="py-6 text-md text-secondary">
              Drop a PDF here, or add a web page or text. With nothing attached, the agent can only answer from its prompt and won’t quote your hours or prices. No documents? Add hours and prices under Business details.
            </p>
          ) : (
            <ul className="divide-y divide-ink-950/10">
              {sources.map((src) => (
                <SourceRow
                  key={src.id}
                  source={src}
                  onToggle={(attached) => onSourcesChange(sources.map((x) => (x.id === src.id ? { ...x, attached } : x)))}
                  onRemove={() => onSourcesChange(sources.filter((x) => x.id !== src.id))}
                />
              ))}
            </ul>
          )}
          <div className="flex min-h-[4.5rem] items-center py-3">{addButtons}</div>
          {fileError && (
            <p role="alert" className="pb-4 text-sm text-terracotta-500">
              {fileError}
            </p>
          )}
        </Section>
      </div>

      <aside className="xl:sticky xl:top-0">
        {onDetailsChange && (
          <Section
            title="Business details"
            icon="info"
            summary={nProducts || nFaqs || list.hours?.trim() || list.handoff?.trim() ? "Added" : "Optional"}
          >
            <dl className="divide-y divide-ink-950/10">
              {detailRows.map((r) => (
                <div key={r.label} className="flex items-baseline justify-between gap-4 py-3.5">
                  <dt className="text-sm text-tertiary">{r.label}</dt>
                  <dd className="min-w-0 truncate text-right text-md font-medium text-primary">{r.value}</dd>
                </div>
              ))}
            </dl>
            <div className="flex min-h-[4.5rem] items-center">
              <Button variant="secondary" className="rounded-full" onClick={() => setPanel("details")}>
                {nProducts || nFaqs || list.hours?.trim() || list.handoff?.trim() ? "Edit details" : "Add details"}
              </Button>
            </div>
          </Section>
        )}
        {sources.length > 0 && (
          <Section title="Answer style" icon="sparkles" summary={answerStyleOf(settings) === "quick" ? "Quick" : "Thorough"}>
            <div className="flex flex-col gap-3 py-5">
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
          </Section>
        )}
      </aside>

      {panel === "web" && (
        <Drawer title="Add a web page" onClose={closePanel} padBottom={false}>
          <div className="py-6">
            <FieldLabel htmlFor={`${id}-url`}>Web address</FieldLabel>
            <div className="flex gap-2">
              <div className="min-w-0 flex-1">
                <Input
                  id={`${id}-url`}
                  name="knowledgeUrl"
                  type="url"
                  inputMode="url"
                  autoFocus
                  value={url}
                  onChange={(e) => {
                    setUrl(e.target.value);
                    if (urlError) setUrlError(null);
                  }}
                  onKeyDown={onUrlKey}
                  aria-invalid={!!urlError || undefined}
                  aria-describedby={urlError ? `${id}-url-err` : undefined}
                  placeholder="example.com/faq"
                />
              </div>
              <Button onClick={addUrl}>Add</Button>
            </div>
            <FieldError id={`${id}-url-err`}>{urlError}</FieldError>
          </div>
        </Drawer>
      )}
      {panel === "text" && (
        <Drawer title="Add text" onClose={closePanel} padBottom={false}>
          <form onSubmit={submitText} noValidate aria-label="Add a text knowledge source" className="flex flex-col gap-4 py-6">
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
                rows={8}
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
                variant="ghost"
                onClick={() => {
                  closePanel();
                  setTextTitle("");
                  setTextBody("");
                }}
              >
                Cancel
              </Button>
              <Button type="submit">Save text</Button>
            </div>
          </form>
        </Drawer>
      )}
      {panel === "details" && onDetailsChange && (
        <Drawer title="Business details" onClose={closePanel} padBottom={false}>
          <BusinessDetailsForm details={details ?? { offerings: [] }} onChange={onDetailsChange} outbound={outbound} />
        </Drawer>
      )}
    </div>
  );
}

/** The facts callers ask about most. The agent quotes only what is listed here. */
function BusinessDetailsForm({ details, onChange, outbound }: { details: BusinessDetails; onChange: (next: BusinessDetails) => void; outbound?: boolean }) {
  const id = useId();
  const rows = details.offerings.length ? details.offerings : [{ id: newId("off"), name: "", price: "" }];
  const setRows = (offerings: Offering[]) => onChange({ ...details, offerings });
  const patch = (offId: string, p: Partial<Offering>) => setRows(rows.map((r) => (r.id === offId ? { ...r, ...p } : r)));
  return (
    <div className="py-6">
          <div className="flex flex-col gap-8">
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
                      className="flex size-10 shrink-0 items-center justify-center rounded-lg text-ink-500 outline-none hover:bg-paper-100 hover:text-ink-900 focus-visible:ring-2 focus-visible:ring-brand-500/30"
                    >
                      <Icon name="x" className="size-4" />
                    </button>
                  </li>
                ))}
              </ul>
              <button type="button" onClick={() => setRows([...rows, { id: newId("off"), name: "", price: "" }])} className="mt-2 inline-flex min-h-10 items-center gap-1.5 rounded-lg px-2.5 text-[14px] font-medium text-brand-700 outline-none hover:bg-paper-100 focus-visible:ring-2 focus-visible:ring-brand-500/30">
                <Icon name="plus" className="size-4" />
                Add another
              </button>
            </fieldset>
            <fieldset>
              <legend className="mb-1.5 text-[14px] font-medium text-ink-900">{outbound ? "Questions people may ask" : "Questions callers ask"}</legend>
              <ul className="flex flex-col gap-3">
                {(details.faqs ?? []).map((f, i) => (
                  <li key={f.id} className="flex items-start gap-2">
                    <div className="flex min-w-0 flex-1 flex-col gap-2">
                      <Input aria-label={`Question ${i + 1}`} value={f.question} onChange={(e) => onChange({ ...details, faqs: (details.faqs ?? []).map((x) => (x.id === f.id ? { ...x, question: e.target.value } : x)) })} placeholder={outbound ? "Question people may ask" : "Question callers ask"} />
                      <Input aria-label={`Answer ${i + 1}`} value={f.answer} onChange={(e) => onChange({ ...details, faqs: (details.faqs ?? []).map((x) => (x.id === f.id ? { ...x, answer: e.target.value } : x)) })} placeholder="Your answer" />
                    </div>
                    <button type="button" aria-label={`Remove question ${i + 1}`} onClick={() => onChange({ ...details, faqs: (details.faqs ?? []).filter((x) => x.id !== f.id) })} className="flex size-10 shrink-0 items-center justify-center rounded-lg text-ink-500 outline-none hover:bg-paper-100 hover:text-ink-900 focus-visible:ring-2 focus-visible:ring-brand-500/30">
                      <Icon name="x" className="size-4" />
                    </button>
                  </li>
                ))}
              </ul>
              <button type="button" onClick={() => onChange({ ...details, faqs: [...(details.faqs ?? []), { id: newId("faq"), question: "", answer: "" }] })} className="mt-2 inline-flex min-h-10 items-center gap-1.5 rounded-lg px-2.5 text-[14px] font-medium text-brand-700 outline-none hover:bg-paper-100 focus-visible:ring-2 focus-visible:ring-brand-500/30">
                <Icon name="plus" className="size-4" />
                Add a question
              </button>
            </fieldset>
            <div className="grid gap-5 border-t border-ink-950/10 pt-6 sm:grid-cols-2">
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
    </div>
  );
}
