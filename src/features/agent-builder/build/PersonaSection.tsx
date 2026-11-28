import { useEffect, useId, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { FieldError, FieldLabel, Input, SettingRow, Select, Textarea } from "@/components/ui/Field";
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
          ? `Edited by hand — business name and voice changes are swapped in, tone won’t rewrite it.`
          : `${capitalizeFirst(what)} written from the business name, voice, tone${fromPurpose ? " and purpose" : ""}. Edit to customize.`}
      </span>
      {custom && (
        <button
          type="button"
          onClick={onRegenerate}
          className="font-semibold text-brand-700 underline-offset-[0.2em] hover:underline"
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
          <div>
            <SettingRow label="Agent name" htmlFor={`${id}-name`} required help="Only you see this.">
              <Input
                id={`${id}-name`}
                name="agentName"
                value={agent.name}
                aria-invalid={agent.name.trim() === "" || undefined}
                aria-describedby={agent.name.trim() === "" ? `${id}-name-err` : undefined}
                onChange={(e) => onChange({ name: e.target.value })}
              />
              <FieldError id={`${id}-name-err`}>{agent.name.trim() === "" ? "Give the agent a name." : null}</FieldError>
            </SettingRow>

            <SettingRow
              label="Business name"
              htmlFor={`${id}-business`}
              help={`What ${outbound ? "recipients" : "callers"} hear.`}
            >
              <Input
                id={`${id}-business`}
                name="businessName"
                autoComplete="organization"
                value={agent.businessName ?? businessNameOf(agent)}
                placeholder={suggestedBusinessName}
                onChange={(e) => onChange({ businessName: e.target.value })}
              />
            </SettingRow>

            <SettingRow
              label="Language"
              htmlFor={`${id}-language`}
              help="Sets the agent's instructions. Voice and speech providers aren't checked for support."
            >
              <Select
                id={`${id}-language`}
                name="language"
                value={languageOf(agent)}
                onChange={(e) => onChange({ language: e.target.value as AgentLanguage })}
              >
                {(Object.entries(agentLanguageLabel) as [AgentLanguage, string][]).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </SettingRow>

            <SettingRow label="Voice" help={canSpeak ? "Play reads the greeting in your browser's voice." : undefined}>
              <div role="radiogroup" aria-label="Voice" className="overflow-hidden rounded-md border border-ink-950/10">
                {withCurrent(voiceOptions, agent.voice).map((v) => {
                  const [voiceName, ...rest] = v.split(" — ");
                  const selected = v === agent.voice;
                  return (
                    <div
                      key={v}
                      className="flex items-center gap-3 border-t border-ink-950/8 px-3 py-2 first:border-t-0"
                    >
                      <span
                        role="radio"
                        aria-checked={selected}
                        aria-label={voiceName}
                        tabIndex={0}
                        onClick={() => onChange({ voice: v })}
                        onKeyDown={(e) => {
                          if (e.key === " " || e.key === "Enter") {
                            e.preventDefault();
                            onChange({ voice: v });
                          }
                        }}
                        className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 rounded outline-none focus-visible:ring-2 focus-visible:ring-brand-200"
                      >
                        <span
                          aria-hidden="true"
                          className={`flex size-4 shrink-0 items-center justify-center rounded-full border ${
                            selected ? "border-ink-950 bg-ink-950" : "border-ink-950/25"
                          }`}
                        >
                          {selected && <span className="size-1.5 rounded-full bg-white" />}
                        </span>
                        <span className="w-16 shrink-0 text-[13px] font-medium text-ink-950">{voiceName}</span>
                        <span className="truncate text-[12.5px] text-ink-500">{rest.join(" — ")}</span>
                      </span>
                      {selected ? (
                        <>
                          <Badge tone="neutral">Selected</Badge>
                          {canSpeak && (
                            <button
                              type="button"
                              aria-pressed={speaking}
                              aria-label={speaking ? "Stop the sample" : "Play the greeting as a sample"}
                              onClick={playSample}
                              className="flex size-7 items-center justify-center rounded-md border border-ink-950/10 text-ink-700 outline-none hover:bg-paper-50 focus-visible:ring-2 focus-visible:ring-brand-200"
                            >
                              <Icon name={speaking ? "x" : "play"} className="size-3.5" />
                            </button>
                          )}
                        </>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </SettingRow>

            <SettingRow
              label={outbound ? "Opening line" : "Greeting"}
              htmlFor={`${id}-greeting`}
              help={outbound ? "What recipients hear when they pick up." : "What callers hear first."}
            >
              <Textarea
                id={`${id}-greeting`}
                name="greeting"
                rows={3}
                value={agent.greeting}
                onChange={(e) => onChange({ greeting: e.target.value })}
              />
              <CompiledNote
                custom={agent.greetingCustom}
                what={lineName}
                fromPurpose={outbound}
                onRegenerate={() => onChange({ greetingCustom: false })}
              />
            </SettingRow>

            <SettingRow label="Tone" htmlFor={`${id}-tone`} help={`${agent.tone} · ${toneBandLabel[band]}`}>
              <Slider
                id={`${id}-tone`}
                name="tone"
                value={agent.tone}
                onChange={(v) => onChange({ tone: v })}
                valueText={`${agent.tone}, ${toneBandLabel[band]}`}
                leftLabel="Formal & brief"
                rightLabel="Warm & chatty"
              />
            </SettingRow>

            {humor && (
              <SettingRow label={humor.label} help={humor.description}>
                <div className="flex justify-end">
                  <Switch
                    checked={humor.enabled}
                    disabled={humor.locked || !onHumorChange}
                    label={humor.label}
                    onChange={onHumorChange}
                  />
                </div>
              </SettingRow>
            )}
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
                className="font-mono text-[12.5px]"
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
        description="Standard (balanced cost and speed). Open Advanced to choose specific speech and language providers — each option’s cost shows on Deploy → Cost estimate."
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
