import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { businessNameOf } from "@/lib/persona";
import type { Agent, CallDirection } from "@/lib/types";

export function CreateSuccess({
  name = "Riverside Dental Front Desk",
  direction = "inbound",
  agent,
  onTest,
  onOpenBuild,
}: {
  name?: string;
  direction?: CallDirection;
  /** The agent that was just created — when given, the defaults list shows its real values. */
  agent?: Agent;
  onTest?: () => void;
  onOpenBuild?: () => void;
}) {
  const agentName = agent?.name ?? name;
  const dir = agent?.direction ?? direction;
  const outbound = dir === "outbound";

  const defaults = [
    {
      label: "Business name",
      value: agent ? `${businessNameOf(agent)} — what ${outbound ? "recipients" : "callers"} hear` : "Taken from the agent name",
    },
    { label: "Voice", value: agent ? agent.voice : "System default — assigned, demo-ready" },
    {
      label: outbound ? "Opening line" : "Greeting",
      value: agent ? `“${agent.greeting}”` : "Auto-generated from the purpose you entered",
    },
    { label: "AI settings", value: "Standard (balanced cost and speed)" },
    { label: "Guardrails", value: "Safety defaults on, no business rules yet" },
    { label: "Knowledge & tools", value: "None attached — add them any time" },
    outbound
      ? { label: "Calling window & DNC", value: "Set in Deploy — nothing is dialed until then" }
      : { label: "Phone number", value: "Not reserved yet — you'll pick one in Deploy" },
  ];

  return (
    <div className="mx-auto w-full max-w-[640px] px-4 py-10 sm:px-0 sm:py-14">
      <div className="flex items-center gap-2 text-[12.5px] font-medium text-success-700">
        <Icon name="check" className="size-3.5" />
        Agent created
      </div>
      <h1 className="mt-1 text-[22px] font-semibold text-ink-950">{agentName} is ready to test</h1>
      <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[14px] text-ink-600">
        <Badge tone={dir}>{outbound ? "Outbound" : "Inbound"}</Badge>
        <Badge tone="neutral" dot>
          Draft
        </Badge>
        <p>
          {outbound
            ? "Start a test call to hear how it opens with a recipient before changing anything else."
            : "Start a test call to hear how it answers before changing anything else."}
        </p>
      </div>

      <div className="mt-7 rounded-lg border border-ink-950/10 bg-paper-0">
        <h2 className="border-b border-ink-950/10 px-4 py-3 text-[13px] font-medium text-ink-700 sm:px-5">
          What we defaulted for you
        </h2>
        <dl className="divide-y divide-ink-950/8">
          {defaults.map((d) => (
            <div
              key={d.label}
              className="flex flex-col gap-0.5 px-4 py-3 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6 sm:px-5"
            >
              <dt className="shrink-0 text-[13px] text-ink-500">{d.label}</dt>
              <dd className="text-[13px] font-medium text-ink-900 sm:text-right">{d.value}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <Button size="lg" className="gap-2" onClick={onTest}>
          <Icon name="play" className="size-4" />
          Start test call
        </Button>
        <Button size="lg" variant="secondary" onClick={onOpenBuild}>
          Open Build editor
        </Button>
      </div>
      <p className="mt-3 text-[12.5px] text-ink-400">
        {outbound
          ? "Nothing is live yet — this agent won't dial anyone until you finish Deploy."
          : "Nothing is live yet — calls won't reach this agent until you finish Deploy."}
      </p>
    </div>
  );
}
