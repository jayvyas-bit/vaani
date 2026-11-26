// Canvas-local narration primitives — presentational only, never shipped to
// the app. Used to label rows, connect steps, and call out the three product
// differentiators on the "Create Agent Journey" canvas. Styled from the real
// app's design tokens (src/index.css) so they read as part of the same system.

export function RowLabel({
  index,
  title,
  subtitle,
  width = 560,
}: {
  index: string;
  title: string;
  subtitle: string;
  width?: number;
}) {
  return (
    <div className="flex items-center gap-3" style={{ width }}>
      <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-ink-950 text-[14px] font-semibold text-paper-0">
        {index}
      </div>
      <div className="min-w-0">
        <p className="text-[16px] font-semibold text-ink-950">{title}</p>
        <p className="truncate text-[12.5px] text-ink-600">{subtitle}</p>
      </div>
    </div>
  );
}

export function FlowArrow({
  label,
  size = 56,
}: {
  label?: string;
  size?: number;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-1" style={{ width: size, height: size }}>
      <svg width={size * 0.6} height={size * 0.3} viewBox="0 0 34 18" fill="none">
        <path d="M1 9H30" stroke="#8d9399" strokeWidth="2" strokeLinecap="round" />
        <path d="M23 2L31 9L23 16" stroke="#8d9399" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {label && <span className="whitespace-nowrap text-[10.5px] font-medium text-ink-400">{label}</span>}
    </div>
  );
}

const calloutTone = {
  accent: { border: "border-accent-600", bg: "bg-accent-50", chip: "bg-accent-600 text-paper-0", text: "text-accent-700" },
  amber: { border: "border-amber-600", bg: "bg-amber-50", chip: "bg-amber-600 text-paper-0", text: "text-amber-700" },
} as const;

export function NoteCallout({
  number,
  title,
  body,
  tone = "accent",
  width = 500,
}: {
  number: number;
  title: string;
  body: string;
  tone?: keyof typeof calloutTone;
  width?: number;
}) {
  const t = calloutTone[tone];
  return (
    <div
      className={`rounded-lg border-[1.5px] ${t.border} ${t.bg} px-4 py-3 shadow-float`}
      style={{ width }}
    >
      <div className="flex items-start gap-2.5">
        <span className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${t.chip}`}>
          {number}
        </span>
        <div className="min-w-0">
          <p className={`text-[12.5px] font-semibold ${t.text}`}>{title}</p>
          <p className="mt-0.5 text-[12px] leading-snug text-ink-800">{body}</p>
        </div>
      </div>
      <svg className="mt-1" width="18" height="10" viewBox="0 0 18 10">
        <path d="M0 0 L9 10 L18 0" className={tone === "amber" ? "fill-amber-50" : "fill-accent-50"} />
      </svg>
    </div>
  );
}
