import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
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
  contentClassName = "",
  center,
}: {
  agent: Agent;
  active: PrimarySection;
  onNavigate?: (section: PrimarySection) => void;
  onBack?: () => void;
  /** Lets a wrapping layout (e.g. the Deploy wizard) line this row's content up with a narrower body below it. */
  contentClassName?: string;
  /** Optional content (e.g. a step indicator) centered in this same header row, between the agent identity and the section nav. */
  center?: ReactNode;
}) {
  const items: { id: PrimarySection; label: string }[] = [
    { id: "build", label: "Build" },
    { id: "test", label: "Test & Evaluate" },
    { id: "deploy", label: "Deploy" },
  ];

  const navRef = useRef<HTMLElement>(null);
  const [pill, setPill] = useState<{ left: number; width: number } | null>(null);

  useLayoutEffect(() => {
    const nav = navRef.current;
    const activeEl = nav?.querySelector<HTMLButtonElement>(`[data-nav-id="${active}"]`);
    if (!nav || !activeEl) return;
    const update = () => setPill({ left: activeEl.offsetLeft, width: activeEl.offsetWidth });
    update();
    const observer = new ResizeObserver(update);
    observer.observe(nav);
    return () => observer.disconnect();
  }, [active]);

  return (
    <header className="border-b border-ink-950/10 bg-paper-0">
      <div
        className={`relative flex flex-col gap-3.5 px-4 py-4 sm:px-6 md:flex-row md:items-center md:justify-between md:gap-6 ${contentClassName}`}
      >
        <div className="flex min-w-0 items-center gap-4">
          <button
            type="button"
            onClick={onBack}
            className="flex shrink-0 items-center gap-1 text-[13px] font-medium text-ink-400 transition-colors hover:text-ink-700"
          >
            <Icon name="chevron-right" className="size-3.5 rotate-180" />
            Agents
          </button>
          <div className="h-5 w-px shrink-0 bg-ink-950/10" />
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
              <p className="min-w-0 max-w-full truncate text-[14.5px] font-semibold tracking-[-0.01em] text-ink-950">
                {agent.name.trim() || "Untitled agent"}
              </p>
              <div className="flex shrink-0 items-center gap-1.5">
                <Badge tone={agent.direction === "inbound" ? "inbound" : "outbound"}>
                  {agent.direction === "inbound" ? "Inbound" : "Outbound"}
                </Badge>
                <Badge tone={statusTone[agent.status] ?? "neutral"} dot>
                  {statusLabel[agent.status] ?? "Draft"}
                </Badge>
              </div>
            </div>
          </div>
        </div>

        {center && (
          <div className="flex min-w-0 items-center justify-center md:absolute md:inset-y-0 md:left-1/2 md:-translate-x-1/2">
            {center}
          </div>
        )}

        <nav
          ref={navRef}
          aria-label="Agent sections"
          className="relative flex shrink-0 items-center gap-1 rounded-xl bg-paper-100 p-1"
        >
          {pill && (
            <span
              aria-hidden="true"
              className="absolute top-1 left-0 h-[calc(100%-0.5rem)] rounded-lg bg-paper-0 shadow-xs ring-1 ring-ink-950/5 transition-[transform,width] duration-200 ease-[var(--ease-out-quart)]"
              style={{ width: pill.width, transform: `translateX(${pill.left}px)` }}
            />
          )}
          {items.map((item) => (
            <button
              key={item.id}
              data-nav-id={item.id}
              type="button"
              onClick={() => onNavigate?.(item.id)}
              aria-current={item.id === active ? "page" : undefined}
              className={`relative z-10 flex-1 whitespace-nowrap rounded-lg px-4 py-1.5 text-[13px] font-medium transition-colors md:flex-none ${
                item.id === active ? "text-ink-950" : "text-ink-500 hover:text-ink-800"
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
