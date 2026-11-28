import { useEffect, useRef, type ReactNode } from "react";
import { Icon, type IconName } from "./Icon";

/** A titled card. The header names the group and shows what is currently chosen. */
export function Section({
  title,
  summary,
  icon,
  children,
}: {
  title: string;
  summary?: string;
  icon: IconName;
  children: ReactNode;
}) {
  return (
    <section className="mb-5 rounded-2xl bg-paper-0 shadow-xs ring-1 ring-ink-950/10">
      <header className="flex items-center justify-between gap-4 border-b border-ink-950/10 px-6 py-4">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-lime-300">
            <Icon name={icon} className="size-[18px]" />
          </span>
          <h2 className="text-lg font-semibold tracking-[-0.01em] text-primary">
            {title}
          </h2>
        </div>
        {summary && (
          <span className="min-w-0 truncate rounded-full px-3 py-1 text-sm font-medium text-secondary ring-1 ring-inset ring-ink-950/15">
            {summary}
          </span>
        )}
      </header>
      <div className="divide-y divide-ink-950/10 px-6">{children}</div>
    </section>
  );
}

/** Opens over the page from the right, so the page underneath never changes height. */
export function Drawer({
  title,
  onClose,
  padBottom = true,
  children,
}: {
  title: string;
  onClose: () => void;
  /** Leave room under the content so floating pickers can open fully. */
  padBottom?: boolean;
  children: ReactNode;
}) {
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onClose]);
  return (
    <div
      className="fixed inset-0 z-50 flex justify-end"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className="absolute inset-0 bg-ink-950/40" onMouseDown={onClose} />
      <div
        ref={panel}
        onKeyDown={(e) => {
          if (e.key !== "Tab" || !panel.current) return;
          const f = panel.current.querySelectorAll<HTMLElement>(
            'button, input, textarea, [href], [tabindex]:not([tabindex="-1"])',
          );
          const list = Array.from(f).filter((x) => !x.hasAttribute("disabled") && x.offsetParent !== null);
          if (list.length === 0) return;
          const first = list[0];
          const last = list[list.length - 1];
          if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last.focus();
          } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }}
        className="relative flex h-full w-[min(640px,100vw)] flex-col bg-paper-0 shadow-xl"
      >
        <header className="flex items-center justify-between gap-4 border-b border-ink-950/10 px-6 py-4">
          <h2 className="text-lg font-semibold tracking-[-0.01em] text-primary">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            autoFocus
            className="flex size-11 items-center justify-center rounded-full text-secondary outline-focus-ring hover:bg-primary_hover focus-visible:outline-2"
          >
            <Icon name="x" className="size-5" />
          </button>
        </header>
        <div className={`min-h-0 flex-1 divide-y divide-ink-950/10 overflow-y-auto px-6 ${padBottom ? "pb-48" : "pb-8"}`}>
          {children}
        </div>
      </div>
    </div>
  );
}

