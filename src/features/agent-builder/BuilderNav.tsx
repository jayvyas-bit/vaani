import type { Agent } from "@/lib/types";
import { Badge } from "@/components/ui/Badge";
import { Icon } from "@/components/ui/Icon";
import { statusLabel, statusTone } from "@/lib/status";

export type PrimarySection = "build" | "test" | "deploy";

export function BuilderNav({
  agent,
  active,
  onNavigate,
  onBack,
}: {
  agent: Agent;
  active: PrimarySection;
  onNavigate?: (section: PrimarySection) => void;
  onBack?: () => void;
}) {
  const items: { id: PrimarySection; label: string }[] = [
    { id: "build", label: "Build" },
    { id: "test", label: "Test & Evaluate" },
    { id: "deploy", label: "Deploy" },
  ];

  return (
    <header className="border-b border-ink-950/10 bg-paper-0">
      <div className="flex flex-col gap-3 px-4 py-3 sm:px-6 md:flex-row md:items-center md:justify-between md:gap-6 md:py-3.5">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="flex shrink-0 items-center gap-1 text-[13px] text-ink-400 hover:text-ink-700"
          >
            <Icon name="chevron-right" className="size-3.5 rotate-180" />
            Agents
          </button>
          <div className="h-4 w-px shrink-0 bg-ink-950/10" />
          <div
            className={`flex size-8 shrink-0 items-center justify-center rounded-md ${
              agent.direction === "inbound" ? "bg-inbound-100 text-inbound-600" : "bg-outbound-100 text-outbound-600"
            }`}
          >
            <Icon name={agent.direction === "inbound" ? "phone-inbound" : "phone-outbound"} className="size-4" />
          </div>
          <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
            <p className="min-w-0 max-w-full truncate text-[14px] font-semibold text-ink-950">
              {agent.name.trim() || "Untitled agent"}
            </p>
            <div className="flex shrink-0 items-center gap-2">
              <Badge tone={agent.direction === "inbound" ? "inbound" : "outbound"}>
                {agent.direction === "inbound" ? "Inbound" : "Outbound"}
              </Badge>
              <Badge tone={statusTone[agent.status] ?? "neutral"} dot>
                {statusLabel[agent.status] ?? "Draft"}
              </Badge>
            </div>
          </div>
        </div>

        <nav aria-label="Agent sections" className="flex shrink-0 items-center gap-1 rounded-lg bg-paper-50 p-1">
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onNavigate?.(item.id)}
              aria-current={item.id === active ? "page" : undefined}
              className={`flex-1 whitespace-nowrap rounded-md px-3.5 py-1.5 text-[13px] font-medium transition-colors md:flex-none ${
                item.id === active ? "bg-paper-0 text-ink-950 shadow-sm" : "text-ink-500 hover:text-ink-800"
              }`}
            >
              {item.label}
            </button>
          ))}
        </nav>
      </div>
    </header>
  );
}
