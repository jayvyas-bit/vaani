import { describe, expect, it } from "vitest";
import { evaluateScenario, type AgentContext } from "@/lib/simulate";
import { retentionStarter, wholesaleStarter } from "@/lib/starters";
import type { Agent, Scenario, ToolDef } from "@/lib/types";

const agent: Agent = {
  id: "a", name: "Test agent", purpose: "test", direction: "inbound", status: "draft", voice: "Sam", greeting: "", tone: 50,
  systemPrompt: "", llmProvider: "x", sttProvider: "x", ttsProvider: "x", temperature: 0.3,
};
const tool = (name: string, enabled = true): ToolDef => ({ id: name, name, description: name, kind: "builtin", enabled });
const ctxFor = (content: ReturnType<typeof wholesaleStarter>, tools: ToolDef[] = []): AgentContext => ({
  agent, rules: content.rules, tools, knowledge: [], safety: [],
});

describe("evaluateScenario", () => {
  it("never reports a verdict outside the known set", () => {
    const c = wholesaleStarter();
    for (const s of c.scenarios) {
      const e = evaluateScenario(s, ctxFor(c));
      expect(["pass", "fail", "inconclusive"]).toContain(e.verdict);
    }
  });

  it("only flags ruleOnly on passes, and never when a system tool is enabled", () => {
    const c = wholesaleStarter();
    for (const s of c.scenarios) {
      const bare = evaluateScenario(s, ctxFor(c));
      if (bare.ruleOnly) expect(bare.verdict).toBe("pass");
      const withTool = evaluateScenario(s, ctxFor(c, [tool("Order lookup")]));
      expect(withTool.ruleOnly).toBeFalsy();
    }
  });

  it("a transfer tool alone does not count as a system tool", () => {
    const c = wholesaleStarter();
    const s: Scenario = { id: "s", title: "Credit limit exceeded", criteria: "Agent does not extend credit beyond the approved limit", source: "manual", verdict: "not-run" };
    const e = evaluateScenario(s, ctxFor(c, [tool("Transfer to a person")]));
    if (e.verdict === "pass") expect(e.ruleOnly).toBe(true);
  });

  it("a scenario with no matching guardrail is not a clean pass", () => {
    const s: Scenario = { id: "s", title: "Caller asks for the moon", criteria: "Agent must arrange a lunar landing", source: "manual", verdict: "not-run" };
    const e = evaluateScenario(s, ctxFor(retentionStarter()));
    expect(e.verdict).not.toBe("pass");
  });
});
