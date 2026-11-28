import { useEffect, useId, useState } from "react";
import { FieldError, FieldLabel, Input, Select, Textarea } from "@/components/ui/Field";
import { HelpCircle } from "@untitledui/icons";
import { Tooltip, TooltipTrigger } from "@/components/base/tooltip/tooltip";
import { Button } from "@/components/ui/Button";
import { RadioTile, RadioTileGroup, SegmentedGroup, SegmentedItem } from "@/components/base/radio-buttons/radio-variants";
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
    <div className="mt-1.5 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-sm text-tertiary">
      <span>
        {custom
          ? `Edited by hand. Tone changes won’t rewrite it.`
          : `${capitalizeFirst(what)} written from the business name, voice, tone${fromPurpose ? " and purpose" : ""}. Edit to customize.`}
      </span>
      {custom && (
        <button
          type="button"
          onClick={onRegenerate}
          className="font-medium text-primary underline underline-offset-[0.2em] hover:text-secondary"
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

  const greetingEmpty = agent.greeting.trim() === "";
  const greetingLong = agent.greeting.length > 280;

  return (
    <div className="grid items-start gap-x-14 lg:grid-cols-2">
      <div>
        <SectionCard
          title="Identity"
          description={`The name you manage it by, and the business ${outbound ? "recipients" : "callers"} hear.`}
          guided={
            <div className="grid gap-5">
              <div>
                <FieldLabel htmlFor={`${id}-name`} required tip="Only you see this. It never appears on calls.">
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
              </div>
              <div>
                <FieldLabel htmlFor={`${id}-business`} tip={`What ${outbound ? "recipients" : "callers"} hear the agent say it works for.`}>
                  Business name
                </FieldLabel>
                <Input
                  id={`${id}-business`}
                  name="businessName"
                  autoComplete="organization"
                  value={agent.businessName ?? businessNameOf(agent)}
                  placeholder={suggestedBusinessName}
                  onChange={(e) => onChange({ businessName: e.target.value })}
                />
              </div>
            </div>
          }
        />

        <SectionCard
          title="Voice"
          description="Pick who the agent sounds like."
          guided={
            <RadioTileGroup aria-label="Voice" value={agent.voice} onChange={(v) => onChange({ voice: v })}>
              {withCurrent(voiceOptions, agent.voice).map((v) => {
                const [voiceName, ...rest] = v.split(" — ");
                return (
                  <RadioTile
                    key={v}
                    value={v}
                    label={voiceName}
                    hint={rest.join(" — ")}
                    leading={
                      <span aria-hidden="true" className="flex size-8 shrink-0 items-center justify-center rounded-full bg-secondary text-sm font-semibold text-secondary">
                        {voiceName.charAt(0)}
                      </span>
                    }
                  />
                );
              })}
            </RadioTileGroup>
          }
        />
      </div>

      <div>
        <SectionCard
          title="Style"
          description="Language and how formal it sounds."
          guided={
            <div className="flex flex-col gap-6">
              <fieldset>
                <legend className="mb-2 text-sm font-medium text-secondary">
                  Language
                  <Tooltip title="Changes the agent's instructions only. Voice and speech support isn't checked." placement="top">
                    <TooltipTrigger aria-label="More info" className="-my-1.5 ml-0.5 inline-flex translate-y-0.5 cursor-pointer rounded-full p-1.5 text-fg-quaternary outline-focus-ring hover:text-fg-quaternary_hover focus-visible:outline-2">
                      <HelpCircle className="size-4" />
                    </TooltipTrigger>
                  </Tooltip>
                </legend>
                <SegmentedGroup aria-label="Language" value={languageOf(agent)} onChange={(v) => onChange({ language: v as AgentLanguage })}>
                  {(Object.entries(agentLanguageLabel) as [AgentLanguage, string][]).map(([value, label]) => (
                    <SegmentedItem key={value} value={value} label={label.replace(" (bilingual)", "")} />
                  ))}
                </SegmentedGroup>
              </fieldset>

              <div>
                <div className="mb-2 flex items-baseline justify-between gap-3">
                  <span id={`${id}-tone-label`} className="text-sm font-medium text-secondary">
                    Tone
                  </span>
                  <span className="text-sm text-tertiary tabular-nums">{toneBandLabel[band]} · {agent.tone}</span>
                </div>
                <Slider
                  id={`${id}-tone`}
                  name="tone"
                  value={agent.tone}
                  onChange={(v) => onChange({ tone: v })}
                  ariaLabelledBy={`${id}-tone-label`}
                  valueText={`${agent.tone}, ${toneBandLabel[band]}`}
                />
                <div role="group" aria-labelledby={`${id}-tone-label`} className="mt-1 flex justify-between">
                  {tonePresets.map((t) => (
                    <button
                      key={t.band}
                      type="button"
                      aria-pressed={band === t.band}
                      onClick={() => onChange({ tone: t.value })}
                      className={`rounded-md px-2.5 py-2 text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-brand-200 ${
                        band === t.band ? "font-medium text-brand-700" : "text-tertiary hover:text-primary"
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {humor && (
                <div className="flex items-center justify-between gap-4 rounded-lg bg-secondary px-4 py-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-primary">{humor.label}</p>
                    <p className="mt-0.5 text-sm text-tertiary">{humor.description}</p>
                  </div>
                  <Switch checked={humor.enabled} disabled={humor.locked || !onHumorChange} label={humor.label} onChange={onHumorChange} />
                </div>
              )}
            </div>
          }
        />

      <SectionCard
        title={outbound ? "Opening line" : "Greeting"}
        description={outbound ? "The first thing recipients hear when they pick up." : "The first thing callers hear."}
        defaultAdvancedOpen={defaultAdvanced}
        guided={
          <div>
            <Textarea
              id={`${id}-greeting`}
              name="greeting"
              aria-label={outbound ? "Opening line" : "Greeting"}
              aria-invalid={greetingEmpty || undefined}
              aria-describedby={greetingEmpty ? `${id}-greeting-err` : undefined}
              rows={4}
              value={agent.greeting}
              onChange={(e) => onChange({ greeting: e.target.value })}
            />
            <FieldError id={`${id}-greeting-err`}>{greetingEmpty ? `Write the ${lineName} the agent says first.` : null}</FieldError>
            <div className="mt-2 flex items-center justify-between gap-3 text-sm">
              <span className={`tabular-nums ${greetingLong ? "font-medium text-warning-700" : "text-tertiary"}`}>
                {agent.greeting.length} {agent.greeting.length === 1 ? "character" : "characters"}{greetingLong ? ". Shorter is easier to listen to." : ""}
              </span>
            </div>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
              <CompiledNote custom={agent.greetingCustom} what={lineName} fromPurpose={outbound} onRegenerate={() => onChange({ greetingCustom: false })} />
              {canSpeak && (
                <Button variant="secondary" size="sm" onClick={playSample} aria-pressed={speaking} disabled={greetingEmpty && !speaking}>
                  <Icon name={speaking ? "x" : "play"} className="size-4" />
                  {speaking ? "Stop" : "Hear it"}
                </Button>
              )}
            </div>
          </div>
        }
        advanced={
          <div className="flex flex-col gap-4">
            <div>
              <FieldLabel htmlFor={`${id}-prompt`} hint="Written from the fields above. Editable.">
                Instructions the agent follows (system prompt)
              </FieldLabel>
              <Textarea
                id={`${id}-prompt`}
                name="systemPrompt"
                rows={5}
                value={agent.systemPrompt}
                onChange={(e) => onChange({ systemPrompt: e.target.value })}
                className="font-mono text-sm"
              />
              <CompiledNote custom={agent.promptCustom} what="instructions" onRegenerate={() => onChange({ promptCustom: false })} />
            </div>
            <div>
              <FieldLabel htmlFor={`${id}-temp`} hint={`${agent.temperature.toFixed(1)}. Lower is more consistent.`}>
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
    </div>
  );
}
