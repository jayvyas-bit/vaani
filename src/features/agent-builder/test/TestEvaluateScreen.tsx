import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { WizardFooter } from "@/components/ui/WizardFooter";
import { BuilderNav, type PrimarySection } from "@/features/agent-builder/BuilderNav";
import type { DeployConfig } from "@/lib/deploy";
import { withLiveGreeting } from "@/lib/persona";
import type { AgentContext } from "@/lib/simulate";
import type {
  Agent,
  BusinessRule,
  KnowledgeSource,
  SafetyToggle,
  Scenario,
  ToolDef,
  TranscriptTurn,
} from "@/lib/types";
import { newId, useControllable } from "@/lib/useControllable";
import { ScenarioPool } from "./ScenarioPool";
import { TestPanel, type FlagDetails } from "./TestPanel";

/** Cut at a word boundary so a flagged title never ends mid-word. */
function excerptOf(text: string, max = 60) {
  const clean = text.trim().replace(/\s+/g, " ");
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > max * 0.5 ? cut.slice(0, lastSpace) : cut).replace(/[\s,.;:–—-]+$/, "")}…`;
}

export function TestEvaluateScreen({
  agent,
  transcript,
  scenarios,
  businessRules = [],
  tools = [],
  knowledge = [],
  safety,
  deploy,
  onScenariosChange,
  onNavigate,
  onBack,
  embedded = false,
}: {
  agent: Agent;
  transcript: TranscriptTurn[];
  scenarios: Scenario[];
  /** The agent’s current config — scenarios and chat replies are derived from it. */
  businessRules?: BusinessRule[];
  tools?: ToolDef[];
  knowledge?: KnowledgeSource[];
  safety?: SafetyToggle[];
  deploy?: DeployConfig;
  onScenariosChange?: (next: Scenario[]) => void;
  onNavigate?: (section: PrimarySection) => void;
  onBack?: () => void;
  /** Inside the agent workspace, whose sidebar and header replace this screen's own nav. */
  embedded?: boolean;
}) {
  const [list, setList] = useControllable(scenarios, onScenariosChange);
  const context: AgentContext = { agent, rules: businessRules, tools, knowledge, safety, deploy };

  // A flagged reply becomes a test scenario so it’s re-checked after every change.
  const onFlag = (turn: TranscriptTurn, details: FlagDetails = {}) => {
    const other = agent.direction === "outbound" ? "recipient" : "caller";
    const callerLine = details.callerLine?.trim();

    if (details.breach && details.breach.length > 0) {
      const [first, ...rest] = details.breach;
      setList([
        ...list,
        {
          id: newId("sc"),
          title: `Guardrail breach: “${first.rule.label}”`,
          criteria: [first.reason, ...rest.map((b) => b.reason)].join(" ") + " Re-check after any change to this agent’s rules or replies.",
          source: "manual",
          verdict: "not-run",
        },
      ]);
      return;
    }

    setList([
      ...list,
      {
        id: newId("sc"),
        title: callerLine ? `Flagged reply to “${excerptOf(callerLine, 50)}”` : `Flagged reply: “${excerptOf(turn.text)}”`,
        criteria: callerLine
          ? `Gives a better answer than “${excerptOf(turn.text, 70)}” when the ${other} says “${excerptOf(callerLine, 70)}”.`
          : `Opens with something better than “${excerptOf(turn.text, 70)}”.`,
        source: "manual",
        verdict: "not-run",
      },
    ]);
  };

  return (
    <div className="flex h-full flex-col bg-paper-50">
      {!embedded && <BuilderNav agent={agent} active="test" onNavigate={onNavigate} onBack={onBack} />}
      <div className="grid flex-1 grid-cols-1 gap-4 overflow-y-auto p-4 sm:p-6 lg:grid-cols-2 lg:overflow-hidden">
        <TestPanel
          agent={agent}
          transcript={withLiveGreeting(transcript, agent)}
          context={context}
          onFlag={onFlag}
        />
        <ScenarioPool scenarios={list} onScenariosChange={setList} context={context} />
      </div>
      {!embedded && (
        <WizardFooter
          backLabel="Back to Build"
          onBack={() => onNavigate?.("build")}
          maxWidthClassName="max-w-none"
        >
          <Button className="gap-1.5" onClick={() => onNavigate?.("deploy")}>
            Continue to Deploy
            <Icon name="chevron-right" className="size-4" />
          </Button>
        </WizardFooter>
      )}
    </div>
  );
}
