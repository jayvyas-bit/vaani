import { NoteCallout } from "./Narration";

export default function CalloutBusinessRulesBoard() {
  return (
    <NoteCallout
      number={2}
      tone="accent"
      title="Differentiator — business rules, not free text"
      body="Below content-safety toggles, business rules are typed constraints (discount limits, forbidden promises, escalation triggers) with a threshold and an action — compiled to JSON the eval system can actually test against."
      width={500}
    />
  );
}
