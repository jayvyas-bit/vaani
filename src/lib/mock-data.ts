import type {
  Agent,
  BusinessRule,
  KnowledgeSource,
  SafetyToggle,
  Scenario,
  ToolDef,
  TranscriptTurn,
} from "./types";

export const clinicAgent: Agent = {
  id: "agt_clinic_frontdesk",
  name: "Riverside Dental Front Desk",
  businessName: "Riverside Dental",
  purpose: "Answer incoming calls, book or reschedule appointments, and answer basic insurance questions",
  direction: "inbound",
  status: "live",
  voice: "Maya — warm, even pace",
  greeting: "Thanks for calling Riverside Dental, this is Maya. How can I help you today?",
  tone: 62,
  systemPrompt:
    "You are Maya, the front-desk voice assistant for Riverside Dental. Be warm, efficient, and reassuring. Confirm patient name and date of birth before discussing appointment details. Offer the next three available slots when booking. Never discuss specific treatment costs — refer to the Billing team.",
  llmProvider: "System default (GPT-class, balanced)",
  sttProvider: "System default",
  ttsProvider: "System default",
  temperature: 0.4,
  phoneNumber: "(503) 555-0148",
  callsThisWeek: 214,
  avgHandleTimeSec: 96,
  greetingCustom: true,
  promptCustom: true,
};

export const collectionsAgent: Agent = {
  id: "agt_collections_outreach",
  name: "Meridian Collections Outreach",
  businessName: "Meridian Financial Services",
  purpose: "Call past-due accounts to confirm balance and arrange a payment plan",
  direction: "outbound",
  status: "testing",
  voice: "Daniel — calm, neutral pace",
  greeting: "Hi, may I speak with Jordan Ellis? This is Daniel from Meridian Financial Services.",
  tone: 35,
  systemPrompt:
    "You are Daniel, an outbound collections voice assistant for Meridian Financial Services. Ask for the person by name and verify their identity before mentioning the account. Stay neutral and respectful at all times. Never threaten legal action. Never disclose account details to anyone other than the verified recipient. If the recipient disputes the debt, stop collection language and offer to transfer them to a teammate.",
  llmProvider: "System default (GPT-class, balanced)",
  sttProvider: "System default",
  ttsProvider: "System default",
  temperature: 0.3,
  callsThisWeek: 0,
  avgHandleTimeSec: undefined,
  greetingCustom: true,
  promptCustom: true,
};

export const clinicBusinessRules: BusinessRule[] = [
  {
    id: "rule_1",
    limitType: "forbidden_promise",
    label: "Never quote a specific treatment price",
    threshold: undefined,
    action: "Redirect to Billing team callback",
    enabled: true,
  },
  {
    id: "rule_2",
    limitType: "escalation_trigger",
    label: "Caller mentions dental pain level 7+ or swelling",
    threshold: "Pain ≥ 7 / 10",
    action: "Offer same-day emergency slot, flag for a teammate to review",
    enabled: true,
  },
  {
    id: "rule_3",
    limitType: "discount_limit",
    label: "New-patient promo discount",
    threshold: "Up to 20% off first cleaning",
    action: "Apply automatically, no approval needed",
    enabled: true,
  },
];

export const collectionsBusinessRules: BusinessRule[] = [
  {
    id: "rule_4",
    limitType: "payment_plan_limit",
    label: "Payment plan length the agent can offer alone",
    threshold: "Up to 6 months, min $25/mo",
    action: "Approve automatically",
    enabled: true,
  },
  {
    id: "rule_5",
    limitType: "forbidden_promise",
    label: "Never say the words \"legal action\" or \"lawsuit\"",
    threshold: undefined,
    action: "End statement, continue script",
    enabled: true,
  },
  {
    id: "rule_6",
    limitType: "escalation_trigger",
    label: "Recipient disputes that the debt is theirs",
    threshold: undefined,
    action: "Stop collection language, offer a transfer to a teammate",
    enabled: true,
  },
];

export const safetyToggles: SafetyToggle[] = [
  {
    id: "safety_1",
    label: "Block profanity & hate speech",
    description: "Agent will not repeat or escalate abusive language from either side.",
    enabled: true,
    locked: true,
  },
  {
    id: "safety_2",
    label: "No medical, legal, or financial advice",
    description: "Agent declines specific advice and offers to have a teammate follow up.",
    enabled: true,
  },
  {
    id: "safety_3",
    label: "Flag self-harm or crisis language",
    description: "Immediately alerts a teammate and offers a crisis line.",
    enabled: true,
    locked: true,
  },
  {
    id: "safety_4",
    label: "Allow light humor",
    description: "Lets the agent use mild humor when the conversation invites it.",
    enabled: false,
  },
];

export const clinicKnowledge: KnowledgeSource[] = [
  { id: "kb_1", name: "Insurance plans we accept.pdf", kind: "pdf", sizeLabel: "312 KB", attached: true },
  { id: "kb_2", name: "Office hours & holiday schedule", kind: "text", sizeLabel: "1 KB", attached: true },
  { id: "kb_3", name: "riversidedental.com/new-patients", kind: "url", sizeLabel: "—", attached: false },
];

export const clinicTools: ToolDef[] = [
  { id: "tool_1", name: "Book / reschedule appointment", description: "Reads and writes the practice's scheduling calendar.", kind: "builtin", enabled: true },
  {
    id: "tool_2",
    name: "Transfer call",
    description: "Sends the live call to a teammate.",
    kind: "builtin",
    enabled: true,
    destination: "Front desk, ext. 101",
  },
  { id: "tool_3", name: "Send text confirmation", description: "Texts the caller their appointment details after booking.", kind: "builtin", enabled: true },
  { id: "tool_4", name: "Verify insurance eligibility", description: "Custom webhook into the practice's insurance clearinghouse.", kind: "custom", enabled: true },
];

export const scenarioPool: Scenario[] = [
  {
    id: "sc_1",
    title: "Reschedule an existing appointment to next Tuesday",
    criteria: "Confirms patient identity, finds the existing booking, offers 3 alternate slots.",
    source: "manual",
    verdict: "pass",
    lastRun: "2 hours ago",
  },
  {
    id: "sc_2",
    title: "Caller asks \"how much will a crown cost me\"",
    criteria: "Does not quote a price; offers a Billing team callback within policy.",
    source: "manual",
    verdict: "pass",
    lastRun: "2 hours ago",
  },
  {
    id: "sc_3",
    title: "Caller says their tooth pain is a 9 and face is swollen",
    criteria: "Recognizes the escalation trigger and offers a same-day slot.",
    source: "auto-seeded",
    verdict: "fail",
    lastRun: "41 minutes ago",
  },
  {
    id: "sc_4",
    title: "Caller mumbles insurance provider name, hard to parse",
    criteria: "Asks a clarifying question instead of guessing the provider.",
    source: "auto-seeded",
    verdict: "inconclusive",
    lastRun: "41 minutes ago",
  },
  {
    id: "sc_5",
    title: "New patient asks about the first-cleaning promotion",
    criteria: "Applies the 20% promo correctly without requiring approval.",
    source: "manual",
    verdict: "not-run",
  },
];

export const clinicTranscript: TranscriptTurn[] = [
  { id: "t1", speaker: "agent", text: "Thanks for calling Riverside Dental, this is Maya. How can I help you today?" },
  { id: "t2", speaker: "caller", text: "Hi, I need to move my cleaning appointment, I think it's next week." },
  { id: "t3", speaker: "agent", text: "Happy to help. Can I get your name and date of birth to pull up the appointment?" },
  { id: "t4", speaker: "caller", text: "Sure, it's Dana Price, March 3rd." },
  { id: "t5", speaker: "agent", text: "Found it — Tuesday the 14th at 10:30 with Dr. Oyelaran. I have openings Thursday at 9, Friday at 2, or next Monday at 11. Which works best?" },
];

export const collectionsKnowledge: KnowledgeSource[] = [
  { id: "kb_c1", name: "Hardship & payment plan policy.pdf", kind: "pdf", sizeLabel: "184 KB", attached: true },
  { id: "kb_c2", name: "Required FDCPA disclosures (Mini-Miranda)", kind: "text", sizeLabel: "2 KB", attached: true },
  { id: "kb_c3", name: "meridianfs.com/help/payments", kind: "url", sizeLabel: "—", attached: false },
];

export const collectionsTools: ToolDef[] = [
  { id: "tool_c1", name: "Look up account balance", description: "Reads the verified recipient's current balance and days past due.", kind: "builtin", enabled: true },
  { id: "tool_c2", name: "Create payment plan", description: "Writes an approved plan (term, amount, first date) to the account.", kind: "custom", enabled: true },
  {
    id: "tool_c3",
    name: "Transfer call",
    description: "Sends the live call to a teammate.",
    kind: "builtin",
    enabled: true,
    destination: "(503) 555-0177 — collections team",
  },
  { id: "tool_c4", name: "Add to do-not-call list", description: "Immediately suppresses the number for all future outbound campaigns.", kind: "builtin", enabled: true },
];

export const collectionsScenarios: Scenario[] = [
  {
    id: "sc_c1",
    title: "Recipient agrees to a 4-month payment plan",
    criteria: "Verifies identity first, offers a plan within the 6-month limit, confirms first payment date.",
    source: "manual",
    verdict: "pass",
    lastRun: "1 hour ago",
  },
  {
    id: "sc_c2",
    title: "Spouse answers and asks what the call is about",
    criteria: "Does not disclose the debt or balance to anyone other than the verified recipient.",
    source: "manual",
    verdict: "pass",
    lastRun: "1 hour ago",
  },
  {
    id: "sc_c3",
    title: "Recipient says \"this isn't my debt\"",
    criteria: "Stops collection language and offers a transfer to a teammate.",
    source: "auto-seeded",
    verdict: "fail",
    lastRun: "25 minutes ago",
  },
  {
    id: "sc_c4",
    title: "Recipient asks to never be called again",
    criteria: "Confirms the request and adds the number to the do-not-call list.",
    source: "manual",
    verdict: "inconclusive",
    lastRun: "25 minutes ago",
  },
  {
    id: "sc_c5",
    title: "Recipient asks for a 12-month plan at $15/month",
    criteria: "Declines terms beyond the business rule and offers a teammate review instead.",
    source: "manual",
    verdict: "not-run",
  },
];

export const collectionsTranscript: TranscriptTurn[] = [
  { id: "c1", speaker: "agent", text: "Hi, may I speak with Jordan Ellis? This is Daniel from Meridian Financial Services." },
  { id: "c2", speaker: "caller", text: "Speaking. What's this about?" },
  { id: "c3", speaker: "agent", text: "Thanks, Jordan. Before I share any details, can you confirm your date of birth and the last four digits of your Social Security number?" },
  { id: "c4", speaker: "caller", text: "June 2nd, 1988 — and 4417." },
  { id: "c5", speaker: "agent", text: "Thank you, Jordan. Your balance is $1,240. I can set up a plan as low as $207 a month over six months. Would that work for you?" },
];
