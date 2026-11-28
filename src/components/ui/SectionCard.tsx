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
      className="border-t border-secondary py-8 first:border-t-0 first:pt-0"
    >
      <header className={`flex items-start justify-between gap-4 ${quiet ? "pb-2" : "pb-5"}`}>
        <div className="min-w-0">
          <h2 className={`font-semibold text-primary ${quiet ? "text-sm" : "text-lg"}`}>
            {title}
          </h2>
          {description && <p className="mt-0.5 text-sm text-tertiary">{description}</p>}
        </div>
        {advanced && (
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            className={`-mr-2 flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-2 text-sm font-semibold outline-focus-ring transition-colors focus-visible:outline-2 ${
              open ? "bg-active text-secondary" : "text-tertiary hover:bg-primary_hover hover:text-secondary"
            }`}
          >
            Advanced
            <Icon
              name="chevron-down"
              className={`size-4 text-fg-quaternary transition-transform ${open ? "rotate-180" : ""}`}
            />
          </button>
        )}
      </header>

      {guided != null && <div>{guided}</div>}

      {advanced && (
        <div
          className={`grid transition-[grid-template-rows] duration-200 ease-[var(--ease-out-quart)] ${
            open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
          }`}
        >
          <div className="min-h-0 overflow-hidden">
            <div className="mt-5 rounded-xl border border-secondary bg-secondary px-4 py-4">
              <div className="mb-3 flex items-center gap-1.5 text-sm font-medium text-tertiary">
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
