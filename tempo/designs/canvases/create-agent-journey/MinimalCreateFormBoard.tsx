import { MinimalCreateForm } from "@/features/agent-builder/create/MinimalCreateForm";

export default function MinimalCreateFormBoard() {
  return (
    <div className="h-[650px] w-[680px] overflow-y-auto rounded-xl border border-ink-950/10 bg-paper-50 shadow-float">
      <MinimalCreateForm />
    </div>
  );
}
