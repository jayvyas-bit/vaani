import { NoteCallout } from "./Narration";

export default function CalloutCostGateBoard() {
  return (
    <NoteCallout
      number={3}
      tone="amber"
      title="Differentiator — cost-before-commit gate"
      body="Live per-minute rate and a monthly projection that update as volume/handle-time sliders move. The acknowledgment checkbox is a hard gate — this agent cannot go live until it's checked."
      width={500}
    />
  );
}
