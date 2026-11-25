import type { ToolDef } from "./types";

/** Is this a call-transfer tool (built-in or a custom one named that way)? */
export function isTransferTool(tool: Pick<ToolDef, "name" | "description">) {
  return /\btransfer/i.test(tool.name) || /^sends the live call/i.test(tool.description);
}

/** The first enabled transfer tool, if any — with or without a destination. */
export function enabledTransferTool(tools: ToolDef[]) {
  return tools.find((t) => t.enabled && isTransferTool(t));
}

/** An enabled transfer tool that actually knows where to send the call. */
export function workingTransferTool(tools: ToolDef[]) {
  return tools.find((t) => t.enabled && isTransferTool(t) && !!t.destination?.trim());
}

/** An enabled tool that can book or move appointments. */
export function bookingTool(tools: ToolDef[]) {
  return tools.find((t) => t.enabled && /(book|schedul|appointment|calendar)/i.test(`${t.name} ${t.description}`));
}
