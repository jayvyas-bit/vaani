import { Slider } from "@/components/ui/Slider";
import { costBreakdown, effectivePerMinRate, suggestCheaperProviders, type DeployConfig } from "@/lib/deploy";
import { formatMoney } from "@/lib/format";
import type { Agent } from "@/lib/types";

/**
 * Live estimate that follows the agent through every section. It reads the same
 * model as the Deploy cost step, so changing a provider or call volume moves it.
 * The volume sliders use the same ranges as that step and write to the same config.
 */
export function CostSummaryPanel({
  agent,
  deploy,
  isDefault,
  onChange,
}: {
  agent: Agent;
  deploy: DeployConfig;
  isDefault: boolean;
  onChange: (next: DeployConfig) => void;
}) {
  const currency = deploy.displayCurrency ?? "USD";
  const rows = costBreakdown(deploy, agent);
  const total = rows.reduce((sum, r) => sum + r.amount, 0);
  const perMin = effectivePerMinRate(agent);
  const budget = deploy.monthlyBudget;
  const over = budget !== undefined && total > budget;
  // A zero budget makes every cheaper swap "needed", sorted biggest saving first.
  const topSwap = suggestCheaperProviders(deploy, agent, 0)?.swaps[0];

  return (
    <section className="rounded-xl bg-secondary">
      <div className="flex items-baseline justify-between gap-2 px-6 pt-6">
        <h2 className="text-sm font-semibold text-primary">Estimated cost</h2>
        <span className="text-sm text-tertiary tabular-nums">{formatMoney(perMin, currency, { cents: true })}/min</span>
      </div>
      <div className="px-6 pb-6">
        <p className="mt-3 text-display-sm font-semibold leading-none tracking-[-0.02em] text-primary tabular-nums">
          {formatMoney(total, currency)}
          <span className="ml-1 text-sm font-normal tracking-normal text-tertiary">/ month</span>
        </p>
        {isDefault && <p className="mt-2 text-sm text-tertiary">Starting estimate. Adjust to your volume.</p>}

        <div className="mt-6 space-y-6">
          <div>
            <div className="flex justify-between text-sm">
              <label id="ws-calls" className="text-secondary">
                Calls per month
              </label>
              <span className="text-primary tabular-nums">{deploy.callsPerMonth.toLocaleString()}</span>
            </div>
            <Slider
              ariaLabelledBy="ws-calls"
              value={deploy.callsPerMonth}
              min={100}
              max={5000}
              step={50}
              valueText={`${deploy.callsPerMonth.toLocaleString()} calls`}
              onChange={(v) => onChange({ ...deploy, callsPerMonth: v })}
            />
          </div>
          <div>
            <div className="flex justify-between text-sm">
              <label id="ws-minutes" className="text-secondary">
                Average call length
              </label>
              <span className="text-primary tabular-nums">{deploy.avgMinutes.toFixed(1)} min</span>
            </div>
            <Slider
              ariaLabelledBy="ws-minutes"
              value={Math.round(deploy.avgMinutes * 10)}
              min={5}
              max={80}
              step={1}
              valueText={`${deploy.avgMinutes.toFixed(1)} minutes`}
              onChange={(v) => onChange({ ...deploy, avgMinutes: v / 10 })}
            />
          </div>
        </div>

        <ul className="mt-6 space-y-3 border-t border-secondary pt-6">
          {rows.map((row) => (
            <li key={row.label} className="flex items-center justify-between gap-3 text-sm">
              <span className="min-w-0 truncate text-secondary">{row.label}</span>
              <span className="shrink-0 text-primary tabular-nums">{formatMoney(row.amount, currency)}</span>
            </li>
          ))}
        </ul>
        {budget !== undefined && (
          <p className={`mt-4 text-sm ${over ? "font-medium text-warning-700" : "text-tertiary"}`}>
            {over
              ? `${formatMoney(total - budget, currency)} over your ${formatMoney(budget, currency)} budget`
              : `Within your ${formatMoney(budget, currency)} budget`}
          </p>
        )}
        {topSwap && topSwap.monthlySavings >= 10 && (
          <p className="mt-5 rounded-lg bg-primary px-3.5 py-3 text-sm text-secondary">
            Switch {topSwap.label.toLowerCase()} to {topSwap.to} to save{" "}
            <span className="font-medium text-primary">{formatMoney(topSwap.monthlySavings, currency)}</span>/month.
          </p>
        )}
      </div>
    </section>
  );
}
