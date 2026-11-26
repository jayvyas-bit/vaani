import { ChannelNumberStep } from "@/features/agent-builder/deploy/ChannelNumberStep";
import { DeployWizardLayout } from "@/features/agent-builder/deploy/DeployWizardLayout";
import { clinicAgent } from "@/lib/mock-data";

export default function ChannelBoard() {
  return (
    <div className="h-[860px] w-[1000px] overflow-hidden rounded-xl border border-ink-950/10 shadow-float">
      <DeployWizardLayout agent={clinicAgent} activeId="channel" completedIds={[]} showBack={false}>
        <ChannelNumberStep direction="inbound" />
      </DeployWizardLayout>
    </div>
  );
}
