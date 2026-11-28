import type { ReactNode } from "react";
import { Icon } from "./Icon";

/**
 * Persistent app-level chrome: logo + primary nav, next to the content area.
 * The one real top-level surface is Agents, so it stays styled as "current"
 * — this is the frame around it, not a destination switcher yet.
 */
export function AppShell({ onGoHome, children }: { onGoHome: () => void; children: ReactNode }) {
  return (
    <div className="flex h-dvh overflow-hidden bg-paper-50">
      <aside className="flex w-60 shrink-0 flex-col border-r border-ink-950/10 bg-paper-0">
        <div className="flex items-center gap-2.5 px-4 py-4">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand-600 text-paper-0 shadow-brand-sm">
            <Icon name="phone-inbound" className="size-4" strokeWidth={2.2} />
          </div>
          <p className="min-w-0 truncate text-[14px] font-semibold tracking-[-0.01em] text-ink-950">
            Voice Agent Builder
          </p>
        </div>
        <nav className="flex-1 space-y-0.5 px-2.5 pt-1">
          <button
            type="button"
            onClick={onGoHome}
            className="flex w-full items-center gap-2.5 rounded-md bg-brand-50 px-3 py-2 text-left text-[13.5px] font-medium text-brand-700 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-brand-200"
          >
            <Icon name="grid" className="size-4" />
            Agents
          </button>
        </nav>
      </aside>
      <div className="min-w-0 flex-1 overflow-hidden">{children}</div>
    </div>
  );
}
