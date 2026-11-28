import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import {
  contactCountLabel,
  contactListSummary,
  defaultDeployConfig,
  dncLabel,
  effectivePerMinRate,
  formatTime,
  hoursSummary,
  monthlyCost as costOf,
  numberSourceNote,
  resolvedNumber,
  type DeployConfig,
} from "@/lib/deploy";
import { formatMoney, type DisplayCurrency } from "@/lib/format";
import { bookingTool, enabledTransferTool, workingBookingTool, workingTransferTool } from "@/lib/tools";
import type { Agent, BusinessRule, KnowledgeSource, Scenario, ToolDef } from "@/lib/types";

export function GoLiveStep({
  agent,
  live = false,
  config: configProp,
  monthlyCost,
  scenarios,
  knowledge,
  businessRules,
  tools,
  onGoLive,
  onReviewTests,
  onReviewKnowledge,
  onReviewGuardrails,
  onReviewTools,
}: {
  agent: Agent;
  live?: boolean;
  /** What the earlier wizard steps collected — every row below is read from it. */
  config?: DeployConfig;
  monthlyCost?: number;
  scenarios?: Scenario[];
  knowledge?: KnowledgeSource[];
  businessRules?: BusinessRule[];
  tools?: ToolDef[];
  onGoLive?: () => void;
  onReviewTests?: () => void;
  onReviewKnowledge?: () => void;
  onReviewGuardrails?: () => void;
  onReviewTools?: () => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const config = configProp ?? defaultDeployConfig(agent.direction, agent.phoneNumber);
  const number = live ? agent.phoneNumber : resolvedNumber(config, agent.phoneNumber);
  const cost = configProp ? costOf(config, agent) : (monthlyCost ?? costOf(config, agent));
  const rate = effectivePerMinRate(agent);
  const currency: DisplayCurrency = config.displayCurrency ?? "USD";

  const total = scenarios?.length ?? 0;
  const passing = scenarios?.filter((s) => s.verdict === "pass").length ?? 0;
  const failing = scenarios?.filter((s) => s.verdict === "fail").length ?? 0;
  const inconclusive = scenarios?.filter((s) => s.verdict === "inconclusive").length ?? 0;
  const notRun = scenarios?.filter((s) => s.verdict === "not-run").length ?? 0;
  const allPassing = total > 0 && passing === total;
  const attachedKnowledge = knowledge?.filter((k) => k.attached).length ?? 0;
  const listSummary = contactListSummary(config);
  const callWindow = `${formatTime(config.windowStart)} and ${formatTime(config.windowEnd)}`;
  const callsCopy = listSummary
    ? `the ${contactCountLabel(config.contactCount)} in ${config.contactListName.trim()} between ${callWindow}`
    : `recipients between ${callWindow}`;

  const hoursValue =
    agent.direction === "inbound"
      ? `${hoursSummary(config)} · ${config.afterHours ? "after-hours calls answered" : "after hours to voicemail"}`
      : `${formatTime(config.windowStart)} – ${formatTime(config.windowEnd)} recipient time · ${dncLabel[config.dncList]} · voicemail detection ${
          config.voicemailDetect ? "on" : "off"
        }`;

  const rows = [
    {
      label: "Phone number",
      value: number ? `${number}, ${numberSourceNote[config.numberMethod]}` : "Not reserved yet",
    },
    ...(agent.direction === "outbound" ? [{ label: "Who to call", value: listSummary ?? "Not set yet" }] : []),
    { label: agent.direction === "inbound" ? "Hours" : "Calling rules", value: hoursValue },
    {
      label: "Projected monthly cost",
      value: `${currency === "USD" ? "≈ " : ""}${formatMoney(cost, currency)} / month (${config.callsPerMonth.toLocaleString()} calls × ${config.avgMinutes.toFixed(1)} min at ${formatMoney(rate, currency, { cents: true })}/min)`,
    },
    ...(config.monthlyBudget !== undefined
      ? [{ label: "Monthly budget", value: formatMoney(config.monthlyBudget, currency) }]
      : []),
    // Only shown once it's actually good news — an unresolved gap here is covered
    // more usefully, with an action button, by the issue banner below.
    ...(total > 0 && allPassing ? [{ label: "Test scenarios", value: `${passing} of ${total} passing` }] : []),
    ...(attachedKnowledge > 0
      ? [{ label: "Knowledge", value: `${attachedKnowledge} source${attachedKnowledge === 1 ? "" : "s"} attached` }]
      : []),
    ...(businessRules !== undefined && businessRules.length > 0
      ? [{ label: "Guardrails", value: `${businessRules.length} rule${businessRules.length === 1 ? "" : "s"} set` }]
      : []),
  ];

  if (live) {
    return (
      <div className="flex flex-col items-center py-10 text-center">
        <div className="animate-success-pop flex size-12 items-center justify-center rounded-full bg-success-100 text-success-700">
          <Icon name="check" className="size-6" strokeWidth={2.2} />
        </div>
        <h1 className="animate-step-in mt-4 text-display-xs font-semibold tracking-[-0.02em] text-primary [animation-delay:90ms]">
          {agent.name} is live
        </h1>
        <p className="animate-step-in mt-1.5 max-w-sm text-[15px] text-ink-600 [animation-delay:140ms]">
          {agent.direction === "inbound"
            ? `Calls to ${number ?? "its number"} now reach this agent.`
            : `From ${number ?? "its number"}, the agent now calls ${callsCopy}, recipient time.`}
        </p>
        <p className="animate-step-in mt-1 max-w-sm text-[13px] text-ink-500 [animation-delay:180ms]">
          You can pause it any time from its Deploy tab.
        </p>
      </div>
    );
  }

  const readinessParts = [
    `${passing} passing`,
    failing > 0 && `${failing} failing`,
    inconclusive > 0 && `${inconclusive} inconclusive`,
    notRun > 0 && `${notRun} not run`,
  ].filter(Boolean);
  const readinessText =
    total === 0
      ? "This agent has no test scenarios yet."
      : notRun === total
        ? `None of the ${total} test scenarios have been run yet.`
        : `Test scenarios: ${readinessParts.join(" · ")}.`;

  interface Issue {
    key: string;
    title: string;
    detail: string;
    action?: { label: string; onClick: () => void };
  }

  const issues: Issue[] = [];
  if (scenarios !== undefined && !allPassing) {
    issues.push({
      key: "tests",
      title: readinessText,
      detail: `${
        failing > 0 || notRun > 0 ? "Run all test scenarios and fix what fails" : "Check the inconclusive ones with a test call"
      } before real ${agent.direction === "inbound" ? "callers" : "recipients"} reach this agent.`,
      action: onReviewTests ? { label: "Review tests", onClick: onReviewTests } : undefined,
    });
  }
  if (knowledge !== undefined && attachedKnowledge === 0) {
    issues.push({
      key: "knowledge",
      title: "No knowledge sources are attached.",
      detail: "This agent will answer from its instructions alone, with nothing to ground it in your real policies, prices or hours.",
      action: onReviewKnowledge ? { label: "Add knowledge", onClick: onReviewKnowledge } : undefined,
    });
  }
  if (businessRules !== undefined && businessRules.length === 0) {
    issues.push({
      key: "rules",
      title: "No guardrails are set.",
      detail: "This agent only follows its persona, with nothing stopping it from promising a discount, refund, or anything else on a call.",
      action: onReviewGuardrails ? { label: "Add a rule", onClick: onReviewGuardrails } : undefined,
    });
  }
  if (config.monthlyBudget !== undefined && cost > config.monthlyBudget) {
    issues.push({
      key: "budget",
      title: `Projected cost exceeds your ${formatMoney(config.monthlyBudget, currency)} monthly budget.`,
      detail: `At this volume, ${agent.name} is projected to cost ${formatMoney(cost, currency)}/month, ${formatMoney(cost - config.monthlyBudget, currency)} over.`,
    });
  }
  if (tools !== undefined) {
    const transfer = enabledTransferTool(tools);
    if (transfer && !workingTransferTool(tools)) {
      issues.push({
        key: "transfer",
        title: `“${transfer.name}” is enabled but has no destination set.`,
        detail: "This agent will offer to transfer the call, then have nowhere to send it.",
        action: onReviewTools ? { label: "Set destination", onClick: onReviewTools } : undefined,
      });
    }
    const booking = bookingTool(tools);
    if (booking && !workingBookingTool(tools)) {
      issues.push({
        key: "booking",
        title: `“${booking.name}” is enabled but no calendar is connected.`,
        detail: "A provider is configured, but without a connected calendar this agent can’t actually book or move appointments.",
        action: onReviewTools ? { label: "Connect calendar", onClick: onReviewTools } : undefined,
      });
    }
  }
  const needsConfirm = issues.length > 0;

  const intro =
    agent.direction === "inbound"
      ? config.numberMethod === "port"
        ? "Once live, calls to your ported number reach the agent instead of your current line."
        : "Once live, real callers dialing this number reach the agent."
      : `Once live, the agent calls ${callsCopy}.`;

  return (
    <div className="flex flex-col gap-7">
      <div>
        <h1 className="text-display-xs font-semibold tracking-[-0.02em] text-primary">Review & go live</h1>
        <p className="mt-2 text-md text-tertiary">{intro}</p>
      </div>

      <dl className="divide-y divide-ink-950/8 rounded-lg border border-ink-950/10 bg-paper-0">
        {rows.map((r) => (
          <div key={r.label} className="flex flex-col gap-0.5 px-4 py-3 sm:flex-row sm:items-baseline sm:gap-6 sm:px-5">
            <dt className="shrink-0 text-[13px] text-ink-500 sm:w-[170px]">{r.label}</dt>
            <dd className="text-[13px] font-medium text-ink-900">{r.value}</dd>
          </div>
        ))}
      </dl>

      {issues.length > 0 && (
        <div className="flex flex-col divide-y divide-warning-200 rounded-lg border border-warning-200 bg-warning-50">
          {issues.map((issue) => (
            <div key={issue.key} role="status" className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start">
              <Icon name="alert" className="mt-0.5 size-4 shrink-0 text-warning-600" />
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-semibold text-ink-900">{issue.title}</p>
                <p className="mt-0.5 text-[12px] text-ink-600">{issue.detail}</p>
              </div>
              {issue.action && (
                <Button size="sm" variant="secondary" className="shrink-0 self-start" onClick={issue.action.onClick}>
                  {issue.action.label}
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      {confirming ? (
        <div
          role="alertdialog"
          aria-labelledby="golive-confirm-title"
          aria-describedby="golive-confirm-desc"
          className="flex flex-col gap-3 rounded-lg border border-error-200 bg-paper-0 p-4"
        >
          <p id="golive-confirm-title" className="text-[15px] font-semibold text-ink-950">
            Go live with {issues.length} open item{issues.length === 1 ? "" : "s"} unresolved?
          </p>
          <ul id="golive-confirm-desc" className="list-disc pl-4 text-[13px] text-ink-600">
            {issues.map((issue) => (
              <li key={issue.key}>{issue.title}</li>
            ))}
          </ul>
          <p className="text-[13px] text-ink-600">
            {agent.name} will {agent.direction === "inbound" ? "start answering real calls" : "start calling real recipients"} with
            these unresolved. You can pause it any time from its Deploy tab.
          </p>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="ghost" onClick={() => setConfirming(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={onGoLive} disabled={!number}>
              Go live anyway
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <p className="text-[13px] text-ink-500">You can pause it any time from its Deploy tab.</p>
          <Button
            size="lg"
            className="shrink-0 gap-2"
            disabled={!number}
            onClick={() => (needsConfirm ? setConfirming(true) : onGoLive?.())}
          >
            <Icon name={agent.direction === "inbound" ? "phone-inbound" : "phone-outbound"} className="size-4" />
            {agent.direction === "inbound" ? "Start answering calls" : "Start calling"}
          </Button>
        </div>
      )}
    </div>
  );
}
