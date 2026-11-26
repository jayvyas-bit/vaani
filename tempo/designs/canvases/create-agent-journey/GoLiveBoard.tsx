import { DeployWizardLayout } from "@/features/agent-builder/deploy/DeployWizardLayout";
import { GoLiveStep } from "@/features/agent-builder/deploy/GoLiveStep";
import { clinicAgent } from "@/lib/mock-data";

export default function GoLiveBoard() {
  return (
    <div className="h-[860px] w-[1000px] overflow-hidden rounded-xl border border-ink-950/10 shadow-float">
      <DeployWizardLayout agent={clinicAgent} activeId="golive" completedIds={["channel", "compliance", "cost"]} continueLabel="Finish">
        <GoLiveStep agent={clinicAgent} />
      </DeployWizardLayout>
    </div>
  );
}
