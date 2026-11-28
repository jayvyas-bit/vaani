import type { Agent, AgentStatus } from "@/lib/types";
import { Badge } from "@/components/ui/Badge";
import { Icon } from "@/components/ui/Icon";
import { PageHeader, PageHeaderBackLink, PageHeaderDivider } from "@/components/ui/PageHeader";
import { Stepper, type StepItem } from "@/components/ui/Stepper";
import { statusLabel, statusTone } from "@/lib/status";

export type PrimarySection = "build" | "test" | "deploy";

const sectionSteps: StepItem[] = [
  { id: "build", label: "Build" },
  { id: "test", label: "Test & Evaluate" },
  { id: "deploy", label: "Deploy" },
];

const sectionOrder: PrimarySection[] = ["build", "test", "deploy"];

/** How far an agent has actually gotten, independent of which tab is open right now. */
const stageIndexForStatus: Record<AgentStatus, number> = { draft: 0, testing: 1, live: 2, paused: 2 };

export function BuilderNav({
  agent,
  active,
  onNavigate,
  onBack,
  contentClassName = "",
}: {
  agent: Agent;
  active: PrimarySection;
  onNavigate?: (section: PrimarySection) => void;
  onBack?: () => void;
  /** Lets a wrapping layout (e.g. the Deploy wizard) line this row’s content up with a narrower body below it. */
  contentClassName?: string;
}) {
  const completedIds = sectionOrder.slice(0, stageIndexForStatus[agent.status] ?? 0);

  return (
    <PageHeader
      stackAt="lg"
      contentClassName={contentClassName}
      left={
        <>
          <PageHeaderBackLink label="Agents" onClick={onBack} />
          <PageHeaderDivider />
          <div className="flex min-w-0 items-center gap-3">
            <div
              className={`flex size-9 shrink-0 items-center justify-center rounded-lg ring-1 ring-inset ${
                agent.direction === "inbound"
                  ? "bg-inbound-50 text-inbound-600 ring-inbound-100"
                  : "bg-outbound-50 text-outbound-600 ring-outbound-100"
              }`}
            >
              <Icon name={agent.direction === "inbound" ? "phone-inbound" : "phone-outbound"} className="size-4" />
            </div>
            <div className="flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-1">
              <p className="min-w-[90px] max-w-full truncate text-[15px] font-semibold tracking-[-0.01em] text-ink-950">
                {agent.name.trim() || "Untitled agent"}
              </p>
              <div className="flex shrink-0 items-center gap-1.5">
                <Badge tone={agent.direction === "inbound" ? "inbound" : "outbound"}>
                  {agent.direction === "inbound" ? "Inbound" : "Outbound"}
                </Badge>
                <Badge tone={statusTone[agent.status] ?? "neutral"} dot live={agent.status === "live"}>
                  {statusLabel[agent.status] ?? "Draft"}
                </Badge>
              </div>
            </div>
          </div>
        </>
      }
      center={
        <Stepper
          steps={sectionSteps}
          activeId={active}
          completedIds={completedIds}
          compact
          onStepClick={(id) => onNavigate?.(id as PrimarySection)}
        />
      }
    />
  );
}
