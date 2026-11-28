import type { ReactNode } from "react";

type Tone = "neutral" | "accent" | "success" | "amber" | "clay" | "inbound" | "outbound";

/**
 * Untitled-style pill badge: soft 50 fill, 700 text, 200 hairline border.
 * Lifecycle status (neutral/amber/success/clay) and call direction
 * (inbound/outbound) both get their tone's real color — direction already
 * has an identity palette (the phone icon badge), so echoing it here
 * reinforces the same signal instead of flattening it to gray.
 */
const toneClasses: Record<Tone, string> = {
  neutral: "bg-gray-50 text-gray-700 border-gray-200",
  accent: "bg-brand-50 text-brand-700 border-brand-200",
  success: "bg-success-50 text-success-700 border-success-200",
  amber: "bg-warning-50 text-warning-700 border-warning-200",
  clay: "bg-error-50 text-error-700 border-error-200",
  inbound: "bg-blue-50 text-blue-700 border-blue-100",
  outbound: "bg-orange-50 text-orange-700 border-orange-100",
};

const dotClasses: Record<Tone, string> = {
  neutral: "bg-gray-500",
  accent: "bg-brand-500",
  success: "bg-success-500",
  amber: "bg-warning-500",
  clay: "bg-error-500",
  inbound: "bg-gray-500",
  outbound: "bg-gray-500",
};

export function Badge({
  tone = "neutral",
  children,
  dot = false,
  /** Live, ongoing state (an agent actually taking calls right now) — the
   * dot gets a soft expanding ring so "live" reads as active, not static. */
  live = false,
  className = "",
}: {
  tone?: Tone;
  children: ReactNode;
  dot?: boolean;
  live?: boolean;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2 py-0.5 text-xs leading-[18px] font-medium ${toneClasses[tone]} ${className}`}
    >
      {dot && (
        <span className="relative flex size-1.5 shrink-0">
          {live && (
            <span
              className={`absolute inline-flex size-full animate-ping rounded-full opacity-60 ${dotClasses[tone]}`}
            />
          )}
          <span className={`relative inline-flex size-1.5 rounded-full ${dotClasses[tone]}`} />
        </span>
      )}
      {children}
    </span>
  );
}
