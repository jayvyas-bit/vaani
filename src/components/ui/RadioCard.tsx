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
      className={`flex w-full items-center gap-3.5 rounded-xl px-4 py-3.5 text-left outline-focus-ring transition duration-100 ease-linear focus-visible:outline-2 focus-visible:outline-offset-2 ${
        disabled
          ? "cursor-not-allowed bg-primary opacity-50 ring-1 ring-primary ring-inset"
          : selected
            ? "bg-brand-25 ring-2 ring-brand ring-inset"
            : "bg-primary ring-1 ring-primary ring-inset hover:ring-brand-300"
      }`}
    >
      {icon && (
        <div
          className={`flex size-9 shrink-0 items-center justify-center rounded-full ring-4 transition-colors ${
            selected ? "bg-brand-solid text-white ring-brand-100" : "bg-secondary text-fg-quaternary ring-primary"
          }`}
        >
          {icon}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`line-clamp-2 text-sm font-semibold ${selected ? "text-brand-secondary" : "text-secondary"}`}>
            {title}
          </span>
          {badge}
        </div>
        {description && (
          <p className="text-sm text-tertiary">{description}</p>
        )}
      </div>
      <div
        className={`flex size-5 shrink-0 items-center justify-center rounded-full ring-1 ring-inset transition duration-100 ${
          selected ? "bg-brand-solid ring-brand-solid" : "bg-primary ring-gray-300"
        }`}
      >
        {selected && <span key={title} className="size-2 rounded-full bg-white" />}
      </div>
    </button>
  );
}
