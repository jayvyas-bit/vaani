import { useEffect, useId, useRef } from "react";
import { Icon } from "@/components/ui/Icon";
import { withLiveGreeting } from "@/lib/persona";
import type { Agent } from "@/lib/types";
import { TestPanel } from "@/features/agent-builder/test/TestPanel";
import type { PreviewSource } from "./AgentWorkspace";

export function PreviewDialog({ agent, source, onClose }: { agent: Agent; source: PreviewSource; onClose: () => void }) {
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="animate-fade-in fixed inset-0 z-50 flex items-center justify-center bg-ink-950/40 p-4" onMouseDown={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onMouseDown={(e) => e.stopPropagation()}
        className="flex h-[min(640px,100%)] w-full max-w-[560px] flex-col overflow-hidden rounded-xl bg-paper-50 shadow-float"
      >
        <div className="flex items-center justify-between border-b border-ink-950/10 bg-paper-0 px-4 py-3">
          <h2 id={titleId} className="text-[14px] font-semibold text-ink-950">
            Preview {agent.name.trim() || "this agent"}
          </h2>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close preview"
            className="flex size-8 items-center justify-center rounded-md text-ink-500 outline-none hover:bg-paper-100 hover:text-ink-900 focus-visible:ring-2 focus-visible:ring-brand-200"
          >
            <Icon name="x" className="size-4" />
          </button>
        </div>
        <div className="min-h-0 flex-1 p-4">
          <TestPanel
            agent={agent}
            transcript={withLiveGreeting(source.transcript, agent)}
            context={source.context}
          />
        </div>
      </div>
    </div>
  );
}
