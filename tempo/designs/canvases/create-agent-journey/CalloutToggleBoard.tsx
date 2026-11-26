import { NoteCallout } from "./Narration";

export default function CalloutToggleBoard() {
  return (
    <NoteCallout
      number={1}
      tone="accent"
      title="Differentiator — Guided ↔ Advanced, inline"
      body="Every section defaults to plain-language guided fields. Advanced isn't a separate mode or page — it's a toggle on the same card, revealing the raw system prompt, temperature, and model stack underneath."
      width={500}
    />
  );
}
