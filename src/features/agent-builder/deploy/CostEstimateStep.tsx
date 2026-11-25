import { useEffect, useId, useMemo, useState } from "react";
import { FieldLabel, Input } from "@/components/ui/Field";
import { Icon } from "@/components/ui/Icon";
import { Slider } from "@/components/ui/Slider";
import { costBreakdown, defaultDeployConfig, effectivePerMinRate, type DeployConfig } from "@/lib/deploy";
import { formatUsd } from "@/lib/format";
import type { Agent, CallDirection } from "@/lib/types";
import { useControllable } from "@/lib/useControllable";

export function CostEstimateStep({
  direction,
  providers,
  config: configProp,
  onConfigChange,
  acknowledged: acknowledgedProp,
  onAcknowledgedChange,
  onEstimateChange,
}: {
  direction: CallDirection;
  /** The agent's chosen AI providers — each one's own rate drives the breakdown below. */
  providers?: Pick<Agent, "llmProvider" | "sttProvider" | "ttsProvider">;
  /** Volume lives in the agent's deploy config so the review step shows the same numbers. */
  config?: DeployConfig;
  onConfigChange?: (next: DeployConfig) => void;
  acknowledged?: boolean;
  onAcknowledgedChange?: (acknowledged: boolean) => void;
  onEstimateChange?: (monthlyCost: number) => void;
}) {
  const id = useId();
  const [config, setConfig] = useControllable(configProp ?? defaultDeployConfig(direction), onConfigChange);
  const { callsPerMonth, avgMinutes } = config;
  const setCallsPerMonth = (v: number) => setConfig({ ...config, callsPerMonth: v });
  const setAvgMinutes = (v: number) => setConfig({ ...config, avgMinutes: v });
  const [acknowledged, setAcknowledged] = useState(acknowledgedProp ?? false);

  const rate = effectivePerMinRate(providers);
  const monthlyMinutes = callsPerMonth * avgMinutes;
  const monthlyCost = monthlyMinutes * rate;
  const budget = config.monthlyBudget;
  const overBudget = budget !== undefined && monthlyCost > budget;

  useEffect(() => {
    onAcknowledgedChange?.(acknowledged);
  }, [acknowledged, onAcknowledgedChange]);

  useEffect(() => {
    onEstimateChange?.(monthlyCost);
  }, [monthlyCost, onEstimateChange]);

  const breakdown = useMemo(() => costBreakdown(config, providers), [config, providers]);

  return (
    <div className="flex flex-col gap-7">
      <div>
        <h1 className="text-[20px] font-semibold text-ink-950">Cost estimate</h1>
        <p className="mt-1 text-[14px] text-ink-600">
          Set your expected volume to see what this agent will cost to run.
        </p>
      </div>

      <div className="rounded-lg border border-ink-950/10 bg-paper-0 p-5">
        <p className="text-[12.5px] font-medium text-ink-500">Projected monthly cost</p>
        <p className="mt-1 text-[32px] leading-none font-semibold tabular-nums text-ink-950">
          {formatUsd(monthlyCost)}
          <span className="ml-1 text-[14px] font-normal text-ink-500">/ month</span>
        </p>
        <p className="mt-2 text-[13px] tabular-nums text-ink-500">
          {Math.round(monthlyMinutes).toLocaleString()} call minutes × {formatUsd(rate, { cents: true })} per minute
          at your chosen AI providers
        </p>

        <div className="mt-5 flex flex-col gap-4 border-t border-ink-950/10 pt-4">
          <div>
            <div className="mb-1.5 flex items-center justify-between text-[13px]">
              <span id={`${id}-calls`} className="font-medium text-ink-800">
                {direction === "inbound" ? "Calls answered per month" : "Calls placed per month"}
              </span>
              <span className="tabular-nums text-ink-600">{callsPerMonth.toLocaleString()}</span>
            </div>
            <Slider
              id={`${id}-calls-input`}
              name="callsPerMonth"
              ariaLabelledBy={`${id}-calls`}
              valueText={`${callsPerMonth.toLocaleString()} calls`}
              value={callsPerMonth}
              min={100}
              max={5000}
              step={50}
              onChange={setCallsPerMonth}
              leftLabel="100"
              rightLabel="5,000"
            />
          </div>
          <div>
            <div className="mb-1.5 flex items-center justify-between text-[13px]">
              <span id={`${id}-aht`} className="font-medium text-ink-800">
                Average handle time
              </span>
              <span className="tabular-nums text-ink-600">{avgMinutes.toFixed(1)} min</span>
            </div>
            <Slider
              id={`${id}-aht-input`}
              name="avgMinutes"
              ariaLabelledBy={`${id}-aht`}
              valueText={`${avgMinutes.toFixed(1)} minutes`}
              value={Math.round(avgMinutes * 10)}
              min={5}
              max={80}
              onChange={(v) => setAvgMinutes(v / 10)}
              leftLabel="0.5 min"
              rightLabel="8 min"
            />
          </div>
        </div>

        <dl className="mt-5 flex flex-col gap-1.5 border-t border-ink-950/10 pt-4 text-[12.5px]">
          {breakdown.map((b) => (
            <div key={b.label} className="flex items-center justify-between gap-3">
              <dt className="text-ink-500">{b.label}</dt>
              <dd className="tabular-nums text-ink-700">{formatUsd(b.amount)}</dd>
            </div>
          ))}
        </dl>

        <div className="mt-5 border-t border-ink-950/10 pt-4">
          <FieldLabel htmlFor={`${id}-budget`} hint="Optional — we'll warn you before going live if you're projected to exceed it">
            Monthly budget
          </FieldLabel>
          <div className="flex items-center gap-2">
            <span className="text-[13px] text-ink-500">$</span>
            <Input
              id={`${id}-budget`}
              name="monthlyBudget"
              type="number"
              inputMode="numeric"
              min={0}
              placeholder="No limit set"
              className="max-w-[160px]"
              value={budget ?? ""}
              onChange={(e) =>
                setConfig({ ...config, monthlyBudget: e.target.value ? Math.max(0, Number(e.target.value)) : undefined })
              }
            />
          </div>
          {overBudget && (
            <p className="mt-2 flex items-start gap-1.5 text-[12.5px] font-medium text-error-600">
              <Icon name="alert" className="mt-0.5 size-3.5 shrink-0" />
              Projected to run {formatUsd(monthlyCost - (budget ?? 0))} over this budget at the volume set above.
            </p>
          )}
        </div>
      </div>

      <button
        type="button"
        role="checkbox"
        aria-checked={acknowledged}
        onClick={() => setAcknowledged((v) => !v)}
        className={`flex items-start gap-3 rounded-lg border p-4 text-left transition-colors ${
          acknowledged ? "border-brand-300 bg-brand-25" : "border-ink-950/10 bg-paper-0 hover:border-ink-950/20"
        }`}
      >
        <div
          className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-md border ${
            acknowledged ? "border-accent-600 bg-accent-600" : "border-ink-300 bg-paper-0"
          }`}
        >
          {acknowledged && <Icon name="check" className="size-3.5 text-paper-0" strokeWidth={2.6} />}
        </div>
        <span className="text-[13px] text-ink-800">
          <span className="font-medium">I understand this is a usage-based estimate.</span> You're billed
          for real call minutes, so the total moves with actual volume and call length. Required to go live.
        </span>
      </button>
    </div>
  );
}
