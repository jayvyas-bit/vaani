import type { DisplayCurrency } from "./format";
import { llmOptions, llmRateMultiplier, sttOptions, sttRateMultiplier, ttsOptions, ttsRateMultiplier } from "./providers";
import type { Agent, CallDirection } from "./types";

export type NumberMethod = "keep" | "new" | "port" | "pool";
export type DncList = "internal" | "federal" | "both";

export type PhoneCountry = "US" | "IN" | "GB" | "AU";

export interface PhoneCountryInfo {
  value: PhoneCountry;
  label: string;
  dialCode: string;
  areaCodeLabel: string;
  areaCodeHint: string;
  areaCodeMaxLength: number;
}

/**
 * Illustrative provisioning only — no carrier is actually reserved for any of
 * these. Each country's area-code shape is simplified (a single numeric code),
 * not a precise model of its real numbering plan.
 */
export const PHONE_COUNTRIES: PhoneCountryInfo[] = [
  { value: "US", label: "United States / Canada", dialCode: "+1", areaCodeLabel: "Preferred area code", areaCodeHint: "Based on your workspace billing address", areaCodeMaxLength: 3 },
  { value: "IN", label: "India", dialCode: "+91", areaCodeLabel: "Preferred STD code", areaCodeHint: "e.g. 22 for Mumbai, 11 for Delhi", areaCodeMaxLength: 4 },
  { value: "GB", label: "United Kingdom", dialCode: "+44", areaCodeLabel: "Preferred area code", areaCodeHint: "e.g. 20 for London", areaCodeMaxLength: 4 },
  { value: "AU", label: "Australia", dialCode: "+61", areaCodeLabel: "Preferred area code", areaCodeHint: "e.g. 2 for Sydney/NSW", areaCodeMaxLength: 2 },
];

export const phoneCountryInfo: Record<PhoneCountry, PhoneCountryInfo> = Object.fromEntries(
  PHONE_COUNTRIES.map((c) => [c.value, c]),
) as Record<PhoneCountry, PhoneCountryInfo>;

export type DayKey = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";
export const DAY_KEYS: DayKey[] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
export const dayLabel: Record<DayKey, string> = {
  mon: "Mon",
  tue: "Tue",
  wed: "Wed",
  thu: "Thu",
  fri: "Fri",
  sat: "Sat",
  sun: "Sun",
};

export interface DayHours {
  closed: boolean;
  open: string; // "HH:MM" 24h
  close: string;
}

/** Everything the Deploy wizard collects, held per agent in App state. */
export interface DeployConfig {
  numberMethod: NumberMethod;
  /** Which country's numbering plan the area code and provisioned/ported number follow. */
  country: PhoneCountry;
  areaCode: string;
  /** The number reserved for "new" — generated, unique across the workspace. */
  provisionedNumber?: string;
  portNumber: string;
  poolNumber?: string;
  // Inbound
  hoursOpen: string; // "HH:MM" 24h
  hoursClose: string;
  afterHours: boolean;
  /** Inbound only: set different hours (or closed) per day instead of one window every day. */
  customHoursByDay?: boolean;
  /** Inbound only: per-day overrides used when `customHoursByDay` is on. A day missing here falls back to hoursOpen/hoursClose. */
  hoursByDay?: Partial<Record<DayKey, DayHours>>;
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
  /** Display-only currency for cost figures. Billing math always runs in USD — this never changes it. */
  displayCurrency?: DisplayCurrency;
}

/** The hours that actually apply on a given day, honoring `customHoursByDay` when set. */
export function dayHoursFor(config: DeployConfig, day: DayKey): DayHours {
  if (config.customHoursByDay && config.hoursByDay?.[day]) return config.hoursByDay[day]!;
  return { closed: false, open: config.hoursOpen, close: config.hoursClose };
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
    country: "US",
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
    displayCurrency: "USD",
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

export function isValidAreaCode(country: PhoneCountry, code: string) {
  const trimmed = code.trim();
  if (country === "US") return /^[2-9]\d{2}$/.test(trimmed);
  const max = phoneCountryInfo[country].areaCodeMaxLength;
  return new RegExp(`^[1-9]\\d{0,${max - 1}}$`).test(trimmed);
}

function digits(s: string) {
  return s.replace(/\D/g, "");
}

export function formatPhone(country: PhoneCountry, raw: string): string | null {
  const d = digits(raw);
  if (country === "US") {
    let nanp = d;
    if (nanp.length === 11 && nanp.startsWith("1")) nanp = nanp.slice(1);
    if (nanp.length !== 10 || !/^[2-9]/.test(nanp)) return null;
    return `(${nanp.slice(0, 3)}) ${nanp.slice(3, 6)}-${nanp.slice(6)}`;
  }
  // Generic international fallback — accepts a plausible national-number length
  // and displays it with the country's dial code, without modelling the exact
  // numbering plan the way the NANP branch above does.
  if (d.length < 7 || d.length > 12) return null;
  return `${phoneCountryInfo[country].dialCode} ${d}`;
}

function provisionedFormat(country: PhoneCountry, areaCode: string, i: number): string {
  if (country === "US") return `(${areaCode}) 555-0${i}`;
  return `${phoneCountryInfo[country].dialCode} ${areaCode} 555${i}`;
}

/**
 * Reserve a fictional 555-01XX placeholder number in the area code that no
 * other agent in the workspace already holds. Illustrative only — no real
 * carrier or number range is checked for any country.
 */
export function provisionNumber(country: PhoneCountry, areaCode: string, taken: Iterable<string>): string {
  const used = new Set(Array.from(taken, (n) => digits(n)));
  const candidates: string[] = [];
  for (let i = 100; i <= 199; i++) {
    const n = provisionedFormat(country, areaCode, i);
    if (!used.has(digits(n))) candidates.push(n);
  }
  if (candidates.length === 0) return provisionedFormat(country, areaCode, 100);
  return candidates[Math.floor(Math.random() * candidates.length)];
}

/** Make sure a "new" number exists and matches the chosen country + area code. */
export function ensureProvisioned(config: DeployConfig, taken: Iterable<string>): DeployConfig {
  if (config.numberMethod !== "new" || !isValidAreaCode(config.country, config.areaCode)) return config;
  const code = config.areaCode.trim();
  const expectedPrefix = config.country === "US" ? `(${code})` : `${phoneCountryInfo[config.country].dialCode} ${code}`;
  if (config.provisionedNumber?.startsWith(expectedPrefix)) return config;
  return { ...config, provisionedNumber: provisionNumber(config.country, code, taken) };
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
      return isValidAreaCode(config.country, config.areaCode) ? (config.provisionedNumber ?? null) : null;
    case "port":
      return formatPhone(config.country, config.portNumber);
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
  const country = phoneCountryInfo[config.country];
  if (config.numberMethod === "new" && !isValidAreaCode(config.country, config.areaCode))
    return `Enter a valid ${country.label} code (numeric, up to ${country.areaCodeMaxLength} digits, can't start with 0).`;
  if (config.numberMethod === "port" && !formatPhone(config.country, config.portNumber))
    return config.country === "US"
      ? "Enter the full 10-digit number you want to port, e.g. (503) 555-0123."
      : `Enter the full number you want to port, e.g. ${country.dialCode} ${"5".repeat(Math.max(7, country.areaCodeMaxLength + 5))}.`;
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

/** "Mon–Fri 9:00 AM–6:00 PM, Sat 9:00 AM–2:00 PM, closed Sun" — groups consecutive days sharing the same hours. */
export function hoursSummary(config: DeployConfig): string {
  if (!config.customHoursByDay) {
    return `${formatTime(config.hoursOpen)} – ${formatTime(config.hoursClose)}, every day`;
  }
  const groups: { label: string; days: DayKey[] }[] = [];
  for (const day of DAY_KEYS) {
    const h = dayHoursFor(config, day);
    const label = h.closed ? "Closed" : `${formatTime(h.open)}–${formatTime(h.close)}`;
    const last = groups[groups.length - 1];
    if (last && last.label === label) last.days.push(day);
    else groups.push({ label, days: [day] });
  }
  return groups
    .map((g) => {
      const dayRange =
        g.days.length > 1 ? `${dayLabel[g.days[0]]}–${dayLabel[g.days[g.days.length - 1]]}` : dayLabel[g.days[0]];
      return g.label === "Closed" ? `closed ${dayRange}` : `${dayRange} ${g.label}`;
    })
    .join(", ");
}

export interface HoursErrors {
  start?: string;
  end?: string;
  /** Inbound custom-by-day mode only: one message per day that fails validation. */
  byDay?: Partial<Record<DayKey, string>>;
}

export function hoursErrors(config: DeployConfig, direction: CallDirection): HoursErrors {
  if (direction === "inbound" && config.customHoursByDay) {
    const byDay: Partial<Record<DayKey, string>> = {};
    for (const day of DAY_KEYS) {
      const h = config.hoursByDay?.[day];
      if (!h || h.closed) continue;
      const start = parseTime(h.open);
      const end = parseTime(h.close);
      if (start === null || end === null) byDay[day] = "Enter a valid time.";
      else if (end <= start) byDay[day] = "Closing time must be after opening time.";
    }
    return Object.keys(byDay).length > 0 ? { byDay } : {};
  }
  const [startRaw, endRaw] =
    direction === "inbound" ? [config.hoursOpen, config.hoursClose] : [config.windowStart, config.windowEnd];
  const start = parseTime(startRaw);
  const end = parseTime(endRaw);
  const errors: HoursErrors = {};
  if (start === null) errors.start = "Enter a valid time.";
  if (end === null) errors.end = "Enter a valid time.";
  if (start !== null && end !== null && end <= start)
    errors.end = direction === "inbound" ? "Closing time must be after opening time." : "Latest must be after earliest.";
  return errors;
}

export function monthlyCost(config: Pick<DeployConfig, "callsPerMonth" | "avgMinutes">, providers?: ProviderSelection) {
  return config.callsPerMonth * config.avgMinutes * effectivePerMinRate(providers);
}

/* ---------------- Cost-saving suggestions ---------------- */

export interface ProviderSwap {
  field: keyof ProviderSelection;
  label: string;
  from: string;
  to: string;
  monthlySavings: number;
}

export interface CostSuggestion {
  swaps: ProviderSwap[];
  newMonthlyCost: number;
  monthlySavings: number;
  /** True if even the cheapest available combination can't bring cost back under budget. */
  stillOverBudget: boolean;
}

const SWAP_COMPONENTS: { field: keyof ProviderSelection; label: string; options: string[]; multipliers: Record<string, number>; base: number }[] = [
  { field: "llmProvider", label: "Language model", options: llmOptions, multipliers: llmRateMultiplier, base: LLM_BASE_RATE },
  { field: "sttProvider", label: "Speech-to-text", options: sttOptions, multipliers: sttRateMultiplier, base: STT_BASE_RATE },
  { field: "ttsProvider", label: "Text-to-speech", options: ttsOptions, multipliers: ttsRateMultiplier, base: TTS_BASE_RATE },
];

/**
 * Proposes the fewest provider swaps (cheapest-first) needed to bring the
 * projected monthly cost back under budget. Never auto-applies — the caller
 * decides whether to accept the tradeoff.
 */
export function suggestCheaperProviders(
  config: Pick<DeployConfig, "callsPerMonth" | "avgMinutes">,
  providers: ProviderSelection,
  budget: number,
): CostSuggestion | undefined {
  const minutes = config.callsPerMonth * config.avgMinutes;
  const currentCost = minutes * effectivePerMinRate(providers);
  if (currentCost <= budget) return undefined;

  const candidates = SWAP_COMPONENTS.map((c) => {
    const current = c.multipliers[providers[c.field]] ?? 1;
    const cheapest = c.options.reduce((best, opt) => ((c.multipliers[opt] ?? 1) < (c.multipliers[best] ?? 1) ? opt : best), c.options[0]);
    const cheapestMult = c.multipliers[cheapest] ?? 1;
    if (cheapestMult >= current) return undefined;
    return {
      field: c.field,
      label: c.label,
      from: providers[c.field],
      to: cheapest,
      monthlySavings: c.base * (current - cheapestMult) * minutes,
    } satisfies ProviderSwap;
  }).filter((c): c is ProviderSwap => c !== undefined);

  if (candidates.length === 0) return undefined;
  candidates.sort((a, b) => b.monthlySavings - a.monthlySavings);

  const applied: ProviderSwap[] = [];
  let running = { ...providers };
  let runningCost = currentCost;
  for (const swap of candidates) {
    if (runningCost <= budget) break;
    applied.push(swap);
    running = { ...running, [swap.field]: swap.to };
    runningCost = minutes * effectivePerMinRate(running);
  }

  return {
    swaps: applied,
    newMonthlyCost: runningCost,
    monthlySavings: currentCost - runningCost,
    stillOverBudget: runningCost > budget,
  };
}

const MIN_CALLS_PER_MONTH = 100;
const CALLS_STEP = 50;

export interface VolumeSuggestion {
  newCallsPerMonth: number;
  newMonthlyCost: number;
  /** True if even the minimum call volume this app allows still exceeds budget. */
  stillOverBudget: boolean;
}

/**
 * The alternative lever to swapping providers: how far call volume would have
 * to drop, at the current providers, to fit the budget. Never auto-applies.
 */
export function suggestLowerVolume(
  config: Pick<DeployConfig, "callsPerMonth" | "avgMinutes">,
  providers: ProviderSelection | undefined,
  budget: number,
): VolumeSuggestion | undefined {
  const costPerCall = config.avgMinutes * effectivePerMinRate(providers);
  if (costPerCall <= 0) return undefined;
  const currentCost = config.callsPerMonth * costPerCall;
  if (currentCost <= budget) return undefined;

  const maxAffordable = Math.floor(budget / costPerCall / CALLS_STEP) * CALLS_STEP;
  const newCallsPerMonth = Math.max(MIN_CALLS_PER_MONTH, maxAffordable);
  if (newCallsPerMonth >= config.callsPerMonth) return undefined;

  const newMonthlyCost = newCallsPerMonth * costPerCall;
  return { newCallsPerMonth, newMonthlyCost, stillOverBudget: newMonthlyCost > budget };
}
