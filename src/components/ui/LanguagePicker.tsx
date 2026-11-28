import { useState } from "react";
import { Icon } from "./Icon";
import { languageLabel, languageOptions, type LanguageOption } from "@/lib/persona";

const pill = "flex min-h-11 items-center gap-1.5 rounded-full px-4 text-sm";
const action =
  "min-h-9 rounded-full px-3.5 text-sm outline-focus-ring transition-colors focus-visible:outline-2";

/**
 * Shows the chosen languages as a short summary and opens a searchable,
 * scrollable list to change them, so it stays compact with any number of
 * languages. Each row sets the main language or toggles an extra one.
 */
export function LanguagePicker({
  primary,
  extras,
  onChange,
  options = languageOptions,
}: {
  primary: string;
  extras: string[];
  onChange: (next: { primary: string; extras: string[] }) => void;
  options?: LanguageOption[];
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const visible = options.filter(
    (o) => !q || o.label.toLowerCase().includes(q) || o.native.toLowerCase().includes(q) || o.code.toLowerCase() === q,
  );

  const setPrimary = (code: string) => onChange({ primary: code, extras: extras.filter((c) => c !== code) });
  const toggleExtra = (code: string) =>
    onChange({ primary, extras: extras.includes(code) ? extras.filter((c) => c !== code) : [...extras, code] });

  return (
    <div className="relative" onKeyDown={(e) => e.key === "Escape" && setOpen(false)}>
      <div className="flex flex-wrap items-center gap-2">
        <span className={`${pill} font-medium text-primary ring-1 ring-inset ring-brand-600`}>
          {languageLabel(primary)}
          <span className="text-tertiary">Main</span>
        </span>
        {extras.map((code) => (
          <span key={code} className={`${pill} bg-lime-400 pr-2 font-medium text-brand-900`}>
            {languageLabel(code)}
            <button
              type="button"
              onClick={() => toggleExtra(code)}
              aria-label={`Remove ${languageLabel(code)}`}
              className="flex size-7 items-center justify-center rounded-full outline-focus-ring hover:bg-brand-900/10 focus-visible:outline-2"
            >
              <Icon name="x" className="size-4" strokeWidth={2.5} />
            </button>
          </span>
        ))}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className={`${pill} text-secondary ring-1 ring-inset ring-ink-950/15 outline-focus-ring hover:bg-primary_hover focus-visible:outline-2`}
        >
          {open ? "Done" : "Change languages"}
          <Icon name="chevron-down" className={`size-4 text-fg-quaternary transition-transform ${open ? "rotate-180" : ""}`} />
        </button>
      </div>
      <p className="mt-2 text-sm text-tertiary">
        {extras.length > 0
          ? `Starts in ${languageLabel(primary)} and switches when the other party speaks ${extras.map(languageLabel).join(" or ")}.`
          : `Speaks ${languageLabel(primary)} only. Add more to let it switch mid-call.`}
      </p>

      {open && (
        <>
        <div className="fixed inset-0 z-30" onMouseDown={() => setOpen(false)} />
        <div className="absolute inset-x-0 top-full z-40 mt-2 rounded-xl bg-paper-0 shadow-lg ring-1 ring-ink-950/15">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Search ${options.length} languages`}
            aria-label="Search languages"
            className="h-12 w-full rounded-t-xl border-b border-ink-950/10 bg-transparent px-4 text-md text-primary outline-none placeholder:text-tertiary focus-visible:bg-primary_hover"
          />
          <ul className="max-h-72 overflow-y-auto p-1.5">
            {visible.map((o) => {
              const isMain = o.code === primary;
              const isExtra = extras.includes(o.code);
              return (
                <li key={o.code} className="flex min-h-12 items-center justify-between gap-3 rounded-lg px-3 hover:bg-primary_hover">
                  <span className="min-w-0 truncate text-md text-primary">
                    {o.label}
                    {o.native !== o.label && <span className="ml-2 text-sm text-tertiary">{o.native}</span>}
                  </span>
                  <span className="flex shrink-0 gap-1.5">
                    <button
                      type="button"
                      aria-pressed={isMain}
                      aria-label={`Set ${o.label} as main language`}
                      onClick={() => setPrimary(o.code)}
                      className={`${action} ${isMain ? "bg-brand-600 font-medium text-white" : "text-secondary ring-1 ring-inset ring-ink-950/15 hover:bg-secondary"}`}
                    >
                      Main
                    </button>
                    {!isMain && (
                      <button
                        type="button"
                        aria-pressed={isExtra}
                        aria-label={`${isExtra ? "Remove" : "Also speak"} ${o.label}`}
                        onClick={() => toggleExtra(o.code)}
                        className={`${action} ${isExtra ? "bg-lime-400 font-medium text-brand-900" : "text-secondary ring-1 ring-inset ring-ink-950/15 hover:bg-secondary"}`}
                      >
                        {isExtra ? "Added" : "Also"}
                      </button>
                    )}
                  </span>
                </li>
              );
            })}
            {visible.length === 0 && <li className="px-3 py-4 text-sm text-tertiary">No language matches “{query}”.</li>}
          </ul>
        </div>
        </>
      )}
    </div>
  );
}
