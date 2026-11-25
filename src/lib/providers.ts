/**
 * AI provider choices and what each one actually changes: latency/accuracy
 * tradeoffs, and a cost multiplier applied against that component's base
 * rate in `lib/deploy.ts` — so picking "Highest accuracy" visibly costs more.
 */

export const llmOptions = ["System default (GPT-class, balanced)", "Fast & inexpensive", "Highest accuracy"];
export const sttOptions = ["System default", "Noisy-environment tuned"];
export const ttsOptions = ["System default", "Low-latency streaming"];

export const llmRateMultiplier: Record<string, number> = {
  "System default (GPT-class, balanced)": 1,
  "Fast & inexpensive": 0.6,
  "Highest accuracy": 1.8,
};

export const sttRateMultiplier: Record<string, number> = {
  "System default": 1,
  "Noisy-environment tuned": 1.3,
};

export const ttsRateMultiplier: Record<string, number> = {
  "System default": 1,
  "Low-latency streaming": 1.25,
};
