import type { ReactNode } from "react";

export function RadioCard({
  selected,
  onSelect,
  icon,
  title,
  description,
  badge,
  disabled = false,
}: {
  selected: boolean;
  onSelect: () => void;
  icon?: ReactNode;
  title: string;
  description?: string;
  badge?: ReactNode;
  /** Shown but not choosable (e.g. "Coming soon" options). */
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={disabled ? undefined : onSelect}
      disabled={disabled}
      aria-pressed={selected}
      className={`flex w-full items-start gap-3.5 rounded-xl border bg-paper-0 p-4 text-left shadow-xs outline-none transition-[border-color,box-shadow] focus-visible:ring-4 focus-visible:ring-brand-500/25 ${
        disabled
          ? "cursor-not-allowed border-paper-200 opacity-60"
          : selected
            ? "border-brand-600 ring-1 ring-brand-600"
            : "border-paper-200 hover:border-ink-300"
      }`}
    >
      {icon && (
        <div
          className={`flex size-9 shrink-0 items-center justify-center rounded-full ring-4 ${
            selected ? "bg-brand-100 text-brand-600 ring-brand-50" : "bg-paper-100 text-ink-500 ring-paper-50"
          }`}
        >
          {icon}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`text-sm font-semibold ${selected ? "text-brand-800" : "text-ink-950"}`}>{title}</span>
          {badge}
        </div>
        {description && (
          <p className={`mt-0.5 text-sm leading-5 ${selected ? "text-brand-700" : "text-ink-600"}`}>{description}</p>
        )}
      </div>
      <div
        className={`mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border transition-colors ${
          selected ? "border-brand-600 bg-brand-600" : "border-ink-300 bg-paper-0"
        }`}
      >
        {selected && <span className="size-1.5 rounded-full bg-paper-0" />}
      </div>
    </button>
  );
}
