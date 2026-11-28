import { useLayoutEffect, useRef, useState, type ReactNode } from "react";

export interface TabItem {
  id: string;
  label: string;
  icon?: ReactNode;
  /** Shown as a hover/focus tooltip so the label’s meaning doesn’t depend on clicking in first. */
  description?: string;
}

export function Tabs({
  items,
  active,
  onChange,
}: {
  items: TabItem[];
  active: string;
  onChange: (id: string) => void;
}) {
  const listRef = useRef<HTMLDivElement>(null);
  const [indicator, setIndicator] = useState<{ left: number; width: number } | null>(null);

  useLayoutEffect(() => {
    const list = listRef.current;
    const activeEl = list?.querySelector<HTMLButtonElement>(`[data-tab-id="${active}"]`);
    if (!list || !activeEl) return;
    const update = () => setIndicator({ left: activeEl.offsetLeft, width: activeEl.offsetWidth });
    update();
    const observer = new ResizeObserver(update);
    observer.observe(list);
    return () => observer.disconnect();
  }, [active, items]);

  return (
    <div
      ref={listRef}
      role="tablist"
      className="relative flex items-center gap-4 overflow-x-auto border-b border-gray-200 [scrollbar-width:none]"
    >
      {items.map((item) => {
        const isActive = item.id === active;
        return (
          <button
            key={item.id}
            data-tab-id={item.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(item.id)}
            className={`group relative flex shrink-0 items-center gap-2 px-1 pt-3 pb-3 text-sm whitespace-nowrap outline-none transition-[color,font-weight] focus-visible:text-gray-900 ${
              isActive ? "font-bold text-gray-900" : "font-medium text-gray-500 hover:text-gray-700"
            }`}
          >
            {item.icon}
            {item.label}
            {item.description && (
              <span
                role="tooltip"
                className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 w-max max-w-56 -translate-x-1/2 scale-95 rounded-lg bg-gray-900 px-2.5 py-1.5 text-left text-xs font-medium text-white opacity-0 shadow-float transition-[opacity,transform] duration-150 ease-[var(--ease-out-quart)] group-hover:scale-100 group-hover:opacity-100 group-focus-visible:scale-100 group-focus-visible:opacity-100"
              >
                {item.description}
                <span className="absolute top-full left-1/2 -ml-1 border-4 border-transparent border-t-gray-900" />
              </span>
            )}
          </button>
        );
      })}
      {indicator && (
        <span
          aria-hidden="true"
          className="absolute bottom-0 left-0 h-[3px] rounded-full bg-brand-600 shadow-[0_0_8px_rgba(127,86,217,0.45)] transition-[transform,width] duration-200 ease-[var(--ease-out-quart)]"
          style={{ width: indicator.width, transform: `translateX(${indicator.left}px)` }}
        />
      )}
    </div>
  );
}
