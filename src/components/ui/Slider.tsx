const thumb =
  "[&::-webkit-slider-thumb]:size-6 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-[3px] [&::-webkit-slider-thumb]:border-brand-600 [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:shadow-xs [&::-webkit-slider-thumb]:transition-[transform,box-shadow] [&::-webkit-slider-thumb]:duration-150 " +
  "[&::-moz-range-thumb]:size-6 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-[3px] [&::-moz-range-thumb]:border-brand-600 [&::-moz-range-thumb]:bg-primary [&::-moz-range-thumb]:shadow-xs [&::-moz-range-thumb]:transition-[transform,box-shadow] [&::-moz-range-thumb]:duration-150 " +
  "hover:[&::-webkit-slider-thumb]:scale-110 hover:[&::-moz-range-thumb]:scale-110 " +
  "" +
  "focus-visible:[&::-webkit-slider-thumb]:ring-4 focus-visible:[&::-webkit-slider-thumb]:ring-brand-600/25 focus-visible:[&::-moz-range-thumb]:ring-4 focus-visible:[&::-moz-range-thumb]:ring-brand-600/25";

export function Slider({
  value,
  onChange,
  min = 0,
  max = 100,
  step,
  leftLabel,
  rightLabel,
  id,
  name,
  ariaLabel,
  ariaLabelledBy,
  valueText,
}: {
  value: number;
  onChange?: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  leftLabel?: string;
  rightLabel?: string;
  id?: string;
  name?: string;
  ariaLabel?: string;
  ariaLabelledBy?: string;
  /** Human-readable value for screen readers, e.g. "0.4" or "Warm & chatty". */
  valueText?: string;
}) {
  const pct = max > min ? Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100)) : 0;

  return (
    <div className="py-1.5">
      <input
        type="range"
        id={id}
        name={name}
        min={min}
        max={max}
        step={step}
        value={value}
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledBy}
        aria-valuetext={valueText}
        readOnly={!onChange}
        onChange={(e) => onChange?.(Number(e.target.value))}
        className={`block h-6 w-full cursor-pointer appearance-none rounded-full bg-clip-content py-[7px] outline-none ${thumb}`}
        style={{
          background: `linear-gradient(to right, var(--color-brand-600) 0%, var(--color-brand-600) ${pct}%, color-mix(in srgb, var(--color-brand-600) 18%, white) ${pct}%, color-mix(in srgb, var(--color-brand-600) 18%, white) 100%)`,
        }}
      />
      {(leftLabel || rightLabel) && (
        <div className="mt-2.5 flex justify-between text-sm text-tertiary">
          <span>{leftLabel}</span>
          <span>{rightLabel}</span>
        </div>
      )}
    </div>
  );
}
