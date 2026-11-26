export default function IntroBoard() {
  return (
    <div className="flex h-[320px] w-[380px] flex-col justify-between rounded-xl border border-ink-950/10 bg-paper-0 p-5 shadow-float">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wide text-accent-700">
          Create Agent Journey
        </p>
        <h1 className="mt-1 text-[19px] font-semibold leading-snug text-ink-950">
          How to read this canvas
        </h1>
        <p className="mt-2.5 text-[12.5px] leading-relaxed text-ink-600">
          Four rows, left to right: <span className="font-medium text-ink-900">Create → Build → Test &amp; Evaluate → Deploy</span>.
          Every frame is the real production component, rendered with real mock
          data — nothing here is a mockup.
        </p>
      </div>
      <div className="flex flex-col gap-1.5 border-t border-ink-950/10 pt-3">
        <p className="text-[11.5px] font-medium text-ink-500">Watch for the numbered callouts —</p>
        <p className="text-[11.5px] text-ink-700">they mark this product's three core differentiators.</p>
      </div>
    </div>
  );
}
