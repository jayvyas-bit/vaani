import type { ReactNode } from "react";
import { Icon } from "./Icon";

/** The "< Agents" back-link that starts every page header’s left cluster. */
export function PageHeaderBackLink({ label, onClick }: { label: string; onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex shrink-0 items-center gap-1 text-[13px] font-medium text-ink-400 transition-colors hover:text-ink-700"
    >
      <Icon name="chevron-right" className="size-3.5 rotate-180" />
      {label}
    </button>
  );
}

export function PageHeaderDivider() {
  return <div className="h-5 w-px shrink-0 bg-ink-950/10" />;
}

/**
 * The one header shell every top-level screen (Agents list, the New-agent
 * wizard, Build/Test/Deploy) renders instead of hand-rolling its own
 * `<header>` with its own padding/width/stacking choices.
 */
export function PageHeader({
  left,
  center,
  right,
  stackAt = "sm",
  contentClassName = "",
}: {
  left: ReactNode;
  /** Centered content (e.g. a Stepper) shared between the left cluster and right actions. */
  center?: ReactNode;
  right?: ReactNode;
  /** Breakpoint at which left/center/right go from stacked to one row — "lg" for the wider agent-identity header (long name + badges + stepper need the extra room). */
  stackAt?: "sm" | "md" | "lg";
  /** Lets a wrapping layout line this row up with a narrower body below it, without changing the header itself. */
  contentClassName?: string;
}) {
  // A 3-column grid (not absolute centering) so the center slot reserves real
  // track width — left/right content truncates inside its own column instead
  // of overlapping the center when it’s long (e.g. a busy agent-identity header).
  const row =
    stackAt === "lg"
      ? "flex-col gap-3.5 lg:grid lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] lg:items-center lg:gap-6"
      : stackAt === "md"
        ? "flex-col gap-3.5 md:grid md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] md:items-center md:gap-6"
        : "flex-col gap-3 sm:grid sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:items-center sm:gap-6";

  return (
    <header className="border-b border-ink-950/10 bg-paper-0">
      <div className={`flex px-4 py-4 sm:px-6 ${row} ${contentClassName}`}>
        <div className="flex min-w-0 items-center gap-4">{left}</div>
        <div className="flex min-w-0 items-center justify-center">{center}</div>
        <div className="flex min-w-0 items-center justify-end gap-3">{right}</div>
      </div>
    </header>
  );
}
