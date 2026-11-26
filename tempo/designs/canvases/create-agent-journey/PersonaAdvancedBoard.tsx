import { BuildEditorPage } from "@/features/agent-builder/build/BuildEditorPage";
import { clinicAgent, clinicBusinessRules, clinicKnowledge, clinicTools, safetyToggles } from "@/lib/mock-data";

export default function PersonaAdvancedBoard() {
  return (
    <div className="h-[860px] w-[1100px] overflow-hidden rounded-xl border border-ink-950/10 shadow-float">
      <BuildEditorPage
        agent={clinicAgent}
        safety={safetyToggles}
        businessRules={clinicBusinessRules}
        knowledge={clinicKnowledge}
        tools={clinicTools}
        initialTab="persona"
        defaultAdvanced={true}
      />
    </div>
  );
}
