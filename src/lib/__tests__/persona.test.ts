import { describe, expect, it } from "vitest";
import { collectionsAgent } from "@/lib/mock-data";
import { compileGreeting } from "@/lib/persona";

const outbound = (purpose: string) => compileGreeting({ ...collectionsAgent, direction: "outbound", purpose, tone: 50 });

describe("compileGreeting (outbound)", () => {
  it("speaks to the person called, not about them", () => {
    const greeting = outbound("Call customers to remind them of upcoming service appointments and rebook missed ones");
    expect(greeting).toContain("remind you of upcoming service appointments");
    expect(greeting).not.toMatch(/\bthem\b/);
  });

  it("turns their into your once the recipient is you", () => {
    const greeting = outbound("Remind customers their vehicle service is due and book a slot");
    expect(greeting).toContain("remind you that your vehicle service is due");
  });
});
