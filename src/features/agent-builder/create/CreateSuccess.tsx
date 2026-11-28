import { useState } from "react";
import { Badge, BadgeWithDot } from "@/components/base/badges/badges";
import { Button } from "@/components/base/buttons/button";
import { Check, Edit01, Play } from "@untitledui/icons";
import { VoiceWaveform } from "@/components/ui/VoiceWaveform";
import { FeaturedIcon } from "@/components/foundations/featured-icon/featured-icon";
import { agentLanguageLabel, businessNameOf, languageOf } from "@/lib/persona";
import type { Agent, BusinessRule, CallDirection, OutcomeField, Scenario, ToolDef } from "@/lib/types";

export function CreateSuccess({
  name = "Riverside Dental Front Desk",
  direction = "inbound",
  agent,
  setup,
  onTest,
  onOpenBuild,
  onEdit,
  onAddCounterpart,
}: {
  name?: string;
  direction?: CallDirection;
  /** The agent that was just created — when given, the defaults list shows its real values. */
  agent?: Agent;
  /** What create seeded beyond the persona, so the page can say what is and is not configured. */
  setup?: { rules: BusinessRule[]; outcomes: OutcomeField[]; scenarios: Scenario[]; tools: ToolDef[]; budget?: string; peakCalls?: number };
  onTest?: () => void;
  onOpenBuild?: () => void;
  /** Opens the Build editor on the tab that holds the given details. */
  onEdit?: (tab: "persona" | "knowledge") => void;
  /** Copies this agent into the opposite direction as a draft, with its rules, outcomes and knowledge. */
  onAddCounterpart?: () => void;
}) {
  const [counterpartAdded, setCounterpartAdded] = useState(false);
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
    { label: outbound ? "When it may call" : "Hours", value: agent?.details?.hours ? `${agent.details.hours}${agent.details.timezone ? ` (${agent.details.timezone.replace(/_/g, " ")})` : ""}` : null, missing: outbound ? "Not set. Deploy starts at 9:00am to 8:00pm as a placeholder; set hours that fit your region’s calling rules before it dials." : "Not set. It won’t state opening hours." },
    {
      label: outbound ? "If they want a person" : "If it can’t help",
      value:
        agent?.details?.handoff ??
        (agent?.details?.messageFields?.length ? `Takes a message: ${agent.details.messageFields.join(", ").toLowerCase()}` : null),
      missing: "Not set. It takes a number for a callback.",
    },
  ];

  const defaults = [
    {
      label: "Business name",
      value: agent ? businessNameOf(agent) : "Taken from the agent name",
    },
    { label: "Voice", value: agent ? agent.voice : "System default, assigned for you" },
    { label: "Language", value: agent ? agentLanguageLabel[languageOf(agent)] : agentLanguageLabel.en },
    { label: "AI settings", value: "Standard (balanced cost and speed)" },
  ];

  const enabledTools = setup?.tools.filter((t) => t.enabled) ?? [];
  const safety = setup
    ? [
        { label: "Guardrails", value: setup.rules.length ? `${setup.rules.length} rules, e.g. ${setup.rules[0].label}` : null, missing: "None yet. Add rules for anything it must never promise." },
        { label: "Required outcomes", value: setup.outcomes.length ? setup.outcomes.map((o) => o.label).join(" · ") : null, missing: `None yet. No ready-made checklist matched this job, so only ${setup.rules.length} general guardrail${setup.rules.length === 1 ? "" : "s"} were added. Add the rules and result fields this job needs.` },
        { label: "Test scenarios", value: `${setup.scenarios.length} ready to run. Verdicts come from your settings, not a live call.`, missing: undefined },
        {
          label: "Actions",
          value: enabledTools.length ? `${enabledTools.map((t) => (t.destination ? `${t.name} to ${t.destination}` : t.name)).join(", ")}. Not verified; this demo never dials or calls a system.` : null,
          missing: "No tools connected. It can talk and take notes, but can’t look anything up, submit anything or confirm an ID.",
        },
        ...(setup.peakCalls ? [{ label: "Busiest moment", value: `${setup.peakCalls.toLocaleString()} calls at once is your estimate. Not verified: ask your phone and voice providers for their limits, then load-test.`, missing: undefined }] : []),
        ...(setup.budget ? [{ label: "Monthly budget", value: `${setup.budget}. Cost is checked in Deploy.`, missing: undefined }] : []),
      ]
    : [];

  const greeting = agent?.greeting ?? "Auto-generated from the purpose you entered";

  const group = (title: string, tab: "persona" | "knowledge", rows: { label: string; value: string | null; missing?: string }[]) => (
    <section>
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-primary">{title}</h2>
        {onEdit && (
          <Button size="sm" color="link-color" iconLeading={Edit01} onClick={() => onEdit(tab)}>
            Edit
          </Button>
        )}
      </div>
      <dl className="mt-3 grid gap-x-10 gap-y-5 border-t border-secondary pt-5 sm:grid-cols-2">
        {rows.map((r) => (
          <div key={r.label} className={`min-w-0 ${r.label === "If it can’t help" ? "sm:col-span-2" : ""}`}>
            <dt className="text-sm text-tertiary">{r.label}</dt>
            <dd className={`mt-1 text-sm ${r.value ? "font-medium text-primary" : "text-tertiary"}`}>{r.value ?? r.missing}</dd>
          </div>
        ))}
      </dl>
    </section>
  );

  return (
    <div className="h-full overflow-y-auto bg-white">
      <div className="mx-auto w-full max-w-[720px] px-5 py-10 sm:px-8 sm:py-14">
        <div className="animate-step-in">
          <div className="flex flex-wrap items-center gap-2">
            <FeaturedIcon icon={Check} color="brand" theme="light" size="md" className="animate-success-pop shrink-0" />
            <Badge size="md" color="brand">{outbound ? "Outbound" : "Inbound"}</Badge>
            <BadgeWithDot size="md" color="gray">
              Draft
            </BadgeWithDot>
          </div>
          <h1 className="mt-4 text-display-xs font-semibold tracking-[-0.02em] text-primary sm:text-display-sm">Your agent is ready to test</h1>
          <p className="mt-2 text-md text-tertiary">{agentName}</p>
        </div>

        <div className="animate-step-in mt-8 rounded-2xl bg-secondary p-6 ring-1 ring-secondary sm:p-8 [animation-delay:90ms]">
          <div className="flex items-center gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-600 text-white">
              <VoiceWaveform variant="idle" className="h-4" />
            </span>
            <div className="min-w-0">
              <h2 className="text-md font-semibold text-primary">{outbound ? "Hear how it opens" : "Hear how it answers"}</h2>
              <p className="text-sm text-tertiary">{outbound ? "You play the recipient." : "You play the caller."}</p>
            </div>
          </div>
          <p className="mt-5 max-w-[92%] rounded-xl bg-white px-4 py-3 text-md text-primary ring-1 ring-secondary ring-inset">{greeting}</p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Button size="lg" iconLeading={Play} onClick={onTest}>
              Start test call
            </Button>
            <Button size="lg" color="secondary" onClick={onOpenBuild}>
              Open Build editor
            </Button>
          </div>
          <p className="mt-4 text-sm text-tertiary">
            {outbound ? "It won’t dial anyone until you finish Deploy." : "Calls won’t reach it until you finish Deploy."}
          </p>
          {onAddCounterpart && (
            <p className="mt-3 text-sm text-tertiary">
              {counterpartAdded ? (
                `An ${outbound ? "inbound" : "outbound"} draft was added to your agents. It starts with copies of this agent’s rules and knowledge; review its opening line, hours and tests before use.`
              ) : (
                <>
                  Need {outbound ? "incoming calls" : "outgoing updates"} too?{" "}
                  <button
                    type="button"
                    className="font-semibold text-brand-secondary underline underline-offset-2"
                    onClick={() => {
                      onAddCounterpart();
                      setCounterpartAdded(true);
                    }}
                  >
                    Add an {outbound ? "inbound" : "outbound"} draft
                  </button>
                </>
              )}
            </p>
          )}
        </div>

        <div className="animate-step-in mt-12 space-y-10 [animation-delay:150ms]">
          {group("Defaults we set", "persona", defaults.map((d) => ({ label: d.label, value: d.value })))}
          {setup && group("Safety and results", "persona", safety)}
          {agent && group("What it knows", "knowledge", known.map((k) => ({ label: k.label, value: k.value, missing: k.missing })))}
        </div>
      </div>
    </div>
  );
}
