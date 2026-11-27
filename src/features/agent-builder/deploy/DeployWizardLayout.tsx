import { useEffect, useRef, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Stepper, type StepItem } from "@/components/ui/Stepper";
import { WizardFooter } from "@/components/ui/WizardFooter";
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
  continueHint,
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
  /** Shown beside Continue while it's disabled — explain why, since the field that caused it may be scrolled out of view. */
  continueHint?: ReactNode;
  showBack?: boolean;
  showContinue?: boolean;
  onContinue?: () => void;
  onStepBack?: () => void;
  onNavigate?: (section: PrimarySection) => void;
  onExit?: () => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [hasMoreBelow, setHasMoreBelow] = useState(false);

  useEffect(() => {
    const root = scrollRef.current;
    const sentinel = sentinelRef.current;
    if (!root || !sentinel) return;
    const observer = new IntersectionObserver(([entry]) => setHasMoreBelow(!entry.isIntersecting), {
      root,
      threshold: 1,
    });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [children]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
  }, [activeId]);

  return (
    <div className="flex h-full flex-col bg-paper-50">
      <BuilderNav agent={agent} active="deploy" onNavigate={onNavigate} onBack={onExit} />
      {!hideStepper && (
        <div className="border-b border-ink-950/10 bg-paper-50 px-4 py-2.5 sm:px-6">
          <div className="mx-auto flex w-full max-w-[640px] lg:max-w-[760px] xl:max-w-[880px] justify-center">
            <Stepper steps={deployStepsFor(agent.direction)} activeId={activeId} completedIds={completedIds} compact />
          </div>
        </div>
      )}
      <div className="relative flex-1 overflow-hidden">
        <div ref={scrollRef} className="h-full overflow-y-auto px-4 py-6 sm:px-6 sm:py-8">
          <div className="mx-auto flex min-h-full w-full max-w-[640px] flex-col justify-center lg:max-w-[760px] xl:max-w-[880px]">
            <div key={activeId} className="animate-step-in">
              {children}
            </div>
            <div ref={sentinelRef} className="h-px" />
          </div>
        </div>
        {hasMoreBelow && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-paper-50 to-transparent" />
        )}
      </div>
      {!hideFooter && (
        <WizardFooter onBack={onStepBack} showBack={showBack} hint={continueDisabled ? continueHint : undefined}>
          {showContinue && (
            <Button disabled={continueDisabled} className="gap-1.5" onClick={onContinue}>
              {continueLabel}
              <Icon name="chevron-right" className="size-4" />
            </Button>
          )}
        </WizardFooter>
      )}
    </div>
  );
}
