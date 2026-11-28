import { enabledTransferTool } from "./tools";
import type { Agent, AgentLanguage, BusinessDetails, CallDirection, ToolDef, TranscriptTurn } from "./types";

/**
 * Persona "compiler": the greeting and system prompt are written from the
 * agent’s business name, voice, tone and purpose (and, for the prompt, which
 * tools exist). Every persona edit goes through `applyPersonaPatch` so those
 * derived strings never go stale.
 */

export const voiceOptions = [
  "Ava — clear, friendly",
  "Sam — clear, friendly",
  "Maya — warm, even pace",
  "Daniel — calm, neutral pace",
  "Priya — bright, upbeat",
  "Owen — low, steady",
];

const FORMAL_PURPOSE_WORDS = [
  "legal",
  "law",
  "attorney",
  "insurance",
  "debt collection",
  "collections agency",
  "collections department",
  "past-due",
  "past due",
  "compliance",
  "debt",
  "audit",
];
const WARM_PURPOSE_WORDS = ["spa", "concierge", "wellness", "support", "salon", "hospitality", "yoga"];

/**
 * A guess at starting voice/tone from the purpose text the user already
 * typed, instead of every agent starting as the same Ava/Sam-at-50. Still
 * fully editable afterward in Build -> Persona — this only changes what’s
 * pre-filled.
 */
export function inferPersonaDefaults(purpose: string, direction: CallDirection): { voice: string; tone: number } {
  const text = purpose.toLowerCase();
  const inbound = direction === "inbound";
  if (FORMAL_PURPOSE_WORDS.some((w) => text.includes(w))) {
    return { voice: inbound ? voiceOptions[3] : voiceOptions[5], tone: 20 };
  }
  if (WARM_PURPOSE_WORDS.some((w) => text.includes(w))) {
    return { voice: inbound ? voiceOptions[4] : voiceOptions[2], tone: 80 };
  }
  return { voice: inbound ? voiceOptions[0] : voiceOptions[1], tone: 50 };
}

export const agentLanguageLabel: Record<AgentLanguage, string> = {
  en: "English",
  hi: "Hindi",
  "en-hi": "English + Hindi (bilingual)",
};

/** Defaults to "en" for agents created before this field existed. */
export function languageOf(agent: Pick<Agent, "language">): AgentLanguage {
  return agent.language ?? "en";
}

export function voiceFirstName(voice: string) {
  return voice.split(/\s+[—–-]\s+/)[0]?.trim() || "your assistant";
}

export type ToneBand = "formal" | "balanced" | "warm";

export function toneBand(tone: number): ToneBand {
  if (tone <= 33) return "formal";
  if (tone >= 67) return "warm";
  return "balanced";
}

/** The "Allow light humor" toggle is a tone choice, so it’s edited in Persona, not Guardrails. */
export const HUMOR_TOGGLE_ID = "safety_4";

export const toneBandLabel: Record<ToneBand, string> = {
  formal: "Formal & brief",
  balanced: "Balanced",
  warm: "Warm & chatty",
};

function lowerFirst(s: string) {
  return s.charAt(0).toLowerCase() + s.slice(1);
}

function stripPeriod(s: string) {
  return s.trim().replace(/[.\s]+$/, "");
}

/**
 * Words that describe the agent’s job rather than the business. Everything
 * from the first of these on is dropped: "Northside Auto Missed-Appointment
 * Callback" → "Northside Auto", "Riverside Dental Front Desk" → "Riverside Dental".
 */
const ROLE_WORDS = new Set(
  "front desk reception receptionist missed appointment appointments callback callbacks outreach reminder reminders renewal renewals collections collection after-hours scheduling scheduler booking intake follow followup line agent bot assistant sales billing lead leads qualification survey surveys confirmation confirmations dispatch helpline hotline answering".split(
    " ",
  ),
);

/** A caller-facing business name guessed from the internal agent name. */
export function cleanBusinessName(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const isRole = (w: string) => {
    const lower = w.toLowerCase().replace(/[^a-z–-]/g, "");
    return ROLE_WORDS.has(lower) || ROLE_WORDS.has(lower.split(/[-–]/)[0]);
  };
  const cut = words.findIndex((w, i) => i > 0 && isRole(w));
  const kept = cut > 0 ? words.slice(0, cut) : words;
  return kept.join(" ").replace(/[\s,:;–—-]+$/, "") || name.trim();
}

/** The name callers hear on the phone. */
export function businessNameOf(agent: Pick<Agent, "name" | "businessName">): string {
  return agent.businessName?.trim() || cleanBusinessName(agent.name) || "our team";
}

function displayName(agent: Pick<Agent, "name" | "businessName">) {
  return businessNameOf(agent);
}

/**
 * Purpose text is naturally written as "Call customers to…" / "Ring leads
 * about…" — but that phrasing is already implied by "I'm calling", so
 * splicing it in verbatim would read "I'm calling to call customers to…".
 */
const LEADING_CALL_VERB = /^(?:i'?m\s+)?(?:call(?:ing)?|ring(?:ing)?|phon(?:e|ing)|contact(?:ing)?|reach(?:ing)?\s+out\s+to)\b\s*/i;
const LEADING_OBJECT_WORD = /^(?:you|customers?|clients?|recipients?|folks|people|them|leads|contacts)\s*/i;

/**
 * Outbound calls are unsolicited, so the recipient needs a reason before
 * they’re asked for a minute of their time — without it they’re as likely to
 * hang up as to hear the agent out. Inbound doesn’t get this: the caller
 * already knows why they dialed, and will say so.
 */
/** The job is written as instructions to the agent ("…, remind them and offer a plan"); only the first clause belongs in what it says aloud. */
const FOLLOW_ON_INSTRUCTION = /,\s+|\s+and\s+(?=(?:offer|remind|ask|confirm|explain|collect|help|let|tell|make|try|send|log|take)\b)/i;

function outboundPurposeClause(purpose: string): string {
  const body = lowerFirst(stripPeriod(purpose)).split(FOLLOW_ON_INSTRUCTION)[0].trim();
  const verbMatch = body.match(LEADING_CALL_VERB);
  if (!verbMatch) return body ? ` I’m calling to ${body}.` : "";
  // Purpose already named who's being called ("call customers to run a
  // survey") — keep whatever follows its own "to" rather than adding another.
  const rest = body.slice(verbMatch[0].length);
  const toClause = rest.match(/^(?:\S+\s+){0,2}?to\s+(.+)$/i);
  if (toClause) return ` I’m calling to ${toClause[1]}.`;
  const withoutObject = rest.replace(LEADING_OBJECT_WORD, "");
  return withoutObject ? ` I’m calling ${withoutObject.replace(/^with\s+/i, "about ")}.` : "";
}

export function compileGreeting(agent: Agent): string {
  const name = displayName(agent);
  const who = voiceFirstName(agent.voice);
  const band = toneBand(agent.tone);
  if (agent.direction === "inbound") {
    if (band === "formal") return `Thank you for calling ${name}. This is ${who}. How may I assist you?`;
    if (band === "warm") return `Hi there, thanks so much for calling ${name}! This is ${who}. What can I help you with today?`;
    return `Thanks for calling ${name}, this is ${who}. How can I help you today?`;
  }
  const purpose = outboundPurposeClause(agent.purpose);
  if (band === "formal")
    return `Good day. This is ${who}, an automated assistant calling on behalf of ${name}.${purpose} Is this a convenient time to speak?`;
  if (band === "warm")
    return `Hi! This is ${who}, an automated assistant with ${name}, hope your day’s going well.${purpose} Do you have a quick minute to chat?`;
  return `Hi, this is ${who}, an automated assistant with ${name}.${purpose} Do you have a quick minute?`;
}

const toneInstruction: Record<ToneBand, string> = {
  formal: "Keep a formal, professional register: short, precise answers and no small talk.",
  balanced: "Be concise and friendly.",
  warm: "Be warm and conversational: acknowledge how the caller feels, use their name once you have it, and keep a relaxed pace.",
};

/**
 * The handoff line only promises a transfer when a Transfer call tool is
 * actually enabled — otherwise the agent would promise something on a real
 * call that it can’t do. Without one it offers a callback instead.
 */
/** What the agent may state as fact. Empty details add nothing, so older agents compile as before. */
export function detailsInstruction(details: BusinessDetails | undefined): string {
  if (!details) return "";
  const offerings = details.offerings.filter((o) => o.name.trim());
  const lines: string[] = [];
  if (offerings.length > 0) {
    const list = offerings.map((o) => (o.price?.trim() ? `${o.name.trim()} (${o.price.trim()})` : o.name.trim())).join("; ");
    lines.push(`Offerings and prices: ${list}.`);
  }
  const faqs = (details.faqs ?? []).filter((f) => f.question.trim() && f.answer.trim());
  if (faqs.length > 0) {
    lines.push(`Common questions and the answers to give: ${faqs.map((f) => `Q: ${f.question.trim()} A: ${f.answer.trim()}`).join(" | ")}.`);
  }
  if (details.hours?.trim()) lines.push(`Hours: ${stripPeriod(details.hours.trim())}${details.timezone ? ` (${details.timezone.replace(/_/g, " ")} time)` : ""}.`);
  if (details.messageFields?.length) lines.push(`When taking a message, collect: ${details.messageFields.join(", ").toLowerCase()}.`);
  if (details.handoff?.trim()) lines.push(`When you can’t answer, hand off to: ${stripPeriod(details.handoff.trim())}.`);
  if (lines.length === 0) return "";
  return ` ${lines.join(" ")} Quote only these facts; if asked about anything else, say you’ll have a teammate confirm instead of guessing.`;
}

export function compileSystemPrompt(agent: Agent, tools: ToolDef[] = []): string {
  const name = displayName(agent);
  const who = voiceFirstName(agent.voice);
  const purpose = agent.purpose.trim() ? ` Your job: ${lowerFirst(stripPeriod(agent.purpose))}.` : "";
  const other = agent.direction === "inbound" ? "the caller" : "the person you’re calling";
  const handoff = enabledTransferTool(tools)
    ? `If you are unsure or ${other} asks for a person, offer to transfer them to a teammate.`
    : `If you are unsure or ${other} asks for a person, take their name and number so a teammate can call them back.`;
  const language = languageOf(agent);
  const languageInstruction =
    language === "hi"
      ? " Speak only in Hindi."
      : language === "en-hi"
        ? " Speak English by default, and switch fluently to Hindi whenever the other party uses Hindi."
        : "";
  return `You are ${who}, the ${agent.direction} voice assistant for ${name}.${purpose} ${toneInstruction[toneBand(agent.tone)]}${languageInstruction} ${handoff}${detailsInstruction(agent.details)}`;
}

/** Re-write a still-generated system prompt after the agent’s tools change. */
export function recompileForTools(agent: Agent, tools: ToolDef[]): Agent {
  if (agent.promptCustom) return agent;
  const systemPrompt = compileSystemPrompt(agent, tools);
  return systemPrompt === agent.systemPrompt ? agent : { ...agent, systemPrompt };
}

function swapAll(text: string, from: string, to: string) {
  // Guard against tiny fragments (e.g. a 1-letter name mid-edit) rewriting
  // unrelated characters all over a hand-written greeting.
  if (from.length < 3 || from === to) return text;
  return text.split(from).join(to);
}

function swapIdentity(text: string, prev: Agent, next: Agent) {
  let out = swapAll(text, prev.name.trim(), next.name.trim());
  out = swapAll(out, businessNameOf(prev), businessNameOf(next));
  const prevWho = voiceFirstName(prev.voice);
  const nextWho = voiceFirstName(next.voice);
  if (prevWho !== nextWho && prevWho.length >= 2) {
    out = out.replace(new RegExp(`\\b${prevWho.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "g"), nextWho);
  }
  return out;
}

const identityKeys: (keyof Agent)[] = ["name", "businessName", "voice", "tone", "purpose", "direction", "language", "details"];

/**
 * Apply an edit to an agent and keep the compiled greeting / system prompt in
 * sync. Typing into the greeting or prompt directly marks it custom; setting
 * `greetingCustom: false` / `promptCustom: false` regenerates from fields.
 * Pass the agent’s tools so a regenerated prompt knows whether it can transfer.
 */
export function applyPersonaPatch(agent: Agent, patch: Partial<Agent>, tools: ToolDef[] = []): Agent {
  const next: Agent = { ...agent, ...patch };
  if ("greeting" in patch && patch.greetingCustom === undefined) next.greetingCustom = true;
  if ("systemPrompt" in patch && patch.promptCustom === undefined) next.promptCustom = true;

  const identityChanged = identityKeys.some((k) => k in patch);

  if (patch.greetingCustom === false || (identityChanged && !next.greetingCustom)) {
    next.greeting = compileGreeting(next);
  } else if (identityChanged && !("greeting" in patch)) {
    next.greeting = swapIdentity(agent.greeting, agent, next);
  }

  if (patch.promptCustom === false || (identityChanged && !next.promptCustom)) {
    next.systemPrompt = compileSystemPrompt(next, tools);
  } else if (identityChanged && !("systemPrompt" in patch)) {
    next.systemPrompt = swapIdentity(agent.systemPrompt, agent, next);
  }
  return next;
}

/** Sample call shown (opt-in) in the Test panel for agents without a recorded one. */
export function sampleCallTranscript(agent: Agent): TranscriptTurn[] {
  const name = displayName(agent);
  if (agent.direction === "inbound") {
    return [
      { id: "s1", speaker: "agent", text: agent.greeting },
      { id: "s2", speaker: "caller", text: "Hi, I wasn’t sure who to ask. What can you help me with?" },
      {
        id: "s3",
        speaker: "agent",
        text: `Happy to help. I’m the automated assistant for ${name}. What can I do for you today?`,
      },
    ];
  }
  return [
    { id: "s1", speaker: "agent", text: agent.greeting },
    { id: "s2", speaker: "caller", text: "Uh, sure. What’s this about?" },
    {
      id: "s3",
      speaker: "agent",
      text: `Thanks. I’m calling from ${name}, and it should only take a minute. Before I go on, can I confirm I’m speaking with the right person?`,
    },
  ];
}

/** Recorded transcripts always open with whatever the greeting is right now. */
export function withLiveGreeting(transcript: TranscriptTurn[], agent: Agent): TranscriptTurn[] {
  if (transcript.length === 0) return sampleCallTranscript(agent);
  return transcript.map((t, i) => (i === 0 && t.speaker === "agent" ? { ...t, text: agent.greeting } : t));
}
