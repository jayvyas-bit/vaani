import type { ReactNode } from "react";

type Tone = "neutral" | "accent" | "success" | "amber" | "clay" | "inbound" | "outbound";

/**
 * Untitled-style pill badge: soft 50 fill, 700 text, 200 hairline border.
 * Color is reserved for lifecycle status (neutral/amber/success/clay) — a
 * fixed attribute like call direction isn't a state, so inbound/outbound
 * share the same neutral look (direction is already color-coded by the
 * phone icon badge next to it).
 */
const toneClasses: Record<Tone, string> = {
  neutral: "bg-gray-50 text-gray-700 border-gray-200",
  accent: "bg-brand-50 text-brand-700 border-brand-200",
  success: "bg-success-50 text-success-700 border-success-200",
  amber: "bg-warning-50 text-warning-700 border-warning-200",
  clay: "bg-error-50 text-error-700 border-error-200",
  inbound: "bg-gray-50 text-gray-700 border-gray-200",
  outbound: "bg-gray-50 text-gray-700 border-gray-200",
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
  className = "",
}: {
  tone?: Tone;
  children: ReactNode;
  dot?: boolean;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2 py-0.5 text-xs leading-[18px] font-medium ${toneClasses[tone]} ${className}`}
    >
      {dot && <span className={`size-1.5 shrink-0 rounded-full ${dotClasses[tone]}`} />}
      {children}
    </span>
  );
}
