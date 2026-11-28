export type CallDirection = "inbound" | "outbound";

export type AgentStatus = "draft" | "testing" | "live" | "paused";

/**
 * "hi" and "en-hi" only control the instruction baked into the compiled
 * system prompt (see `persona.ts`) — they don’t verify that the chosen voice,
 * STT or TTS provider actually supports Hindi. Confirm that separately before
 * relying on it for real calls.
 */
export type AgentLanguage = "en" | "hi" | "en-hi";

export interface Agent {
  id: string;
  /** Internal name — only people in the builder see it. */
  name: string;
  /**
   * What callers hear ("Thanks for calling Riverside Dental"). Falls back to a
   * cleaned-up version of `name` when unset — see `businessNameOf`.
   */
  businessName?: string;
  purpose: string;
  direction: CallDirection;
  status: AgentStatus;
  voice: string;
  greeting: string;
  tone: number; // 0 (formal) – 100 (casual)
  systemPrompt: string;
  /** Defaults to "en" — see `languageOf` in persona.ts. */
  language?: AgentLanguage;
  llmProvider: string;
  sttProvider: string;
  ttsProvider: string;
  temperature: number;
  phoneNumber?: string;
  callsThisWeek?: number;
  avgHandleTimeSec?: number;
  /**
   * True once someone has hand-edited the greeting / system prompt. While
   * false, both are recompiled from name, voice, tone and purpose on every
   * change; once true, only the name and voice name are swapped in.
   */
  greetingCustom?: boolean;
  promptCustom?: boolean;
  /**
   * Set when this agent was created as the inbound/outbound counterpart of
   * another agent (or vice versa). Purely a cross-reference for the Agents
   * list and menu — the two agents otherwise run as independent records.
   */
  linkedAgentId?: string;
}

export type LimitType =
  | "discount_limit"
  | "forbidden_promise"
  | "escalation_trigger"
  | "payment_plan_limit"
  | "follow_up_limit";

export interface BusinessRule {
  id: string;
  limitType: LimitType;
  label: string;
  threshold?: string;
  /** Discount limits only: the per-item floor price a discount must never cross, e.g. "$45". */
  priceFloor?: string;
  action: string;
  enabled: boolean;
}

export interface SafetyToggle {
  id: string;
  label: string;
  description: string;
  enabled: boolean;
  locked?: boolean;
}

export interface KnowledgeSource {
  id: string;
  name: string;
  kind: "pdf" | "url" | "text";
  sizeLabel: string;
  attached: boolean;
}

export type CalendarProvider = "google" | "outlook" | "other";

export interface ToolDef {
  id: string;
  name: string;
  description: string;
  kind: "builtin" | "custom";
  enabled: boolean;
  /** Transfer tools only: where the call goes (number, extension, queue or voicemail). */
  destination?: string;
  /** Booking tools only: which calendar this is configured to read/write. */
  calendarProvider?: CalendarProvider;
  /**
   * Booking tools only: true once a real calendar account has been connected.
   * Configuring a provider above does not set this — it only becomes true
   * through an actual OAuth/connection step, which this demo doesn’t perform.
   */
  calendarConnected?: boolean;
  /** Present on custom webhook tools (e.g. generated from a cURL command). */
  method?: string;
  url?: string;
  params?: string[];
  timeoutSec?: number;
}

export type OutcomeFieldType = "text" | "boolean" | "enum";

/** A required/expected result the agent should capture or report by end of call. */
export interface OutcomeField {
  id: string;
  label: string;
  type: OutcomeFieldType;
  /** enum type only. */
  options?: string[];
  required: boolean;
}

export interface KnowledgeSettings {
  chunkSize: number;
  topK: number;
}

export type ScenarioSource = "manual" | "auto-seeded";
export type Verdict = "pass" | "fail" | "inconclusive" | "not-run";

export interface Scenario {
  id: string;
  title: string;
  criteria: string;
  source: ScenarioSource;
  verdict: Verdict;
  lastRun?: string;
  /** Epoch ms of the last simulated run; preferred over `lastRun` when set. */
  lastRunAt?: number;
  /** Why the evaluator reached its verdict. */
  reason?: string;
  /**
   * A snapshot (from `contextSignature`) of the agent config this verdict was
   * run against. When it no longer matches the agent's current config, the
   * verdict is stale — shown as-is, never silently cleared, until "Run all".
   */
  lastRunSignature?: string;
}

export interface TranscriptTurn {
  id: string;
  speaker: "caller" | "agent";
  text: string;
  flagged?: boolean;
}
