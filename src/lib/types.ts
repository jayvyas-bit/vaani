export type CallDirection = "inbound" | "outbound";

export type AgentStatus = "draft" | "testing" | "live" | "paused";

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
}

export type LimitType =
  | "discount_limit"
  | "forbidden_promise"
  | "escalation_trigger"
  | "payment_plan_limit";

export interface BusinessRule {
  id: string;
  limitType: LimitType;
  label: string;
  threshold?: string;
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

export interface ToolDef {
  id: string;
  name: string;
  description: string;
  kind: "builtin" | "custom";
  enabled: boolean;
  /** Transfer tools only: where the call goes (number, extension, queue or voicemail). */
  destination?: string;
  /** Present on custom webhook tools (e.g. generated from a cURL command). */
  method?: string;
  url?: string;
  params?: string[];
  timeoutSec?: number;
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
}

export interface TranscriptTurn {
  id: string;
  speaker: "caller" | "agent";
  text: string;
  flagged?: boolean;
}
