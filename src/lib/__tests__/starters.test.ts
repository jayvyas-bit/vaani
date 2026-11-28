import { describe, expect, it } from "vitest";
import { baseRules, pickStarter, STARTERS } from "@/lib/starters";

describe("pickStarter", () => {
  it("returns nothing for a job that matches no starter", () => {
    expect(pickStarter("Sell handmade candles", "inbound")).toBeUndefined();
  });

  it("never returns a starter written for the other direction", () => {
    for (const st of STARTERS) {
      const other = st.direction === "inbound" ? "outbound" : "inbound";
      const text = st.keywords.source.replace(/[\\()?:|^$.*+\[\]{}b]/g, " ");
      const picked = pickStarter(text, other);
      if (picked) expect(STARTERS.find((s) => s.id === picked.id)?.direction).toBe(other);
    }
  });

  it("routes known jobs to their starter", () => {
    expect(pickStarter("Handle subscription cancellation requests and present retention offers", "inbound")?.id).toBe("retention");
    expect(pickStarter("Remind customers their vehicle service is due and book a slot", "outbound")?.id).toBe("service-reminder");
  });

  it("builds fresh content each time with unique ids", () => {
    const a = pickStarter("Handle subscription cancellation requests", "inbound")!.content;
    const b = pickStarter("Handle subscription cancellation requests", "inbound")!.content;
    expect(a.rules.map((r) => r.id)).not.toEqual(b.rules.map((r) => r.id));
  });

  it("every starter ships guardrails, outcomes and tests", () => {
    for (const st of STARTERS) {
      const c = st.build();
      expect(c.rules.length, st.id).toBeGreaterThan(0);
      expect(c.outcomes.length, st.id).toBeGreaterThan(0);
      expect(c.scenarios.length, st.id).toBeGreaterThan(0);
    }
  });

  it("falls back to two universal guardrails", () => {
    expect(baseRules()).toHaveLength(2);
  });
});

import { dncNumberCount } from "@/lib/deploy";
describe("dncNumberCount", () => {
  it("counts distinct plausible numbers across lines and commas", () => {
    expect(dncNumberCount("+91 98765 43210\n+91 98765 43210, +1 (503) 555-0185\nabc\n12")).toBe(2);
    expect(dncNumberCount(undefined)).toBe(0);
  });
});
