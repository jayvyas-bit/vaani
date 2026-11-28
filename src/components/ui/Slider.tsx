const thumb =
  "[&::-webkit-slider-thumb]:size-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-brand-600 [&::-webkit-slider-thumb]:bg-paper-0 [&::-webkit-slider-thumb]:shadow-xs [&::-webkit-slider-thumb]:transition-[transform,box-shadow] [&::-webkit-slider-thumb]:duration-150 " +
  "[&::-moz-range-thumb]:size-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-brand-600 [&::-moz-range-thumb]:bg-paper-0 [&::-moz-range-thumb]:shadow-xs [&::-moz-range-thumb]:transition-[transform,box-shadow] [&::-moz-range-thumb]:duration-150 " +
  "hover:[&::-webkit-slider-thumb]:scale-110 hover:[&::-moz-range-thumb]:scale-110 " +
  "" +
  "focus-visible:[&::-webkit-slider-thumb]:ring-4 focus-visible:[&::-webkit-slider-thumb]:ring-ink-950/15 focus-visible:[&::-moz-range-thumb]:ring-4 focus-visible:[&::-moz-range-thumb]:ring-ink-950/15";

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
        className={`block h-1.5 w-full cursor-pointer appearance-none rounded-full outline-none ${thumb}`}
        style={{
          background: `linear-gradient(to right, var(--color-ink-950) 0%, var(--color-ink-950) ${pct}%, var(--color-paper-200) ${pct}%, var(--color-paper-200) 100%)`,
        }}
      />
      {(leftLabel || rightLabel) && (
        <div className="mt-2.5 flex justify-between text-xs font-medium text-ink-500">
          <span>{leftLabel}</span>
          <span>{rightLabel}</span>
        </div>
      )}
    </div>
  );
}
