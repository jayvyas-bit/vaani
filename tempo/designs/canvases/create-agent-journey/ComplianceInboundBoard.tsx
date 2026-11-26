import { ComplianceStep } from "@/features/agent-builder/deploy/ComplianceStep";
import { DeployWizardLayout } from "@/features/agent-builder/deploy/DeployWizardLayout";
import { clinicAgent } from "@/lib/mock-data";

export default function ComplianceInboundBoard() {
  return (
    <div className="h-[860px] w-[1000px] overflow-hidden rounded-xl border border-ink-950/10 shadow-float">
      <DeployWizardLayout agent={clinicAgent} activeId="compliance" completedIds={["channel"]}>
        <ComplianceStep direction="inbound" />
      </DeployWizardLayout>
    </div>
  );
}
