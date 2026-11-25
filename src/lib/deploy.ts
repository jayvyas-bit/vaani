import { llmRateMultiplier, sttRateMultiplier, ttsRateMultiplier } from "./providers";
import type { Agent, CallDirection } from "./types";

export type NumberMethod = "keep" | "new" | "port" | "pool";
export type DncList = "internal" | "federal" | "both";

/** Everything the Deploy wizard collects, held per agent in App state. */
export interface DeployConfig {
  numberMethod: NumberMethod;
  areaCode: string;
  /** The number reserved for "new" — generated, unique across the workspace. */
  provisionedNumber?: string;
  portNumber: string;
  poolNumber?: string;
  // Inbound
  hoursOpen: string; // "HH:MM" 24h
  hoursClose: string;
  afterHours: boolean;
  // Outbound
  windowStart: string;
  windowEnd: string;
  dncList: DncList;
  voicemailDetect: boolean;
  /** Outbound: which contact list the agent dials, and how many people are on it. */
  contactListName: string;
  contactCount: number;
  // Cost
  callsPerMonth: number;
  avgMinutes: number;
  /** Optional monthly spend ceiling — Cost estimate and Go live warn when the projection exceeds it. */
  monthlyBudget?: number;
}

/**
 * Per-minute rate at the system default for every provider. Split across the
 * four components below so a provider change (Build → Persona → AI settings)
 * visibly moves the matching slice of the cost breakdown, not just a flat total.
 */
export const PER_MIN_RATE = 0.14;
const STT_BASE_RATE = 0.022;
const TTS_BASE_RATE = 0.023;
const LLM_BASE_RATE = 0.065;
const TELEPHONY_BASE_RATE = 0.03; // Doesn't vary with AI provider choice.

type ProviderSelection = Pick<Agent, "llmProvider" | "sttProvider" | "ttsProvider">;

/** The per-minute rate this agent's chosen providers actually produce. */
export function effectivePerMinRate(providers?: ProviderSelection): number {
  if (!providers) return PER_MIN_RATE;
  return (
    STT_BASE_RATE * (sttRateMultiplier[providers.sttProvider] ?? 1) +
    TTS_BASE_RATE * (ttsRateMultiplier[providers.ttsProvider] ?? 1) +
    LLM_BASE_RATE * (llmRateMultiplier[providers.llmProvider] ?? 1) +
    TELEPHONY_BASE_RATE
  );
}

export interface CostBreakdownRow {
  label: string;
  amount: number;
}

/** Real per-component shares of the projected monthly cost, not a fixed cosmetic split. */
export function costBreakdown(
  config: Pick<DeployConfig, "callsPerMonth" | "avgMinutes">,
  providers?: ProviderSelection,
): CostBreakdownRow[] {
  const minutes = config.callsPerMonth * config.avgMinutes;
  const sttMult = providers ? (sttRateMultiplier[providers.sttProvider] ?? 1) : 1;
  const ttsMult = providers ? (ttsRateMultiplier[providers.ttsProvider] ?? 1) : 1;
  const llmMult = providers ? (llmRateMultiplier[providers.llmProvider] ?? 1) : 1;
  return [
    { label: "Speech-to-text", amount: minutes * STT_BASE_RATE * sttMult },
    { label: "Text-to-speech", amount: minutes * TTS_BASE_RATE * ttsMult },
    { label: "Language model", amount: minutes * LLM_BASE_RATE * llmMult },
    { label: "Telephony & call minutes", amount: minutes * TELEPHONY_BASE_RATE },
  ];
}

/** Predefined workspace contact lists an outbound agent can be pointed at, plus any CSV upload. */
export interface ContactList {
  name: string;
  count: number;
}

export const WORKSPACE_CONTACT_LISTS: ContactList[] = [
  { name: "Past-due March", count: 1800 },
  { name: "Q4 renewals", count: 640 },
  { name: "New patient follow-ups", count: 320 },
];

/** Numbers already owned by the workspace but not attached to an agent. */
export const WORKSPACE_POOL = ["(503) 555-0112", "(971) 555-0164", "(360) 555-0185"];

export const dncLabel: Record<DncList, string> = {
  internal: "Workspace DNC list",
  federal: "Federal + state registries",
  both: "Workspace list + registries",
};

export function defaultDeployConfig(direction: CallDirection, currentNumber?: string): DeployConfig {
  return {
    numberMethod: currentNumber ? "keep" : "new",
    areaCode: "503",
    portNumber: "",
    hoursOpen: "08:00",
    hoursClose: "18:00",
    afterHours: true,
    windowStart: "09:00",
    windowEnd: "20:00",
    dncList: "internal",
    voicemailDetect: true,
    contactListName: "",
    contactCount: 0,
    callsPerMonth: direction === "inbound" ? 900 : 1800,
    avgMinutes: direction === "inbound" ? 2.4 : 3.1,
  };
}

/** Fill fields added after a config was saved (older localStorage entries). */
export function normalizeDeployConfig(config: Partial<DeployConfig> | undefined, direction: CallDirection): DeployConfig {
  return { ...defaultDeployConfig(direction), ...(config ?? {}) };
}

/* ---------------- Who to call (outbound) ---------------- */

export interface ContactListErrors {
  name?: string;
  count?: string;
}

export function contactListErrors(config: DeployConfig): ContactListErrors {
  const errors: ContactListErrors = {};
  if (!config.contactListName.trim()) errors.name = "Name the contact list this agent should call.";
  if (!Number.isFinite(config.contactCount) || config.contactCount < 1)
    errors.count = "Enter how many contacts are on the list.";
  return errors;
}

export function contactCountLabel(count: number) {
  return `${count.toLocaleString()} contact${count === 1 ? "" : "s"}`;
}

/** "Past-due March — 1,800 contacts", or null while the list isn't set. */
export function contactListSummary(config: DeployConfig): string | null {
  if (!config.contactListName.trim() || !(config.contactCount > 0)) return null;
  return `${config.contactListName.trim()} — ${contactCountLabel(config.contactCount)}`;
}

export function isValidAreaCode(code: string) {
  return /^[2-9]\d{2}$/.test(code.trim());
}

function digits(s: string) {
  return s.replace(/\D/g, "");
}

export function formatPhone(raw: string): string | null {
  let d = digits(raw);
  if (d.length === 11 && d.startsWith("1")) d = d.slice(1);
  if (d.length !== 10 || !/^[2-9]/.test(d)) return null;
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
}

/**
 * Reserve a fictional 555-01XX number in the area code that no other agent in
 * the workspace already holds.
 */
export function provisionNumber(areaCode: string, taken: Iterable<string>): string {
  const used = new Set(Array.from(taken, (n) => digits(n)));
  const candidates: string[] = [];
  for (let i = 100; i <= 199; i++) {
    const n = `(${areaCode}) 555-0${i}`;
    if (!used.has(digits(n))) candidates.push(n);
  }
  if (candidates.length === 0) return `(${areaCode}) 555-0100`;
  return candidates[Math.floor(Math.random() * candidates.length)];
}

/** Make sure a "new" number exists and matches the chosen area code. */
export function ensureProvisioned(config: DeployConfig, taken: Iterable<string>): DeployConfig {
  if (config.numberMethod !== "new" || !isValidAreaCode(config.areaCode)) return config;
  const code = config.areaCode.trim();
  if (config.provisionedNumber?.startsWith(`(${code})`)) return config;
  return { ...config, provisionedNumber: provisionNumber(code, taken) };
}

export function availablePool(taken: Iterable<string>) {
  const used = new Set(Array.from(taken, (n) => digits(n)));
  return WORKSPACE_POOL.filter((n) => !used.has(digits(n)));
}

export function resolvedNumber(config: DeployConfig, currentNumber?: string): string | null {
  switch (config.numberMethod) {
    case "keep":
      return currentNumber ?? null;
    case "new":
      return isValidAreaCode(config.areaCode) ? (config.provisionedNumber ?? null) : null;
    case "port":
      return formatPhone(config.portNumber);
    case "pool":
      return config.poolNumber ?? null;
  }
}

export const numberSourceNote: Record<NumberMethod, string> = {
  keep: "current number",
  new: "reserved for this agent — active once you go live",
  port: "porting from your carrier",
  pool: "from your workspace pool",
};

export function channelError(config: DeployConfig, currentNumber?: string): string | null {
  if (config.numberMethod === "new" && !isValidAreaCode(config.areaCode))
    return "Enter a 3-digit US area code (it can't start with 0 or 1).";
  if (config.numberMethod === "port" && !formatPhone(config.portNumber))
    return "Enter the full 10-digit number you want to port, e.g. (503) 555-0123.";
  if (config.numberMethod === "pool" && !config.poolNumber) return "Pick a number from your pool.";
  if (!resolvedNumber(config, currentNumber)) return "Choose a phone number to continue.";
  return null;
}

/* ---------------- Time ---------------- */

/** Parse "HH:MM" (24h, as produced by <input type="time">) into minutes. */
export function parseTime(value: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}

export function formatTime(value: string): string {
  const mins = parseTime(value);
  if (mins === null) return "—";
  const h24 = Math.floor(mins / 60);
  const m = mins % 60;
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${h24 < 12 ? "AM" : "PM"}`;
}

export interface HoursErrors {
  start?: string;
  end?: string;
}

export function hoursErrors(config: DeployConfig, direction: CallDirection): HoursErrors {
  const [startRaw, endRaw] =
    direction === "inbound" ? [config.hoursOpen, config.hoursClose] : [config.windowStart, config.windowEnd];
  const start = parseTime(startRaw);
  const end = parseTime(endRaw);
  const errors: HoursErrors = {};
  if (start === null) errors.start = "Enter a valid time.";
  if (end === null) errors.end = "Enter a valid time.";
  if (start !== null && end !== null && end <= start)
    errors.end = direction === "inbound" ? "Closing time must be after opening time." : "Latest must be after earliest.";
  if (direction === "outbound") {
    // TCPA: no calls before 8am or after 9pm in the recipient's local time.
    if (start !== null && start < 8 * 60) errors.start = "TCPA doesn't allow calls before 8:00 AM.";
    if (end !== null && end > 21 * 60) errors.end = "TCPA doesn't allow calls after 9:00 PM.";
  }
  return errors;
}

export function monthlyCost(config: Pick<DeployConfig, "callsPerMonth" | "avgMinutes">, providers?: ProviderSelection) {
  return config.callsPerMonth * config.avgMinutes * effectivePerMinRate(providers);
}
