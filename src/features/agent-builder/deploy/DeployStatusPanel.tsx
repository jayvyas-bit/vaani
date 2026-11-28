import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { contactListSummary, dncLabel, formatTime, type DeployConfig } from "@/lib/deploy";
import { formatUsd } from "@/lib/format";
import { statusLabel, statusTone } from "@/lib/status";
import type { Agent } from "@/lib/types";

/**
 * What Deploy shows for an agent that is already live (or paused): its status,
 * a Pause / Resume switch, and a summary of how it’s deployed. Changing those
 * settings re-opens the wizard.
 */
export function DeployStatusPanel({
  agent,
  config,
  monthlyCost,
  onPause,
  onResume,
  onEditSettings,
  onEditBudget,
}: {
  agent: Agent;
  config: DeployConfig;
  /** Current projected spend at this agent’s configured volume and providers. */
  monthlyCost?: number;
  onPause?: () => void;
  onResume?: () => void;
  onEditSettings?: () => void;
  /** Jumps straight to the Cost estimate step — no need to re-walk phone/hours first. */
  onEditBudget?: () => void;
}) {
  const live = agent.status === "live";
  const inbound = agent.direction === "inbound";
  const budget = config.monthlyBudget;
  const overBudget = budget !== undefined && monthlyCost !== undefined && monthlyCost > budget;

  const rows = [
    { label: "Phone number", value: agent.phoneNumber ?? "Not reserved yet" },
    ...(!inbound ? [{ label: "Who to call", value: contactListSummary(config) ?? "Not set yet" }] : []),
    {
      label: inbound ? "Hours" : "Calling rules",
      value: inbound
        ? `Mon–Fri ${formatTime(config.hoursOpen)} – ${formatTime(config.hoursClose)} · ${
            config.afterHours ? "after-hours calls answered" : "after hours to voicemail"
          }`
        : `${formatTime(config.windowStart)} – ${formatTime(config.windowEnd)} recipient time · ${dncLabel[config.dncList]}`,
    },
  ];

  const statusText = live
    ? inbound
      ? `Answering calls to ${agent.phoneNumber ?? "its number"}.`
      : `Placing calls from ${agent.phoneNumber ?? "its number"} inside its calling window.`
    : inbound
      ? `Paused — calls to ${agent.phoneNumber ?? "its number"} go to your voicemail until you resume.`
      : "Paused — no calls are being placed until you resume.";

  return (
    <div className="flex flex-col gap-7">
      <div>
        <h1 className="text-[20px] font-semibold text-ink-950">Deployment</h1>
        <p className="mt-1 text-[14px] text-ink-600">
          {live ? "This agent is live." : "This agent is paused."} Pause or resume it here at any time.
        </p>
      </div>

      <div className="flex flex-col gap-4 rounded-lg border border-ink-950/10 bg-paper-0 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div className="flex min-w-0 items-start gap-3">
          <div
            className={`flex size-9 shrink-0 items-center justify-center rounded-full ${
              live ? "bg-success-100 text-success-700" : "bg-paper-50 text-ink-500"
            }`}
          >
            <Icon name={live ? (inbound ? "phone-inbound" : "phone-outbound") : "clock"} className="size-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-[14px] font-semibold text-ink-950">Status</p>
              <Badge tone={statusTone[agent.status]} dot live={live}>
                {statusLabel[agent.status]}
              </Badge>
            </div>
            <p className="mt-0.5 text-[13px] text-ink-600" role="status">
              {statusText}
            </p>
          </div>
        </div>
        {live ? (
          <Button variant="secondary" className="shrink-0" onClick={onPause}>
            Pause agent
          </Button>
        ) : (
          <Button className="shrink-0" onClick={onResume}>
            Resume agent
          </Button>
        )}
      </div>

      <dl className="divide-y divide-ink-950/8 rounded-lg border border-ink-950/10 bg-paper-0">
        {rows.map((r) => (
          <div key={r.label} className="flex flex-col gap-0.5 px-4 py-3 sm:flex-row sm:items-baseline sm:gap-6 sm:px-5">
            <dt className="shrink-0 text-[13px] text-ink-500 sm:w-[170px]">{r.label}</dt>
            <dd className="text-[13px] font-medium text-ink-900">{r.value}</dd>
          </div>
        ))}
      </dl>

      <div className="flex flex-col gap-4 rounded-lg border border-ink-950/10 bg-paper-0 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div className="flex min-w-0 items-start gap-3">
          <div
            className={`flex size-9 shrink-0 items-center justify-center rounded-full ${
              overBudget ? "bg-warning-100 text-warning-700" : "bg-paper-50 text-ink-500"
            }`}
          >
            <Icon name={overBudget ? "alert" : "flag"} className="size-4" />
          </div>
          <div className="min-w-0">
            <p className="text-[14px] font-semibold text-ink-950">Monthly budget</p>
            {budget !== undefined ? (
              <p className="mt-0.5 text-[13px] text-ink-600">
                {monthlyCost !== undefined && (
                  <>
                    Projected {formatUsd(monthlyCost)} of {formatUsd(budget)}
                    {overBudget && (
                      <span className="font-medium text-warning-700"> — {formatUsd(monthlyCost - budget)} over</span>
                    )}
                  </>
                )}
              </p>
            ) : (
              <p className="mt-0.5 text-[13px] text-ink-600">
                No budget set{monthlyCost !== undefined ? ` — projected ${formatUsd(monthlyCost)}/month` : ""}.
              </p>
            )}
          </div>
        </div>
        {onEditBudget && (
          <Button variant="secondary" className="shrink-0 self-start sm:self-auto" onClick={onEditBudget}>
            {budget !== undefined ? "Edit budget" : "Set a budget"}
          </Button>
        )}
      </div>

      {onEditSettings && (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[13px] text-ink-500">Need a different number or hours?</p>
          <Button variant="ghost" className="gap-1 self-start sm:self-auto" onClick={onEditSettings}>
            Change deploy settings
            <Icon name="chevron-right" className="size-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
