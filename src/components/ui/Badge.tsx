import type { ReactNode } from "react";
import { Badge as UntitledBadge, BadgeWithDot } from "@/components/base/badges/badges";

type Tone = "neutral" | "accent" | "success" | "amber" | "clay" | "inbound" | "outbound";

const colorMap = {
  neutral: "gray",
  accent: "brand",
  success: "success",
  amber: "warning",
  clay: "error",
  inbound: "blue",
  outbound: "orange",
} as const;

/** Wrapper over the Untitled UI Badge keeping the tone API. */
export function Badge({
  tone = "neutral",
  children,
  dot = false,
  live = false,
  className = "",
}: {
  tone?: Tone;
  children: ReactNode;
  dot?: boolean;
  live?: boolean;
  className?: string;
}) {
  const color = colorMap[tone];
  return dot ? (
    <BadgeWithDot size="md" color={color} className={`${live ? "[&>svg]:animate-pulse" : ""} ${className}`}>
      {children}
    </BadgeWithDot>
  ) : (
    <UntitledBadge size="md" color={color} className={className}>
      {children}
    </UntitledBadge>
  );
}
