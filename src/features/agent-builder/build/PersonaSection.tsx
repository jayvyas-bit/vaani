import { useEffect, useId, useState } from "react";
import { Button } from "@/components/ui/Button";
import { FieldError, FieldLabel, Input, Select, Textarea } from "@/components/ui/Field";
import { Icon } from "@/components/ui/Icon";
import { SectionCard } from "@/components/ui/SectionCard";
import { Slider } from "@/components/ui/Slider";
import { Switch } from "@/components/ui/Switch";
import { businessNameOf, cleanBusinessName, toneBand, toneBandLabel, voiceOptions } from "@/lib/persona";
import { llmOptions, sttOptions, ttsOptions } from "@/lib/providers";
import type { Agent, SafetyToggle } from "@/lib/types";

function withCurrent(options: string[], current: string) {
  return options.includes(current) ? options : [current, ...options];
}

function CompiledNote({
  custom,
  what,
  onRegenerate,
}: {
  custom?: boolean;
  what: string;
  onRegenerate: () => void;
}) {
  return (
    <div className="mt-1.5 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs text-gray-500">
      <span>
        {custom
          ? `Edited by hand — business name and voice changes are swapped in, tone won't rewrite it.`
          : `Written from the business name, voice, tone and purpose. Edit to customize.`}
      </span>
      {custom && (
        <button
          type="button"
          onClick={onRegenerate}
          className="font-semibold text-brand-700 underline-offset-2 hover:underline"
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
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
              </div>
              <div>
                <FieldLabel htmlFor={`${id}-voice`} hint={canSpeak ? "▶ plays the greeting" : undefined}>
                  Voice
                </FieldLabel>
                <div className="flex gap-2">
                  <Select
                    id={`${id}-voice`}
                    name="voice"
                    value={agent.voice}
                    className="min-w-0 flex-1"
                    onChange={(e) => onChange({ voice: e.target.value })}
                  >
                    {withCurrent(voiceOptions, agent.voice).map((v) => (
                      <option key={v}>{v}</option>
                    ))}
                  </Select>
                  {canSpeak && (
                    <Button
                      variant="secondary"
                      size="md"
                      className="px-3"
                      aria-label={speaking ? "Stop the sample" : "Play the greeting as a sample"}
                      aria-pressed={speaking}
                      onClick={playSample}
                    >
                      <Icon name={speaking ? "x" : "play"} className="size-4" />
                    </Button>
                  )}
                </div>
              </div>
            </div>

            <div>
              <FieldLabel
                htmlFor={`${id}-business`}
                hint="Only you see the agent name"
              >
                Business name (what {outbound ? "recipients" : "callers"} hear)
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

            <div>
              <FieldLabel
                htmlFor={`${id}-greeting`}
                hint={agent.direction === "outbound" ? "What recipients hear when they pick up" : "What callers hear first"}
              >
                {agent.direction === "outbound" ? "Opening line" : "Greeting"}
              </FieldLabel>
              <Textarea
                id={`${id}-greeting`}
                name="greeting"
                rows={2}
                value={agent.greeting}
                onChange={(e) => onChange({ greeting: e.target.value })}
              />
              <CompiledNote
                custom={agent.greetingCustom}
                what={lineName}
                onRegenerate={() => onChange({ greetingCustom: false })}
              />
            </div>

            <div>
              <FieldLabel id={`${id}-tone-label`} htmlFor={`${id}-tone`} hint={`${agent.tone} · ${toneBandLabel[band]}`}>
                Tone
              </FieldLabel>
              <Slider
                id={`${id}-tone`}
                name="tone"
                value={agent.tone}
                onChange={(v) => onChange({ tone: v })}
                valueText={`${agent.tone}, ${toneBandLabel[band]}`}
                leftLabel="Formal & brief"
                rightLabel="Warm & chatty"
              />
              {humor && (
                <div className="mt-4 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-[13px] font-medium text-ink-950">{humor.label}</p>
                    <p className="text-[12.5px] text-ink-500">{humor.description}</p>
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
        description="Standard (balanced cost and speed). Open Advanced to choose specific speech and language providers — each option's cost shows on Deploy → Cost estimate."
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
