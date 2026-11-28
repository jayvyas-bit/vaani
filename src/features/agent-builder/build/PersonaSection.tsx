import { useEffect, useId, useState, type ReactNode } from "react";
import { FieldError, Input, Textarea } from "@/components/ui/Field";
import { Radio, RadioGroup } from "react-aria-components";
import { Icon } from "@/components/ui/Icon";
import { Drawer, Section } from "@/components/ui/PanelCard";
import { Slider } from "@/components/ui/Slider";
import { VoiceWaveform } from "@/components/ui/VoiceWaveform";
import { Switch } from "@/components/ui/Switch";
import { LanguagePicker } from "@/components/ui/LanguagePicker";
import {
  languageSummary,
  canonicalVoice,
  businessNameOf,
  cleanBusinessName,
  languagesOf,
  toneBand,
  toneBandLabel,
  voiceOptions,
  voiceFirstName,
} from "@/lib/persona";
import {
  llmOptions,
  moreLlmOptions,
  moreSttOptions,
  moreTtsOptions,
  llmRateMultiplier,
  llmTradeoff,
  sttOptions,
  sttRateMultiplier,
  sttTradeoff,
  ttsOptions,
  ttsRateMultiplier,
  ttsTradeoff,
} from "@/lib/providers";
import type { Agent, SafetyToggle } from "@/lib/types";

function withCurrent(options: string[], current: string) {
  return options.includes(current) ? options : [current, ...options];
}

/** "System default (Deepgram Nova-3)" -> "Deepgram Nova-3". */
function shortProvider(option: string) {
  return option.match(/\(([^)]+)\)/)?.[1] ?? option;
}

/** The leading label: "Fast & inexpensive (GPT-4.1 mini)" -> "Fast & inexpensive". */
function optionTitle(option: string) {
  return option.replace(/\s*\([^)]*\)\s*$/, "").replace(/ — /, ", ");
}

function costLabel(multiplier: number | undefined) {
  if (multiplier === undefined) return "Cost not set";
  return multiplier === 1 ? "Standard rate" : `${multiplier}x the standard rate`;
}

interface PickerItem {
  title: string;
  meta?: string;
  detail?: string;
  trailing?: string;
}

/**
 * The one control for any list that can grow (voices, models, speech engines).
 * Closed: a single row with the current pick. Open: a searchable list, current
 * pick and recommended options first. Six options or sixty look the same.
 */
function Picker({
  ariaLabel,
  value,
  options,
  moreOptions = [],
  describe,
  onChange,
  onPreview,
  previewingKey,
  note,
}: {
  ariaLabel: string;
  value: string;
  options: string[];
  /** Extra choices beyond the recommended set. */
  moreOptions?: string[];
  describe: (option: string) => PickerItem;
  onChange: (v: string) => void;
  /** When set, each row gets a play button. */
  onPreview?: (option: string) => void;
  previewingKey?: string | null;
  note?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const listId = useId();
  const q = query.trim().toLowerCase();
  const all = [
    ...withCurrent(options, value),
    ...moreOptions.filter((o) => o !== value && !options.includes(o)),
  ];
  const found = all.filter((o) => !q || o.toLowerCase().includes(q));
  const cur = describe(value);

  const play = (o: string, selected: boolean) => {
    const playing = previewingKey === o;
    return (
      onPreview && (
        <button
          type="button"
          onClick={() => onPreview(o)}
          aria-pressed={playing}
          aria-label={`${playing ? "Stop" : "Hear"} ${describe(o).title}`}
          className={`flex size-11 shrink-0 items-center justify-center rounded-full outline-focus-ring focus-visible:outline-2 focus-visible:outline-offset-2 ${selected || playing ? "bg-lime-400 text-brand-900 hover:bg-lime-300" : "bg-brand-600 text-white hover:bg-brand-700"}`}
        >
          <Icon name={playing ? "x" : "play"} className="size-4" />
        </button>
      )
    );
  };

  return (
    <div
      className="relative"
      onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
    >
      <div className="flex items-center gap-3 rounded-xl bg-paper-0 p-1.5 ring-1 ring-inset ring-ink-950/15">
        {play(value, true)}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls={listId}
          aria-label={`${ariaLabel}: ${cur.title}. ${open ? "Close" : "Change"}`}
          className="flex min-h-11 min-w-0 flex-1 items-center justify-between gap-3 rounded-lg px-2 text-left outline-focus-ring hover:bg-primary_hover focus-visible:outline-2"
        >
          <span className="min-w-0">
            <span className="block truncate text-md font-semibold text-primary">
              {cur.title}
            </span>
            {cur.meta && (
              <span className="block truncate text-sm text-tertiary">
                {cur.meta}
              </span>
            )}
          </span>
          <span className="flex shrink-0 items-center gap-2 text-sm text-tertiary">
            {cur.trailing && (
              <span className="hidden tabular-nums sm:inline">
                {cur.trailing}
              </span>
            )}
            <span className="font-semibold text-secondary">Change</span>
            <Icon
              name="chevron-down"
              className={`size-4 text-fg-quaternary transition-transform ${open ? "rotate-180" : ""}`}
            />
          </span>
        </button>
      </div>
      {open && (
        <>
          <div
            className="fixed inset-0 z-30"
            onMouseDown={() => setOpen(false)}
          />
          <div
            id={listId}
            className="absolute inset-x-0 top-full z-40 mt-1.5 overflow-hidden rounded-xl bg-paper-0 shadow-lg ring-1 ring-ink-950/15"
          >
            <RadioGroup
              aria-label={ariaLabel}
              value={value}
              onChange={(v) => {
                onChange(v);
                setOpen(false);
              }}
            >
              {all.length > 6 && (
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={`Search ${all.length} options`}
                  aria-label={`Search ${ariaLabel}`}
                  className="h-11 w-full border-b border-ink-950/10 bg-transparent px-4 text-md text-primary outline-none placeholder:text-tertiary focus-visible:bg-primary_hover"
                />
              )}
              <div className="max-h-80 overflow-y-auto p-1.5">
                {found.map((o) => {
                  const d = describe(o);
                  return (
                    <div key={o} className="flex items-center gap-2">
                      {play(o, false)}
                      <Radio
                        value={o}
                        className={({ isSelected }) =>
                          `flex min-h-12 min-w-0 flex-1 cursor-pointer items-center justify-between gap-3 rounded-lg px-3 py-2 outline-focus-ring focus-visible:outline-2 ${isSelected ? "bg-brand-600 text-white" : "hover:bg-primary_hover"}`
                        }
                      >
                        {({ isSelected }) => (
                          <>
                            <span className="min-w-0">
                              <span className="block truncate text-md font-medium">
                                {d.title}
                                {d.meta && (
                                  <span
                                    className={`font-normal ${isSelected ? "text-lime-300" : "text-tertiary"}`}
                                  >
                                    {" "}
                                    · {d.meta}
                                  </span>
                                )}
                              </span>
                              {d.detail && (
                                <span
                                  className={`block text-sm ${isSelected ? "text-white/70" : "text-tertiary"}`}
                                >
                                  {d.detail}
                                </span>
                              )}
                            </span>
                            {d.trailing && (
                              <span
                                className={`shrink-0 text-sm tabular-nums ${isSelected ? "text-lime-300" : "text-tertiary"}`}
                              >
                                {d.trailing}
                              </span>
                            )}
                          </>
                        )}
                      </Radio>
                    </div>
                  );
                })}
                {found.length === 0 && (
                  <p className="px-3 py-4 text-sm text-tertiary">
                    No match for “{query}”.
                  </p>
                )}
              </div>
            </RadioGroup>
            {note && (
              <p className="border-t border-ink-950/10 px-4 py-3 text-sm text-tertiary">
                {note}
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}

/**
 * Voices stay on screen as a library: play, compare, pick. Search appears once
 * the list outgrows the viewport, and the list scrolls inside its own frame.
 */
/** A two-tone gradient per voice, spread around the colour wheel by position so no two neighbours match. */
function voiceOrb(index: number) {
  const h = (index * 137 + 12) % 360;
  return `radial-gradient(circle at 30% 25%, hsl(${h} 70% 78%), hsl(${(h + 50) % 360} 60% 45%))`;
}

function VoiceLibrary({
  value,
  options,
  onChange,
  onPreview,
  previewingKey,
}: {
  value: string;
  options: string[];
  onChange: (v: string) => void;
  onPreview?: (v: string) => void;
  previewingKey: string | null;
}) {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const found = options.filter((o) => !q || o.toLowerCase().includes(q));
  return (
    <div>
      {options.length > 6 && (
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={`Search ${options.length} voices`}
          aria-label="Search voices"
          className="mb-3 h-11 w-full rounded-xl bg-paper-0 px-4 text-md text-primary ring-1 ring-inset ring-ink-950/15 outline-none placeholder:text-tertiary focus-visible:ring-2 focus-visible:ring-brand-600"
        />
      )}
      <RadioGroup
        aria-label="Voice"
        value={value}
        onChange={onChange}
        className="grid max-h-[26rem] gap-2.5 overflow-y-auto p-0.5 sm:grid-cols-2"
      >
        {found.map((v) => {
          const [name, ...rest] = v.split(" — ");
          const playing = previewingKey === v;
          return (
            <div
              key={v}
              className="group flex h-20 items-center gap-3 rounded-xl bg-paper-0 px-3 ring-1 ring-inset ring-ink-950/15 transition-colors hover:ring-ink-950/30 has-[[data-selected]]:bg-brand-600 has-[[data-selected]]:ring-brand-600"
            >
              <span
                aria-hidden="true"
                className="size-11 shrink-0 rounded-full ring-2 ring-inset ring-white/60"
                style={{ background: voiceOrb(options.indexOf(v)) }}
              />
              <Radio
                value={v}
                className="flex min-h-11 min-w-0 flex-1 cursor-pointer items-center rounded-lg outline-focus-ring focus-visible:outline-2"
              >
                <span className="min-w-0" title={rest.join(" — ")}>
                  <span className="flex items-center gap-1.5 text-md font-semibold text-primary group-has-[[data-selected]]:text-white">
                    <span className="truncate">{name}</span>
                    <Icon
                      name="check"
                      className="hidden size-4 shrink-0 text-lime-300 group-has-[[data-selected]]:block"
                      strokeWidth={3}
                    />
                  </span>
                  <span className="line-clamp-2 text-sm leading-snug text-tertiary group-has-[[data-selected]]:text-white/75">
                    {rest.join(" — ")}
                  </span>
                </span>
              </Radio>
              {onPreview && (
                <button
                  type="button"
                  onClick={() => onPreview(v)}
                  aria-pressed={playing}
                  aria-label={`${playing ? "Stop" : "Hear"} ${name}`}
                  className="flex size-11 shrink-0 items-center justify-center rounded-full bg-brand-600 text-white outline-focus-ring hover:bg-brand-700 focus-visible:outline-2 focus-visible:outline-offset-2 group-has-[[data-selected]]:bg-lime-400 group-has-[[data-selected]]:text-brand-900 group-has-[[data-selected]]:hover:bg-lime-300 aria-pressed:bg-lime-400 aria-pressed:text-brand-900"
                >
                  <Icon name={playing ? "x" : "play"} className="size-4" />
                </button>
              )}
            </div>
          );
        })}
        {found.length === 0 && (
          <p className="px-4 py-4 text-sm text-tertiary">
            No match for “{query}”.
          </p>
        )}
      </RadioGroup>
    </div>
  );
}

const modelNote =
  "“Cost not set” models are counted at the default rate in the estimate. Confirm each is enabled for your account before going live.";

const describeModel =
  (tradeoff: Record<string, string>, rates: Record<string, number>) =>
  (o: string): PickerItem => ({
    title: optionTitle(o),
    meta: shortProvider(o),
    detail: tradeoff[o],
    trailing: costLabel(rates[o]),
  });

const tonePresets: {
  band: ReturnType<typeof toneBand>;
  label: string;
  value: number;
}[] = [
  { band: "formal", label: "Formal", value: 20 },
  { band: "balanced", label: "Balanced", value: 50 },
  { band: "warm", label: "Warm", value: 80 },
];

function CompiledNote({
  custom,
  onDark = false,
  onRegenerate,
}: {
  custom?: boolean;
  /** Renders for the teal opening-line panel. */
  onDark?: boolean;
  onRegenerate: () => void;
}) {
  return (
    <div
      className={`mt-1.5 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-sm ${onDark ? "text-white/80" : "text-tertiary"}`}
    >
      <span>
        {custom
          ? `Edited by hand. Tone changes won’t rewrite it.`
          : `Generated from your settings. Edit freely.`}
      </span>
      {custom && (
        <button
          type="button"
          onClick={onRegenerate}
          className={`font-medium underline underline-offset-[0.2em] ${onDark ? "text-white hover:text-lime-300" : "text-primary hover:text-secondary"}`}
        >
          Reset to generated
        </button>
      )}
    </div>
  );
}

/** Every setting: label and one-line hint on the left, the control on the right. */
function Row({
  label,
  hint,
  htmlFor,
  labelId,
  hintError = false,
  stacked = false,
  children,
}: {
  label: string;
  hint?: string;
  htmlFor?: string;
  labelId?: string;
  /** Turns the hint into a required-field message without changing the row height. */
  hintError?: boolean;
  /** Control sits under the label at full width. */
  stacked?: boolean;
  children: ReactNode;
}) {
  const Label = htmlFor ? "label" : "p";
  return (
    <div className={`grid gap-3 py-5 ${stacked ? "" : "sm:grid-cols-[200px_minmax(0,1fr)] sm:gap-8"}`}>
      <div>
        <Label
          id={labelId}
          {...(htmlFor ? { htmlFor } : {})}
          className="block text-sm font-semibold text-primary"
        >
          {label}
        </Label>
        {hint && (
          <p className={`mt-0.5 text-sm ${hintError ? "font-medium text-terracotta-500" : "text-tertiary"}`}>
            {hint}
          </p>
        )}
      </div>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

export function PersonaSection({
  agent,
  onChange,
  humor,
  onHumorChange,
}: {
  agent: Agent;
  onChange: (patch: Partial<Agent>) => void;
  defaultAdvanced?: boolean;
  /** The "Allow light humor" setting — a tone choice, so it sits under Tone. */
  humor?: SafetyToggle;
  onHumorChange?: (enabled: boolean) => void;
}) {
  const id = useId();
  const [speakingKey, setSpeakingKey] = useState<string | null>(null);
  const speaking = speakingKey === "greeting";
  const voiceValue = canonicalVoice(agent.voice);
  const canSpeak = typeof window !== "undefined" && "speechSynthesis" in window;
  const band = toneBand(agent.tone);
  const outbound = agent.direction === "outbound";
  const lineName = outbound ? "opening line" : "greeting";
  const suggestedBusinessName = cleanBusinessName(agent.name);

  useEffect(
    () => () => {
      if (canSpeak) window.speechSynthesis.cancel();
    },
    [canSpeak],
  );

  const speak = (key: string, text: string) => {
    if (!canSpeak) return;
    const synth = window.speechSynthesis;
    if (speakingKey === key) {
      synth.cancel();
      setSpeakingKey(null);
      return;
    }
    const u = new SpeechSynthesisUtterance(text);
    // Map tone onto pace so the sample audibly reflects the slider.
    u.rate = band === "formal" ? 0.95 : band === "warm" ? 1.08 : 1;
    u.onend = () => setSpeakingKey(null);
    u.onerror = () => setSpeakingKey(null);
    synth.cancel();
    synth.speak(u);
    setSpeakingKey(key);
  };
  const playSample = () => speak("greeting", agent.greeting);
  const playVoice = (voice: string) =>
    speak(
      `voice:${voice}`,
      `Hi, this is ${voiceFirstName(voice)}. How does this sound?`,
    );

  const greetingEmpty = agent.greeting.trim() === "";
  const greetingLong = agent.greeting.length > 280;
  const businessMissing = (agent.businessName ?? "").trim() === "";
  const [drawer, setDrawer] = useState<"prompt" | "models" | null>(null);
  const orbIndex = Math.max(0, voiceOptions.indexOf(voiceValue));
  const spokenSeconds = (t: string) =>
    Math.max(1, Math.round(t.trim().split(/\s+/).length / 2.5));

  return (
    <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(380px,460px)] xl:gap-10">
      <aside className="xl:sticky xl:top-0 xl:order-2 xl:max-h-[calc(100dvh-9rem)] xl:overflow-y-auto">
        <section
          className="relative overflow-hidden rounded-2xl bg-brand-600 p-6 text-white shadow-sm"
          style={{
            backgroundImage:
              "radial-gradient(90% 70% at 100% 0%, rgb(163 230 53 / 0.22), transparent 60%)",
          }}
        >
          <div className="flex items-center gap-4">
            <span
              aria-hidden="true"
              className="size-16 shrink-0 rounded-full ring-2 ring-white/70"
              style={{ background: voiceOrb(orbIndex) }}
            />
            <div className="min-w-0 flex-1">
              <h2 className="text-xl font-semibold tracking-[-0.01em]">
                {outbound ? "Opening line" : "Greeting"}
              </h2>
              <ul
                className="mt-1 flex flex-wrap gap-x-2 gap-y-0.5"
                aria-label="Current persona"
              >
                {[
                  voiceFirstName(voiceValue),
                  languageSummary(agent),
                  `${toneBandLabel[band]} tone`,
                ].map((chip) => (
                  <li
                    key={chip}
                    className="text-sm text-white/80 [&:not(:last-child)]:after:ml-2 [&:not(:last-child)]:after:content-['·']"
                  >
                    {chip}
                  </li>
                ))}
              </ul>
            </div>
            <VoiceWaveform
              variant={speaking ? "live" : "idle"}
              className="h-8 shrink-0 text-lime-300"
            />
          </div>
          <p className="mt-5 text-sm text-white/70">
            {`The first thing ${outbound ? "recipients" : "callers"} hear. Click the text to edit.`}
          </p>
          <textarea
            id={`${id}-greeting`}
            name="greeting"
            aria-label={outbound ? "Opening line" : "Greeting"}
            aria-invalid={greetingEmpty || undefined}
            aria-describedby={`${id}-greeting-meta`}
            value={agent.greeting}
            maxLength={500}
            onChange={(e) => onChange({ greeting: e.target.value })}
            className="mt-2 block min-h-28 w-full resize-none rounded-2xl rounded-tl-md bg-white/12 px-5 py-4 text-base leading-relaxed text-white ring-1 ring-inset ring-white/25 [field-sizing:content] outline-none placeholder:text-white/40 hover:ring-white/45 focus-visible:ring-2 focus-visible:ring-lime-300"
          />
          <div className="mt-3 flex min-h-11 items-center justify-between gap-3 text-sm">
            <span
              id={`${id}-greeting-meta`}
              role={greetingEmpty ? "alert" : undefined}
              className={`tabular-nums ${greetingEmpty || greetingLong ? "font-medium text-lime-300" : "text-white/80"}`}
            >
              {greetingEmpty
                ? `Write the ${lineName} the agent says first.`
                : `About ${spokenSeconds(agent.greeting)} seconds spoken`}
              {greetingLong ? ". Shorter is easier to listen to." : ""}
            </span>
            {canSpeak && (
              <button
                type="button"
                onClick={playSample}
                aria-pressed={speaking}
                disabled={greetingEmpty && !speaking}
                className="inline-flex h-11 shrink-0 items-center gap-2 rounded-full bg-lime-400 px-5 text-sm font-semibold text-brand-900 outline-focus-ring transition-colors hover:bg-lime-300 focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Icon name={speaking ? "x" : "play"} className="size-4" />
                {speaking ? "Stop" : "Hear it"}
              </button>
            )}
          </div>
          <CompiledNote
            onDark
            custom={agent.greetingCustom}
            onRegenerate={() => onChange({ greetingCustom: false })}
          />
        </section>
        <section className="mt-5 rounded-2xl bg-paper-0 p-6 shadow-xs ring-1 ring-ink-950/10">
          <h3 className="text-md font-semibold text-primary">Persona at a glance</h3>
          <dl className="mt-3 divide-y divide-ink-950/10">
            {[
              ["Works for", businessNameOf(agent)],
              ["Voice", voiceFirstName(voiceValue)],
              ["Language", languageSummary(agent)],
              ["Tone", `${toneBandLabel[band]}${humor ? (humor.enabled ? ", light humor on" : ", no humor") : ""}`],
              ["Instructions", `${agent.promptCustom ? "Edited" : "Generated"}, ${agent.systemPrompt.trim().split(/\s+/).filter(Boolean).length} words`],
              ["Language model", shortProvider(agent.llmProvider)],
            ].map(([k, v]) => (
              <div key={k} className="flex items-baseline justify-between gap-4 py-2.5 text-sm">
                <dt className="text-tertiary">{k}</dt>
                <dd className="min-w-0 truncate text-right font-medium text-primary">{v}</dd>
              </div>
            ))}
          </dl>
        </section>
      </aside>
      <div className="min-w-0 xl:order-1">
        <Section title="Identity" icon="user" summary={businessNameOf(agent)}>
          <Row
            label="Business name"
            hint={
              businessMissing
                ? "Required. Say who the agent works for."
                : `What ${outbound ? "recipients" : "callers"} hear it say it works for.`
            }
            hintError={businessMissing}
            htmlFor={`${id}-business`}
          >
            <Input
              id={`${id}-business`}
              name="businessName"
              autoComplete="organization"
              aria-invalid={businessMissing || undefined}
              value={agent.businessName ?? businessNameOf(agent)}
              placeholder={suggestedBusinessName}
              onChange={(e) => onChange({ businessName: e.target.value })}
            />
          </Row>
          <Row
            label="Agent name (internal)"
            hint="Only you see this. It never appears on calls."
            htmlFor={`${id}-name`}
          >
            <Input
              id={`${id}-name`}
              name="agentName"
              value={agent.name}
              aria-invalid={agent.name.trim() === "" || undefined}
              aria-describedby={
                agent.name.trim() === "" ? `${id}-name-err` : undefined
              }
              onChange={(e) => onChange({ name: e.target.value })}
            />
            <FieldError id={`${id}-name-err`}>
              {agent.name.trim() === "" ? "Give the agent a name." : null}
            </FieldError>
          </Row>
        </Section>

        <Section
          title="Voice and language"
          icon="play"
          summary={`${voiceFirstName(voiceValue)} · ${languageSummary(agent)}`}
        >
          <Row
            stacked
            label="Voice"
            hint={
              canSpeak
                ? "Play a sample. Uses your browser’s voice."
                : "Who the agent sounds like."
            }
          >
            <VoiceLibrary
              value={voiceValue}
              options={withCurrent(voiceOptions, voiceValue)}
              onChange={(v) => onChange({ voice: v })}
              onPreview={canSpeak ? playVoice : undefined}
              previewingKey={
                speakingKey?.startsWith("voice:") ? speakingKey.slice(6) : null
              }
            />
          </Row>
          <Row
            label="Language"
            hint="Voice support isn’t checked."
          >
            <LanguagePicker
              primary={languagesOf(agent).primary}
              extras={languagesOf(agent).extras}
              onChange={(v) =>
                onChange({ language: v.primary, extraLanguages: v.extras })
              }
            />
          </Row>
        </Section>

        <Section title="Personality" icon="sparkles" summary={`${toneBandLabel[band]} tone`}>
          <Row
            label="Tone"
            hint="Pick a preset or fine-tune."
            labelId={`${id}-tone-label`}
          >
            <div
              role="group"
              aria-labelledby={`${id}-tone-label`}
              className="grid grid-cols-3 gap-1 rounded-xl bg-paper-0 p-1 ring-1 ring-inset ring-ink-950/15"
            >
              {tonePresets.map((t) => (
                <button
                  key={t.band}
                  type="button"
                  aria-pressed={band === t.band}
                  onClick={() => onChange({ tone: t.value })}
                  className={`min-h-11 rounded-lg px-3 text-sm font-semibold outline-focus-ring focus-visible:outline-2 ${band === t.band ? "bg-brand-600 text-white" : "text-secondary hover:bg-primary_hover"}`}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <div className="mt-3">
              <Slider
                id={`${id}-tone`}
                name="tone"
                value={agent.tone}
                onChange={(v) => onChange({ tone: v })}
                ariaLabelledBy={`${id}-tone-label`}
                valueText={`${agent.tone}, ${toneBandLabel[band]}`}
              />
            </div>
            {humor && (
              <div className="mt-4 flex items-center gap-3 border-t border-ink-950/10 pt-4">
                <Switch
                  checked={humor.enabled}
                  disabled={humor.locked || !onHumorChange}
                  label={humor.label}
                  onChange={onHumorChange}
                />
                <span
                  aria-hidden="true"
                  onClick={() =>
                    !humor.locked && onHumorChange?.(!humor.enabled)
                  }
                  className="min-w-0 cursor-pointer select-none text-sm text-secondary"
                >
                  <span className="font-medium text-primary">{humor.label}</span>
                  <span className="text-tertiary"> · {humor.enabled ? "On" : "Off"}</span>
                </span>
              </div>
            )}
          </Row>
        </Section>

        <Section title="Advanced" icon="wrench" summary="Instructions and models">
          {[
            {
              key: "prompt" as const,
              label: "Instructions",
              hint: "What the agent follows on every call.",
              value: `${agent.promptCustom ? "Edited" : "Generated"} · ${agent.systemPrompt.trim().split(/\s+/).filter(Boolean).length} words`,
            },
            {
              key: "models" as const,
              label: "Models",
              hint: "Language model, temperature, speech engines.",
              value: shortProvider(agent.llmProvider),
            },
          ].map((r) => (
            <button
              key={r.key}
              type="button"
              onClick={() => setDrawer(r.key)}
              aria-haspopup="dialog"
              className="-mx-6 flex min-h-[4.5rem] w-[calc(100%+3rem)] items-center justify-between gap-4 px-6 text-left outline-focus-ring hover:bg-primary_hover focus-visible:outline-2 focus-visible:-outline-offset-2"
            >
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-primary">{r.label}</span>
                <span className="block truncate text-sm text-tertiary">{r.hint}</span>
              </span>
              <span className="flex shrink-0 items-center gap-2 text-sm font-medium text-secondary">
                <span className="hidden max-w-48 truncate sm:inline">{r.value}</span>
                <Icon name="chevron-right" className="size-4 text-fg-quaternary" />
              </span>
            </button>
          ))}
        </Section>
        {drawer === "prompt" && (
          <Drawer title="Instructions" onClose={() => setDrawer(null)}>
          <Row
            label="System prompt"
            hint="What the agent follows on every call."
            htmlFor={`${id}-prompt`}
          >
            <Textarea
              id={`${id}-prompt`}
              name="systemPrompt"
              rows={8}
              value={agent.systemPrompt}
              onChange={(e) => onChange({ systemPrompt: e.target.value })}
              className="min-h-40 text-md leading-relaxed [field-sizing:content]"
            />
            <CompiledNote
              custom={agent.promptCustom}
              onRegenerate={() => onChange({ promptCustom: false })}
            />
          </Row>
          </Drawer>
        )}
        {drawer === "models" && (
          <Drawer title="Models" onClose={() => setDrawer(null)}>
          <Row label="Language model" hint="Decides what the agent says.">
            <Picker
              ariaLabel="Language model"
              value={agent.llmProvider}
              options={llmOptions}
              moreOptions={moreLlmOptions}
              describe={describeModel(llmTradeoff, llmRateMultiplier)}
              note={modelNote}
              onChange={(v) => onChange({ llmProvider: v })}
            />
          </Row>
          <Row
            label="Temperature"
            hint="Lower is more consistent. Higher is more varied."
            htmlFor={`${id}-temp`}
          >
            <Slider
              id={`${id}-temp`}
              name="temperature"
              value={Math.round(agent.temperature * 10)}
              min={0}
              max={10}
              step={1}
              onChange={(v) => onChange({ temperature: v / 10 })}
              valueText={agent.temperature.toFixed(1)}
              leftLabel="0.0"
              rightLabel="1.0"
            />
          </Row>
          <Row label="Speech-to-text" hint="How the agent hears callers.">
            <Picker
              ariaLabel="Speech-to-text"
              value={agent.sttProvider}
              options={sttOptions}
              moreOptions={moreSttOptions}
              describe={describeModel(sttTradeoff, sttRateMultiplier)}
              note={modelNote}
              onChange={(v) => onChange({ sttProvider: v })}
            />
          </Row>
          <Row label="Text-to-speech" hint="How the agent speaks.">
            <Picker
              ariaLabel="Text-to-speech"
              value={agent.ttsProvider}
              options={ttsOptions}
              moreOptions={moreTtsOptions}
              describe={describeModel(ttsTradeoff, ttsRateMultiplier)}
              note={modelNote}
              onChange={(v) => onChange({ ttsProvider: v })}
            />
          </Row>
          </Drawer>
        )}
      </div>
    </div>
  );
}
