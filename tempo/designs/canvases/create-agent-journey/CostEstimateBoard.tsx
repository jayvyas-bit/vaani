import { CostEstimateStep } from "@/features/agent-builder/deploy/CostEstimateStep";
import { DeployWizardLayout } from "@/features/agent-builder/deploy/DeployWizardLayout";
import { clinicAgent } from "@/lib/mock-data";

export default function CostEstimateBoard() {
  return (
    <div className="h-[860px] w-[1000px] overflow-hidden rounded-xl border border-ink-950/10 shadow-float">
      <DeployWizardLayout agent={clinicAgent} activeId="cost" completedIds={["channel", "compliance"]}>
        <CostEstimateStep direction="inbound" />
      </DeployWizardLayout>
    </div>
  );
}
