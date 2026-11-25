import { Icon } from "./Icon";

export interface StepItem {
  id: string;
  label: string;
}

export function Stepper({
  steps,
  activeId,
  completedIds,
  compact = false,
}: {
  steps: StepItem[];
  activeId: string;
  completedIds: string[];
  /** Condensed dots + "Step N of M — label" for tight single-row headers. */
  compact?: boolean;
}) {
  const activeIndex = steps.findIndex((s) => s.id === activeId);

  if (compact) {
    return (
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex shrink-0 items-center gap-1" aria-hidden="true">
          {steps.map((step, i) => {
            const done = completedIds.includes(step.id);
            const active = step.id === activeId;
            return (
              <span
                key={step.id}
                className={`h-1.5 w-6 rounded-full transition-colors ${
                  done || active ? "bg-brand-600" : i < activeIndex ? "bg-brand-200" : "bg-gray-200"
                }`}
              />
            );
          })}
        </div>
        <span className="min-w-0 truncate whitespace-nowrap text-[12.5px] text-ink-500">
          <span className="font-medium text-ink-900">
            Step {activeIndex + 1} of {steps.length}
          </span>
          <span className="mx-1.5 text-ink-300">·</span>
          <span className="font-medium text-ink-700">{steps[activeIndex]?.label}</span>
        </span>
      </div>
    );
  }

  return (
    <ol className="flex items-center overflow-x-auto [scrollbar-width:none]">
      {steps.map((step, i) => {
        const done = completedIds.includes(step.id);
        const active = step.id === activeId;
        return (
          <li key={step.id} className="flex shrink-0 items-center" aria-current={active ? "step" : undefined}>
            <div className="flex items-center gap-2.5">
              <div
                className={`flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                  done
                    ? "bg-brand-600 text-white"
                    : active
                      ? "bg-brand-600 text-white ring-4 ring-brand-500/25"
                      : "border border-gray-200 bg-white text-gray-500"
                }`}
              >
                {done ? <Icon name="check" className="size-4" strokeWidth={2.5} /> : i + 1}
              </div>
              <span
                className={`whitespace-nowrap text-sm font-semibold ${
                  active ? "text-brand-700" : done ? "text-gray-700" : "text-gray-500"
                }`}
              >
                {step.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div
                className={`mx-2 h-0.5 w-5 rounded-full sm:mx-3 sm:w-10 ${i < activeIndex ? "bg-brand-600" : "bg-gray-200"}`}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}
