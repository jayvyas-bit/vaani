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
  showCount = true,
  variant = "dots",
  onStepClick,
}: {
  steps: StepItem[];
  activeId: string;
  completedIds: string[];
  /** Condensed dots + "Step N of M — label" for tight single-row headers. */
  compact?: boolean;
  /** Set false when an ancestor header already shows its own "Step N of M" — avoids two stacked step counters reading as contradictory. */
  showCount?: boolean;
  /**
   * "dots" is the glowing progress-bar look for a journey's one primary stepper.
   * "breadcrumb" is a quieter numbered-chip list for a sub-wizard nested under
   * that primary stepper, so the two never read as two competing progress bars.
   */
  variant?: "dots" | "breadcrumb";
  /** When given, each step becomes a button so the stepper doubles as free-roam navigation. */
  onStepClick?: (id: string) => void;
}) {
  const activeIndex = steps.findIndex((s) => s.id === activeId);

  if (variant === "breadcrumb") {
    return (
      <ol className="flex min-w-0 items-center gap-1 overflow-x-auto [scrollbar-width:none]">
        {steps.map((step, i) => {
          const done = completedIds.includes(step.id);
          const active = step.id === activeId;
          return (
            <li key={step.id} className="flex shrink-0 items-center gap-1">
              {i > 0 && <Icon name="chevron-right" className="size-3 shrink-0 text-ink-300" />}
              <span className="flex items-center gap-1.5 whitespace-nowrap px-1 py-0.5 text-[12px]">
                <span
                  className={`flex size-[17px] shrink-0 items-center justify-center rounded-full text-[9.5px] font-semibold transition-colors duration-200 ${
                    active
                      ? "bg-brand-600 text-white"
                      : done
                        ? "bg-brand-100 text-brand-700"
                        : "border border-ink-950/15 text-ink-500"
                  }`}
                >
                  {done ? <Icon name="check" className="size-2.5" strokeWidth={3} /> : i + 1}
                </span>
                <span className={`font-medium ${active ? "text-ink-900" : done ? "text-ink-600" : "text-ink-500"}`}>
                  {step.label}
                </span>
              </span>
            </li>
          );
        })}
      </ol>
    );
  }

  if (compact) {
    return (
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex shrink-0 items-center gap-1">
          {steps.map((step, i) => {
            const reached = completedIds.includes(step.id) || i <= activeIndex;
            const active = step.id === activeId;
            const dot = (
              <span
                className={`inline-block h-[5px] rounded-full transition-[width,background-color,box-shadow] duration-200 ease-[var(--ease-out-quart)] ${
                  active
                    ? "w-8 bg-brand-600 ring-2 ring-brand-500/30"
                    : reached
                      ? "w-5 bg-brand-600"
                      : "w-5 bg-gray-200"
                } ${onStepClick ? "hover:bg-brand-400" : ""}`}
              />
            );
            return onStepClick ? (
              <button
                key={step.id}
                type="button"
                aria-current={active ? "step" : undefined}
                aria-label={step.label}
                onClick={() => onStepClick(step.id)}
                className="rounded-full p-0.5 outline-none focus-visible:ring-4 focus-visible:ring-brand-500/25"
              >
                {dot}
              </button>
            ) : (
              <span key={step.id} aria-hidden="true">
                {dot}
              </span>
            );
          })}
        </div>
        <span className="min-w-0 truncate whitespace-nowrap text-[12px] text-ink-500">
          {showCount && (
            <>
              <span className="font-medium text-ink-900">
                Step {activeIndex + 1} of {steps.length}
              </span>
              <span className="mx-1.5 text-ink-300">·</span>
            </>
          )}
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
                className={`flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-colors duration-200 ${
                  done
                    ? "bg-brand-600 text-white"
                    : active
                      ? "bg-brand-600 text-white ring-4 ring-brand-500/25"
                      : "border border-gray-200 bg-white text-gray-500"
                }`}
              >
                {done ? (
                  <Icon name="check" className="size-4 animate-step-in" strokeWidth={2.5} />
                ) : (
                  i + 1
                )}
              </div>
              <span
                className={`whitespace-nowrap text-sm font-semibold transition-colors duration-200 ${
                  active ? "text-brand-700" : done ? "text-gray-700" : "text-gray-500"
                }`}
              >
                {step.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div
                className={`mx-2 h-0.5 w-5 rounded-full transition-colors duration-300 sm:mx-3 sm:w-10 ${i < activeIndex ? "bg-brand-600" : "bg-gray-200"}`}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}
