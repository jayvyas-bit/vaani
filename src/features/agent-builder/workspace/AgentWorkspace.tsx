import { useState, type ReactNode } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { BrandMark } from "@/components/ui/AppShell";
import { Icon, type IconName } from "@/components/ui/Icon";
import type { DeployConfig } from "@/lib/deploy";
import { statusLabel, statusTone } from "@/lib/status";
import type { Agent, TranscriptTurn } from "@/lib/types";
import type { AgentContext } from "@/lib/simulate";
import { PreviewDialog } from "./AgentPreviewPanel";
import { CallFlowPanel } from "./CallFlowPanel";
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
      <p className="px-3 pb-1.5 text-[11.5px] font-semibold uppercase tracking-[0.06em] text-ink-400">{label}</p>
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
                className={`flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-left text-[13px] outline-none transition-colors focus-visible:ring-2 focus-visible:ring-brand-200 ${
                  isActive
                    ? "bg-paper-100 font-medium text-ink-950"
                    : "text-ink-600 hover:bg-paper-100 hover:text-ink-900"
                }`}
              >
                <Icon name={item.icon} className="size-4 shrink-0" />
                <span className="min-w-0 flex-1 truncate">{item.label}</span>
                {check?.done && (
                  <span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-success-100 text-success-700">
                    <Icon name="check" className="size-3" strokeWidth={2.5} />
                    <span className="sr-only">{check.label}: done</span>
                  </span>
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
  const [testing, setTesting] = useState(false);
  const inbound = agent.direction === "inbound";
  const doneCount = readiness?.filter((r) => r.done).length ?? 0;

  return (
    <div className="flex h-dvh overflow-hidden bg-paper-50">
      <aside className="flex w-60 shrink-0 flex-col border-r border-ink-950/10 bg-paper-0">
        <BrandMark />
        <nav aria-label="Agent sections" className="mt-2 flex-1 space-y-5 overflow-y-auto px-2.5 pb-4">
          <NavGroup label="Build" items={buildItems} active={section} readiness={readiness} onSelect={onSelect} />
          <NavGroup label="Launch" items={launchItems} active={section} readiness={readiness} onSelect={onSelect} />
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1">
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex h-14 shrink-0 items-center justify-between gap-4 border-b border-ink-950/10 bg-paper-0 px-4 sm:px-6">
            <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-2 text-[13.5px]">
              <button
                type="button"
                onClick={onBack}
                className="shrink-0 rounded-md text-ink-500 outline-none transition-colors hover:text-ink-900 focus-visible:ring-2 focus-visible:ring-brand-200"
              >
                Agents
              </button>
              <Icon name="chevron-right" className="size-3.5 shrink-0 text-ink-300" />
              <span
                className={`flex size-6 shrink-0 items-center justify-center rounded-md ring-1 ring-inset ${
                  inbound ? "bg-inbound-50 text-inbound-600 ring-inbound-100" : "bg-outbound-50 text-outbound-600 ring-outbound-100"
                }`}
              >
                <Icon name={inbound ? "phone-inbound" : "phone-outbound"} className="size-3.5" />
                <span className="sr-only">{inbound ? "Inbound" : "Outbound"}</span>
              </span>
              <h1 className="min-w-0 truncate font-semibold text-ink-950">{agent.name.trim() || "Untitled agent"}</h1>
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
              {section !== "test" && (
                <Button variant="secondary" size="sm" className="gap-1.5" onClick={() => setTesting(true)}>
                  <Icon name="play" className="size-3.5" />
                  Test agent
                </Button>
              )}
              {readiness && (
                <>
                  <span className="hidden text-[12.5px] text-ink-500 tabular-nums sm:inline">
                    {doneCount} of {readiness.length} ready
                  </span>
                  <Button size="sm" onClick={() => onSelect("deploy")}>
                    Go live
                  </Button>
                </>
              )}
            </div>
          </header>
          <div className="relative min-h-0 flex-1 overflow-hidden">{children}</div>
          {testing && <PreviewDialog agent={agent} source={preview} onClose={() => setTesting(false)} />}
        </div>

        <aside
          aria-label="Agent summary"
          className={`w-[320px] shrink-0 flex-col gap-3 overflow-y-auto border-l border-ink-950/10 bg-paper-50 p-3 ${
            railOpen ? "fixed inset-y-0 right-0 z-30 flex shadow-float" : "hidden"
          } xl:static xl:flex xl:shadow-none`}
        >
          <button
            type="button"
            onClick={() => setRailOpen(false)}
            aria-label="Hide summary"
            className="flex size-7 shrink-0 items-center justify-center self-end rounded-md text-ink-400 outline-none hover:bg-paper-100 hover:text-ink-700 focus-visible:ring-2 focus-visible:ring-brand-200 xl:hidden"
          >
            <Icon name="x" className="size-4" />
          </button>
          <CostSummaryPanel agent={agent} deploy={deploy} isDefault={deployIsDefault} onChange={onDeployChange} />
          <CallFlowPanel agent={agent} />
        </aside>
      </div>
    </div>
  );
}
