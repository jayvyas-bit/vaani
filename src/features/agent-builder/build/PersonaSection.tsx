import { useEffect, useId, useState } from "react";
import { FieldError, FieldLabel, Input, Select, Textarea } from "@/components/ui/Field";
import { Icon } from "@/components/ui/Icon";
import { SectionCard } from "@/components/ui/SectionCard";
import { Slider } from "@/components/ui/Slider";
import { Switch } from "@/components/ui/Switch";
import { agentLanguageLabel, businessNameOf, cleanBusinessName, languageOf, toneBand, toneBandLabel, voiceOptions } from "@/lib/persona";
import { llmOptions, sttOptions, ttsOptions } from "@/lib/providers";
import type { Agent, AgentLanguage, SafetyToggle } from "@/lib/types";

function withCurrent(options: string[], current: string) {
  return options.includes(current) ? options : [current, ...options];
}

const tonePresets: { band: ReturnType<typeof toneBand>; label: string; value: number }[] = [
  { band: "formal", label: "Formal", value: 20 },
  { band: "balanced", label: "Balanced", value: 50 },
  { band: "warm", label: "Warm", value: 80 },
];

function capitalizeFirst(text: string) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function CompiledNote({
  custom,
  what,
  fromPurpose = true,
  onRegenerate,
}: {
  custom?: boolean;
  what: string;
  /** False where the compiled text genuinely doesn’t draw on the purpose field. */
  fromPurpose?: boolean;
  onRegenerate: () => void;
}) {
  return (
    <div className="mt-1.5 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs text-gray-500">
      <span>
        {custom
          ? `Edited by hand. Tone changes won’t rewrite it.`
          : `${capitalizeFirst(what)} written from the business name, voice, tone${fromPurpose ? " and purpose" : ""}. Edit to customize.`}
      </span>
      {custom && (
        <button
          type="button"
          onClick={onRegenerate}
          className="font-medium text-ink-900 underline underline-offset-[0.2em] hover:text-ink-600"
        >
          Regenerate {what} from fields
        </button>
      )}
    </div>
  );
}

export function PersonaSection({
  agent,
  onChange,
  defaultAdvanced = false,
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
  const [speaking, setSpeaking] = useState(false);
  const canSpeak = typeof window !== "undefined" && "speechSynthesis" in window;
  const band = toneBand(agent.tone);
  const outbound = agent.direction === "outbound";
  const lineName = outbound ? "opening line" : "greeting";
  const suggestedBusinessName = cleanBusinessName(agent.name);

  useEffect(() => () => {
    if (canSpeak) window.speechSynthesis.cancel();
  }, [canSpeak]);

  const playSample = () => {
    if (!canSpeak) return;
    const synth = window.speechSynthesis;
    if (speaking) {
      synth.cancel();
      setSpeaking(false);
      return;
    }
    const u = new SpeechSynthesisUtterance(agent.greeting);
    // Map tone onto pace so the sample audibly reflects the slider.
    u.rate = band === "formal" ? 0.95 : band === "warm" ? 1.08 : 1;
    u.onend = () => setSpeaking(false);
    u.onerror = () => setSpeaking(false);
    synth.cancel();
    synth.speak(u);
    setSpeaking(true);
  };

  return (
    <div className="flex flex-col gap-4">
      <SectionCard
        title="Who this agent is"
        description="How it introduces itself and sounds on the call."
        defaultAdvancedOpen={defaultAdvanced}
        guided={
          <div className="grid gap-x-12 gap-y-6 py-4 lg:grid-cols-2">
            <div className="flex min-w-0 flex-col gap-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <FieldLabel htmlFor={`${id}-name`} required>
                    Agent name
                  </FieldLabel>
                  <Input
                    id={`${id}-name`}
                    name="agentName"
                    value={agent.name}
                    aria-invalid={agent.name.trim() === "" || undefined}
                    aria-describedby={agent.name.trim() === "" ? `${id}-name-err` : undefined}
                    onChange={(e) => onChange({ name: e.target.value })}
                  />
                  <FieldError id={`${id}-name-err`}>{agent.name.trim() === "" ? "Give the agent a name." : null}</FieldError>
                  <p className="mt-1 text-xs text-ink-500">Only you see this.</p>
                </div>
                <div>
                  <FieldLabel htmlFor={`${id}-business`}>Business name</FieldLabel>
                  <Input
                    id={`${id}-business`}
                    name="businessName"
                    autoComplete="organization"
                    value={agent.businessName ?? businessNameOf(agent)}
                    placeholder={suggestedBusinessName}
                    onChange={(e) => onChange({ businessName: e.target.value })}
                  />
                  <p className="mt-1 text-xs text-ink-500">What {outbound ? "recipients" : "callers"} hear.</p>
                </div>
              </div>

              <fieldset>
                <legend className="mb-1.5 text-[13px] font-medium text-ink-900">Language</legend>
                <div className="grid grid-cols-3 gap-1 rounded-md bg-paper-100 p-1">
                  {(Object.entries(agentLanguageLabel) as [AgentLanguage, string][]).map(([value, label]) => (
                    <label key={value} className="relative min-w-0">
                      <input
                        type="radio"
                        name={`${id}-language`}
                        value={value}
                        checked={languageOf(agent) === value}
                        onChange={() => onChange({ language: value })}
                        className="peer sr-only"
                      />
                      <span className="block cursor-pointer truncate rounded px-2 py-1.5 text-center text-[13px] text-ink-600 transition-colors hover:text-ink-950 peer-checked:bg-paper-0 peer-checked:font-medium peer-checked:text-ink-950 peer-checked:shadow-xs peer-focus-visible:ring-2 peer-focus-visible:ring-brand-200">
                        {label.replace(" (bilingual)", "")}
                      </span>
                    </label>
                  ))}
                </div>
                <p className="mt-1.5 text-xs text-ink-500">
                  Changes the agent's instructions only. Voice and speech support isn't checked.
                </p>
              </fieldset>

              <div>
                <div className="mb-1.5 flex items-baseline justify-between gap-3">
                  <span id={`${id}-tone-label`} className="text-[13px] font-medium text-ink-900">
                    Tone
                  </span>
                  <span className="text-xs text-ink-500 tabular-nums">
                    {toneBandLabel[band]} · {agent.tone}
                  </span>
                </div>
                <div role="group" aria-labelledby={`${id}-tone-label`} className="mb-1 flex flex-wrap gap-1.5">
                  {tonePresets.map((t) => {
                    const active = band === t.band;
                    return (
                      <button
                        key={t.band}
                        type="button"
                        aria-pressed={active}
                        onClick={() => onChange({ tone: t.value })}
                        className={`rounded-md border px-3.5 py-1.5 text-[13px] outline-none transition-colors focus-visible:ring-2 focus-visible:ring-brand-200 ${
                          active
                            ? "border-brand-600 bg-brand-600 text-white"
                            : "border-ink-950/45 bg-paper-0 text-ink-700 hover:border-ink-950/70"
                        }`}
                      >
                        {t.label}
                      </button>
                    );
                  })}
                </div>
                <Slider
                  id={`${id}-tone`}
                  name="tone"
                  value={agent.tone}
                  onChange={(v) => onChange({ tone: v })}
                  valueText={`${agent.tone}, ${toneBandLabel[band]}`}
                  leftLabel="Formal & brief"
                  rightLabel="Warm & chatty"
                />
              </div>

              {humor && (
                <div className="flex items-start justify-between gap-4 rounded-md border border-ink-950/15 px-3.5 py-3">
                  <div className="min-w-0">
                    <p className="text-[13px] font-medium text-ink-900">{humor.label}</p>
                    <p className="mt-0.5 text-xs text-ink-500">{humor.description}</p>
                  </div>
                  <Switch
                    checked={humor.enabled}
                    disabled={humor.locked || !onHumorChange}
                    label={humor.label}
                    onChange={onHumorChange}
                  />
                </div>
              )}
            </div>

            <div className="flex min-w-0 flex-col gap-6">
              <fieldset>
                <legend className="mb-1.5 text-[13px] font-medium text-ink-900">Voice</legend>
                <div className="grid gap-2 sm:grid-cols-2">
                  {withCurrent(voiceOptions, agent.voice).map((v) => {
                    const [voiceName, ...rest] = v.split(" — ");
                    const selected = v === agent.voice;
                    return (
                      <div key={v} className="relative">
                        <label className="block">
                          <input
                            type="radio"
                            name={`${id}-voice`}
                            value={v}
                            checked={selected}
                            onChange={() => onChange({ voice: v })}
                            className="peer sr-only"
                          />
                          <span className="flex cursor-pointer items-center gap-2.5 rounded-md border border-ink-950/45 bg-paper-0 py-2.5 pl-2.5 pr-11 transition-colors hover:border-ink-950/70 peer-checked:border-brand-600 peer-checked:bg-paper-50 peer-focus-visible:ring-2 peer-focus-visible:ring-brand-200">
                            <span
                              aria-hidden="true"
                              className={`flex size-8 shrink-0 items-center justify-center rounded-full text-[13px] font-semibold ${
                                selected ? "bg-brand-600 text-white" : "bg-paper-100 text-ink-700"
                              }`}
                            >
                              {voiceName.charAt(0)}
                            </span>
                            <span className="min-w-0">
                              <span className="block truncate text-[13px] font-medium text-ink-950">{voiceName}</span>
                              <span className="block truncate text-xs text-ink-500">{rest.join(" — ")}</span>
                            </span>
                          </span>
                        </label>
                        {selected && canSpeak && (
                          <button
                            type="button"
                            aria-pressed={speaking}
                            aria-label={speaking ? "Stop the sample" : "Play the greeting as a sample"}
                            onClick={playSample}
                            className="absolute right-2 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded-full bg-brand-600 text-white outline-none hover:bg-brand-700 focus-visible:ring-2 focus-visible:ring-brand-200"
                          >
                            <Icon name={speaking ? "x" : "play"} className="size-3.5" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
                {canSpeak && <p className="mt-1.5 text-xs text-ink-500">Play reads the greeting in your browser's voice.</p>}
              </fieldset>

              <div>
                <FieldLabel htmlFor={`${id}-greeting`}>{outbound ? "Opening line" : "Greeting"}</FieldLabel>
                <Textarea
                  id={`${id}-greeting`}
                  name="greeting"
                  rows={3}
                  value={agent.greeting}
                  onChange={(e) => onChange({ greeting: e.target.value })}
                />
                <p className="mt-1 text-xs text-ink-500">
                  {outbound ? "What recipients hear when they pick up." : "What callers hear first."}
                </p>
                <CompiledNote
                  custom={agent.greetingCustom}
                  what={lineName}
                  fromPurpose={outbound}
                  onRegenerate={() => onChange({ greetingCustom: false })}
                />
              </div>
            </div>
          </div>
        }
        advanced={
          <div className="flex flex-col gap-4">
            <div>
              <FieldLabel htmlFor={`${id}-prompt`} hint="Written from the fields above — editable">
                Instructions the agent follows (system prompt)
              </FieldLabel>
              <Textarea
                id={`${id}-prompt`}
                name="systemPrompt"
                rows={5}
                value={agent.systemPrompt}
                onChange={(e) => onChange({ systemPrompt: e.target.value })}
                className="font-mono text-[12px]"
              />
              <CompiledNote
                custom={agent.promptCustom}
                what="instructions"
                onRegenerate={() => onChange({ promptCustom: false })}
              />
            </div>
            <div>
              <FieldLabel htmlFor={`${id}-temp`} hint={`${agent.temperature.toFixed(1)} — lower is more consistent`}>
                Temperature
              </FieldLabel>
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
            </div>
          </div>
        }
      />

      <SectionCard
        title="AI settings"
        description="Balanced cost and speed by default. Advanced lets you pick providers."
        defaultAdvancedOpen={defaultAdvanced}
        quiet
        guided={null}
        advanced={
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <FieldLabel htmlFor={`${id}-llm`}>Language model (LLM)</FieldLabel>
              <Select
                id={`${id}-llm`}
                name="llmProvider"
                value={agent.llmProvider}
                onChange={(e) => onChange({ llmProvider: e.target.value })}
              >
                {withCurrent(llmOptions, agent.llmProvider).map((o) => (
                  <option key={o}>{o}</option>
                ))}
              </Select>
            </div>
            <div>
              <FieldLabel htmlFor={`${id}-stt`}>Speech-to-text</FieldLabel>
              <Select
                id={`${id}-stt`}
                name="sttProvider"
                value={agent.sttProvider}
                onChange={(e) => onChange({ sttProvider: e.target.value })}
              >
                {withCurrent(sttOptions, agent.sttProvider).map((o) => (
                  <option key={o}>{o}</option>
                ))}
              </Select>
            </div>
            <div>
              <FieldLabel htmlFor={`${id}-tts`}>Text-to-speech</FieldLabel>
              <Select
                id={`${id}-tts`}
                name="ttsProvider"
                value={agent.ttsProvider}
                onChange={(e) => onChange({ ttsProvider: e.target.value })}
              >
                {withCurrent(ttsOptions, agent.ttsProvider).map((o) => (
                  <option key={o}>{o}</option>
                ))}
              </Select>
            </div>
          </div>
        }
      />
    </div>
  );
}
