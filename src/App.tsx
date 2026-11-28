import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { AppShell } from "@/components/ui/AppShell";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { PageHeader, PageHeaderBackLink, PageHeaderDivider } from "@/components/ui/PageHeader";
import { Stepper, type StepItem } from "@/components/ui/Stepper";
import type { PrimarySection } from "@/features/agent-builder/BuilderNav";
import { BuildEditorPage, type BuildTab } from "@/features/agent-builder/build/BuildEditorPage";
import { CreateSuccess } from "@/features/agent-builder/create/CreateSuccess";
import { MethodChooser, type Method } from "@/features/agent-builder/create/MethodChooser";
import { MinimalCreateForm, type CreateFormValues } from "@/features/agent-builder/create/MinimalCreateForm";
import { TemplateGallery } from "@/features/agent-builder/create/TemplateGallery";
import { agentTemplates } from "@/lib/templates";
import { ChannelNumberStep } from "@/features/agent-builder/deploy/ChannelNumberStep";
import { ComplianceStep } from "@/features/agent-builder/deploy/ComplianceStep";
import { CostEstimateStep } from "@/features/agent-builder/deploy/CostEstimateStep";
import { DeployStatusPanel } from "@/features/agent-builder/deploy/DeployStatusPanel";
import { DeployWizardLayout, deployStepsFor } from "@/features/agent-builder/deploy/DeployWizardLayout";
import { GoLiveStep } from "@/features/agent-builder/deploy/GoLiveStep";
import { TestEvaluateScreen } from "@/features/agent-builder/test/TestEvaluateScreen";
import {
  clinicAgent,
  clinicBusinessRules,
  clinicKnowledge,
  clinicOutcomes,
  clinicTools,
  clinicTranscript,
  collectionsAgent,
  collectionsBusinessRules,
  collectionsKnowledge,
  collectionsOutcomes,
  collectionsScenarios,
  collectionsTools,
  collectionsTranscript,
  safetyToggles,
  scenarioPool,
} from "@/lib/mock-data";
import {
  channelError,
  contactCountLabel,
  contactListErrors,
  defaultDeployConfig,
  ensureProvisioned,
  formatTime,
  hoursErrors,
  monthlyCost as estimatedMonthlyCost,
  normalizeDeployConfig,
  resolvedNumber,
  type DeployConfig,
} from "@/lib/deploy";
import { formatUsd } from "@/lib/format";
import {
  applyPersonaPatch,
  cleanBusinessName,
  compileGreeting,
  compileSystemPrompt,
  inferPersonaDefaults,
  recompileForTools,
} from "@/lib/persona";
import { statusLabel, statusTone } from "@/lib/status";
import { bookingTool } from "@/lib/tools";
import type {
  Agent,
  BusinessRule,
  CallDirection,
  KnowledgeSettings,
  KnowledgeSource,
  OutcomeField,
  SafetyToggle,
  Scenario,
  ToolDef,
  TranscriptTurn,
} from "@/lib/types";
import { newId } from "@/lib/useControllable";

/* ------------------------------------------------------------------ */
/* Data                                                                 */
/* ------------------------------------------------------------------ */

/** Everything about one agent. App owns the array; every screen edits it via callbacks. */
interface AgentRecord {
  agent: Agent;
  businessRules: BusinessRule[];
  knowledge: KnowledgeSource[];
  knowledgeSettings?: KnowledgeSettings;
  tools: ToolDef[];
  /** Per agent — toggling a safety setting on one agent must not change another. */
  safety: SafetyToggle[];
  scenarios: Scenario[];
  transcript: TranscriptTurn[];
  /** What this agent must capture or report by the end of a call. */
  outcomes: OutcomeField[];
  /** What the Deploy wizard collected; created on first visit to Deploy. */
  deploy?: DeployConfig;
}

const cloneSafety = () => safetyToggles.map((t) => ({ ...t }));

const seedRecords = (): AgentRecord[] => [
  {
    agent: clinicAgent,
    businessRules: clinicBusinessRules,
    knowledge: clinicKnowledge,
    tools: clinicTools,
    safety: cloneSafety(),
    scenarios: scenarioPool,
    transcript: clinicTranscript,
    outcomes: clinicOutcomes,
  },
  {
    agent: collectionsAgent,
    businessRules: collectionsBusinessRules,
    knowledge: collectionsKnowledge,
    tools: collectionsTools,
    safety: cloneSafety(),
    scenarios: collectionsScenarios,
    transcript: collectionsTranscript,
    outcomes: collectionsOutcomes,
  },
];

/* ---------- Persistence (plain JSON in localStorage) ---------- */

const STORAGE_KEY = "voice-agent-builder.agents.v2";
/** Before the content audit. Agents people created carry over; the two demo agents are re-seeded. */
const LEGACY_STORAGE_KEY = "voice-agent-builder.agents.v1";
const seedIds = new Set([clinicAgent.id, collectionsAgent.id]);

const asArray = <T,>(v: unknown, fallback: T[]): T[] => (Array.isArray(v) ? (v as T[]) : fallback);

function normalizeRecord(raw: unknown): AgentRecord | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Partial<AgentRecord>;
  const a = r.agent;
  if (!a || typeof a !== "object" || typeof a.id !== "string" || typeof a.name !== "string") return null;
  const status = (["draft", "testing", "live", "paused"] as const).includes(a.status) ? a.status : "draft";
  const direction = a.direction === "outbound" ? "outbound" : "inbound";
  return {
    agent: { ...a, status, direction },
    businessRules: asArray(r.businessRules, []),
    knowledge: asArray(r.knowledge, []),
    knowledgeSettings: r.knowledgeSettings,
    tools: asArray(r.tools, []),
    safety: asArray(r.safety, cloneSafety()),
    scenarios: asArray(r.scenarios, []),
    transcript: asArray(r.transcript, []),
    outcomes: asArray(r.outcomes, []),
    deploy: r.deploy ? normalizeDeployConfig(r.deploy, direction) : undefined,
  };
}

function parseRecords(raw: string): AgentRecord[] | null {
  const parsed: unknown = JSON.parse(raw);
  if (!Array.isArray(parsed)) return null;
  return parsed.map(normalizeRecord).filter((r): r is AgentRecord => r !== null);
}

function loadRecords(): AgentRecord[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw !== null) return parseRecords(raw) ?? seedRecords();
    const legacy = window.localStorage.getItem(LEGACY_STORAGE_KEY);
    if (legacy === null) return seedRecords();
    const old = parseRecords(legacy);
    if (!old) return seedRecords();
    // Demo agents shipped with copy the audit corrected — replace them; keep everything else.
    const fresh = seedRecords();
    return old.map((r) => (seedIds.has(r.agent.id) ? (fresh.find((f) => f.agent.id === r.agent.id) ?? r) : r));
  } catch {
    return seedRecords();
  }
}

function saveRecords(records: AgentRecord[]) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  } catch {
    // Storage full or blocked (private mode) — the session still works in memory.
  }
}

/** Every number held or reserved by an agent other than `exceptId`. */
function takenNumbers(records: AgentRecord[], exceptId: string): string[] {
  const out: string[] = [];
  for (const r of records) {
    if (r.agent.id === exceptId) continue;
    if (r.agent.phoneNumber) out.push(r.agent.phoneNumber);
    if (r.deploy?.provisionedNumber) out.push(r.deploy.provisionedNumber);
    if (r.deploy) {
      const n = resolvedNumber(r.deploy, r.agent.phoneNumber);
      if (n) out.push(n);
    }
  }
  return out;
}

const blankValues: CreateFormValues = { name: "", purpose: "", direction: "inbound" };

function buildRecord(values: CreateFormValues): AgentRecord {
  const { name, purpose, direction } = values;
  const inbound = direction === "inbound";
  const other = inbound ? "Caller" : "Recipient";
  const persona = inferPersonaDefaults(purpose, direction);

  const base: Agent = {
    id: newId("agt"),
    name,
    // What callers hear — editable separately in Build → Persona.
    businessName: values.businessName?.trim() || cleanBusinessName(name),
    purpose,
    direction,
    status: "draft",
    voice: persona.voice,
    greeting: "",
    tone: persona.tone,
    systemPrompt: "",
    language: "en",
    llmProvider: "System default — balanced (GPT-4.1)",
    sttProvider: "System default (Deepgram Nova-3)",
    ttsProvider: "System default (ElevenLabs Turbo)",
    temperature: 0.4,
    callsThisWeek: 0,
    // Not hand-edited yet, so both stay compiled from name / voice / tone / purpose.
    greetingCustom: false,
    promptCustom: false,
  };
  // No tools yet, so the prompt offers a teammate callback rather than promising a transfer.
  const agent: Agent = { ...base, greeting: compileGreeting(base), systemPrompt: compileSystemPrompt(base, []) };

  const scenarios: Scenario[] = [
    {
      id: newId("sc"),
      title: inbound ? "Caller asks what this line can help with" : "Recipient asks who is calling and why",
      criteria: "Explains the agent’s purpose in one or two sentences, without inventing details.",
      source: "manual",
      verdict: "not-run",
    },
    {
      id: newId("sc"),
      title: `${other} asks to speak to a real person`,
      criteria: "Gets them to a teammate right away — a live transfer if one is set up, otherwise a callback.",
      source: "manual",
      verdict: "not-run",
    },
    {
      id: newId("sc"),
      title: inbound ? "Caller goes silent for 10 seconds" : "Call reaches voicemail",
      criteria: inbound
        ? "Checks in once, then politely ends the call if there’s still no response."
        : "Leaves your name and callback number only — no account details.",
      source: "manual",
      verdict: "not-run",
    },
  ];

  // Empty transcript: the Test panel renders a sample call that always opens
  // with the agent’s *current* greeting.
  return {
    agent,
    businessRules: [],
    knowledge: [],
    tools: [],
    safety: cloneSafety(),
    scenarios,
    transcript: [],
    outcomes: [],
  };
}

/* ------------------------------------------------------------------ */
/* Agents list                                                          */
/* ------------------------------------------------------------------ */

function AgentRowMenu({
  agent,
  onDuplicate,
  onDelete,
  onAddCounterpart,
}: {
  agent: Agent;
  onDuplicate: () => void;
  onDelete: () => void;
  onAddCounterpart?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setConfirming(false);
      }
    };
    document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, [open]);

  return (
    <div ref={ref} className="relative shrink-0" onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        aria-label={`More actions for ${agent.name || "untitled agent"}`}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => {
          setOpen((v) => !v);
          setConfirming(false);
        }}
        className="flex size-8 items-center justify-center rounded-md text-ink-400 outline-none transition-colors hover:bg-ink-950/5 hover:text-ink-700 focus-visible:bg-ink-950/5"
      >
        <Icon name="more-vertical" className="size-4.5" />
      </button>
      {open && (
        <div
          role="menu"
          className="animate-popover-in absolute right-0 top-full z-10 mt-1 w-48 overflow-hidden rounded-lg border border-ink-950/10 bg-paper-0 py-1 shadow-lg"
        >
          {confirming ? (
            <div key="confirm" className="animate-fade-in px-3 py-2.5">
              <p className="text-[12.5px] text-ink-700">Delete {agent.name.trim() || "this agent"}? This can’t be undone.</p>
              <div className="mt-2 flex justify-end gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setConfirming(false);
                    setOpen(false);
                  }}
                  className="rounded px-2 py-1 text-[12.5px] font-medium text-ink-600 hover:bg-ink-950/5"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    onDelete();
                  }}
                  className="rounded bg-error-600 px-2 py-1 text-[12.5px] font-medium text-paper-0 hover:bg-error-700"
                >
                  Delete
                </button>
              </div>
            </div>
          ) : (
            <div key="actions" className="animate-fade-in">
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setOpen(false);
                  onDuplicate();
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] text-ink-800 hover:bg-paper-50"
              >
                <Icon name="copy" className="size-3.5 text-ink-400" />
                Duplicate
              </button>
              {onAddCounterpart && (
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setOpen(false);
                    onAddCounterpart();
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] text-ink-800 hover:bg-paper-50"
                >
                  <Icon name={agent.direction === "inbound" ? "phone-outbound" : "phone-inbound"} className="size-3.5 text-ink-400" />
                  Add {agent.direction === "inbound" ? "outbound" : "inbound"} counterpart
                </button>
              )}
              <button
                type="button"
                role="menuitem"
                onClick={() => setConfirming(true)}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] text-error-600 hover:bg-error-50"
              >
                <Icon name="trash" className="size-3.5" />
                Delete
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function AgentRow({
  agent,
  deploy,
  linkedAgentName,
  onOpen,
  onDuplicate,
  onDelete,
  onAddCounterpart,
}: {
  agent: Agent;
  deploy?: DeployConfig;
  /** Name of the linked inbound/outbound counterpart, if any — looked up by the parent. */
  linkedAgentName?: string;
  onOpen: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onAddCounterpart?: () => void;
}) {
  const budget = deploy?.monthlyBudget;
  const cost = deploy ? estimatedMonthlyCost(deploy, agent) : undefined;
  const overBudget = budget !== undefined && cost !== undefined && cost > budget;

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`Open ${agent.name || "untitled agent"}`}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen();
        }
      }}
      className="group flex cursor-pointer items-center gap-3 px-4 py-4 outline-none transition-colors hover:bg-paper-50 focus-visible:bg-paper-50 sm:gap-4 sm:px-5"
    >
      <div
        className={`flex size-10 shrink-0 items-center justify-center rounded-md transition-transform duration-200 ease-[var(--ease-out-quart)] group-hover:scale-105 ${
          agent.direction === "inbound" ? "bg-inbound-100 text-inbound-600" : "bg-outbound-100 text-outbound-600"
        }`}
      >
        <Icon name={agent.direction === "inbound" ? "phone-inbound" : "phone-outbound"} className="size-5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <p className="min-w-[120px] max-w-full truncate text-[14px] font-semibold text-ink-950">{agent.name.trim() || "Untitled agent"}</p>
          <Badge tone={agent.direction === "inbound" ? "inbound" : "outbound"}>
            {agent.direction === "inbound" ? "Inbound" : "Outbound"}
          </Badge>
          <Badge tone={statusTone[agent.status]} dot live={agent.status === "live"}>
            {statusLabel[agent.status]}
          </Badge>
          {linkedAgentName && (
            <span className="inline-flex items-center gap-1 text-[12px] text-ink-400">
              <Icon name="link" className="size-3" />
              Paired with {linkedAgentName}
            </span>
          )}
        </div>
        <p className="mt-0.5 truncate text-[13px] text-ink-500">{agent.purpose}</p>
        {agent.phoneNumber && (
          <p className="mt-0.5 text-[12.5px] tabular-nums text-ink-400">{agent.phoneNumber}</p>
        )}
      </div>
      <div className="hidden shrink-0 gap-6 text-right lg:flex">
        <div className="w-[86px] shrink-0">
          <p className="whitespace-nowrap text-[12px] text-ink-400">Calls this week</p>
          <p className="whitespace-nowrap text-[13px] font-medium tabular-nums text-ink-900">{agent.callsThisWeek ?? 0}</p>
        </div>
        <div className="w-[88px] shrink-0">
          <p className="whitespace-nowrap text-[12px] text-ink-400">Avg handle time</p>
          <p className="whitespace-nowrap text-[13px] font-medium tabular-nums text-ink-900">
            {agent.avgHandleTimeSec ? `${Math.round(agent.avgHandleTimeSec / 60)} min` : "No calls yet"}
          </p>
        </div>
        <div className="w-[96px] shrink-0">
          {budget !== undefined ? (
            <>
              <p className="whitespace-nowrap text-[12px] text-ink-400">Budget</p>
              <p
                className={`whitespace-nowrap text-[13px] font-medium tabular-nums ${overBudget ? "text-warning-700" : "text-ink-900"}`}
              >
                {formatUsd(budget)}/mo{overBudget && " — over"}
              </p>
            </>
          ) : (
            <p className="whitespace-nowrap text-[13px] text-ink-300">—</p>
          )}
        </div>
      </div>
      <AgentRowMenu agent={agent} onDuplicate={onDuplicate} onDelete={onDelete} onAddCounterpart={onAddCounterpart} />
      <Icon
        name="chevron-right"
        className="size-4 shrink-0 text-ink-300 transition-[color,transform] duration-200 ease-[var(--ease-out-quart)] group-hover:translate-x-0.5 group-hover:text-brand-600 group-focus-visible:translate-x-0.5 group-focus-visible:text-brand-600"
      />
    </div>
  );
}

function liveBannerText(agent: Agent, deploy?: DeployConfig) {
  if (agent.direction === "inbound") {
    return agent.phoneNumber ? ` — calls to ${agent.phoneNumber} now reach it.` : " — it’s answering calls now.";
  }
  const from = agent.phoneNumber ? ` from ${agent.phoneNumber}` : "";
  if (deploy?.contactListName.trim() && deploy.contactCount > 0) {
    return ` — it’s calling the ${contactCountLabel(deploy.contactCount)} in ${deploy.contactListName.trim()}${from} between ${formatTime(deploy.windowStart)} and ${formatTime(deploy.windowEnd)}.`;
  }
  return ` — it will start calling${from} within its calling window.`;
}

function AgentsList({
  records,
  justWentLive,
  onNew,
  onOpen,
  onDismissBanner,
  onDuplicate,
  onDelete,
  onAddCounterpart,
}: {
  records: AgentRecord[];
  justWentLive: { agent: Agent; deploy?: DeployConfig } | null;
  onNew: () => void;
  onOpen: (id: string) => void;
  onDismissBanner: () => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  onAddCounterpart?: (id: string) => void;
}) {
  return (
    <div className="h-full overflow-y-auto bg-paper-50">
      <PageHeader
        left={<h1 className="text-[16px] font-semibold text-ink-950">Agents</h1>}
        right={
          records.length > 0 && (
            <Button className="gap-1.5" onClick={onNew}>
              <Icon name="plus" className="size-4" />
              New agent
            </Button>
          )
        }
      />
      <main className="px-4 py-6 sm:px-6 sm:py-8">
        <div className="mx-auto max-w-4xl lg:max-w-5xl xl:max-w-6xl">
          {justWentLive && (
            <div
              role="status"
              className="mb-4 flex flex-wrap items-center gap-3 rounded-lg border border-success-200 bg-success-50 px-4 py-3"
            >
              <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-success-100 text-success-700">
                <Icon name="check" className="size-4" strokeWidth={2.4} />
              </div>
              <p className="min-w-0 flex-1 text-[13px] text-ink-800">
                <span className="font-semibold">{justWentLive.agent.name}</span> is live
                {liveBannerText(justWentLive.agent, justWentLive.deploy)}
              </p>
              <Button variant="ghost" size="sm" onClick={onDismissBanner}>
                Dismiss
              </Button>
            </div>
          )}
          {records.length > 0 ? (
            <div className="overflow-hidden rounded-lg border border-ink-950/10 bg-paper-0">
              <div className="divide-y divide-ink-950/8">
                {records.map((r) => (
                  <AgentRow
                    key={r.agent.id}
                    agent={r.agent}
                    deploy={r.deploy}
                    linkedAgentName={
                      r.agent.linkedAgentId
                        ? records.find((o) => o.agent.id === r.agent.linkedAgentId)?.agent.name
                        : undefined
                    }
                    onOpen={() => onOpen(r.agent.id)}
                    onDuplicate={() => onDuplicate(r.agent.id)}
                    onDelete={() => onDelete(r.agent.id)}
                    onAddCounterpart={
                      !r.agent.linkedAgentId && onAddCounterpart ? () => onAddCounterpart(r.agent.id) : undefined
                    }
                  />
                ))}
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-ink-950/15 px-6 py-12 text-center">
              <p className="text-[14px] font-semibold text-ink-950">No agents on this workspace yet</p>
              <p className="mx-auto mt-1 max-w-sm text-[13px] text-ink-500">
                Start with a name and one line about the job: answer a front desk line, call back missed
                appointments, chase past-due balances. You can start a test call a minute later.
              </p>
              <Button className="mt-5 gap-1.5" onClick={onNew}>
                <Icon name="plus" className="size-4" />
                Create your first agent
              </Button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Create flow shell                                                    */
/* ------------------------------------------------------------------ */

const createSteps: StepItem[] = [
  { id: "method", label: "How to start" },
  { id: "basics", label: "Name & purpose" },
  { id: "done", label: "Ready to test" },
];

function CreateShell({
  activeId,
  completedIds,
  onExit,
  children,
}: {
  activeId: string;
  completedIds: string[];
  onExit: () => void;
  children: ReactNode;
}) {
  return (
    <div className="flex h-full flex-col bg-paper-50">
      <PageHeader
        left={
          <>
            <PageHeaderBackLink label="Agents" onClick={onExit} />
            <PageHeaderDivider />
            <span className="truncate text-[14px] font-semibold text-ink-950">New agent</span>
          </>
        }
        center={<Stepper steps={createSteps} activeId={activeId} completedIds={completedIds} compact />}
      />
      <div className="flex-1 overflow-hidden">{children}</div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* App state machine                                                    */
/* ------------------------------------------------------------------ */

type DeployStepId = "channel" | "compliance" | "cost" | "golive";
const deployOrder: DeployStepId[] = ["channel", "compliance", "cost", "golive"];

type Screen =
  | { name: "list" }
  | { name: "create-method" }
  | { name: "template-gallery" }
  | { name: "create-form"; method: Method; templateId?: string }
  | { name: "create-success"; agentId: string; method: Method }
  | { name: "build"; agentId: string; tab?: BuildTab }
  | { name: "test"; agentId: string }
  | {
      name: "deploy";
      agentId: string;
      step: DeployStepId;
      live: boolean;
      /** A live/paused agent opens on its status panel; true while changing its settings. */
      edit?: boolean;
    };

const screenNames = new Set([
  "list",
  "create-method",
  "template-gallery",
  "create-form",
  "create-success",
  "build",
  "test",
  "deploy",
]);

/** Screens are stored in history.state so Back/Forward (and reload) stay inside the app. */
function screenFromHistory(state: unknown): Screen | null {
  const s = (state as { screen?: Screen } | null)?.screen;
  if (!s || typeof s !== "object" || !screenNames.has(s.name)) return null;
  if (s.name === "deploy" && !deployOrder.includes(s.step)) return null;
  return s;
}

export default function App() {
  const [records, setRecords] = useState<AgentRecord[]>(loadRecords);
  const [screen, setScreen] = useState<Screen>(() => screenFromHistory(window.history.state) ?? { name: "list" });
  const [justWentLive, setJustWentLive] = useState<string | null>(null);
  const [costAcknowledged, setCostAcknowledged] = useState(false);
  const [monthlyCost, setMonthlyCost] = useState<number | undefined>(undefined);

  const handleAcknowledged = useCallback((v: boolean) => setCostAcknowledged(v), []);
  const handleEstimate = useCallback((v: number) => setMonthlyCost(v), []);

  // Persist every change — there is no Save button anywhere in the builder.
  useEffect(() => saveRecords(records), [records]);

  // History: stamp the first entry, then follow Back/Forward.
  useEffect(() => {
    window.history.replaceState({ ...(window.history.state ?? {}), screen }, "");
    const onPop = (e: PopStateEvent) => setScreen(screenFromHistory(e.state) ?? { name: "list" });
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount only
  }, []);

  const navigate = (next: Screen, opts: { replace?: boolean } = {}) => {
    setScreen(next);
    if (opts.replace) window.history.replaceState({ screen: next }, "");
    else window.history.pushState({ screen: next }, "");
  };

  // A Deploy visit needs a config with a reserved number that no other agent holds.
  const deployAgentId = screen.name === "deploy" ? screen.agentId : null;
  useEffect(() => {
    if (!deployAgentId) return;
    setRecords((rs) => {
      const rec = rs.find((r) => r.agent.id === deployAgentId);
      if (!rec) return rs;
      const base = rec.deploy ?? defaultDeployConfig(rec.agent.direction, rec.agent.phoneNumber);
      const next = ensureProvisioned(base, takenNumbers(rs, deployAgentId));
      if (next === rec.deploy) return rs;
      return rs.map((r) => (r.agent.id === deployAgentId ? { ...r, deploy: next } : r));
    });
  }, [deployAgentId]);

  const findRecord = (id: string) => records.find((r) => r.agent.id === id);

  const patchRecord = (id: string, patch: Partial<Omit<AgentRecord, "agent">>) =>
    setRecords((rs) => rs.map((r) => (r.agent.id === id ? { ...r, ...patch } : r)));

  /** Agent edits go through the persona compiler so greeting + prompt never go stale. */
  const updateAgent = (id: string, patch: Partial<Agent>) =>
    setRecords((rs) =>
      rs.map((r) => (r.agent.id === id ? { ...r, agent: applyPersonaPatch(r.agent, patch, r.tools) } : r)),
    );

  /** Tool changes can change what the generated prompt may promise (e.g. a transfer). */
  const updateTools = (id: string, tools: ToolDef[]) =>
    setRecords((rs) => rs.map((r) => (r.agent.id === id ? { ...r, tools, agent: recompileForTools(r.agent, tools) } : r)));

  const duplicateRecord = (id: string) => {
    setRecords((rs) => {
      const rec = rs.find((r) => r.agent.id === id);
      if (!rec) return rs;
      const copy: AgentRecord = {
        ...rec,
        agent: {
          ...rec.agent,
          id: newId("agt"),
          name: `${rec.agent.name.trim() || "Untitled agent"} (copy)`,
          status: "draft",
          phoneNumber: undefined,
          callsThisWeek: undefined,
          avgHandleTimeSec: undefined,
          linkedAgentId: undefined,
        },
        scenarios: rec.scenarios.map((s) => ({ ...s, verdict: "not-run" })),
        transcript: [],
        deploy: undefined,
      };
      const idx = rs.findIndex((r) => r.agent.id === id);
      return [...rs.slice(0, idx + 1), copy, ...rs.slice(idx + 1)];
    });
  };

  const deleteRecord = (id: string) =>
    setRecords((rs) => {
      const rec = rs.find((r) => r.agent.id === id);
      const linkedId = rec?.agent.linkedAgentId;
      return rs
        .filter((r) => r.agent.id !== id)
        .map((r) => (linkedId && r.agent.id === linkedId ? { ...r, agent: { ...r.agent, linkedAgentId: undefined } } : r));
    });

  /** The other direction’s job description, derived mechanically — not a guess at the real business flow. */
  const createCounterpart = (id: string) => {
    setRecords((rs) => {
      const rec = rs.find((r) => r.agent.id === id);
      if (!rec || rec.agent.linkedAgentId) return rs;
      const direction: CallDirection = rec.agent.direction === "inbound" ? "outbound" : "inbound";
      const newId_ = newId("agt");
      const counterpart: AgentRecord = {
        ...rec,
        agent: {
          ...rec.agent,
          id: newId_,
          direction,
          status: "draft",
          phoneNumber: undefined,
          callsThisWeek: undefined,
          avgHandleTimeSec: undefined,
          linkedAgentId: rec.agent.id,
        },
        scenarios: rec.scenarios.map((s) => ({ ...s, verdict: "not-run" as const })),
        transcript: [],
        deploy: undefined,
      };
      counterpart.agent.greeting = compileGreeting(counterpart.agent);
      counterpart.agent.systemPrompt = compileSystemPrompt(counterpart.agent, counterpart.tools);
      const idx = rs.findIndex((r) => r.agent.id === id);
      return [
        ...rs.slice(0, idx + 1).map((r) => (r.agent.id === id ? { ...r, agent: { ...r.agent, linkedAgentId: newId_ } } : r)),
        counterpart,
        ...rs.slice(idx + 1),
      ];
    });
  };

  const goList = () => navigate({ name: "list" });

  const navigateSection = (agentId: string) => (section: PrimarySection) => {
    if (section === "build") navigate({ name: "build", agentId });
    if (section === "test") {
      const rec = findRecord(agentId);
      if (rec?.agent.status === "draft") updateAgent(agentId, { status: "testing" });
      navigate({ name: "test", agentId });
    }
    if (section === "deploy") {
      setCostAcknowledged(false);
      setMonthlyCost(undefined);
      navigate({ name: "deploy", agentId, step: "channel", live: false });
    }
  };

  /* ---------- List ---------- */
  if (screen.name === "list") {
    const liveRecord = justWentLive ? findRecord(justWentLive) : undefined;
    const liveAgent = liveRecord ? { agent: liveRecord.agent, deploy: liveRecord.deploy } : null;
    return (
      <AppShell onGoHome={goList}>
        <AgentsList
          records={records}
          justWentLive={liveAgent}
          onNew={() => {
            setJustWentLive(null);
            navigate({ name: "create-method" });
          }}
          onOpen={(id) => {
            setJustWentLive(null);
            navigate({ name: "build", agentId: id });
          }}
          onDismissBanner={() => setJustWentLive(null)}
          onDuplicate={duplicateRecord}
          onDelete={deleteRecord}
          onAddCounterpart={createCounterpart}
        />
      </AppShell>
    );
  }

  /* ---------- Create ---------- */
  if (screen.name === "create-method") {
    return (
      <AppShell onGoHome={goList}>
        <CreateShell activeId="method" completedIds={[]} onExit={goList}>
          <MethodChooser
            onContinue={(method) =>
              navigate(method === "template" ? { name: "template-gallery" } : { name: "create-form", method })
            }
          />
        </CreateShell>
      </AppShell>
    );
  }

  if (screen.name === "template-gallery") {
    return (
      <AppShell onGoHome={goList}>
        <CreateShell activeId="method" completedIds={[]} onExit={goList}>
          <TemplateGallery
            onBack={() => navigate({ name: "create-method" })}
            onSelect={(template) => navigate({ name: "create-form", method: "template", templateId: template.id })}
          />
        </CreateShell>
      </AppShell>
    );
  }

  if (screen.name === "create-form") {
    const template = screen.templateId ? agentTemplates.find((t) => t.id === screen.templateId) : undefined;
    return (
      <AppShell onGoHome={goList}>
        <CreateShell activeId="basics" completedIds={["method"]} onExit={goList}>
          <MinimalCreateForm
            key={screen.templateId ?? screen.method}
            onBack={() =>
              navigate(screen.method === "template" ? { name: "template-gallery" } : { name: "create-method" })
            }
            initialValues={template?.values ?? blankValues}
            onCreate={(values) => {
              const rec = buildRecord(values);
              setRecords((rs) => [rec, ...rs]);
              // Replace the form entry so Back can’t re-submit it.
              navigate({ name: "create-success", agentId: rec.agent.id, method: screen.method }, { replace: true });
            }}
          />
        </CreateShell>
      </AppShell>
    );
  }

  const record = findRecord(screen.agentId);
  if (!record) {
    // e.g. a history entry for an agent that no longer exists — never render a blank screen.
    return (
      <AppShell onGoHome={goList}>
        <AgentsList
          records={records}
          justWentLive={null}
          onNew={() => navigate({ name: "create-method" })}
          onOpen={(id) => navigate({ name: "build", agentId: id })}
          onDismissBanner={() => undefined}
          onDuplicate={duplicateRecord}
          onDelete={deleteRecord}
          onAddCounterpart={createCounterpart}
        />
      </AppShell>
    );
  }
  const { agent } = record;

  if (screen.name === "create-success") {
    return (
      <AppShell onGoHome={goList}>
        <CreateShell activeId="done" completedIds={["method", "basics"]} onExit={goList}>
          <CreateSuccess
            agent={agent}
            name={agent.name}
            direction={agent.direction}
            onTest={() => navigateSection(agent.id)("test")}
            onOpenBuild={() => navigate({ name: "build", agentId: agent.id })}
          />
        </CreateShell>
      </AppShell>
    );
  }

  /* ---------- Build ---------- */
  if (screen.name === "build") {
    return (
      <AppShell onGoHome={goList}>
        <BuildEditorPage
          key={agent.id}
          agent={agent}
          safety={record.safety}
          businessRules={record.businessRules}
          knowledge={record.knowledge}
          knowledgeSettings={record.knowledgeSettings}
          tools={record.tools}
          outcomes={record.outcomes}
          initialTab={screen.tab}
          onAgentChange={(patch) => updateAgent(agent.id, patch)}
          onSafetyChange={(safety) => patchRecord(agent.id, { safety })}
          onBusinessRulesChange={(businessRules) => patchRecord(agent.id, { businessRules })}
          onKnowledgeChange={(knowledge) => patchRecord(agent.id, { knowledge })}
          onKnowledgeSettingsChange={(knowledgeSettings) => patchRecord(agent.id, { knowledgeSettings })}
          onToolsChange={(tools) => updateTools(agent.id, tools)}
          onOutcomesChange={(outcomes) => patchRecord(agent.id, { outcomes })}
          onNavigate={navigateSection(agent.id)}
          onBack={goList}
        />
      </AppShell>
    );
  }

  const deployConfig = record.deploy ?? defaultDeployConfig(agent.direction, agent.phoneNumber);
  const setDeployConfig = (deploy: DeployConfig) => patchRecord(agent.id, { deploy });

  /* ---------- Test ---------- */
  if (screen.name === "test") {
    return (
      <AppShell onGoHome={goList}>
        <TestEvaluateScreen
          key={agent.id}
          agent={agent}
          transcript={record.transcript}
          scenarios={record.scenarios}
          businessRules={record.businessRules}
          tools={record.tools}
          knowledge={record.knowledge}
          safety={record.safety}
          deploy={record.deploy}
          onScenariosChange={(scenarios) => patchRecord(agent.id, { scenarios })}
          onNavigate={navigateSection(agent.id)}
          onBack={goList}
        />
      </AppShell>
    );
  }

  /* ---------- Deploy ---------- */
  if ((agent.status === "live" || agent.status === "paused") && !screen.live && !screen.edit) {
    return (
      <AppShell onGoHome={goList}>
        <DeployWizardLayout
          agent={agent}
          activeId="golive"
          completedIds={[]}
          hideStepper
          hideFooter
          onNavigate={navigateSection(agent.id)}
          onExit={goList}
        >
          <DeployStatusPanel
            agent={agent}
            config={deployConfig}
            monthlyCost={estimatedMonthlyCost(deployConfig, agent)}
            onPause={() => updateAgent(agent.id, { status: "paused" })}
            onResume={() => updateAgent(agent.id, { status: "live" })}
            onEditSettings={() => navigate({ ...screen, step: "channel", edit: true })}
            onEditBudget={() => navigate({ ...screen, step: "cost", edit: true })}
          />
        </DeployWizardLayout>
      </AppShell>
    );
  }

  const stepIndex = deployOrder.indexOf(screen.step);
  const completedIds = screen.live ? deployStepsFor(agent.direction).map((s) => s.id) : deployOrder.slice(0, stepIndex);
  const taken = takenNumbers(records, agent.id);

  const goLive = () => {
    const number = resolvedNumber(deployConfig, agent.phoneNumber);
    if (!number) return;
    updateAgent(agent.id, { status: "live", phoneNumber: number });
    navigate({ ...screen, live: true }, { replace: true });
  };

  const onContinue = () => {
    if (screen.live) {
      setJustWentLive(agent.id);
      goList();
      return;
    }
    if (screen.step === "golive") {
      goLive();
      return;
    }
    navigate({ ...screen, step: deployOrder[stepIndex + 1] });
  };

  const onStepBack = () => {
    if (stepIndex > 0) navigate({ ...screen, step: deployOrder[stepIndex - 1] });
  };

  let continueLabel = "Continue";
  if (screen.step === "golive" && screen.live) continueLabel = "Back to Agents";

  const stepBlocked =
    (screen.step === "channel" && channelError(deployConfig, agent.phoneNumber) !== null) ||
    (screen.step === "compliance" && Object.keys(hoursErrors(deployConfig, agent.direction)).length > 0) ||
    (screen.step === "compliance" &&
      agent.direction === "outbound" &&
      Object.keys(contactListErrors(deployConfig)).length > 0) ||
    (screen.step === "cost" && !costAcknowledged);

  return (
    <AppShell onGoHome={goList}>
      <DeployWizardLayout
        agent={agent}
        activeId={screen.live ? "golive" : screen.step}
        completedIds={completedIds}
        continueLabel={continueLabel}
        continueDisabled={stepBlocked}
        continueHint={screen.step === "cost" && !costAcknowledged ? "Check the box above to continue" : undefined}
        showBack={stepIndex > 0 && !screen.live}
        showContinue={!(screen.step === "golive" && !screen.live)}
        onContinue={onContinue}
        onStepBack={onStepBack}
        onNavigate={navigateSection(agent.id)}
        onExit={goList}
      >
        {screen.step === "channel" && (
          <ChannelNumberStep
            direction={agent.direction}
            currentNumber={agent.phoneNumber}
            takenNumbers={taken}
            config={deployConfig}
            onConfigChange={setDeployConfig}
          />
        )}
        {screen.step === "compliance" && (
          <ComplianceStep
            direction={agent.direction}
            config={deployConfig}
            onConfigChange={setDeployConfig}
            canBook={!!bookingTool(record.tools)}
          />
        )}
        {screen.step === "cost" && (
          <CostEstimateStep
            direction={agent.direction}
            providers={agent}
            config={deployConfig}
            onConfigChange={setDeployConfig}
            acknowledged={costAcknowledged}
            onAcknowledgedChange={handleAcknowledged}
            onEstimateChange={handleEstimate}
            onApplyProviders={(patch) => updateAgent(agent.id, patch)}
          />
        )}
        {screen.step === "golive" && (
          <GoLiveStep
            agent={agent}
            live={screen.live}
            config={deployConfig}
            monthlyCost={monthlyCost}
            scenarios={record.scenarios}
            knowledge={record.knowledge}
            businessRules={record.businessRules}
            tools={record.tools}
            onGoLive={goLive}
            onReviewTests={() => navigateSection(agent.id)("test")}
            onReviewKnowledge={() => navigate({ name: "build", agentId: agent.id, tab: "knowledge" })}
            onReviewGuardrails={() => navigate({ name: "build", agentId: agent.id, tab: "guardrails" })}
            onReviewTools={() => navigate({ name: "build", agentId: agent.id, tab: "tools" })}
          />
        )}
      </DeployWizardLayout>
    </AppShell>
  );
}
