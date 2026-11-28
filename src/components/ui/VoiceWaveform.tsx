const BARS = [0.55, 0.85, 1, 0.7, 0.4];

/**
 * The one bespoke illustration mark in the app: an audio waveform, because
 * this product's whole job is voice. Idle breathes slowly (an invitation,
 * not a progress signal); live pulses fast (audio is actually flowing right
 * now) — both are state, never decoration for its own sake.
 */
export function VoiceWaveform({
  variant = "idle",
  className = "",
}: {
  variant?: "idle" | "live";
  className?: string;
}) {
  return (
    <div className={`flex items-center justify-center gap-[3px] ${className}`} aria-hidden="true">
      {BARS.map((peak, i) => (
        <span
          key={i}
          className={`w-[3px] rounded-full bg-current ${variant === "live" ? "animate-waveform-live" : "animate-waveform-idle"}`}
          style={{
            height: "100%",
            transformOrigin: "center",
            animationDelay: `${i * (variant === "live" ? 70 : 110)}ms`,
            "--wf-peak": peak,
          } as React.CSSProperties}
        />
      ))}
    </div>
  );
}
