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
      className={`flex w-full items-start gap-3.5 rounded-xl border p-4 text-left outline-none transition-[border-color,box-shadow,transform,background-color] duration-150 ease-[var(--ease-out-quart)] focus-visible:ring-4 focus-visible:ring-brand-500/25 active:scale-[0.99] ${
        disabled
          ? "cursor-not-allowed border-paper-200 bg-paper-0 opacity-60 shadow-none"
          : selected
            ? "border-brand-600 bg-brand-50/60 shadow-[var(--shadow-brand-sm)] ring-1 ring-brand-600"
            : "border-paper-200 bg-paper-0 shadow-xs hover:border-ink-300 hover:shadow-sm"
      }`}
    >
      {icon && (
        <div
          className={`flex size-9 shrink-0 items-center justify-center rounded-full ring-4 transition-colors ${
            selected ? "bg-brand-600 text-white ring-brand-100" : "bg-paper-100 text-ink-500 ring-paper-50"
          }`}
        >
          {icon}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`line-clamp-2 text-sm font-semibold ${selected ? "text-brand-800" : "text-ink-950"}`}>
            {title}
          </span>
          {badge}
        </div>
        {description && (
          <p className={`mt-0.5 text-sm leading-5 ${selected ? "text-brand-700" : "text-ink-600"}`}>{description}</p>
        )}
      </div>
      <div
        className={`mt-0.5 flex size-[18px] shrink-0 items-center justify-center rounded-full border transition-colors ${
          selected ? "border-brand-600 bg-brand-600" : "border-ink-300 bg-paper-0"
        }`}
      >
        {selected && <span key={title} className="size-2 animate-check-in rounded-full bg-paper-0" />}
      </div>
    </button>
  );
}
