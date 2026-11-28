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
  advancedLabel = "Advanced",
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
  /** Names what the toggle reveals, e.g. "Search settings". */
  advancedLabel?: string;
}) {
  const [open, setOpen] = useState(defaultAdvancedOpen);

  return (
    <section
      className="rounded-xl border border-ink-950/10 bg-paper-0 p-5 shadow-xs"
    >
      <header
        className={`flex flex-wrap items-start justify-between gap-x-4 gap-y-2 ${quiet ? "pb-3" : "pb-4"}`}
      >
        <div className="min-w-0">
          <h2 className="text-md font-semibold text-primary">{title}</h2>
          {description && <p className="mt-0.5 text-sm text-tertiary">{description}</p>}
        </div>
        {advanced && (
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            className={`-mr-2 flex shrink-0 items-center gap-1 rounded-md px-2 py-1.5 text-sm font-semibold outline-focus-ring transition-colors focus-visible:outline-2 ${
              open ? "bg-active text-secondary" : "text-tertiary hover:bg-primary_hover hover:text-secondary"
            }`}
          >
            {advancedLabel}
            <Icon
              name="chevron-down"
              className={`size-4 text-fg-quaternary transition-transform ${open ? "rotate-180" : ""}`}
            />
          </button>
        )}
      </header>

      <div className="min-w-0">
        {guided != null && <div>{guided}</div>}

        {advanced && (
          <div
            className={`grid transition-[grid-template-rows] duration-200 ease-[var(--ease-out-quart)] ${
              open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
            }`}
          >
            <div className="min-h-0 overflow-hidden">
              <div className="mt-4 rounded-xl border border-secondary bg-secondary px-4 py-4">
                <div className="mb-3 flex items-center gap-1.5 text-sm font-medium text-tertiary">
                  <Icon name="wrench" className="size-3.5" />
                  {advancedLabel}
                </div>
                {advanced}
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
