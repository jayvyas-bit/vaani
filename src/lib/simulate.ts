import type { DeployConfig } from "./deploy";
import { businessNameOf, toneBand, voiceFirstName } from "./persona";
import { bookingTool, enabledTransferTool, workingBookingTool, workingTransferTool } from "./tools";
import type {
  Agent,
  BusinessDetails,
  BusinessRule,
  KnowledgeSource,
  LimitType,
  SafetyToggle,
  Scenario,
  ToolDef,
  Verdict,
} from "./types";

/**
 * Prototype stand-in for the eval + LLM backend. Nothing here is random:
 * verdicts and replies are derived from what is actually configured on the
 * agent (rules, tools, knowledge, prompt), so changing the config changes
 * the outcome.
 */

export interface AgentContext {
  agent: Agent;
  rules: BusinessRule[];
  tools: ToolDef[];
  knowledge: KnowledgeSource[];
  safety?: SafetyToggle[];
  deploy?: DeployConfig;
}

const STOPWORDS = new Set(
  "the and for with that this from your you are was were will what when then than they them their there have has had not but can could would should into about after before over under just like only also once each more most other some such very caller recipient agent call calls asks says said offers offer gives give without instead still does doesn".split(
    " ",
  ),
);

/** Callers and rule authors rarely use the same word — fold common synonyms together. */
const SYNONYMS: Record<string, string> = {
  cost: "price",
  costs: "price",
  charge: "price",
  charges: "price",
  quote: "price",
  quotes: "price",
  rate: "price",
  rates: "price",
  fee: "price",
  fees: "price",
  fix: "repair",
  fixing: "repair",
  repairs: "repair",
  appt: "appointment",
};

export function tokens(text: string): Set<string> {
  const out = new Set<string>();
  for (const word of text.toLowerCase().split(/[^a-z0-9]+/)) {
    const raw = SYNONYMS[word] ?? word;
    if (raw.length < 4 || STOPWORDS.has(raw)) continue;
    out.add(raw.endsWith("s") && raw.length > 4 ? raw.slice(0, -1) : raw);
  }
  return out;
}

function overlap(a: Set<string>, b: Set<string>) {
  let n = 0;
  for (const t of a) if (b.has(t)) n++;
  return n;
}

function has(text: string, re: RegExp) {
  return re.test(text);
}

function lowerFirst(s: string) {
  return s.charAt(0).toLowerCase() + s.slice(1);
}

function stripPeriod(s: string) {
  return s.trim().replace(/[.\s]+$/, "");
}

const typeKeywords: { type: LimitType; re: RegExp }[] = [
  { type: "escalation_trigger", re: /\b(pain|swollen|swelling|emergency|urgent|dispute|isn'?t my debt|not my debt|escalat|crisis|angry|threat)/ },
  { type: "payment_plan_limit", re: /\b(payment plan|month plan|installment|per month|\/month|\d+-month)/ },
  { type: "discount_limit", re: /\b(discount|promo|promotion|coupon|% off|percent off)/ },
  {
    type: "follow_up_limit",
    re: /\b(no answer|didn'?t (answer|pick up)|doesn'?t (answer|pick up)|unreachable|repeated(ly)? (call|dial|try)|call attempt|max(?:imum)? attempts|attempt limit|retr(?:y|ies)|give up (calling|trying)|stop (calling|trying|dialing) after)/,
  },
  { type: "forbidden_promise", re: /\b(price|cost|quote|charge|legal action|lawsuit|guarantee|promise|refund)/ },
];

const typeLabel: Record<LimitType, string> = {
  discount_limit: "discount limit",
  forbidden_promise: "forbidden-promise",
  escalation_trigger: "escalation trigger",
  payment_plan_limit: "payment plan limit",
  follow_up_limit: "follow-up limit",
};

function ruleTokens(r: BusinessRule) {
  return tokens(`${r.label} ${r.threshold ?? ""} ${r.priceFloor ?? ""} ${r.action}`);
}

/**
 * Best rule for a piece of text. With a detected limit type, the rule must be
 * of that type and share at least one word; without one, it must share at
 * least two words with the rule’s own label (so a stray word like "slot"
 * doesn’t credit an unrelated rule).
 */
function matchRule(text: string, rules: BusinessRule[], type?: LimitType): BusinessRule | undefined {
  const t = tokens(text);
  const pool = type ? rules.filter((r) => r.limitType === type) : rules;
  let best: BusinessRule | undefined;
  let bestScore = 0;
  for (const r of pool) {
    const words = type ? overlap(t, ruleTokens(r)) : overlap(t, tokens(r.label));
    if (words < (type ? 1 : 2)) continue;
    const score = words + (r.enabled ? 0.5 : 0);
    if (score > bestScore) {
      best = r;
      bestScore = score;
    }
  }
  return best;
}

function detectTypes(text: string): LimitType[] {
  return typeKeywords.filter((k) => k.re.test(text)).map((k) => k.type);
}

/**
 * More than one keyword type can match the same text (e.g. "financing,
 * interest rate, or discounts" matches both forbidden_promise and
 * discount_limit). Try each matched type in declared order and use
 * whichever one actually resolves to a rule, instead of locking in on
 * the first keyword match even when a later-matched type is the one the
 * agent actually has a rule for.
 */
function matchTypedRule(
  text: string,
  rules: BusinessRule[],
): { rule: BusinessRule | undefined; type: LimitType | undefined } {
  const types = detectTypes(text);
  for (const t of types) {
    const rule = matchRule(text, rules, t);
    if (rule) return { rule, type: t };
  }
  if (types.length === 0) return { rule: matchRule(text, rules), type: undefined };
  return { rule: undefined, type: types[0] };
}

/* ------------------------------------------------------------------ */
/* Party-size / headcount thresholds ("party of 9 or more")             */
/* ------------------------------------------------------------------ */

const PARTY_WORDS = /\b(part(?:y|ies)|groups?|guests?|people|persons|headcount|table size)\b/i;

/** A headcount mentioned in free text: "party of 15", "a table for 12", "20 people". */
function partySizeIn(text: string): number | undefined {
  const m =
    text.match(/\b(?:part(?:y|ies)|groups?|table|booking|reservation)s?\s+(?:of|for)\s+(\d+)\b/i) ??
    text.match(/\b(\d+)\s+(?:people|guests|persons|diners)\b/i);
  return m ? Number(m[1]) : undefined;
}

/**
 * An escalation_trigger rule whose label/threshold encodes a minimum
 * headcount (e.g. "party of 9 or more"). Its condition only ever lives in
 * free text, so this is the one number in that text worth trusting — word
 * overlap against the rest of the label is too unreliable to match on.
 */
function partySizeThreshold(rule: BusinessRule): number | undefined {
  if (rule.limitType !== "escalation_trigger") return undefined;
  const source = `${rule.threshold ?? ""} ${rule.label}`;
  if (!PARTY_WORDS.test(source)) return undefined;
  const m = source.match(/\b(\d+)\s*(?:\+|or more|or above|or higher|and up)\b/i);
  return m ? Number(m[1]) : undefined;
}

function findTool(tools: ToolDef[], re: RegExp) {
  return tools.find((t) => t.enabled && re.test(`${t.name} ${t.description}`.toLowerCase()));
}

/* ------------------------------------------------------------------ */
/* Numeric limits ("Up to 6 months, min $25/mo")                        */
/* ------------------------------------------------------------------ */

type LimitUnit = "months" | "usd" | "percent";

interface NumericLimit {
  unit: LimitUnit;
  bound: "max" | "min";
  value: number;
}

interface Amount {
  unit: LimitUnit;
  value: number;
}

function amountsIn(text: string): Amount[] {
  const out: Amount[] = [];
  // Only a bare "12-month" / "6 months" counts — "$15/month" is a dollar amount.
  const months = text.match(/(?<![\d/$.])(\d+)\s*-?\s*months?\b/i);
  if (months) out.push({ unit: "months", value: Number(months[1]) });
  const usd = text.match(/\$\s?(\d+(?:\.\d+)?)/);
  if (usd) out.push({ unit: "usd", value: Number(usd[1]) });
  const pct = text.match(/(\d+(?:\.\d+)?)\s?(%|percent)/i);
  if (pct) out.push({ unit: "percent", value: Number(pct[1]) });
  return out;
}

/** Parse a rule threshold into bounds. Each comma/semicolon/"and" clause is one bound. */
export function parseLimits(threshold: string | undefined): NumericLimit[] {
  if (!threshold) return [];
  const out: NumericLimit[] = [];
  for (const clause of threshold.split(/[,;]|\band\b/i)) {
    const c = clause.toLowerCase();
    const bound: NumericLimit["bound"] = /(\bmin\b|minimum|at least|no less than|or more)/.test(c) ? "min" : "max";
    // One bound per clause; a "$25/mo" clause is a dollar amount, not a month count.
    const found = amountsIn(clause);
    const first = found.find((a) => a.unit === "usd") ?? found[0];
    if (first) out.push({ ...first, bound });
  }
  return out;
}

export function describeAmount(a: Amount, perMonth: boolean) {
  if (a.unit === "usd") return `$${a.value}${perMonth ? "/month" : ""}`;
  if (a.unit === "percent") return `${a.value}%`;
  return `${a.value} month${a.value === 1 ? "" : "s"}`;
}

export function describeBreach(l: NumericLimit, perMonth: boolean) {
  const v = l.unit === "months" ? `${l.value}-month` : describeAmount(l, perMonth);
  return l.bound === "max" ? `over the ${v} cap` : `under the ${v} minimum`;
}

interface LimitCheck {
  requested: Amount[];
  breaches: NumericLimit[];
}

/** Compare the numbers a scenario asks for against a rule’s limits. */
export function checkLimits(rule: BusinessRule, request: string): LimitCheck | undefined {
  if (rule.limitType !== "payment_plan_limit" && rule.limitType !== "discount_limit") return undefined;
  const limits = parseLimits(rule.threshold);
  if (rule.limitType === "discount_limit" && rule.priceFloor) {
    const floor = amountsIn(rule.priceFloor).find((a) => a.unit === "usd");
    if (floor) limits.push({ unit: "usd", bound: "min", value: floor.value });
  }
  const requested = amountsIn(request);
  if (limits.length === 0 || requested.length === 0) return undefined;
  const breaches = limits.filter((l) => {
    const r = requested.find((a) => a.unit === l.unit);
    if (!r) return false;
    return l.bound === "max" ? r.value > l.value : r.value < l.value;
  });
  return { requested, breaches };
}

/** Does the rule’s action say what happens when a request falls outside its limits? */
function handlesOutOfLimit(action: string) {
  return /(beyond|over the|above|exceed|outside|otherwise|longer|more than|review|escalat|transfer|teammate|person|declin|refus|deny|counter)/i.test(
    action,
  );
}

/**
 * A breach isn’t only handled by the rule that defines the limit — a separate
 * "Never do" or "Hand to a person" rule can cover the same scenario. Search
 * every other enabled rule (any type) for one whose action actually handles
 * an out-of-limit request and that’s clearly about the same thing.
 */
function coveringRule(rules: BusinessRule[], primary: BusinessRule, text: string): BusinessRule | undefined {
  const textTokens = tokens(text);
  let best: BusinessRule | undefined;
  let bestScore = 0;
  for (const r of rules) {
    if (r.id === primary.id || !r.enabled || !handlesOutOfLimit(r.action)) continue;
    const score = overlap(textTokens, ruleTokens(r));
    if (score > bestScore) {
      best = r;
      bestScore = score;
    }
  }
  return best;
}

/**
 * Someone asking to be handed to a teammate — distinct from the word "human"
 * or "transfer" appearing incidentally (e.g. a rule that "flags the lead for
 * a human follow-up decision" is an internal process note, not a caller
 * requesting a handoff).
 */
const requestsHandoff = (text: string) =>
  /(real person|speak (?:to|with) (?:a |an )?(?:person|human|representative|someone)|ask(?:s|ed|ing)? (?:for|to speak (?:to|with)) (?:a )?(?:person|human|representative|manager|teammate)|transfer (?:to|me|the call|them|him|her|us)|put (?:me|us|them) through|\brepresentative\b|\bteammate\b|\bmanager\b)/.test(
    text,
  );

const promisesTransfer = (text: string) =>
  /(transfer|connect (you|them|the caller|the person) (to|with)|hand (it|the call|them) (off|over)|put (you|them) through)/i.test(text);

/** A tool/API/system that’s down, erroring, or not responding — distinct from a request simply being denied. */
const toolFailureFramed = (text: string) =>
  /(api (fail|failure|down|error|outage)|system (is )?down|service (is )?(down|unavailable)|can'?t reach|not responding|500 error|times? ?out|timeout|outage|offline|unreachable)/i.test(
    text,
  );

/** The record being asked about doesn’t exist, rather than a tool being broken. */
const notFoundFramed = (text: string) =>
  /(doesn'?t exist|does not exist|no such (order|account|record|customer)|no record|not found|can'?t find|couldn'?t find|missing order|no matching)/i.test(
    text,
  );

/** Does the tool’s own description say what to do when it fails or comes up empty? */
function handlesToolFailure(description: string) {
  return /(apologi|do not guess|don'?t guess|transfer|escalat|log a case|case id|honest|instead of inventing|can'?t be logged automatically|without guessing)/i.test(
    description,
  );
}

/** Best enabled tool for a piece of text, by name+description word overlap. */
function bestTool(text: string, tools: ToolDef[]): ToolDef | undefined {
  const t = tokens(text);
  let best: ToolDef | undefined;
  let bestScore = 0;
  for (const tool of tools) {
    if (!tool.enabled) continue;
    const score = overlap(t, tokens(`${tool.name} ${tool.description}`));
    if (score > bestScore) {
      best = tool;
      bestScore = score;
    }
  }
  return best;
}

function findKnowledge(text: string, knowledge: KnowledgeSource[]) {
  const t = tokens(text);
  let best: KnowledgeSource | undefined;
  let bestScore = 0;
  for (const k of knowledge) {
    if (!k.attached) continue;
    const score = overlap(t, tokens(`${k.name} ${k.body ?? ""}`));
    if (score > bestScore) {
      best = k;
      bestScore = score;
    }
  }
  return best;
}

/* ------------------------------------------------------------------ */
/* Scenario evaluation                                                  */
/* ------------------------------------------------------------------ */

export interface Evaluation {
  verdict: Exclude<Verdict, "not-run">;
  reason: string;
  /** A pass that rests on a written guardrail alone: the scenario depends on a system no enabled tool provides. */
  ruleOnly?: boolean;
}

/** Words that mean the scenario needs a connected system to be real, not just a written rule. */
const SYSTEM_WORDS = /\b(system|ticket|calendar|crm|ats|api|database|record|lookup|look up|dispatch|inventory|registration|registered|payment|paid|booking|booked|slot|waitlist|seat|account|reservation)\b/;

/**
 * A cheap fingerprint of everything a verdict is computed from. Compare it
 * against a scenario's `lastRunSignature` to tell whether a passed/failed
 * verdict still reflects the agent's current config.
 */
export function contextSignature(ctx: AgentContext): string {
  return JSON.stringify({
    // Lifecycle status changes when a run happens; it never changes a verdict.
    agent: { ...ctx.agent, status: undefined },
    rules: ctx.rules,
    tools: ctx.tools,
    knowledge: ctx.knowledge,
    safety: ctx.safety,
    // Only the one deploy setting a verdict reads; opening Deploy must not mark results stale.
    voicemailOff: ctx.deploy?.voicemailDetect === false,
  });
}

export function evaluateScenario(scenario: Scenario, ctx: AgentContext): Evaluation {
  const result = evaluateCore(scenario, ctx);
  const hasSystemTool = ctx.tools.some((t) => t.enabled && !/transfer/i.test(`${t.name} ${t.description}`));
  const ruleOnly = result.verdict === "pass" && !hasSystemTool && SYSTEM_WORDS.test(`${scenario.title} ${scenario.criteria}`.toLowerCase());
  return ruleOnly ? { ...result, ruleOnly: true } : result;
}

function evaluateCore(scenario: Scenario, ctx: AgentContext): Evaluation {
  const text = `${scenario.title} ${scenario.criteria}`.toLowerCase();
  const prompt = ctx.agent.systemPrompt.toLowerCase();

  const who = ctx.agent.direction === "inbound" ? "The caller" : "The recipient";

  if (scenario.title.startsWith("Flagged reply")) {
    return {
      verdict: "inconclusive",
      reason: "Flagged in a test session. A reworded reply can’t be judged from settings alone — start a test call to check it.",
    };
  }

  // 0. Behaviour that only exists on a live call: barge-in and a transfer that
  // fails to connect. A text simulator cannot observe either, so never pass them.
  // Lookups and submissions need a connected system of record. Without a non-transfer tool, nothing here can find a
  // policy or return a claim ID, so a text run must not pass them.
  const hasSystemTool = ctx.tools.some((t) => t.enabled && !/transfer/i.test(`${t.name} ${t.description}`));
  if (/(claims? system|claim id|not found|lookup|look up|submission|submit)/.test(text) && /(policy|claim|record|account)/.test(text) && !hasSystemTool) {
    return {
      verdict: "inconclusive",
      reason: "No lookup or claims tool is connected, so this agent cannot find a record or return a claim ID. Connect a system tool and test it with real data. Until then it should only note the claim and hand off.",
    };
  }
  // Spotting a repeat request needs a record to check against; with no system tool it can only be noted for a person.
  if (/\b(already (open|reported|logged)|duplicate|repeat(ed)? (complaint|request|issue)|existing (ticket|request))\b/.test(text) && !hasSystemTool) {
    return {
      verdict: "inconclusive",
      reason: "No ticketing or lookup tool is connected, so this agent cannot see whether a request is already open. Connect a system tool and test it with real data. Until then it can only record the details and flag a possible repeat for a person.",
    };
  }
  // An emergency rule can say "hand to the duty manager", but without a live transfer destination nobody is reachable.
  if (/\b(emergency|fire|smoke|unwell|medical|injur\w*|ambulance|live wire|fallen|hazard\w*|gas leak)\b/.test(text) && !ctx.tools.some((t) => t.enabled && /transfer/i.test(`${t.name} ${t.description}`))) {
    return {
      verdict: "inconclusive",
      reason: "The rule says to hand off, but no Transfer tool is switched on, so no one can actually be reached. Add a transfer to the duty manager, then test with a real number.",
    };
  }
  // Live data that changes mid-call can only be seen on a real call against a real feed; a written rule proves nothing here.
  if (/\b(status|price|fare|availability|stock|queue)\b[^.]{0,40}\b(changes?|changed|updates?)\b[^.]{0,30}\b(during|mid-?call|while|in the middle)\b/.test(text)) {
    return {
      verdict: "inconclusive",
      reason: "Data that changes during a call can only be seen on a live call against a real feed. This demo has no live data. Test it with your real status system and force a change mid-call.",
    };
  }
  // A rule can say "only confirm a slot the calendar returned", but with no calendar tool nothing can ever be confirmed or tested.
  if (/\bcalendar (returned|confirm\w*|shows?)\b/.test(text) && !ctx.tools.some((t) => t.enabled && /(calendar|book|schedul|appointment)/i.test(`${t.name} ${t.description}`))) {
    return {
      verdict: "inconclusive",
      reason: "The guardrail is written, but no calendar or booking tool is connected, so no slot can be confirmed or checked. Until then the agent should only note preferred times for a person to confirm.",
    };
  }
  // Volume cannot be exercised here: the demo never places or receives calls, and no concurrency limit is configured or measured.
  if (/\b(simultaneous|concurrent|at once|at the same time|surge|spike)\b/.test(text) && /\b(calls?|callers?)\b/.test(text)) {
    return {
      verdict: "inconclusive",
      reason: "Peak call volume cannot be tested here. This demo never places or receives calls, and no concurrent-call limit is set or measured. Ask your telephony and voice providers for their limits in writing, then load-test before relying on it. Until then, the agent should have a fallback for callers who cannot get through.",
    };
  }
  // A language switch needs the language configured; the quality of the speech can only be heard on a live call.
  if (/(switch|chang|speak|reply|respond)\w*[^.]{0,40}\b(hindi|english|language)\b|\b(hindi|english)\b[^.]{0,30}\b(mid-call|midway|switch)/.test(text) && /\b(hindi|language)\b/.test(text)) {
    const lang = ctx.agent.language ?? "en";
    if (lang !== "en-hi" && lang !== "hi") {
      return { verdict: "fail", reason: "The agent is set to English only, so it has no configured Hindi to switch into. Set the language to English + Hindi (bilingual)." };
    }
    return { verdict: "inconclusive", reason: "Bilingual is configured, but whether the agent switches cleanly and keeps context can only be heard on a live call. Check that your voice provider supports Hindi, then test it." };
  }
  if (/(interrupt|talks? over|barge|mid-sentence)/.test(text)) {
    return { verdict: "inconclusive", reason: "Interruption handling depends on live audio timing. Start a test call and talk over the agent to check it." };
  }
  if (/transfer/.test(text) && /(fail|not connect|didn.?t connect|busy|no answer|unreachable)/.test(text)) {
    return { verdict: "inconclusive", reason: "A failed transfer can only be observed on a live call, because this demo never dials the destination. Test it with a real number." };
  }

  // 1. Tool failure / missing-record scenarios. These need the specific tool’s
  // own fallback language, not a generic guardrail keyword match — without this,
  // "refund" alone would route a failed-lookup or not-found scenario into the
  // forbidden-promise rule below and give it the same reasoning as an unrelated case.
  // With no tools at all, a guardrail that already says what to do (e.g. "never give a restoration time") decides it instead.
  const ruleCovers = !ctx.tools.length && !!matchRule(text, ctx.rules.filter((r) => r.enabled));
  if ((toolFailureFramed(text) || notFoundFramed(text)) && !ruleCovers) {
    const tool = bestTool(text, ctx.tools);
    if (!tool && ctx.tools.some((t) => t.enabled)) {
      return {
        verdict: "inconclusive",
        reason: "Tool failures happen on live calls. Enabled tools exist, but none clearly matches this scenario; run a test call that forces the tool to fail.",
      };
    }
    if (!tool && !ctx.tools.length) {
      return {
        verdict: "inconclusive",
        reason: "This agent has no tools, so there is nothing that can fail. Add a tool (for example call transfer) to make this scenario meaningful.",
      };
    }
    if (!tool) {
      return {
        verdict: "fail",
        reason: "No enabled tool matches this request, so there’s nothing configured here to fail over or fall back on.",
      };
    }
    const sentences = tool.description.split(/(?<=[.!?])\s+/);
    const fallbackSentence = sentences.find((s) => handlesToolFailure(s));
    if (fallbackSentence) {
      return {
        verdict: "pass",
        reason: `“${tool.name}” is enabled and its description spells out the fallback: ${lowerFirst(stripPeriod(fallbackSentence))}.`,
      };
    }
    return {
      verdict: "fail",
      reason: `“${tool.name}” is enabled, but its description doesn’t say what the agent should do if it fails or comes up empty. Add that fallback in Build → Tools.`,
    };
  }

  // 2. Return/cancellation window and similar eligibility windows — a numeric
  // business-rule type doesn’t exist for these, so check rules and knowledge
  // directly instead of falling through to an unrelated keyword match.
  if (has(text, /(return window|return period|exchange window|outside .*(day|window)|expired return|return eligib|cancellation window)/)) {
    const ruleHit = ctx.rules.find((r) => r.enabled && /(return|exchange|eligib)/i.test(`${r.label} ${r.action}`));
    if (ruleHit) {
      return {
        verdict: "pass",
        reason: `“${ruleHit.label}” covers this — agent will ${lowerFirst(stripPeriod(ruleHit.action))}.`,
      };
    }
    const source = findKnowledge(text, ctx.knowledge);
    if (source) {
      return { verdict: "pass", reason: `Answerable from attached knowledge: “${source.name}”.` };
    }
    return {
      verdict: "fail",
      reason:
        "No guardrail rule or attached knowledge source defines the return/eligibility window, so the agent has nothing to check this against. Add one in Build → Guardrails or Knowledge.",
    };
  }

  // 3a. Party-size / headcount escalation thresholds, matched by the actual
  // number in the text — a rule label like "party of 9 or more" rarely
  // shares words with scenario text ("a table for 15 people"), and a
  // party-of-4 or an unrelated scenario can coincidentally share words
  // ("party", "reservation") with that label without breaching its threshold.
  const requestedSize = partySizeIn(text);
  if (requestedSize !== undefined) {
    const sizeRule = ctx.rules.find((r) => {
      const threshold = partySizeThreshold(r);
      return threshold !== undefined && requestedSize >= threshold;
    });
    if (sizeRule) {
      if (!sizeRule.enabled) {
        return { verdict: "fail", reason: `Rule “${sizeRule.label}” exists but is turned off, so nothing enforces it on the call.` };
      }
      const action = lowerFirst(stripPeriod(sizeRule.action));
      if (promisesTransfer(sizeRule.action) && !workingTransferTool(ctx.tools)) {
        const half = enabledTransferTool(ctx.tools);
        return {
          verdict: "fail",
          reason: half
            ? `“${sizeRule.label}” says to ${action}, but “${half.name}” has no destination set. Add one in Build → Tools.`
            : `“${sizeRule.label}” says to ${action}, but call transfer isn’t set up. Add it in Build → Tools.`,
        };
      }
      return {
        verdict: "pass",
        reason: `${who} asks for a party of ${requestedSize}, which meets “${sizeRule.label}” — agent will ${action}.`,
      };
    }
  }

  // 3b. Business rules — typed keywords first, then plain-word overlap. Rules
  // with a parseable party-size threshold are matched only by 3a above, never
  // by word overlap, since their label’s vocabulary ("party", "reservation")
  // is too generic in this domain to trust as a coincidental match.
  const sizeRuleIds = new Set(ctx.rules.filter((r) => partySizeThreshold(r) !== undefined).map((r) => r.id));
  const matchableRules = ctx.rules.filter((r) => !sizeRuleIds.has(r.id));
  const { rule, type } = matchTypedRule(text, matchableRules);
  if (rule) {
    if (!rule.enabled) {
      return { verdict: "fail", reason: `Rule “${rule.label}” exists but is turned off, so nothing enforces it on the call.` };
    }
    const action = lowerFirst(stripPeriod(rule.action));

    // Numbers in the request (title only — criteria usually restate the limit).
    const check = checkLimits(rule, scenario.title);
    if (check && check.breaches.length > 0) {
      const perMonth = rule.limitType === "payment_plan_limit";
      const asked = check.requested.map((a) => describeAmount(a, perMonth)).join(" at ");
      const breach = check.breaches.map((l) => describeBreach(l, perMonth)).join(" and ");
      if (!handlesOutOfLimit(rule.action)) {
        const backup = coveringRule(ctx.rules, rule, text);
        if (backup) {
          const backupAction = lowerFirst(stripPeriod(backup.action));
          if (promisesTransfer(backup.action) && !workingTransferTool(ctx.tools)) {
            const half = enabledTransferTool(ctx.tools);
            return {
              verdict: "fail",
              reason: half
                ? `“${backup.label}” says to ${backupAction}, but “${half.name}” has no destination set. Add one in Build → Tools.`
                : `“${backup.label}” says to ${backupAction}, but call transfer isn’t set up. Add it in Build → Tools.`,
            };
          }
          return {
            verdict: "pass",
            reason: `${who} asks for ${asked}, which is ${breach} in “${rule.label}”. That rule alone doesn’t say what happens next, but “${backup.label}” covers it: ${backupAction}.`,
          };
        }
        return {
          verdict: "fail",
          reason: `${who} asks for ${asked}, which is ${breach} in “${rule.label}”. That rule only says what to do inside its limits (${action}) — nothing tells the agent to decline or send this for review. Add that in Build → Guardrails.`,
        };
      }
      return {
        verdict: "pass",
        reason: `${who} asks for ${asked}, which is ${breach} in “${rule.label}”, and the rule covers that: ${action}.`,
      };
    }

    // A rule that hands off needs a transfer that can actually complete.
    if (promisesTransfer(rule.action) && !workingTransferTool(ctx.tools)) {
      const half = enabledTransferTool(ctx.tools);
      return {
        verdict: "fail",
        reason: half
          ? `“${rule.label}” says to ${action}, but “${half.name}” has no destination set. Add one in Build → Tools.`
          : `“${rule.label}” says to ${action}, but call transfer isn’t set up. Add it in Build → Tools.`,
      };
    }

    if (check) {
      return {
        verdict: "pass",
        reason: `Within “${rule.label}”${rule.threshold ? ` (${rule.threshold})` : ""} — agent will ${action}.`,
      };
    }
    return { verdict: "pass", reason: `Covered by rule “${rule.label}” — agent will ${action}.` };
  }
  if (type) {
    const sameType = ctx.rules.some((r) => r.limitType === type);
    return {
      verdict: "fail",
      reason: sameType
        ? `None of this agent’s ${typeLabel[type]} rules cover this, so nothing enforces “${stripPeriod(scenario.criteria)}”.`
        : `No ${typeLabel[type]} rule on this agent, so nothing enforces “${stripPeriod(scenario.criteria)}”. Add one in Build → Guardrails.`,
    };
  }

  // 4. Do-not-call requests.
  if (has(text, /(never be called|stop calling|do-not-call|do not call|dnc)/)) {
    const tool = findTool(ctx.tools, /(do-not-call|do not call|dnc|suppress)/);
    return tool
      ? { verdict: "pass", reason: `“${tool.name}” is enabled, so the request is honored immediately.` }
      : { verdict: "fail", reason: "No do-not-call tool is enabled, so the agent can’t actually suppress the number." };
  }

  // 5. Booking / rescheduling.
  if (has(text, /(book|reschedul|appointment|schedul|slot)/)) {
    const tool = bookingTool(ctx.tools);
    const failureFramed = has(
      text,
      /(api (fail|failure|down|error|outage)|calendar (fail|failure|down|error|unavailable|outage)|system (is )?down|service (is )?(down|unavailable)|can'?t reach|not responding|500 error|times? ?out|timeout|outage|offline)/,
    );
    if (failureFramed) {
      if (!tool) {
        return {
          verdict: "fail",
          reason: "No booking or calendar tool is enabled, so there’s no integration here to fail over in the first place.",
        };
      }
      const connected = workingBookingTool(ctx.tools);
      return {
        verdict: "inconclusive",
        reason: `“${tool.name}” is enabled, but ${connected ? "its calendar connection is simulated for testing" : "it isn’t connected to a real calendar"} — this prototype has no live backend to actually fail, so a real API-failure path can’t be verified from config alone. Test this with a real calendar integration before relying on it.`,
      };
    }
    if (!tool) {
      return { verdict: "fail", reason: "No booking or calendar tool is enabled, so the agent can’t find or move appointments." };
    }

    // Prefer a specific guardrail rule or knowledge source over a generic
    // "the tool is on" claim — otherwise unrelated booking scenarios (model
    // availability, rescheduling, overbooking) all get the same boilerplate.
    const ruleHit = matchRule(text, ctx.rules);
    if (ruleHit) {
      if (!ruleHit.enabled) {
        return { verdict: "fail", reason: `Rule “${ruleHit.label}” exists but is turned off, so nothing enforces it on the call.` };
      }
      return {
        verdict: "pass",
        reason: `“${tool.name}” is enabled, and “${ruleHit.label}” covers this — agent will ${lowerFirst(stripPeriod(ruleHit.action))}.`,
      };
    }
    const source = findKnowledge(text, ctx.knowledge);
    if (source) {
      return {
        verdict: "pass",
        reason: `“${tool.name}” is enabled, and this is answerable from attached knowledge: “${source.name}”.`,
      };
    }
    const promptHits = overlap(tokens(text), tokens(prompt));
    if (promptHits >= 2) {
      return {
        verdict: "pass",
        reason: `“${tool.name}” is enabled, and the system prompt specifically addresses this.`,
      };
    }
    return {
      verdict: "inconclusive",
      reason: `“${tool.name}” is enabled, but nothing in the prompt, rules, or knowledge specifically addresses this beyond having a booking tool on. Start a test call to check the actual behavior, or add a rule/knowledge source for it in Build.`,
    };
  }

  // 6. Handoff to a teammate.
  if (requestsHandoff(text)) {
    const working = workingTransferTool(ctx.tools);
    const half = enabledTransferTool(ctx.tools);
    const promises = promisesTransfer(prompt);
    if (working) {
      return {
        verdict: "pass",
        reason: `“${working.name}” sends the call to ${working.destination!.trim()}${promises ? ", and the prompt offers it" : ""}.`,
      };
    }
    if (half) {
      return {
        verdict: "fail",
        reason: `“${half.name}” is on but has no “Transfer to” destination, so the handoff can’t complete. Add one in Build → Tools.`,
      };
    }
    if (promises) {
      return {
        verdict: "fail",
        reason: `The agent promises to transfer ${
          ctx.agent.direction === "outbound" ? "recipients" : "callers"
        }, but call transfer isn’t set up. Add it in Build → Tools.`,
      };
    }
    const callback = /(call (them|you) back|callback|take (their|a) (name|message))/.test(prompt);
    const criteriaAcceptCallback = /(callback|call (them|you) back|otherwise)/i.test(scenario.criteria);
    if (callback && criteriaAcceptCallback) {
      return {
        verdict: "pass",
        reason:
          "No call transfer is set up, so the agent takes their name and number for a teammate to call back — and doesn’t promise more. Add a Transfer call tool in Build → Tools to hand calls over live.",
      };
    }
    return {
      verdict: "fail",
      reason: callback
        ? "The agent can only offer a callback — call transfer isn’t set up. Add it in Build → Tools."
        : "Nothing lets the agent hand the call to a teammate. Add a Transfer call tool in Build → Tools.",
    };
  }

  // 7. Identity / disclosure.
  if (has(text, /(identity|verify|verified|spouse|disclos|account holder|date of birth)/)) {
    return /(verify|verified|identity|date of birth|account holder)/.test(prompt)
      ? { verdict: "pass", reason: "System prompt requires identity verification before sharing details." }
      : { verdict: "fail", reason: "System prompt never tells the agent to verify identity before sharing account details." };
  }

  // 8. Voicemail (outbound).
  if (has(text, /voicemail/)) {
    return ctx.deploy?.voicemailDetect === false
      ? { verdict: "fail", reason: "Voicemail detection is off in Deploy, so the agent runs its live script at the beep." }
      : { verdict: "pass", reason: "Voicemail detection is on — the agent leaves your name and callback number only, no account details." };
  }

  // 9. Audio-dependent behavior can’t be judged from config alone.
  if (has(text, /(silent|silence|no response)/)) {
    return { verdict: "inconclusive", reason: "Silence handling depends on live call timing — start a test call to check it." };
  }
  if (has(text, /(mumble|hard to parse|unclear|accent|noisy|background noise)/)) {
    return ctx.agent.sttProvider.toLowerCase().includes("noisy")
      ? { verdict: "pass", reason: "Noisy-environment speech-to-text is selected, and the prompt asks before guessing." }
      : { verdict: "inconclusive", reason: "Depends on speech-to-text accuracy; try the noisy-environment model in Persona → Advanced." };
  }

  // 10. "What is this call about" — purpose.
  if (has(text, /(what this line|who is calling|what can you|purpose|what.*help with|why)/)) {
    return ctx.agent.purpose.trim().length > 10
      ? { verdict: "pass", reason: "The agent’s purpose is in its prompt, so it can explain the call accurately." }
      : { verdict: "fail", reason: "The agent has no purpose line to explain the call from." };
  }

  // 11. Knowledge lookups.
  const source = findKnowledge(text, ctx.knowledge);
  if (source) return { verdict: "pass", reason: `Answerable from attached knowledge: “${source.name}”.` };

  // 12. Fallback: does anything in the config address it?
  const config = tokens(
    [ctx.agent.systemPrompt, ctx.agent.purpose, ...ctx.tools.filter((t) => t.enabled).map((t) => `${t.name} ${t.description}`)].join(" "),
  );
  const hits = overlap(tokens(text), config);
  if (hits >= 2) return { verdict: "pass", reason: "The prompt and enabled tools address this directly." };
  return {
    verdict: "inconclusive",
    reason: "Nothing in this agent’s prompt, rules, tools or knowledge addresses this yet.",
  };
}

/* ------------------------------------------------------------------ */
/* Chat replies                                                         */
/* ------------------------------------------------------------------ */

function toned(ctx: AgentContext, formal: string, balanced: string, warm: string) {
  const band = toneBand(ctx.agent.tone);
  return band === "formal" ? formal : band === "warm" ? warm : balanced;
}

/** Quote a listed offering or the hours when the caller asks about them — never anything unlisted. */
function answerFromDetails(text: string, details: BusinessDetails | undefined): string | undefined {
  if (!details) return undefined;
  if (details.hours?.trim() && /\b(hours?|open|close|closing|opening)\b/.test(text)) {
    return `We’re open ${stripPeriod(details.hours.trim())}.`;
  }
  const t = tokens(text);
  let bestFaq: { answer: string } | undefined;
  let bestFaqScore = 0;
  for (const f of details.faqs ?? []) {
    if (!f.question.trim() || !f.answer.trim()) continue;
    const score = overlap(t, tokens(f.question));
    if (score > bestFaqScore) {
      bestFaq = f;
      bestFaqScore = score;
    }
  }
  if (bestFaq) return bestFaq.answer.trim();
  let best: { name: string; price?: string } | undefined;
  let bestScore = 0;
  for (const o of details.offerings) {
    if (!o.name.trim()) continue;
    const score = overlap(t, tokens(o.name));
    if (score > bestScore) {
      best = o;
      bestScore = score;
    }
  }
  if (!best) return undefined;
  const price = best.price?.trim();
  return price
    ? /\d/.test(price)
      ? `${best.name.trim()} is ${price}. Would you like to go ahead?`
      : `Pricing for ${best.name.trim()}: ${price.charAt(0).toLowerCase()}${price.slice(1)}. Would you like a teammate to follow up?`
    : `Yes, we offer ${best.name.trim()}. I don’t have a price to quote, so I’ll have a teammate confirm it with you.`;
}

export function simulateReply(message: string, ctx: AgentContext): string {
  const text = message.toLowerCase();
  const name = businessNameOf(ctx.agent);
  const who = voiceFirstName(ctx.agent.voice);
  const purpose = ctx.agent.purpose.trim() ? lowerFirst(stripPeriod(ctx.agent.purpose)) : "help with your request";

  if (requestsHandoff(text) || /\boperator\b/.test(text)) {
    const tool = workingTransferTool(ctx.tools);
    return tool
      ? toned(ctx, "Certainly. I will transfer you to a member of our team now.", "Of course — I’ll transfer you to a teammate now. One moment.", "Absolutely, no problem at all! I’m connecting you with one of my teammates right now — hang tight.")
      : `I understand. I’ll have a teammate from ${name} call you back. What’s the best number to reach you?`;
  }

  if (/(stop calling|don'?t call|do not call|remove me)/.test(text)) {
    const tool = findTool(ctx.tools, /(do-not-call|do not call|dnc|suppress)/);
    return tool
      ? "Understood — I’ve added your number to our do-not-call list. You won’t hear from us again. Sorry for the interruption."
      : "Understood. I’ll pass your request along so a teammate can remove your number.";
  }

  const requestedSize = partySizeIn(text);
  if (requestedSize !== undefined) {
    const sizeRule = ctx.rules.find((r) => {
      const threshold = partySizeThreshold(r);
      return threshold !== undefined && requestedSize >= threshold;
    });
    if (sizeRule?.enabled) {
      const action = lowerFirst(stripPeriod(sizeRule.action));
      return toned(
        ctx,
        `Thank you for letting me know. For a party of ${requestedSize}, I am not able to confirm that directly — ${action}.`,
        `Got it — for a party of ${requestedSize} I can’t book that directly, so here’s what I’ll do: ${action}.`,
        `Thanks for sharing that! For a party of ${requestedSize} I can’t lock that in myself, so ${action}.`,
      );
    }
  }

  const sizeRuleIds = new Set(ctx.rules.filter((r) => partySizeThreshold(r) !== undefined).map((r) => r.id));
  const matchableRules = ctx.rules.filter((r) => !sizeRuleIds.has(r.id));
  const { rule, type } = matchTypedRule(text, matchableRules);
  if (rule && rule.enabled) {
    const action = lowerFirst(stripPeriod(rule.action));
    const check = checkLimits(rule, message);
    if (check && check.breaches.length > 0) {
      const limits = rule.threshold ? ` (${rule.threshold})` : "";
      return handlesOutOfLimit(rule.action)
        ? `That’s outside what I can offer on this call${limits}, so I’ll ${action}.`
        : `${rule.threshold ? `Our limits are: ${lowerFirst(rule.threshold)}` : "That’s outside our limits"}, so I can’t set that up — and I don’t have instructions for requests beyond that.`;
    }
    switch (rule.limitType) {
      case "forbidden_promise":
        return `That’s not something I’m able to commit to on this call. What I can do: ${action}.`;
      case "escalation_trigger":
        return toned(ctx, `Thank you for telling me. I am escalating this now — ${action}.`, `Thanks for letting me know — that’s important. I’m escalating it now: ${action}.`, `Oh no, I’m sorry you’re dealing with that. Let’s get you taken care of right away — ${action}.`);
      case "discount_limit":
        return `Good news — ${lowerFirst(rule.label)}${rule.threshold ? ` (${rule.threshold})` : ""}. I’ll ${action}.`;
      case "payment_plan_limit":
        return `I can set that up within our limits${rule.threshold ? ` (${rule.threshold})` : ""} — I’ll ${action}.`;
    }
  }
  if (type === "forbidden_promise") {
    return `Let me make sure I give you accurate information on that — I’ll have someone from ${name} follow up with the specifics.`;
  }

  const fact = answerFromDetails(text, ctx.agent.details);
  if (fact) return fact;

  const source = findKnowledge(text, ctx.knowledge);
  if (source) return `Let me check “${source.name}” for that — that’s what I go by for questions like this.`;

  if (/(book|appointment|reschedul|schedule)/.test(text)) {
    const tool = bookingTool(ctx.tools);
    return tool
      ? "I can take care of that. Can I get your full name and date of birth to pull up your record?"
      : `I can’t book directly yet, but I’ll take your details and someone from ${name} will confirm a time with you.`;
  }

  if (/(what can you|what do you do|who (is|are) (this|you)|what is this|what’s this)/.test(text)) {
    return `I’m ${who}, the automated assistant for ${name}. I’m here to ${purpose}. What can I do for you?`;
  }

  if (/^(hi|hello|hey|good (morning|afternoon|evening))\b/.test(text)) {
    return toned(ctx, `Hello. You’ve reached ${name}. How may I assist you?`, `Hi there! You’ve reached ${name}. How can I help?`, `Hey, hi! Great to hear from you — you’ve reached ${name}. What can I do for you today?`);
  }

  if (/(thank|bye|that’s all|that is all)/.test(text)) {
    return toned(ctx, `You’re welcome. Thank you for contacting ${name}. Goodbye.`, `You’re welcome! Thanks for calling ${name} — have a good one.`, `Anytime! It was really nice talking with you — take care, and thanks for calling ${name}!`);
  }

  return toned(
    ctx,
    `Understood. I’m here to ${purpose}. Could you give me a few more details?`,
    `Got it. I’m here to ${purpose} — can you tell me a bit more so I can help?`,
    `Totally hear you! I’m here to ${purpose}, so let’s sort it out together — tell me a little more?`,
  );
}

/* ------------------------------------------------------------------ */
/* Live guardrail enforcement                                          */
/* ------------------------------------------------------------------ */

const FORBIDDEN_PROMISE_PHRASES =
  /\b(i guarantee|guaranteed|i promise|you have my word|i can promise|definitely will|100%\s?(sure|certain)|no question it will)\b/i;

export interface GuardrailBreach {
  rule: BusinessRule;
  reason: string;
}

/**
 * Independently checks what the agent actually said against configured
 * guardrails. `evaluateScenario` only scores written scenario descriptions
 * (title/criteria text) against the config — it never looks at a real
 * generated reply. This runs on every live reply instead, so a rule still
 * gets enforced even when the text that produced the reply didn’t avoid
 * breaking it.
 */
export function auditReply(reply: string, ctx: AgentContext): GuardrailBreach[] {
  const breaches: GuardrailBreach[] = [];

  for (const rule of ctx.rules) {
    if (!rule.enabled) continue;

    if (rule.limitType === "discount_limit" || rule.limitType === "payment_plan_limit") {
      const check = checkLimits(rule, reply);
      if (check && check.breaches.length > 0) {
        const perMonth = rule.limitType === "payment_plan_limit";
        const asked = check.requested.map((a) => describeAmount(a, perMonth)).join(" at ");
        const breach = check.breaches.map((l) => describeBreach(l, perMonth)).join(" and ");
        breaches.push({
          rule,
          reason: `The reply itself states ${asked}, which is ${breach} set by “${rule.label}”${rule.threshold ? ` (${rule.threshold})` : ""}.`,
        });
      }
    }

    if (rule.limitType === "forbidden_promise" && FORBIDDEN_PROMISE_PHRASES.test(reply)) {
      if (overlap(tokens(reply), ruleTokens(rule)) > 0) {
        breaches.push({
          rule,
          reason: `The reply uses an absolute commitment (“guarantee”, “promise”, or similar), which “${rule.label}” says not to do.`,
        });
      }
    }
  }

  return breaches;
}

/* ------------------------------------------------------------------ */
/* cURL → tool schema                                                   */
/* ------------------------------------------------------------------ */

export interface ParsedCurl {
  method: string;
  url: string;
  headers: string[];
  params: string[];
  suggestedName: string;
}

function shellWords(input: string): string[] {
  const s = input.replace(/\\\r?\n/g, " ");
  const out: string[] = [];
  let cur = "";
  let quote: '"' | "'" | null = null;
  let inWord = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (quote) {
      if (c === quote) quote = null;
      else if (c === "\\" && quote === '"' && i + 1 < s.length) cur += s[++i];
      else cur += c;
    } else if (c === '"' || c === "'") {
      quote = c;
      inWord = true;
    } else if (/\s/.test(c)) {
      if (inWord) out.push(cur);
      cur = "";
      inWord = false;
    } else {
      cur += c;
      inWord = true;
    }
  }
  if (inWord) out.push(cur);
  return out;
}

function titleCase(s: string) {
  return s.replace(/[-_]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function parseCurl(input: string): ParsedCurl | { error: string } {
  const words = shellWords(input.trim());
  if (words[0]?.toLowerCase() !== "curl") return { error: "That doesn’t look like a cURL command — it should start with “curl”." };
  let method: string | undefined;
  let url: string | undefined;
  let body: string | undefined;
  const headers: string[] = [];
  for (let i = 1; i < words.length; i++) {
    const w = words[i];
    if (w === "-X" || w === "--request") method = words[++i]?.toUpperCase();
    else if (w.startsWith("-X") && w.length > 2) method = w.slice(2).toUpperCase();
    else if (w === "-H" || w === "--header") {
      const h = words[++i];
      if (h) headers.push(h.split(":")[0].trim());
    } else if (["-d", "--data", "--data-raw", "--data-binary", "--json"].includes(w)) body = words[++i];
    else if (w === "--url") url = words[++i];
    else if (/^https?:\/\//i.test(w)) url = w;
  }
  if (!url) return { error: "Couldn’t find an http(s) URL in that command." };
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { error: `“${url}” isn’t a valid URL.` };
  }
  method = method ?? (body ? "POST" : "GET");

  const params = new Set<string>();
  parsed.searchParams.forEach((_, k) => params.add(k));
  if (body) {
    try {
      const json = JSON.parse(body) as unknown;
      if (json && typeof json === "object" && !Array.isArray(json)) Object.keys(json).forEach((k) => params.add(k));
    } catch {
      body.split("&").forEach((pair) => {
        const k = pair.split("=")[0]?.trim();
        if (k) params.add(k);
      });
    }
  }

  const segments = parsed.pathname.split("/").filter((p) => p && !/^v\d+$/i.test(p) && !/^\d+$/.test(p));
  const last = segments[segments.length - 1] ?? parsed.hostname.split(".")[0];
  const verb = { GET: "Get", POST: "Create", PUT: "Update", PATCH: "Update", DELETE: "Delete" }[method] ?? method;
  return {
    method,
    url: `${parsed.origin}${parsed.pathname}`,
    headers,
    params: [...params],
    suggestedName: `${verb} ${titleCase(last)}`.trim(),
  };
}
