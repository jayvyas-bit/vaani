import { TestEvaluateScreen } from "@/features/agent-builder/test/TestEvaluateScreen";
import { clinicAgent, clinicTranscript, scenarioPool } from "@/lib/mock-data";

export default function TestEvaluateBoard() {
  return (
    <div className="h-[860px] w-[1440px] overflow-hidden rounded-xl border border-ink-950/10 shadow-float">
      <TestEvaluateScreen agent={clinicAgent} transcript={clinicTranscript} scenarios={scenarioPool} />
    </div>
  );
}
