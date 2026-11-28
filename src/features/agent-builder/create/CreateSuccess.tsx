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

  const offerings = agent?.details?.offerings.filter((o) => o.name.trim()) ?? [];
  const known = [
    {
      label: "Products & prices",
      value: offerings.length
        ? offerings.map((o) => (o.price ? `${o.name} ${o.price}` : o.name)).join(" · ")
        : null,
      missing: "None yet. It will say a teammate confirms prices.",
    },
    { label: "Hours", value: agent?.details?.hours ?? null, missing: "Not set. It won’t state opening hours." },
    {
      label: "If it can’t help",
      value: agent?.details?.handoff ?? null,
      missing: "Not set. It takes a number for a callback.",
    },
  ];

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
  ];

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-[640px] px-4 py-10 sm:px-0 sm:py-14">
          <div className="flex items-center gap-3">
            <div className="animate-success-pop flex size-11 shrink-0 items-center justify-center rounded-full bg-success-100 text-success-700">
              <Icon name="check" className="size-5" strokeWidth={2.5} />
            </div>
            <div className="animate-step-in [animation-delay:90ms]">
              <p className="text-[12px] font-medium text-success-700">Agent created</p>
              <h1 className="text-[22px] font-semibold text-ink-950">{agentName} is ready to test</h1>
            </div>
          </div>
          <div className="animate-step-in mt-4 flex flex-wrap items-center gap-2 text-[15px] text-ink-600 [animation-delay:140ms]">
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

          <div className="animate-step-in mt-7 rounded-lg border border-ink-950/10 bg-paper-0 [animation-delay:190ms]">
            <h2 className="border-b border-ink-950/10 px-4 py-3 text-[13px] font-medium text-ink-700 sm:px-5">
              What we defaulted for you
            </h2>
            <dl className="divide-y divide-ink-950/8">
              {defaults.map((d) => (
                <div
                  key={d.label}
                  className="flex flex-col gap-0.5 px-4 py-3 sm:flex-row sm:items-baseline sm:gap-6 sm:px-5"
                >
                  <dt className="shrink-0 text-[13px] text-ink-500 sm:w-[170px]">{d.label}</dt>
                  <dd className="text-[13px] font-medium text-ink-900">{d.value}</dd>
                </div>
              ))}
            </dl>
          </div>

          {agent && (
            <div className="animate-step-in mt-4 rounded-lg border border-ink-950/10 bg-paper-0 [animation-delay:210ms]">
              <h2 className="border-b border-ink-950/10 px-4 py-3 text-[13px] font-medium text-ink-700 sm:px-5">
                What it knows about the business
              </h2>
              <dl className="divide-y divide-ink-950/8">
                {known.map((k) => (
                  <div key={k.label} className="flex flex-col gap-0.5 px-4 py-3 sm:flex-row sm:items-baseline sm:gap-6 sm:px-5">
                    <dt className="shrink-0 text-[13px] text-ink-500 sm:w-[170px]">{k.label}</dt>
                    <dd className={`text-[13px] ${k.value ? "font-medium text-ink-900" : "text-ink-500"}`}>
                      {k.value ?? k.missing}
                    </dd>
                  </div>
                ))}
              </dl>
              <p className="border-t border-ink-950/10 px-4 py-3 text-[12px] text-ink-500 sm:px-5">
                Add or change any of this in Build → Knowledge.
              </p>
            </div>
          )}

          <div className="animate-step-in mt-6 flex flex-col gap-3 sm:flex-row sm:items-center [animation-delay:230ms]">
            <Button size="lg" className="gap-2" onClick={onTest}>
              <Icon name="play" className="size-4" />
              Start test call
            </Button>
            <Button size="lg" variant="secondary" onClick={onOpenBuild}>
              Open Build editor
            </Button>
          </div>
          <p className="mt-3 text-[12px] text-ink-500">
            {outbound
              ? "Nothing is live yet — this agent won’t dial anyone until you finish Deploy."
              : "Nothing is live yet — calls won’t reach this agent until you finish Deploy."}
          </p>
        </div>
      </div>
    </div>
  );
}
