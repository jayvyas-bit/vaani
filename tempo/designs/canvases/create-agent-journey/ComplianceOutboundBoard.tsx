import { ComplianceStep } from "@/features/agent-builder/deploy/ComplianceStep";
import { DeployWizardLayout } from "@/features/agent-builder/deploy/DeployWizardLayout";
import { collectionsAgent } from "@/lib/mock-data";

export default function ComplianceOutboundBoard() {
  return (
    <div className="h-[860px] w-[1000px] overflow-hidden rounded-xl border border-ink-950/10 shadow-float">
      <DeployWizardLayout agent={collectionsAgent} activeId="compliance" completedIds={["channel"]}>
        <ComplianceStep direction="outbound" />
      </DeployWizardLayout>
    </div>
  );
}
