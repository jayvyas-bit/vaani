import { Canvas, Storyboard } from "tempo-sdk/canvas";

import IntroBoard from "./IntroBoard";
import RowLabelCreateBoard from "./RowLabelCreateBoard";
import RowLabelBuildBoard from "./RowLabelBuildBoard";
import RowLabelTestBoard from "./RowLabelTestBoard";
import RowLabelDeployBoard from "./RowLabelDeployBoard";
import ArrowCreate1Board from "./ArrowCreate1Board";
import ArrowCreate2Board from "./ArrowCreate2Board";
import ArrowDeploy1Board from "./ArrowDeploy1Board";
import ArrowDeploy2Board from "./ArrowDeploy2Board";
import ArrowDeploy3Board from "./ArrowDeploy3Board";
import ArrowDeploy4Board from "./ArrowDeploy4Board";
import CalloutToggleBoard from "./CalloutToggleBoard";
import CalloutBusinessRulesBoard from "./CalloutBusinessRulesBoard";
import CalloutCostGateBoard from "./CalloutCostGateBoard";

import MethodChooserBoard from "./MethodChooserBoard";
import MinimalCreateFormBoard from "./MinimalCreateFormBoard";
import CreateSuccessBoard from "./CreateSuccessBoard";
import PersonaGuidedBoard from "./PersonaGuidedBoard";
import PersonaAdvancedBoard from "./PersonaAdvancedBoard";
import GuardrailsBoard from "./GuardrailsBoard";
import KnowledgeBoard from "./KnowledgeBoard";
import ToolsBoard from "./ToolsBoard";
import TestEvaluateBoard from "./TestEvaluateBoard";
import ChannelBoard from "./ChannelBoard";
import ComplianceInboundBoard from "./ComplianceInboundBoard";
import ComplianceOutboundBoard from "./ComplianceOutboundBoard";
import CostEstimateBoard from "./CostEstimateBoard";
import GoLiveBoard from "./GoLiveBoard";

export default function CreateAgentJourneyCanvas() {
  return (
    <Canvas name="Create Agent Journey" backgroundColor="#232323">
      {/* Row 1 — Create */}
      <Storyboard id="RowLabelCreate" component={RowLabelCreateBoard} layout={{ x: 0, y: 20, zIndex: 5 }} />
      <Storyboard id="Intro" name="Intro — how to read this canvas" component={IntroBoard} layout={{ x: 0, y: 140 }} />
      <Storyboard id="MethodChooser" name="Create — choose a method" component={MethodChooserBoard} layout={{ x: 440, y: 140 }} />
      <Storyboard id="ArrowCreate1" component={ArrowCreate1Board} layout={{ x: 1122, y: 440, zIndex: 5 }} />
      <Storyboard id="MinimalCreateForm" name="Create — the 3 required fields" component={MinimalCreateFormBoard} layout={{ x: 1180, y: 140 }} />
      <Storyboard id="ArrowCreate2" component={ArrowCreate2Board} layout={{ x: 1862, y: 440, zIndex: 5 }} />
      <Storyboard id="CreateSuccess" name="Create — success" component={CreateSuccessBoard} layout={{ x: 1920, y: 140 }} />

      {/* Row 2 — Build */}
      <Storyboard id="RowLabelBuild" component={RowLabelBuildBoard} layout={{ x: 0, y: 820, zIndex: 5 }} />
      <Storyboard id="CalloutToggle" component={CalloutToggleBoard} layout={{ x: 1160, y: 890, zIndex: 5 }} />
      <Storyboard id="CalloutBusinessRules" component={CalloutBusinessRulesBoard} layout={{ x: 2320, y: 890, zIndex: 5 }} />
      <Storyboard id="PersonaGuided" name="Build — Persona (guided)" component={PersonaGuidedBoard} layout={{ x: 0, y: 1040 }} />
      <Storyboard id="PersonaAdvanced" name="Build — Persona (advanced)" component={PersonaAdvancedBoard} layout={{ x: 1160, y: 1040 }} />
      <Storyboard id="Guardrails" name="Build — Guardrails" component={GuardrailsBoard} layout={{ x: 2320, y: 1040 }} />
      <Storyboard id="Knowledge" name="Build — Knowledge" component={KnowledgeBoard} layout={{ x: 3480, y: 1040 }} />
      <Storyboard id="Tools" name="Build — Tools" component={ToolsBoard} layout={{ x: 4640, y: 1040 }} />

      {/* Row 3 — Test & Evaluate */}
      <Storyboard id="RowLabelTest" component={RowLabelTestBoard} layout={{ x: 0, y: 1930, zIndex: 5 }} />
      <Storyboard id="TestEvaluate" name="Test & Evaluate" component={TestEvaluateBoard} layout={{ x: 0, y: 2010 }} />

      {/* Row 4 — Deploy */}
      <Storyboard id="RowLabelDeploy" component={RowLabelDeployBoard} layout={{ x: 0, y: 2900, zIndex: 5 }} />
      <Storyboard id="CalloutCostGate" component={CalloutCostGateBoard} layout={{ x: 3180, y: 2970, zIndex: 5 }} />
      <Storyboard id="Channel" name="Deploy — Channel & number" component={ChannelBoard} layout={{ x: 0, y: 3120 }} />
      <Storyboard id="ArrowDeploy1" component={ArrowDeploy1Board} layout={{ x: 1002, y: 3520, zIndex: 5 }} />
      <Storyboard id="ComplianceInbound" name="Deploy — Compliance (inbound)" component={ComplianceInboundBoard} layout={{ x: 1060, y: 3120 }} />
      <Storyboard id="ArrowDeploy2" component={ArrowDeploy2Board} layout={{ x: 2062, y: 3520, zIndex: 5 }} />
      <Storyboard id="ComplianceOutbound" name="Deploy — Compliance (outbound)" component={ComplianceOutboundBoard} layout={{ x: 2120, y: 3120 }} />
      <Storyboard id="ArrowDeploy3" component={ArrowDeploy3Board} layout={{ x: 3122, y: 3520, zIndex: 5 }} />
      <Storyboard id="CostEstimate" name="Deploy — Cost estimate (hard gate)" component={CostEstimateBoard} layout={{ x: 3180, y: 3120 }} />
      <Storyboard id="ArrowDeploy4" component={ArrowDeploy4Board} layout={{ x: 4182, y: 3520, zIndex: 5 }} />
      <Storyboard id="GoLive" name="Deploy — Go live" component={GoLiveBoard} layout={{ x: 4240, y: 3120 }} />
    </Canvas>
  );
}
