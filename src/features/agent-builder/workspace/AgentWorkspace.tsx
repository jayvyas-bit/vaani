import { useState, type ReactNode } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { BrandMark } from "@/components/ui/AppShell";
import { Icon, type IconName } from "@/components/ui/Icon";
import type { DeployConfig } from "@/lib/deploy";
import { statusLabel, statusTone } from "@/lib/status";
import type { Agent, TranscriptTurn } from "@/lib/types";
import type { AgentContext } from "@/lib/simulate";
import { AgentPreviewPanel } from "./AgentPreviewPanel";
import { CostSummaryPanel } from "./CostSummaryPanel";

export type WorkspaceSection = "persona" | "guardrails" | "knowledge" | "tools" | "outcomes" | "test" | "deploy";

/** One go-live requirement, shown as a tick beside the sidebar item that fixes it. */
export interface ReadinessItem {
  label: string;
  done: boolean;
  section: WorkspaceSection;
}

interface NavItem {
  id: WorkspaceSection;
  label: string;
  icon: IconName;
}

const buildItems: NavItem[] = [
  { id: "persona", label: "Persona", icon: "user" },
  { id: "guardrails", label: "Guardrails", icon: "shield" },
  { id: "knowledge", label: "Knowledge", icon: "book" },
  { id: "tools", label: "Tools", icon: "wrench" },
  { id: "outcomes", label: "Outcomes", icon: "check" },
];

const launchItems: NavItem[] = [
  { id: "test", label: "Test & evaluate", icon: "play" },
  { id: "deploy", label: "Deploy", icon: "flag" },
];

/** What the preview dialog needs to run a real test call from any screen. */
export interface PreviewSource {
  transcript: TranscriptTurn[];
  context: AgentContext;
}

function NavGroup({
  label,
  items,
  active,
  readiness,
  onSelect,
}: {
  label: string;
  items: NavItem[];
  active: WorkspaceSection;
  readiness?: ReadinessItem[];
  onSelect: (id: WorkspaceSection) => void;
}) {
  return (
    <div>
      <p className="px-3 pb-1.5 text-xs font-semibold uppercase tracking-[0.06em] text-ink-500">{label}</p>
      <ul className="space-y-0.5">
        {items.map((item) => {
          const isActive = item.id === active;
          const check = readiness?.find((r) => r.section === item.id);
          return (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => onSelect(item.id)}
                aria-current={isActive ? "page" : undefined}
                className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm outline-focus-ring transition-colors duration-150 focus-visible:outline-2 ${
                  isActive
                    ? "bg-active font-medium text-primary"
                    : "text-tertiary hover:bg-primary_hover hover:text-secondary"
                }`}
              >
                <Icon name={item.icon} className="size-4 shrink-0" />
                <span className="min-w-0 flex-1 truncate">{item.label}</span>
                {check?.done && (
                  <span className="animate-check-in flex size-4 shrink-0 items-center justify-center rounded-full bg-success-100 text-success-700">
                    <Icon name="check" className="size-3" strokeWidth={2.5} />
                    <span className="sr-only">{check.label}: done</span>
                  </span>
                )}
                {check && !check.done && (
                  <span aria-hidden="true" className="size-1.5 shrink-0 rounded-full bg-warning-500" />
                )}
                {check && !check.done && <span className="sr-only">{check.label}: to do</span>}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/**
 * Three panes around the editor: the app sidebar, a one-line header over the
 * work area, and a rail on the right that follows the agent through every
 * section — a call to try it, its running cost, and the call-flow map.
 */
export function AgentWorkspace({
  agent,
  section,
  onSelect,
  onBack,
  preview,
  deploy,
  deployIsDefault,
  onDeployChange,
  readiness,
  children,
}: {
  agent: Agent;
  section: WorkspaceSection;
  onSelect: (section: WorkspaceSection) => void;
  onBack: () => void;
  preview: PreviewSource;
  deploy: DeployConfig;
  /** True until the person has saved their own volume in Deploy. */
  deployIsDefault: boolean;
  onDeployChange: (next: DeployConfig) => void;
  /** Omitted once the agent is live — nothing left to finish. */
  readiness?: ReadinessItem[];
  children: ReactNode;
}) {
  // Below xl the rail doesn't fit beside the editor, so it opens over it on demand.
  const [railOpen, setRailOpen] = useState(false);
  const inbound = agent.direction === "inbound";
  const doneCount = readiness?.filter((r) => r.done).length ?? 0;
  const nextTodo = readiness?.find((r) => !r.done);

  return (
    <div className="flex h-dvh overflow-hidden bg-paper-50">
      <aside className="hidden w-60 shrink-0 flex-col lg:flex border-r border-ink-950/10 bg-paper-0">
        <BrandMark />
        <nav aria-label="Agent sections" className="mt-2 flex-1 space-y-5 overflow-y-auto px-2.5 pb-4">
          <NavGroup label="Build" items={buildItems} active={section} readiness={readiness} onSelect={onSelect} />
          <NavGroup label="Launch" items={launchItems} active={section} readiness={readiness} onSelect={onSelect} />
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1">
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex h-14 shrink-0 items-center justify-between gap-4 border-b border-ink-950/10 bg-paper-0 px-4 sm:px-6">
            <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-2 text-sm">
              <button
                type="button"
                onClick={onBack}
                className="hidden shrink-0 rounded-md text-ink-500 outline-none sm:inline transition-colors hover:text-ink-900 focus-visible:ring-2 focus-visible:ring-brand-200"
              >
                Agents
              </button>
              <Icon name="chevron-right" className="hidden size-3.5 shrink-0 text-ink-300 sm:block" />
              <span
                className={`flex size-6 shrink-0 items-center justify-center rounded-md ring-1 ring-inset ${
                  inbound ? "bg-inbound-50 text-inbound-600 ring-inbound-100" : "bg-outbound-50 text-outbound-600 ring-outbound-100"
                }`}
              >
                <Icon name={inbound ? "phone-inbound" : "phone-outbound"} className="size-3.5" />
                <span className="sr-only">{inbound ? "Inbound" : "Outbound"}</span>
              </span>
              <span className="min-w-0 truncate font-semibold text-primary">{agent.name.trim() || "Untitled agent"}</span>
              <Badge tone={statusTone[agent.status] ?? "neutral"} dot live={agent.status === "live"}>
                {statusLabel[agent.status] ?? "Draft"}
              </Badge>
            </nav>
            <div className="flex shrink-0 items-center gap-3">
              <Button
                variant="secondary"
                size="sm"
                className="xl:hidden"
                aria-expanded={railOpen}
                onClick={() => setRailOpen((o) => !o)}
              >
                <Icon name="play" className="size-3.5" />
                Summary
              </Button>
              {readiness && (
                <>
                  <span className="hidden text-sm text-ink-500 tabular-nums sm:inline">
                    {doneCount} of {readiness.length} ready
                  </span>
                  <Button
                    size="sm"
                    title={nextTodo ? `Next: ${nextTodo.label}` : "Everything is ready"}
                    onClick={() => onSelect(nextTodo ? nextTodo.section : "deploy")}
                  >
                    {nextTodo ? "Finish setup" : "Go live"}
                  </Button>
                </>
              )}
            </div>
          </header>
          <nav aria-label="Agent sections" className="flex shrink-0 gap-1 overflow-x-auto border-b border-secondary bg-primary px-3 py-2 lg:hidden">
            {[...buildItems, ...launchItems].map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelect(item.id)}
                aria-current={item.id === section ? "page" : undefined}
                className={`flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-sm outline-focus-ring focus-visible:outline-2 ${
                  item.id === section ? "bg-active font-medium text-primary" : "text-tertiary hover:bg-primary_hover"
                }`}
              >
                <Icon name={item.icon} className="size-4" />
                {item.label}
              </button>
            ))}
          </nav>
          <div className="relative min-h-0 flex-1 overflow-hidden">{children}</div>
        </div>

        <aside
          aria-label="Agent summary"
          className={`w-[360px] shrink-0 flex-col gap-5 overflow-y-auto border-l border-secondary bg-primary p-5 ${
            railOpen ? "fixed inset-y-0 right-0 z-30 flex shadow-float" : "hidden"
          } xl:static xl:flex xl:shadow-none`}
        >
          <AgentPreviewPanel agent={agent} source={preview} onClose={() => setRailOpen(false)} />
          <CostSummaryPanel agent={agent} deploy={deploy} isDefault={deployIsDefault} onChange={onDeployChange} />
        </aside>
      </div>
    </div>
  );
}
