/**
 * AI provider choices and what each one actually changes: latency/accuracy
 * tradeoffs, and a cost multiplier applied against that component's base
 * rate in `lib/deploy.ts` — so picking "Highest accuracy" visibly costs more.
 *
 * Each option names the real vendor/model behind its tradeoff rather than a
 * bare tier label, so a user who specifically wants Claude over GPT, or
 * Deepgram over AssemblyAI, can say so in the same single dropdown a guided
 * user leaves on "System default" — no separate technical picker required.
 */

export const llmOptions = [
  "System default — balanced (GPT-4.1)",
  "Fast & inexpensive (GPT-4.1 mini)",
  "Highest accuracy (Claude Opus 4.5)",
  "Most current knowledge (Grok 4)",
];
export const sttOptions = ["System default (Deepgram Nova-3)", "Noisy-environment tuned (AssemblyAI Universal)"];
export const ttsOptions = ["System default (ElevenLabs Turbo)", "Low-latency streaming (ElevenLabs Flash)"];

export const llmRateMultiplier: Record<string, number> = {
  "System default — balanced (GPT-4.1)": 1,
  "Fast & inexpensive (GPT-4.1 mini)": 0.6,
  "Highest accuracy (Claude Opus 4.5)": 1.8,
  "Most current knowledge (Grok 4)": 1.4,
};

export const sttRateMultiplier: Record<string, number> = {
  "System default (Deepgram Nova-3)": 1,
  "Noisy-environment tuned (AssemblyAI Universal)": 1.3,
};

export const ttsRateMultiplier: Record<string, number> = {
  "System default (ElevenLabs Turbo)": 1,
  "Low-latency streaming (ElevenLabs Flash)": 1.25,
};

/** What a caller actually notices if this option is picked — shown next to cost-saving swap suggestions. */
export const llmTradeoff: Record<string, string> = {
  "System default — balanced (GPT-4.1)": "Balanced cost and reasoning quality.",
  "Fast & inexpensive (GPT-4.1 mini)": "Quicker, cheaper replies. May miss nuance on complex or ambiguous requests.",
  "Highest accuracy (Claude Opus 4.5)": "Best reasoning and edge-case handling, at the highest cost.",
  "Most current knowledge (Grok 4)": "Most up-to-date world knowledge, at a moderate premium over default.",
};

export const sttTradeoff: Record<string, string> = {
  "System default (Deepgram Nova-3)": "Reliable transcription for typical call conditions.",
  "Noisy-environment tuned (AssemblyAI Universal)":
    "More accurate in loud environments (drive-thru, warehouse), at a higher cost.",
};

export const ttsTradeoff: Record<string, string> = {
  "System default (ElevenLabs Turbo)": "Natural-sounding voice at standard latency.",
  "Low-latency streaming (ElevenLabs Flash)": "Faster voice response with fewer pauses, at a higher cost.",
};
