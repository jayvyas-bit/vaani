import type { AgentStatus } from "./types";

export const statusLabel: Record<AgentStatus, string> = {
  draft: "Draft",
  testing: "Testing",
  live: "Live",
  paused: "Paused",
};

export const statusTone: Record<AgentStatus, "neutral" | "amber" | "success"> = {
  draft: "neutral",
  testing: "amber",
  live: "success",
  paused: "neutral",
};
