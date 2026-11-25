/**
 * Untitled-style toggle. Geometry is fixed so the knob can never leave the
 * track: track is 44x24 (w-11 h-6) with 2px padding; knob is 20x20 (size-5)
 * and travels exactly 20px (translate-x-5): 2 + 20 + 20 + 2 = 44.
 */
export function Switch({
  checked,
  onChange,
  disabled,
  label,
  id,
}: {
  checked: boolean;
  onChange?: (next: boolean) => void;
  disabled?: boolean;
  /** Accessible name — required in practice; switches have no visible label of their own. */
  label?: string;
  id?: string;
}) {
  return (
    <button
      type="button"
      id={id}
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange?.(!checked)}
      className={`inline-flex h-6 w-11 shrink-0 items-center overflow-hidden rounded-full p-0.5 outline-none transition-colors duration-150 focus-visible:ring-4 focus-visible:ring-brand-500/25 disabled:cursor-not-allowed ${
        checked ? "bg-brand-600" : "bg-gray-200"
      } ${disabled ? "opacity-50" : checked ? "cursor-pointer hover:bg-brand-700" : "cursor-pointer hover:bg-gray-300"}`}
    >
      <span
        aria-hidden="true"
        className={`block size-5 rounded-full bg-white shadow-sm transition-transform duration-150 ease-[cubic-bezier(0.25,1,0.5,1)] ${
          checked ? "translate-x-5" : "translate-x-0"
        }`}
      />
    </button>
  );
}
