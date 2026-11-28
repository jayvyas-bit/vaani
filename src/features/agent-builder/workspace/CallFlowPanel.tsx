import { useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Icon, type IconName } from "@/components/ui/Icon";
import type { Agent } from "@/lib/types";

interface FlowNode {
  icon: IconName;
  label: string;
  note: string;
}

/** Placeholder only: the same five beats for every agent, not read from its config yet. */
function sampleFlow(direction: Agent["direction"]): FlowNode[] {
  return [
    direction === "inbound"
      ? { icon: "phone-inbound", label: "Call comes in", note: "Caller reaches the agent" }
      : { icon: "phone-outbound", label: "Agent dials", note: "Recipient picks up" },
    { icon: "message", label: "Greeting", note: "Introduces itself" },
    { icon: "list", label: "Understand the request", note: "Works out what's needed" },
    { icon: "wrench", label: "Tools and knowledge", note: "Looks things up, takes action" },
    { icon: "check", label: "Wrap up or hand off", note: "Ends the call or transfers" },
  ];
}

export function CallFlowPanel({ agent }: { agent: Agent }) {
  const nodes = sampleFlow(agent.direction);
  const [open, setOpen] = useState(false);

  return (
    <section className="rounded-xl border border-ink-950/10 bg-paper-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 rounded-xl px-4 py-3 text-left outline-none focus-visible:ring-2 focus-visible:ring-brand-200"
      >
        <span className="flex items-center gap-2">
          <h2 className="text-[13px] font-semibold text-ink-950">Call flow</h2>
          <Badge tone="neutral">Sample</Badge>
        </span>
        <Icon name="chevron-down" className={`size-4 text-ink-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="border-y border-ink-950/10 bg-[radial-gradient(var(--color-gray-200)_1px,transparent_1px)] [background-size:14px_14px] px-4 py-4">
            <ol className="mx-auto flex w-full max-w-[220px] flex-col items-stretch">
              {nodes.map((node, i) => (
                <li key={node.label} className="flex flex-col items-center">
                  {i > 0 && <span aria-hidden="true" className="h-4 w-px bg-ink-300" />}
                  <div className="flex w-full items-center gap-2.5 rounded-lg border border-ink-950/10 bg-paper-0 px-3 py-2 shadow-xs">
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-brand-50 text-brand-600">
                      <Icon name={node.icon} className="size-3.5" />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-[12.5px] font-medium text-ink-900">{node.label}</span>
                      <span className="block truncate text-[11.5px] text-ink-500">{node.note}</span>
                    </span>
                  </div>
                </li>
              ))}
            </ol>
          </div>
      )}
    </section>
  );
}
