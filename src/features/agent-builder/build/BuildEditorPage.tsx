import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { Tabs, type TabItem } from "@/components/ui/Tabs";
import { BuilderNav, type PrimarySection } from "@/features/agent-builder/BuilderNav";
import { applyPersonaPatch, HUMOR_TOGGLE_ID } from "@/lib/persona";
import type {
  Agent,
  BusinessRule,
  KnowledgeSettings,
  KnowledgeSource,
  SafetyToggle,
  ToolDef,
} from "@/lib/types";
import { useControllable } from "@/lib/useControllable";
import { GuardrailsSection } from "./GuardrailsSection";
import { defaultKnowledgeSettings, KnowledgeSection } from "./KnowledgeSection";
import { PersonaSection } from "./PersonaSection";
import { ToolsSection } from "./ToolsSection";

export type BuildTab = "persona" | "guardrails" | "knowledge" | "tools";

const tabs: TabItem[] = [
  { id: "persona", label: "Persona", icon: <Icon name="user" className="size-4" /> },
  { id: "guardrails", label: "Guardrails", icon: <Icon name="shield" className="size-4" /> },
  { id: "knowledge", label: "Knowledge", icon: <Icon name="book" className="size-4" /> },
  { id: "tools", label: "Tools", icon: <Icon name="wrench" className="size-4" /> },
];

/**
 * All edits flow straight out through the `on*Change` callbacks so App.tsx
 * holds the one true agent record — there is no Save step. When a callback
 * is omitted (standalone canvas renders) the page keeps a local copy instead.
 */
export function BuildEditorPage({
  agent,
  safety,
  businessRules,
  knowledge,
  tools,
  knowledgeSettings = defaultKnowledgeSettings,
  initialTab = "persona",
  defaultAdvanced = false,
  onAgentChange,
  onSafetyChange,
  onBusinessRulesChange,
  onKnowledgeChange,
  onKnowledgeSettingsChange,
  onToolsChange,
  onNavigate,
  onBack,
}: {
  agent: Agent;
  safety: SafetyToggle[];
  businessRules: BusinessRule[];
  knowledge: KnowledgeSource[];
  tools: ToolDef[];
  knowledgeSettings?: KnowledgeSettings;
  initialTab?: BuildTab;
  defaultAdvanced?: boolean;
  onAgentChange?: (patch: Partial<Agent>) => void;
  onSafetyChange?: (next: SafetyToggle[]) => void;
  onBusinessRulesChange?: (next: BusinessRule[]) => void;
  onKnowledgeChange?: (next: KnowledgeSource[]) => void;
  onKnowledgeSettingsChange?: (next: KnowledgeSettings) => void;
  onToolsChange?: (next: ToolDef[]) => void;
  onNavigate?: (section: PrimarySection) => void;
  onBack?: () => void;
}) {
  const [tab, setTab] = useState<BuildTab>(initialTab);

  const [localAgent, setLocalAgent] = useState(agent);
  const currentAgent = onAgentChange ? agent : localAgent;
  const patchAgent = (patch: Partial<Agent>) =>
    onAgentChange ? onAgentChange(patch) : setLocalAgent((a) => applyPersonaPatch(a, patch, tools));

  const [safetyState, setSafety] = useControllable(safety, onSafetyChange);
  const [rules, setRules] = useControllable(businessRules, onBusinessRulesChange);
  const [sources, setSources] = useControllable(knowledge, onKnowledgeChange);
  const [kbSettings, setKbSettings] = useControllable(knowledgeSettings, onKnowledgeSettingsChange);
  const [toolList, setTools] = useControllable(tools, onToolsChange);
  const humor = safetyState.find((s) => s.id === HUMOR_TOGGLE_ID);

  return (
    <div className="flex h-full flex-col bg-paper-50">
      <BuilderNav agent={currentAgent} active="build" onNavigate={onNavigate} onBack={onBack} />
      {currentAgent.status === "live" && (
        <div role="status" className="flex items-center gap-2 border-b border-warning-200 bg-warning-50 px-4 py-2 sm:px-6">
          <Icon name="alert" className="size-3.5 shrink-0 text-warning-600" />
          <p className="text-[12.5px] text-ink-800">
            <span className="font-semibold">This agent is live.</span> Changes here take effect immediately for real{" "}
            {currentAgent.direction === "inbound" ? "callers" : "calls"}.
          </p>
        </div>
      )}
      {currentAgent.status === "paused" && (
        <div role="status" className="flex items-center gap-2 border-b border-ink-950/10 bg-paper-50 px-4 py-2 sm:px-6">
          <Icon name="clock" className="size-3.5 shrink-0 text-ink-400" />
          <p className="text-[12.5px] text-ink-600">This agent is paused. Changes take effect once you resume it from Deploy.</p>
        </div>
      )}
      <div className="border-b border-ink-950/10 bg-paper-0 px-4 sm:px-6">
        <Tabs items={tabs} active={tab} onChange={(id) => setTab(id as BuildTab)} />
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-6">
        <div className="mx-auto w-full max-w-[720px]" role="tabpanel" aria-label={tabs.find((t) => t.id === tab)?.label}>
          {tab === "persona" && (
            <PersonaSection
              agent={currentAgent}
              onChange={patchAgent}
              defaultAdvanced={defaultAdvanced}
              humor={humor}
              onHumorChange={(enabled) =>
                setSafety(safetyState.map((s) => (s.id === HUMOR_TOGGLE_ID ? { ...s, enabled } : s)))
              }
            />
          )}
          {tab === "guardrails" && (
            <GuardrailsSection
              safety={safetyState}
              businessRules={rules}
              onSafetyChange={setSafety}
              onBusinessRulesChange={setRules}
              defaultAdvanced={defaultAdvanced}
            />
          )}
          {tab === "knowledge" && (
            <KnowledgeSection
              sources={sources}
              onSourcesChange={setSources}
              settings={kbSettings}
              onSettingsChange={setKbSettings}
              defaultAdvanced={defaultAdvanced}
            />
          )}
          {tab === "tools" && (
            <ToolsSection tools={toolList} onToolsChange={setTools} defaultAdvanced={defaultAdvanced} />
          )}
        </div>
      </div>
    </div>
  );
}
