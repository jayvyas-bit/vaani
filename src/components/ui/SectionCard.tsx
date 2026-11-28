import { useState, type ReactNode } from "react";
import { Icon } from "./Icon";

/**
 * The product’s core progressive-disclosure primitive: every build-editor
 * section (persona, guardrails, knowledge, tools) is guided by default, with
 * an inline "Advanced" toggle that reveals the raw config underneath —
 * never a separate mode or page. One component, reused everywhere that
 * pattern applies, so the behavior (and its visual language) stays identical
 * across the whole editor.
 *
 * The canvas for this component is at
 * tempo/designs/design-system/section-card/index.canvas.tsx. If you adjust
 * this component, keep the canvas and its asset declaration in sync.
 */
export function SectionCard({
  title,
  description,
  guided,
  advanced,
  defaultAdvancedOpen = false,
  quiet = false,
}: {
  title: string;
  description?: string;
  guided: ReactNode;
  advanced?: ReactNode;
  defaultAdvancedOpen?: boolean;
  /**
   * Secondary sections (a single default, nothing to fill in) render
   * flatter and smaller so the primary section on a tab owns the weight.
   */
  quiet?: boolean;
}) {
  const [open, setOpen] = useState(defaultAdvancedOpen);

  return (
    <section
      className="border-b border-ink-950/10 last:border-b-0"
    >
      <header className={`flex items-start justify-between gap-4 px-6 ${quiet ? "py-4" : "pt-6 pb-2"}`}>
        <div className="min-w-0">
          <h3 className={`font-semibold tracking-[-0.01em] text-ink-950 ${quiet ? "text-[13px]" : "text-[15px]"}`}>
            {title}
          </h3>
          {description && <p className="mt-0.5 text-[13px] text-ink-500">{description}</p>}
        </div>
        {advanced && (
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            className={`-mr-2 flex shrink-0 items-center gap-1.5 rounded-md px-2 py-1 text-[13px] font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ink-400/30 ${
              open ? "bg-paper-100 text-ink-900" : "text-ink-600 hover:bg-paper-50 hover:text-ink-900"
            }`}
          >
            Advanced
            <Icon
              name="chevron-down"
              className={`size-4 text-ink-500 transition-transform ${open ? "rotate-180" : ""}`}
            />
          </button>
        )}
      </header>

      {guided != null && <div className={`px-6 ${quiet ? "pb-4" : "pb-2"}`}>{guided}</div>}

      {advanced && (
        <div
          className={`grid transition-[grid-template-rows] duration-200 ease-[var(--ease-out-quart)] ${
            open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
          }`}
        >
          <div className="min-h-0 overflow-hidden">
            <div className="mx-6 mb-4 rounded-md border border-ink-950/10 bg-paper-50 px-4 py-4">
              <div className="mb-3 flex items-center gap-1.5 text-xs font-semibold text-ink-500">
                <Icon name="wrench" className="size-3.5" />
                Advanced settings
              </div>
              {advanced}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
