import type { ReactNode } from "react";
import { Button } from "./Button";
import { Icon } from "./Icon";

/**
 * The one footer bar every multi-step wizard (Create, Deploy) renders instead
 * of placing its primary action inline in the scrolling content — Back on
 * the left, the step’s primary action(s) on the right, both reachable
 * without scrolling.
 */
export function WizardFooter({
  onBack,
  showBack = true,
  backLabel = "Back",
  maxWidthClassName = "max-w-[640px]",
  hint,
  children,
}: {
  onBack?: () => void;
  showBack?: boolean;
  backLabel?: string;
  /** Matches the footer’s inner width to the step content above it. */
  maxWidthClassName?: string;
  /** Shown beside the primary action — use to explain why it’s disabled. */
  hint?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="sticky bottom-0 z-10 border-t border-secondary bg-paper-50/90 px-4 py-4 shadow-[0_-8px_24px_-12px_rgba(16,24,40,0.12)] backdrop-blur sm:px-6">
      <div className={`mx-auto flex w-full items-center justify-between gap-3 ${maxWidthClassName}`}>
        {showBack ? (
          <Button variant="ghost" className="gap-1.5" onClick={onBack}>
            <Icon name="chevron-right" className="size-4 rotate-180" />
            {backLabel}
          </Button>
        ) : (
          <span />
        )}
        <div className="flex items-center gap-3">
          {hint && <span className="text-sm font-medium text-warning-700">{hint}</span>}
          {children ?? <span />}
        </div>
      </div>
    </div>
  );
}
