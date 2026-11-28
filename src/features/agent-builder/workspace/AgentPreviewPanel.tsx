import { useEffect, useId, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { withLiveGreeting } from "@/lib/persona";
import type { Agent } from "@/lib/types";
import { VoiceWaveform } from "@/components/ui/VoiceWaveform";
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
          <h2 id={titleId} className="text-md font-semibold text-primary">
            Preview {agent.name.trim() || "this agent"}
          </h2>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close preview"
            className="flex size-8 items-center justify-center rounded-md text-tertiary outline-none hover:bg-paper-100 hover:text-ink-900 focus-visible:ring-2 focus-visible:ring-brand-200"
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

/** Sticky rail card: an orb and one button that opens a live test call from any section. */
export function AgentPreviewPanel({
  agent,
  source,
  onClose,
}: {
  agent: Agent;
  source: PreviewSource;
  /** Below xl the rail is a drawer; this closes it. */
  onClose?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const voiceName = agent.voice.split(" — ")[0];

  return (
    <section className="relative rounded-xl border border-ink-950/10 bg-paper-0 px-6 pb-6 pt-7">
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          aria-label="Hide summary"
          className="absolute right-2 top-2 flex size-7 items-center justify-center rounded-md text-ink-400 outline-none hover:bg-paper-100 hover:text-ink-700 focus-visible:ring-2 focus-visible:ring-brand-200 xl:hidden"
        >
          <Icon name="x" className="size-4" />
        </button>
      )}
      <div className="flex flex-col items-center text-center">
        <span
          className={`flex size-14 items-center justify-center rounded-full ring-1 ring-inset bg-primary text-primary ring-primary`}
        >
          <VoiceWaveform className="h-6" />
        </span>
        <h2 className="mt-4 text-md font-semibold text-primary">Talk to your agent</h2>
        <p className="mt-1 text-sm text-tertiary">{voiceName}'s voice · text test</p>
      </div>
      <Button variant="secondary" className="mt-6 w-full" onClick={() => setOpen(true)}>
        <Icon name="play" className="size-3.5" />
        Start test call
      </Button>
      {open && <PreviewDialog agent={agent} source={source} onClose={() => setOpen(false)} />}
    </section>
  );
}
