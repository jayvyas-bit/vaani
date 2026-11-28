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
    <section className="rounded-xl border border-ink-950/10 bg-paper-0">
      <div className="flex items-baseline justify-between gap-2 px-4 pt-3.5">
        <h2 className="text-[13px] font-semibold text-ink-950">Estimated cost</h2>
        <span className="text-[12px] text-ink-500 tabular-nums">{formatMoney(perMin, currency, { cents: true })}/min</span>
      </div>
      <div className="px-4 pb-3.5">
        <p className="mt-1 text-[26px] font-semibold leading-none tracking-[-0.02em] text-ink-950 tabular-nums">
          {formatMoney(total, currency)}
          <span className="ml-1 text-[12.5px] font-normal tracking-normal text-ink-500">/ month</span>
        </p>
        {isDefault && <p className="mt-1.5 text-[12px] text-ink-500">Starting estimate. Adjust to your volume.</p>}

        <div className="mt-2 space-y-1">
          <div>
            <div className="flex justify-between text-[12.5px]">
              <label id="ws-calls" className="text-ink-600">
                Calls per month
              </label>
              <span className="text-ink-900 tabular-nums">{deploy.callsPerMonth.toLocaleString()}</span>
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
            <div className="flex justify-between text-[12.5px]">
              <label id="ws-minutes" className="text-ink-600">
                Average call length
              </label>
              <span className="text-ink-900 tabular-nums">{deploy.avgMinutes.toFixed(1)} min</span>
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

        <ul className="mt-2 space-y-1.5 border-t border-ink-950/10 pt-3">
          {rows.map((row) => (
            <li key={row.label} className="flex items-center justify-between gap-3 text-[12.5px]">
              <span className="min-w-0 truncate text-ink-600">{row.label}</span>
              <span className="shrink-0 text-ink-900 tabular-nums">{formatMoney(row.amount, currency)}</span>
            </li>
          ))}
        </ul>
        {budget !== undefined && (
          <p className={`mt-3 text-[12px] ${over ? "font-medium text-warning-700" : "text-ink-500"}`}>
            {over
              ? `${formatMoney(total - budget, currency)} over your ${formatMoney(budget, currency)} budget`
              : `Within your ${formatMoney(budget, currency)} budget`}
          </p>
        )}
        {topSwap && topSwap.monthlySavings >= 10 && (
          <p className="mt-3 rounded-md bg-paper-50 px-2.5 py-2 text-[12px] text-ink-600">
            Switch {topSwap.label.toLowerCase()} to {topSwap.to} to save{" "}
            <span className="font-medium text-ink-900">{formatMoney(topSwap.monthlySavings, currency)}</span>/month.
          </p>
        )}
      </div>
    </section>
  );
}
