import type { ReactNode } from "react";

export interface TabItem {
  id: string;
  label: string;
  icon?: ReactNode;
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
  return (
    <div role="tablist" className="flex items-center gap-4 overflow-x-auto border-b border-gray-200 [scrollbar-width:none]">
      {items.map((item) => {
        const isActive = item.id === active;
        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(item.id)}
            className={`relative flex shrink-0 items-center gap-2 px-1 pt-3 pb-3 text-sm font-semibold whitespace-nowrap outline-none transition-colors focus-visible:text-gray-900 ${
              isActive ? "text-gray-900" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {item.icon}
            {item.label}
            {isActive && <span className="absolute inset-x-0 bottom-0 h-0.5 bg-brand-600" />}
          </button>
        );
      })}
    </div>
  );
}
