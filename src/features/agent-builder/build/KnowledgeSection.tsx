import { useId, useRef, useState, type ChangeEvent, type KeyboardEvent } from "react";
import { Button } from "@/components/ui/Button";
import { FieldError, Input } from "@/components/ui/Field";
import { Icon, type IconName } from "@/components/ui/Icon";
import { RadioCard } from "@/components/ui/RadioCard";
import { SectionCard } from "@/components/ui/SectionCard";
import { Switch } from "@/components/ui/Switch";
import { newId } from "@/lib/useControllable";
import type { KnowledgeSettings, KnowledgeSource } from "@/lib/types";

const kindIcon: Record<KnowledgeSource["kind"], IconName> = {
  pdf: "file",
  url: "link",
  text: "file",
};

/**
 * "Chunk size" / "top-k" are raw RAG internals with no actionable meaning to
 * any user — nobody, technical or not, can reason about "800 tokens" without
 * already knowing how this agent's retrieval is implemented. These two
 * presets give the same underlying tuning as an outcome instead.
 */
export const knowledgeAnswerStylePresets = {
  quick: { chunkSize: 500, topK: 3 },
  thorough: { chunkSize: 1200, topK: 6 },
} satisfies Record<string, KnowledgeSettings>;

export type KnowledgeAnswerStyle = keyof typeof knowledgeAnswerStylePresets;

export const defaultKnowledgeSettings: KnowledgeSettings = knowledgeAnswerStylePresets.quick;

/** Settings from before this preset existed won't match either exactly — nearest by topK. */
function answerStyleOf(settings: KnowledgeSettings): KnowledgeAnswerStyle {
  return settings.topK >= 5 ? "thorough" : "quick";
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
  return (
    <div className="flex items-center gap-3 px-6 py-3">
      <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-paper-100 text-ink-500">
        <Icon name={kindIcon[source.kind]} className="size-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13.5px] font-medium text-ink-950">{source.name}</p>
        <p className="text-[12.5px] text-ink-500">
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
}: {
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
    <SectionCard
      title="Knowledge"
      description="Your business info this agent can answer from, like hours, prices or an FAQ page."
      defaultAdvancedOpen={defaultAdvanced}
      guided={
        <div className="-mx-6 -mb-6 mt-1 divide-y divide-ink-950/8 border-t border-ink-950/8">
          {sources.length === 0 && (
            <p className="px-6 py-5 text-[13px] text-ink-500">
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
          <div className="px-6 py-5">
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
            </div>
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
  );
}
