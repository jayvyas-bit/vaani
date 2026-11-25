import type { ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Stepper, type StepItem } from "@/components/ui/Stepper";
import { BuilderNav, type PrimarySection } from "@/features/agent-builder/BuilderNav";
import type { Agent, CallDirection } from "@/lib/types";

/** Step labels match each step's heading: inbound sets hours, outbound sets calling rules. */
export function deployStepsFor(direction: CallDirection): StepItem[] {
  return [
    { id: "channel", label: "Phone number" },
    { id: "compliance", label: direction === "inbound" ? "Hours" : "Calling rules" },
    { id: "cost", label: "Cost estimate" },
    { id: "golive", label: "Go live" },
  ];
}

export const deploySteps: StepItem[] = deployStepsFor("inbound");

export function DeployWizardLayout({
  agent,
  activeId,
  completedIds,
  children,
  continueLabel = "Continue",
  continueDisabled = false,
  showBack = true,
  showContinue = true,
  onContinue,
  onStepBack,
  onNavigate,
  onExit,
  hideStepper = false,
  hideFooter = false,
}: {
  agent: Agent;
  activeId: string;
  completedIds: string[];
  children: ReactNode;
  /** The live/paused status panel isn't a wizard step, so it has no stepper or footer. */
  hideStepper?: boolean;
  hideFooter?: boolean;
  continueLabel?: string;
  continueDisabled?: boolean;
  showBack?: boolean;
  showContinue?: boolean;
  onContinue?: () => void;
  onStepBack?: () => void;
  onNavigate?: (section: PrimarySection) => void;
  onExit?: () => void;
}) {
  return (
    <div className="flex h-full flex-col bg-paper-50">
      <BuilderNav agent={agent} active="deploy" onNavigate={onNavigate} onBack={onExit} />
      {!hideStepper && (
        <div className="border-b border-ink-950/10 bg-paper-0 px-4 py-4 sm:px-6">
          <Stepper steps={deployStepsFor(agent.direction)} activeId={activeId} completedIds={completedIds} />
        </div>
      )}
      <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 sm:py-8">
        <div className="mx-auto w-full max-w-[640px]">{children}</div>
      </div>
      {!hideFooter && (
      <div className="flex items-center justify-between gap-3 border-t border-ink-950/10 bg-paper-0 px-4 py-3.5 sm:px-6">
        {showBack ? (
          <Button variant="ghost" className="gap-1.5" onClick={onStepBack}>
            <Icon name="chevron-right" className="size-4 rotate-180" />
            Back
          </Button>
        ) : (
          <span />
        )}
        {showContinue && (
          <Button disabled={continueDisabled} className="gap-1.5" onClick={onContinue}>
            {continueLabel}
            <Icon name="chevron-right" className="size-4" />
          </Button>
        )}
      </div>
      )}
    </div>
  );
}
